import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GENERAL_CATALOG, CATALOG_SECTIONS } from '../config/data.js';
import { formatVenezuelaDate, arePhoneNumbersEqual, sanitizePhone } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storePath = path.resolve(__dirname, '../data/store.json');

class StoreService {
    constructor() {
        this.data = this.load();
    }

    /**
     * Carga el archivo de almacenamiento persistente asegurando valores por defecto
     */
    load() {
        const defaults = {
            customCatalog: '',
            tasaBCV: '',
            lastUpdated: null,
            updatedBy: null,
            adminGroups: [],
            ordersGroups: [],
            updatesGroups: [],
            isPaused: false,
        };

        try {
            if (fs.existsSync(storePath)) {
                const raw = fs.readFileSync(storePath, 'utf8');
                return { ...defaults, ...JSON.parse(raw) };
            }
        } catch (err) {
            logger.error('Error al leer store.json, usando valores por defecto:', err.message);
        }
        return defaults;
    }

    /**
     * Guarda el estado actual en disco
     */
    save() {
        try {
            const dir = path.dirname(storePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(storePath, JSON.stringify(this.data, null, 2), 'utf8');
        } catch (err) {
            logger.error('Error al guardar store.json:', err.message);
        }
    }

    /**
     * Actualiza la lista de precios y ofertas
     * @param {string} text
     * @param {string} sender
     */
    updateCatalog(text, sender = 'Admin') {
        this.data.customCatalog = text.trim();
        this.data.lastUpdated = new Date().toISOString();
        this.data.updatedBy = sender;
        this.save();
        logger.success(`Catálogo actualizado por ${sender} a las ${formatVenezuelaDate()}`);
        return this.data;
    }

    /**
     * Actualiza la tasa BCV del día
     * @param {string|number} tasa
     * @param {string} sender
     */
    updateTasa(tasa, sender = 'Admin') {
        this.data.tasaBCV = String(tasa).trim();
        this.data.lastUpdated = new Date().toISOString();
        this.data.updatedBy = sender;
        this.save();
        logger.success(`Tasa BCV actualizada a ${tasa} Bs/$ por ${sender}`);
        return this.data;
    }

    /**
     * Registra un grupo para recepción de pedidos y despacho
     * @param {string} groupId
     */
    registerOrdersGroup(groupId) {
        if (!this.data.ordersGroups) this.data.ordersGroups = [];
        if (!this.data.ordersGroups.includes(groupId)) {
            this.data.ordersGroups.push(groupId);
            this.save();
            logger.success(`Grupo de PEDIDOS registrado: ${groupId}`);
        }
    }

    /**
     * Registra un grupo para actualizaciones de precios y tasa
     * @param {string} groupId
     */
    registerUpdatesGroup(groupId) {
        if (!this.data.updatesGroups) this.data.updatesGroups = [];
        if (!this.data.updatesGroups.includes(groupId)) {
            this.data.updatesGroups.push(groupId);
            this.save();
            logger.success(`Grupo de ACTUALIZACIONES registrado: ${groupId}`);
        }
    }

    /**
     * Registra un grupo como autorizado general (pedidos y actualizaciones)
     * @param {string} groupId
     */
    registerAdminGroup(groupId) {
        if (!this.data.adminGroups) this.data.adminGroups = [];
        if (!this.data.adminGroups.includes(groupId)) {
            this.data.adminGroups.push(groupId);
            this.save();
            logger.success(`Grupo de administración general registrado: ${groupId}`);
        }
    }

    /**
     * Obtiene todos los grupos que deben recibir notificaciones de nuevos pedidos
     * @returns {string[]}
     */
    getOrdersGroups() {
        const envOrders = process.env.ORDERS_GROUP_ID
            ? process.env.ORDERS_GROUP_ID.split(',').map(g => g.replace(/^['"]|['"]$/g, '').trim())
            : [];
        const envAdmin = process.env.ADMIN_GROUP_ID
            ? process.env.ADMIN_GROUP_ID.split(',').map(g => g.replace(/^['"]|['"]$/g, '').trim())
            : [];
        const set = new Set([
            ...(this.data.ordersGroups || []),
            ...(this.data.adminGroups || []),
            ...envOrders,
            ...envAdmin
        ]);
        return Array.from(set).map(g => g.trim()).filter(g => g && g.endsWith('@g.us'));
    }

    /**
     * Obtiene todos los grupos autorizados para actualizaciones
     * @returns {string[]}
     */
    getUpdatesGroups() {
        const envUpdates = process.env.UPDATES_GROUP_ID
            ? process.env.UPDATES_GROUP_ID.split(',').map(g => g.replace(/^['"]|['"]$/g, '').trim())
            : [];
        const envAdmin = process.env.ADMIN_GROUP_ID
            ? process.env.ADMIN_GROUP_ID.split(',').map(g => g.replace(/^['"]|['"]$/g, '').trim())
            : [];
        const set = new Set([
            ...(this.data.updatesGroups || []),
            ...(this.data.adminGroups || []),
            ...envUpdates,
            ...envAdmin
        ]);
        return Array.from(set).map(g => g.trim()).filter(g => g && g.endsWith('@g.us'));
    }


    /**
     * Verifica si el remitente del mensaje es un administrador autorizado o proviene de un grupo admin
     * @param {Object} ctx Contexto del mensaje de BuilderBot
     * @returns {boolean}
     */
    isAdmin(ctx) {
        if (!ctx) return false;
        if (ctx.key?.fromMe) return true;

        const text = (ctx.body || '').trim().toLowerCase();
        // Permitir comandos de vinculación de grupo para su procesamiento
        if (text.startsWith('#grupo') || text.startsWith('grupo ') || text === '#pedidos' || text === '#actualizaciones' || text === '#despacho' || text === '#grupos' || text === 'grupos') {
            return true;
        }

        const remoteJid = ctx.key?.remoteJid || ctx.from || '';
        const participant = ctx.key?.participantAlt || ctx.key?.participant || ctx.participant || ctx.from || '';

        // 1. Verificar si proviene de algún grupo registrado (pedidos, actualizaciones o general)
        const allGroups = [
            ...(this.data.adminGroups || []),
            ...(this.data.ordersGroups || []),
            ...(this.data.updatesGroups || [])
        ];
        if (allGroups.includes(remoteJid)) {
            return true;
        }

        // 2. Verificar si el teléfono coincide con ADMIN_PHONE (soporta varios separados por coma)
        const adminPhone = process.env.ADMIN_PHONE || '04142634053';
        const phones = adminPhone.split(',').map(p => p.trim());
        for (const p of phones) {
            if (arePhoneNumbersEqual(participant, p) || arePhoneNumbersEqual(ctx.from, p)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Limpia todos los grupos registrados (pedidos, actualizaciones y generales)
     */
    clearGroups() {
        this.data.adminGroups = [];
        this.data.ordersGroups = [];
        this.data.updatesGroups = [];
        this.save();
        logger.info('Todos los grupos registrados han sido desvinculados.');
        return this.data;
    }

    /**
     * Verifica si el remitente es el administrador principal (para tareas criticas como registrar grupos)
     * @param {Object} ctx Contexto del mensaje de BuilderBot
     * @returns {boolean}
     */
    isSuperAdmin(ctx) {
        if (!ctx) return false;
        if (ctx.key?.fromMe) return true;

        const remoteJid = ctx.key?.remoteJid || ctx.from || '';
        // Permitir vincular grupos directamente si el comando se ejecuta dentro de un grupo
        if (remoteJid.endsWith('@g.us')) {
            return true;
        }

        const participant = ctx.key?.participantAlt || ctx.key?.participant || ctx.participant || ctx.from || '';
        const adminPhone = process.env.ADMIN_PHONE || '04142634053';
        const phones = adminPhone.split(',').map(p => p.trim());
        for (const p of phones) {
            if (arePhoneNumbersEqual(participant, p) || arePhoneNumbersEqual(ctx.from, p)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Notifica a todos los canales administrativos (grupos registrados y telefono admin)
     * @param {Object} provider Proveedor de BuilderBot
     * @param {string} message Mensaje a enviar
     */
    async notifyAdmins(provider, message) {
        if (!provider || !message) return;

        const targets = new Set();

        // 1. Agregar grupos registrados
        if (Array.isArray(this.data.adminGroups)) {
            for (const groupId of this.data.adminGroups) {
                if (groupId) targets.add(groupId);
            }
        }

        // 2. Agregar telefono admin si esta configurado
        const adminPhone = sanitizePhone(process.env.ADMIN_PHONE || '');
        if (adminPhone) {
            const normalizedPhone = adminPhone.startsWith('58') ? adminPhone : `58${adminPhone.replace(/^0+/, '')}`;
            targets.add(`${normalizedPhone}@s.whatsapp.net`);
        }

        // 3. Enviar notificaciones a cada canal
        for (const target of targets) {
            try {
                await provider.sendMessage(target, message, {});
            } catch (err) {
                logger.error(`Error al notificar a canal admin (${target}):`, err.message);
            }
        }
    }

    /**
     * Pausa o reactiva el bot para clientes
     * @param {boolean} status
     * @param {string} sender
     */
    setPaused(status, sender = 'Admin') {
        this.data.isPaused = Boolean(status);
        this.data.lastUpdated = new Date().toISOString();
        this.data.updatedBy = sender;
        this.save();
        logger.info(`Estado del bot cambiado a: ${status ? 'PAUSADO ⏸️' : 'ACTIVO 🟢'} por ${sender}`);
        return this.data.isPaused;
    }

    /**
     * Verifica si el bot está pausado
     * @returns {boolean}
     */
    isPaused() {
        return Boolean(this.data.isPaused);
    }

    /**
     * Devuelve los datos actuales del store
     */
    getStore() {
        return this.data;
    }

    /**
     * Obtiene el catálogo formateado para enviar a los clientes
     */
    getFormattedCatalog() {
        const sections = [];

        if (this.data.tasaBCV) {
            sections.push(`🇻🇪 *Tasa oficial del día:* ${this.data.tasaBCV} Bs/$`);
        }

        if (this.data.customCatalog) {
            sections.push('📋 *LISTA DE PRECIOS Y OFERTAS ACTUALIZADA:*');
            sections.push(this.data.customCatalog);
            if (this.data.lastUpdated) {
                sections.push(`\n_🔄 Actualizado el: ${formatVenezuelaDate(this.data.lastUpdated)}_`);
            }
        } else {
            sections.push('📋 *CATÁLOGO DE PRODUCTOS DISPONIBLES:*');
            sections.push(GENERAL_CATALOG);
        }

        return sections.join('\n\n');
    }

    /**
     * Obtiene las secciones del catálogo listas para ser enviadas por bloques en WhatsApp
     * @returns {string[]}
     */
    getCatalogSections() {
        if (this.data.customCatalog) {
            return [this.getFormattedCatalog()];
        }

        const list = [];
        if (this.data.tasaBCV) {
            list.push(`🇻🇪 *Tasa oficial del día:* ${this.data.tasaBCV} Bs/$`);
        }
        list.push(...CATALOG_SECTIONS);
        return list;
    }
}

export const storeService = new StoreService();
