/**
 * Servicio para interpretar pedidos escritos en texto libre o desordenado por clientes.
 * Limpia saludos, muletillas y conectores, y organiza cada producto y cantidad en una lista
 * sencilla y directa (un ítem debajo del otro) para facilitar la lectura al personal de despacho.
 */

import { storeConfigLoader } from '../config/storeConfigLoader.js';

const configuredAssistant = (storeConfigLoader.getBusiness().assistantName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const FILLER_WORDS = new Set([
    'hola', 'buenas', 'buen', 'dia', 'dias', 'tardes', 'noches', 'saludos',
    'que', 'tal', 'como', 'estas', 'esta', 'estan', 'epale', 'pana', 'amigo',
    'amiga', 'asistente', 'por', 'favor', 'porfa', 'gracias', 'muchas',
    'muchos', 'mira', 'esto', 'vale', 'ok', 'quiero', 'quisiera', 'necesito',
    'dame', 'mandame', 'anotame', 'apartame', 'traeme', 'enviame', 'voy', 'a',
    'pedir', 'querer', 'para', 'deseo', 'lo', 'siguiente',
    'ah', 'aja', 'ajá', 'y', 'e', 'tambien', 'también', 'ademas', 'además',
    'agrega', 'agregame', 'agrégame', 'sumale', 'súmale', 'pon', 'ponle'
]);

if (configuredAssistant) {
    FILLER_WORDS.add(configuredAssistant);
}
// Mantener alias por defecto
FILLER_WORDS.add('pitin');

function getPrefixRegex() {
    const configuredAssistant = (storeConfigLoader.getBusiness().assistantName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const assistantPattern = configuredAssistant ? `${configuredAssistant}|` : '';
    return new RegExp(`^(?:hola|buenas tardes|buenas noches|buenos d[ií]as|buen d[ií]a|buenas|saludos|c[oó]mo est[aá]s?|c[oó]mo est[aá]n|qu[eé] tal|amig[oa]|${assistantPattern}pit[ií]n|asistente|por favor|porfa|mira|[eé]pale|pana|quisiera pedir|quisiera comprar|quisiera|quiero comprar|quiero pedir|quiero esto|quiero|voy a querer|voy a pedir|deseo|necesito|m[aá]ndame|an[oó]tame|ap[aá]rtame|tr[aá]eme|env[ií]ame|dame|d[aá]nos|v[eé]ndeme|esto|lo siguiente|para pedir|pedir|ordenar|anota|anote|ah|aj[aá]|tambi[eé]n|adem[aá]s|agrega|agr[eé]game|s[uú]male|ponle|pon|y|e)[:\\s,.-]*`, 'i');
}

/**
 * Limpia prefijos y sufijos de una línea de producto
 * @param {string} s
 * @returns {string}
 */
export function cleanItem(s) {
    if (!s || typeof s !== 'string') return '';
    let res = s
        .replace(/^[-*•]\s*|^\d+\)\s*|^\d+\.(?!\d)\s*/, '')
        .trim();

    const prefixRegex = getPrefixRegex();
    let changed = true;
    while (changed) {
        changed = false;
        const before = res;
        res = res.replace(prefixRegex, '').trim();
        if (res !== before) changed = true;
    }

    // Sufijos de cortesía o conectores al final
    const suffixRegex = /[\s,.-]+(?:y|e|además|ademas|también|tambien|por favor|porfa|gracias|muchas gracias)$/i;
    changed = true;
    while (changed) {
        changed = false;
        const before = res;
        res = res.replace(suffixRegex, '').trim();
        if (res !== before) changed = true;
    }

    return res;
}

/**
 * Determina si una cadena es un producto real o solo una frase de relleno / saludo
 * @param {string} item
 * @returns {boolean}
 */
export function isValidProductItem(item) {
    if (!item || item.length < 3) return false;
    const clean = item.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿?¡!.,:;()_/\-]/g, ' ').trim();
    if (!clean || clean.length < 3) return false;

    const words = clean.split(/\s+/).filter(Boolean);
    const nonFiller = words.filter(w => !FILLER_WORDS.has(w));
    return nonFiller.length > 0;
}

/**
 * Divide un texto de pedido en líneas o ítems individuales
 * @param {string} rawText
 * @returns {string[]}
 */
export function parseOrderItems(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        return [];
    }

    let text = cleanItem(rawText);
    if (!text) {
        return [];
    }

    // 1. Si el cliente ya lo escribió separado por saltos de línea
    const existingLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (existingLines.length > 1) {
        const cleanedLines = existingLines.map(cleanItem).filter(isValidProductItem);
        if (cleanedLines.length > 0) return cleanedLines;
    }

    // 2. Split por puntuación (comas, punto y coma, " y ", " e ", "+", "más"), excepto si es fracción ("y 1/2", "y medio")
    const parts = text.split(/(?:,|\;|\s\+\s|\sm[aá]s\s|\sy\s(?!(?:1\/2|1\/4|medio)\b)|\se\s)/i);
    const items = [];

    // Separar si hay múltiples productos concatenados sin puntuación (ej: "...muslo 1 pedazo de queso...")
    const itemStartRegex = /(?<!\b(?:de|del|por|en|cada))\s+(?=(?:\d+(?:[.,]\d+)?\s*(?:kg|kilos?|g|gr|gramos?|bolsas?|paquetes?|bandejas?|piezas?|pedazos?|unidades?|pack|packs|tenders?|cart[oó]n|cartones|combos?|ofertas?|pollos?))|(?:un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|medio|1\/2|1\/4)\s+(?:bolsa|paquete|bandeja|pedazo|kilo|pieza|oferta|queso|pollo|cart[oó]n|combo)s?)/gi;

    for (let part of parts) {
        part = part.trim();
        if (!part) continue;
        const subparts = part.split(itemStartRegex);
        for (let sub of subparts) {
            const cleaned = cleanItem(sub);
            if (isValidProductItem(cleaned)) {
                items.push(cleaned);
            }
        }
    }

    return items.length > 0 ? items : (isValidProductItem(text) ? [text] : []);
}

/**
 * Formatea los ítems en una lista simple y eficaz: un ítem debajo del otro
 * @param {string} rawText
 * @returns {string}
 */
export function formatOrderItemsSimple(rawText) {
    const items = parseOrderItems(rawText);
    if (!items || items.length === 0) {
        return (rawText || 'No especificado').trim();
    }

    // Un ítem debajo del otro con viñeta limpia
    return items.map(item => `• ${item}`).join('\n');
}

/**
 * Detecta si el texto es una pregunta explícita sobre precios o costos
 * @param {string} text
 * @returns {boolean}
 */
export function hasPriceQuestion(text) {
    return /\b(?:precio|precios|cuanto|cuánto|a como|a cómo|a cuanto|a cuánto|costo|costos|cotizar|cotizacion|cotización|tasa|valor)\b/i.test(text || '');
}

/**
 * Detecta si un mensaje tiene intención de compra/pedido directo
 * @param {string} text
 * @returns {boolean}
 */
export function hasOrderIntent(text) {
    if (!text || typeof text !== 'string') return false;
    if (hasPriceQuestion(text)) return false;
    if (/\b(?:quiero|quisiera|mandame|mándame|anotame|anótame|apartame|apártame|traeme|tráeme|enviame|envíame|dame|danos|dános|vendeme|véndeme|comprar|pedir|pedido|ordenar|voy a querer|voy a pedir|necesito)\b/i.test(text)) {
        return true;
    }
    return hasExplicitItems(text);
}

/**
 * Detecta si el mensaje ya incluye productos y/o cantidades explícitas para un pedido
 * @param {string} text
 * @returns {boolean}
 */
export function hasExplicitItems(text) {
    if (!text || typeof text !== 'string') return false;
    if (hasPriceQuestion(text)) return false;

    // 1. Verbos de orden directa o adición
    const hasVerb = /\b(?:quiero|quisiera|mandame|mándame|anotame|anótame|apartame|apártame|traeme|tráeme|enviame|envíame|dame|danos|dános|vendeme|véndeme|comprar|pedir|pedido|ordenar|voy a querer|voy a pedir|necesito|agrega|agregame|agrégame|sumale|súmale|pon|ponle|adicional)\b/i.test(text);

    // 2. Números o cantidades (dígitos o palabras)
    const hasNumber = /\b(?:\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|medio|kilo\s+y\s+medio|1\/2|1\/4)\b/i.test(text);

    // 3. Unidades y cantidades explícitas (ej: "5 kilos", "2.5 de", "kilo y medio", "una bolsa de", "un cartón de")
    const hasUnits = /\b(?:\d+(?:[.,]\d+)?\s*(?:kg|kilos?|k|g|gr|gramos?|bolsas?|paquetes?|bandejas?|piezas?|pedazos?|unidades?|pack|packs|tenders?|cart[oó]n|cartones|combos?|ofertas?|pollos?|quesos?|milanesas?|huevos?)|(?:un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|medio|kilo\s+y\s+medio|1\/2|1\/4)\s+(?:bolsa|paquete|bandeja|pedazo|kilo|pieza|oferta|queso|pollo|cart[oó]n|combo|lomo|carne|pechuga|muslo|ala)s?)\b/i.test(text);

    // 4. Productos del catálogo activo (o vocabulario base de respaldo)
    const catalogKws = storeConfigLoader.getCatalogKeywords();
    let hasProducts = false;
    if (catalogKws.length > 0) {
        const lowerText = text.toLowerCase();
        for (const kw of catalogKws) {
            if (kw && kw.length >= 3 && lowerText.includes(kw)) {
                hasProducts = true;
                break;
            }
        }
    }
    if (!hasProducts) {
        hasProducts = /\b(?:pechugas?|muslos?|alas?|alitas?|milanesas?|cuadril|molida|solomo|lomito|lomo|punta|quesos?|salchichas?|chuletas?|costillas?|pollos?|carnes?|huevos?|h[ií]gados?|chistorras?|chorizos?|morcillas?|pernil(?:es)?|tenders?|nuggets?|teque[ñn]os?|combos?|ofertas?|cerdo)\b/i.test(text);
    }

    // Caso A: Si tiene verbo explícito de pedido y menciona productos o unidades
    if (hasVerb && (hasProducts || hasUnits)) {
        return true;
    }

    // Caso B: Si menciona números/cantidades y productos (ej: "1 queso duro", "2 kilos de pollo molido")
    if ((hasNumber || hasUnits) && hasProducts) {
        return true;
    }

    // Caso C: Si escribió múltiples productos separados por comas o líneas
    const parsed = parseOrderItems(text);
    if (parsed.length >= 2 && hasProducts) {
        return true;
    }

    return false;
}

/**
 * Agrega o combina nuevos productos a una lista existente de comanda
 * @param {string} existingFormatted Texto formateado previo o no formateado
 * @param {string} newRaw Nuevo texto con productos enviado por el cliente
 * @returns {string} Lista combinada en viñetas limpias
 */
export function appendOrderItems(existingFormatted = '', newRaw = '') {
    const existingLines = (existingFormatted || '')
        .split(/\r?\n/)
        .map(l => l.replace(/^[-*•]\s*/, '').trim())
        .filter(l => l && l !== 'No especificado');

    const newParsed = parseOrderItems(newRaw);
    const toAdd = newParsed.length > 0
        ? newParsed
        : (isValidProductItem(newRaw) ? [cleanItem(newRaw)] : []);

    const combined = [...existingLines, ...toAdd];
    if (combined.length === 0) {
        return (newRaw || existingFormatted || 'No especificado').trim();
    }

    return combined.map(item => `• ${item}`).join('\n');
}
