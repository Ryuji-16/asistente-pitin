import { storeService } from './storeService.js';
import { storeConfigLoader } from '../config/storeConfigLoader.js';
import { STORE_CUSTOM_HANDLERS } from './storeCustomHandlers.js';

/**
 * Normaliza un texto para búsqueda (minúsculas, sin tildes, sin signos raros)
 */
export const normalizeQuery = (text = '') => {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[¿?¡!.,:;()_/\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Obtiene la tasa oficial del día formateada si está disponible
 */
const getTasaFooter = () => {
    const store = storeService.getStore();
    if (store && store.tasaBCV) {
        return `\n\n🇻🇪 *Tasa oficial del día:* ${store.tasaBCV} Bs/$`;
    }
    return '';
};

/**
 * Pie de mensaje con opciones de acción rápida
 */
const getActionFooter = () => {
    return [
        '',
        '👉 *¿Deseas incluirlo en tu pedido?*',
        '• Responde *2* para *Hacer un Pedido*',
        '• Responde *1* para ver nuestro *Catálogo Completo en PDF*',
        '• Responde *menu* para volver al Menú Principal'
    ].join('\n');
};

/**
 * Genera una tarjeta de respuesta dinámica y limpia para cualquier producto genérico del catálogo
 * @param {Object} prod
 * @param {string} cleanText
 * @returns {string}
 */
export function buildDynamicProductAnswer(prod, cleanText = '') {
    const icon = prod.icon || storeConfigLoader.getBusiness().icon || '🏷️';
    const lines = [
        `${icon} *${prod.name}:*`,
        ''
    ];

    if (prod.price !== undefined && prod.price !== null) {
        lines.push(`• 🏷️ *Precio:* $${Number(prod.price).toFixed(2)}${prod.unit ? ` / ${prod.unit}` : ''}`);
    }

    if (prod.description) {
        lines.push(prod.description);
    }

    if (Array.isArray(prod.variants) && prod.variants.length > 0) {
        lines.push('');
        lines.push('📦 *Opciones y Variantes:*');
        for (const v of prod.variants) {
            lines.push(`• ${v.name}: $${Number(v.price).toFixed(2)}${v.unit ? ` (${v.unit})` : ''}`);
        }
    }

    if (prod.note) {
        lines.push('');
        lines.push(`💡 *Nota:* ${prod.note}`);
    }

    return lines.join('\n');
}

class CatalogSearchService {
    /**
     * Devuelve una lista de palabras clave para registrar en el flujo de BuilderBot
     */
    getTriggerKeywords() {
        const set = new Set();

        // 1. Palabras clave de todos los productos configurados
        const catalogKws = storeConfigLoader.getCatalogKeywords();
        for (const kw of catalogKws) {
            set.add(kw);
        }

        // 2. Frases y palabras comunes al preguntar precios en WhatsApp
        const priceTriggers = [
            'precio',
            'precios',
            'a como',
            'a cuanto',
            'cuanto cuesta',
            'cuanto sale',
            'cuanto vale',
            'que vale',
            'que cuesta',
            'que precio',
            'valor',
            'tienen',
            'disponen',
            'kilo'
        ];

        for (const pt of priceTriggers) {
            set.add(pt);
        }

        return Array.from(set);
    }

    /**
     * Busca si la consulta del usuario corresponde a un producto específico del catálogo
     * @param {string} text Mensaje recibido del usuario
     * @returns {string|null} Respuesta formateada con el precio o null si no se identifica producto
     */
    searchProductPrice(text = '') {
        if (!text || typeof text !== 'string') return null;

        const clean = normalizeQuery(text);
        if (!clean) return null;

        const products = storeConfigLoader.getCatalog().products || [];

        // Comprobamos si el texto busca explícitamente algún producto
        for (const prod of products) {
            const keywords = Array.isArray(prod.keywords) ? prod.keywords : [];
            // Ordenar keywords por longitud descendente para emparejar frases compuestas primero
            const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);

            for (const kw of sortedKeywords) {
                const normalizedKw = normalizeQuery(kw);
                if (normalizedKw && clean.includes(normalizedKw)) {
                    // Si existe un manejador especializado para este producto, usarlo
                    const customHandler = STORE_CUSTOM_HANDLERS[prod.id];
                    const productAnswer = customHandler
                        ? customHandler(clean)
                        : buildDynamicProductAnswer(prod, clean);

                    return productAnswer + getTasaFooter() + '\n' + getActionFooter();
                }
            }
        }

        return null;
    }
}

export const catalogSearchService = new CatalogSearchService();
