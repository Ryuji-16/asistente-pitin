import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, '../../store.config.json');

/**
 * Valores predeterminados seguros en caso de que store.config.json esté ausente o incompleto
 */
const DEFAULT_CONFIG = {
    business: {
        id: 'default-store',
        name: 'Tienda Oficial',
        branch: 'Principal',
        assistantName: 'Asistente',
        icon: '🏪',
        tagline: 'Atención personalizada y delivery',
        welcomeMessage: '¡Hola! Bienvenido a nuestra tienda. ¿Qué te gustaría ordenar hoy?',
        phone: '',
        instagram: '',
        address: 'Tienda principal',
        reference: '',
        location: {
            name: 'Tienda principal',
            latitude: 10.4326,
            longitude: -66.8601
        }
    },
    whatsapp: {
        groupKeyword: 'asistente'
    },
    schedule: {
        timezone: 'America/Caracas',
        ranges: [
            {
                id: 'allWeek',
                days: [0, 1, 2, 3, 4, 5, 6],
                openHour: 8,
                openMinute: 0,
                closeHour: 20,
                closeMinute: 0,
                label: 'Todos los días: 8:00 AM a 8:00 PM'
            }
        ],
        offHoursNotice: 'Hola 👋 En este momento nuestra tienda física se encuentra fuera de horario de atención comercial.'
    },
    delivery: {
        baseFee: 3.50,
        roadMultiplier: 1.35,
        fallbackFeeNotice: 'Zona por verificar con la tienda',
        tiers: []
    },
    paymentMethods: {
        pagoMovil: {
            enabled: true,
            banco: '',
            telefono: '',
            rif: '',
            titular: ''
        },
        zelle: {
            enabled: false,
            email: '',
            titular: '',
            nota: ''
        },
        otros: 'Efectivo o punto de venta'
    },
    catalog: {
        pdfFile: 'catalogo.pdf',
        products: []
    },
    orderFlow: {
        orderProcessingNotice: 'En breve procesaremos tu pedido y te contactaremos.',
        pickupBranchLabel: 'Retiro en tienda',
        farewellMessage: '¡Muchas gracias por tu compra!'
    }
};

class StoreConfigLoader {
    constructor() {
        this.config = this.load();
    }

    /**
     * Carga y parsea el archivo store.config.json
     * @returns {Object}
     */
    load() {
        try {
            if (fs.existsSync(configPath)) {
                const raw = fs.readFileSync(configPath, 'utf8');
                const parsed = JSON.parse(raw);
                logger.info(`[StoreConfigLoader] Configuración cargada con éxito para "${parsed.business?.name || 'Tienda'}"`);
                return {
                    ...DEFAULT_CONFIG,
                    ...parsed,
                    business: { ...DEFAULT_CONFIG.business, ...(parsed.business || {}) },
                    whatsapp: { ...DEFAULT_CONFIG.whatsapp, ...(parsed.whatsapp || {}) },
                    schedule: { ...DEFAULT_CONFIG.schedule, ...(parsed.schedule || {}) },
                    delivery: { ...DEFAULT_CONFIG.delivery, ...(parsed.delivery || {}) },
                    paymentMethods: { ...DEFAULT_CONFIG.paymentMethods, ...(parsed.paymentMethods || {}) },
                    catalog: { ...DEFAULT_CONFIG.catalog, ...(parsed.catalog || {}) },
                    orderFlow: { ...DEFAULT_CONFIG.orderFlow, ...(parsed.orderFlow || {}) }
                };
            } else {
                logger.warn(`[StoreConfigLoader] No se encontró ${configPath}, usando configuración por defecto.`);
                return DEFAULT_CONFIG;
            }
        } catch (err) {
            logger.error('[StoreConfigLoader] Error al parsear store.config.json:', err.message);
            return DEFAULT_CONFIG;
        }
    }

    /**
     * Recarga la configuración desde disco
     */
    reload() {
        this.config = this.load();
        return this.config;
    }

    /**
     * Obtiene la configuración completa
     */
    getConfig() {
        return this.config;
    }

    /**
     * Obtiene los datos del negocio
     */
    getBusiness() {
        return this.config.business;
    }

    /**
     * Obtiene la configuración de WhatsApp y grupos
     */
    getWhatsapp() {
        return this.config.whatsapp;
    }

    /**
     * Palabra clave para vincular grupos de WhatsApp
     */
    getGroupKeyword() {
        return (this.config.whatsapp?.groupKeyword || this.config.business?.assistantName || '').toLowerCase();
    }

    /**
     * Obtiene la configuración de horarios
     */
    getSchedule() {
        return this.config.schedule;
    }

    /**
     * Obtiene la configuración de delivery
     */
    getDelivery() {
        return this.config.delivery;
    }

    /**
     * Obtiene los métodos de pago
     */
    getPaymentMethods() {
        return this.config.paymentMethods;
    }

    /**
     * Obtiene la configuración de catálogo
     */
    getCatalog() {
        return this.config.catalog;
    }

    /**
     * Obtiene las opciones de flujo de pedidos
     */
    getOrderFlow() {
        return this.config.orderFlow;
    }

    /**
     * Devuelve todas las palabras clave registradas de los productos del catálogo
     * @returns {string[]}
     */
    getCatalogKeywords() {
        const keywords = new Set();
        const products = this.config.catalog?.products || [];
        for (const prod of products) {
            if (Array.isArray(prod.keywords)) {
                for (const kw of prod.keywords) {
                    keywords.add(kw.toLowerCase().trim());
                }
            }
            if (prod.name) {
                keywords.add(prod.name.toLowerCase().trim());
            }
        }
        return Array.from(keywords);
    }
}

export const storeConfigLoader = new StoreConfigLoader();
