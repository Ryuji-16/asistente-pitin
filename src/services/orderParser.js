/**
 * Servicio para interpretar pedidos escritos en texto libre o desordenado por clientes.
 * Limpia saludos, muletillas y conectores, y organiza cada producto y cantidad en una lista
 * sencilla y directa (un ítem debajo del otro) para facilitar la lectura al personal de despacho.
 */

function cleanLine(s) {
    let res = s
        .replace(/^[-*•]\s*|^\d+[\).]\s*/, '')
        .replace(/\s+(?:y|e|además|ademas|también|tambien|por favor|porfa|gracias)$/i, '')
        .trim();
    res = res.replace(/^(?:m[aá]ndame|an[oó]tame|ap[aá]rtame|tr[aá]eme|env[ií]ame|dame|d[aá]nos|v[eé]ndeme|quiero|quisiera|necesito|voy a querer|voy a pedir)[:\s,.-]*/i, '').trim();
    return res;
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

    let text = rawText.trim();

    const introRegex = /^(?:buenas tardes|buenas noches|buenos d[ií]as|buen d[ií]a|buenas|hola|saludos|c[oó]mo est[aá]n|qu[eé] tal|amig[oa]|pit[ií]n|asistente|por favor|porfa|mira|[eé]pale|pana|quisiera pedir|quisiera comprar|quisiera|quiero comprar|quiero pedir|quiero esto|quiero|voy a querer|voy a pedir|deseo|necesito|m[aá]ndame|an[oó]tame|ap[aá]rtame|tr[aá]eme|env[ií]ame|dame|d[aá]nos|v[eé]ndeme|esto|lo siguiente|para pedir|pedir|ordenar)[:\s,.-]*/i;

    // Limpiar iterativamente saludos, muletillas y frases introductorias al inicio
    let changed = true;
    while (changed) {
        changed = false;
        const before = text;
        text = text.replace(introRegex, '').trim();
        if (text !== before) changed = true;
    }

    if (!text) {
        return [];
    }

    // Si el cliente ya lo escribió separado por saltos de línea
    const existingLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (existingLines.length > 1) {
        const cleanedLines = existingLines.map(cleanLine).filter(Boolean).filter(l => !/^(?:hola|buenas|noches|tardes|dias|buen dia|saludos|por favor|porfa|gracias|amigo|pana|mira|esto)$/i.test(l));
        if (cleanedLines.length > 0) return cleanedLines;
    }

    // Split por puntuación (comas, punto y coma, " y ", " e ", "+", "más"), excepto si es fracción ("y 1/2", "y medio")
    const parts = text.split(/(?:,|\;|\s\+\s|\sm[aá]s\s|\sy\s(?!(?:1\/2|1\/4|medio)\b)|\se\s)/i);
    const items = [];

    // Separar si hay múltiples productos concatenados sin puntuación (ej: "...muslo 1 pedazo de queso...")
    const itemStartRegex = /(?<!\b(?:de|del|por|en|cada))\s+(?=(?:\d+(?:[.,]\d+)?\s*(?:kg|kilos?|g|gr|gramos?|bolsas?|paquetes?|bandejas?|piezas?|pedazos?|unidades?|pack|packs|tenders?|cart[oó]n|cartones|combos?|ofertas?|pollos?))|(?:un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|medio|1\/2|1\/4)\s+(?:bolsa|paquete|bandeja|pedazo|kilo|pieza|oferta|queso|pollo|cart[oó]n|combo)s?)/gi;

    for (let part of parts) {
        part = part.trim();
        if (!part) continue;
        const subparts = part.split(itemStartRegex);
        for (let sub of subparts) {
            const cleaned = cleanLine(sub);
            if (cleaned && cleaned.length > 1) {
                // Descartar si solo es un saludo o muletilla residual
                if (!/^(?:hola|buenas|noches|tardes|dias|buen dia|saludos|por favor|porfa|gracias|amigo|pana|mira|esto)$/i.test(cleaned)) {
                    items.push(cleaned);
                }
            }
        }
    }

    return items.length > 0 ? items : [text];
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

    // Un ítem debajo del otro con guión simple y directo sin recarga visual
    return items.map(item => `- ${item}`).join('\n');
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
