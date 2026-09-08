import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GENERAL_CATALOG } from '../config/data.js';
import { formatVenezuelaDate } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storePath = path.resolve(__dirname, '../data/store.json');

class StoreService {
    constructor() {
        this.data = this.load();
    }

    /**
     * Carga el archivo de almacenamiento persistente
     */
    load() {
        try {
            if (fs.existsSync(storePath)) {
                const raw = fs.readFileSync(storePath, 'utf8');
                return JSON.parse(raw);
            }
        } catch (err) {
            logger.error('Error al leer store.json, usando valores por defecto:', err.message);
        }
        return {
            customCatalog: '',
            tasaBCV: '',
            lastUpdated: null,
            updatedBy: null,
            adminGroups: [],
        };
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
     * Registra un grupo como autorizado para actualizaciones
     * @param {string} groupId
     */
    registerAdminGroup(groupId) {
        if (!this.data.adminGroups.includes(groupId)) {
            this.data.adminGroups.push(groupId);
            this.save();
            logger.success(`Grupo de administración registrado: ${groupId}`);
        }
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
}

export const storeService = new StoreService();
