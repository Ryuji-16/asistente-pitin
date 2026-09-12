/**
 * Servicio para interpretar pedidos escritos en texto libre o desordenado por clientes.
 * Limpia saludos, muletillas y conectores, y organiza cada producto y cantidad en una lista
 * sencilla y directa (un ítem debajo del otro) para facilitar la lectura al personal de despacho.
 */

const FILLER_WORDS = new Set([
    'hola', 'buenas', 'buen', 'dia', 'dias', 'tardes', 'noches', 'saludos',
    'que', 'tal', 'como', 'estas', 'esta', 'estan', 'epale', 'pana', 'amigo',
    'amiga', 'pitin', 'asistente', 'por', 'favor', 'porfa', 'gracias', 'muchas',
    'muchos', 'mira', 'esto', 'vale', 'ok', 'quiero', 'quisiera', 'necesito',
    'dame', 'mandame', 'anotame', 'apartame', 'traeme', 'enviame', 'voy', 'a',
    'pedir', 'querer', 'para', 'deseo', 'lo', 'siguiente'
]);

/**
 * Limpia prefijos y sufijos de una línea de producto
 * @param {string} s
 * @returns {string}
 */
export function cleanItem(s) {
    if (!s || typeof s !== 'string') return '';
    let res = s
        .replace(/^[-*•]\s*|^\d+[\).]\s*/, '')
        .trim();

    // Prefijos que se deben eliminar iterativamente al inicio
    const prefixRegex = /^(?:hola|buenas tardes|buenas noches|buenos d[ií]as|buen d[ií]a|buenas|saludos|c[oó]mo est[aá]s?|c[oó]mo est[aá]n|qu[eé] tal|amig[oa]|pit[ií]n|asistente|por favor|porfa|mira|[eé]pale|pana|quisiera pedir|quisiera comprar|quisiera|quiero comprar|quiero pedir|quiero esto|quiero|voy a querer|voy a pedir|deseo|necesito|m[aá]ndame|an[oó]tame|ap[aá]rtame|tr[aá]eme|env[ií]ame|dame|d[aá]nos|v[eé]ndeme|esto|lo siguiente|para pedir|pedir|ordenar|anota|anote)[:\s,.-]*/i;

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
    if (!item || item.length < 2) return false;
    const clean = item.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿?¡!.,:;()_/\-]/g, ' ').trim();
    if (!clean) return false;

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
    return /\b(?:quiero|quisiera|mandame|mándame|anotame|anótame|apartame|apártame|traeme|tráeme|enviame|envíame|dame|danos|dános|vendeme|véndeme|comprar|pedir|pedido|ordenar|voy a querer|voy a pedir|necesito)\b/i.test(text);
}

/**
 * Detecta si el mensaje ya incluye productos y/o cantidades explícitas para un pedido
 * @param {string} text
 * @returns {boolean}
 */
export function hasExplicitItems(text) {
    if (!hasOrderIntent(text)) return false;
    const hasUnits = /\b(?:\d+(?:[.,]\d+)?\s*(?:kg|kilos?|g|gr|gramos?|bolsas?|paquetes?|bandejas?|piezas?|pedazos?|unidades?|pack|packs|tenders?|cart[oó]n|cartones|combos?|ofertas?|pollos?)|(?:un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|medio|1\/2|1\/4)\s+(?:bolsa|paquete|bandeja|pedazo|kilo|pieza|oferta|queso|pollo|cart[oó]n|combo)s?)\b/i.test(text);
    const hasProducts = /\b(?:pechugas?|muslos?|alas?|alitas?|milanesas?|cuadril|molida|solomo|lomito|punta|quesos?|salchichas?|chuletas?|costillas?|pollos?|carnes?|huevos?|chistorras?|chorizos?|morcillas?|pernil(?:es)?|tenders?|nuggets?|teque[ñn]os?|combos?|ofertas?)\b/i.test(text);
    return hasUnits || hasProducts;
}
