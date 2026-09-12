/**
 * Servicio para interpretar pedidos escritos en texto libre o desordenado por clientes.
 * Limpia saludos, muletillas y conectores, y organiza cada producto y cantidad en una lista
 * sencilla y directa (un ítem debajo del otro) para facilitar la lectura al personal de despacho.
 */

function cleanLine(s) {
    return s
        .replace(/^[-*•]\s*|^\d+[\).]\s*/, '')
        .replace(/\s+(?:y|e|además|ademas|también|tambien|por favor|porfa|gracias)$/i, '')
        .trim();
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

    // Limpiar iterativamente saludos, muletillas y frases introductorias al inicio
    let changed = true;
    while (changed) {
        changed = false;
        const before = text;
        text = text.replace(
            /^(?:hola|buenas|buen dia|buenos dias|buenas tardes|buenas noches|saludos|como estan|que tal|amigo|amiga|pitin|asistente|por favor|porfa|mira|epale|pana|quisiera|quiero esto|quiero|deseo|necesito|mandame|anotame|apartame|voy a pedir|esto|lo siguiente|para pedir|pedir|ordenar)[:\s,.-]*/i,
            ''
        ).trim();
        if (text !== before) changed = true;
    }

    if (!text) {
        return [];
    }

    // Si el cliente ya lo escribió separado por saltos de línea
    const existingLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (existingLines.length > 1) {
        const cleanedLines = existingLines.map(cleanLine).filter(Boolean);
        if (cleanedLines.length > 0) return cleanedLines;
    }

    // Split por puntuación (comas, punto y coma, " y ", " e ", "+", "más")
    const parts = text.split(/(?:,|\;|\sy\s|\se\s|\s\+\s|\sm[aá]s\s)(?!\d)/i);
    const items = [];

    // Separar si hay múltiples productos concatenados sin puntuación (ej: "...muslo 1 pedazo de queso...")
    const itemStartRegex = /(?<!\b(?:de|del|por|en|cada))\s+(?=(?:\d+(?:[.,]\d+)?\s*(?:kg|kilos?|g|gr|gramos?|bolsas?|paquetes?|bandejas?|piezas?|pedazos?|unidades?|pack|tenders?)|(?:una?|dos|tres|cuatro|cinco|medio|1\/2)\s+(?:bolsa|paquete|bandeja|pedazo|kilo|pieza|oferta|queso)))/gi;

    for (let part of parts) {
        part = part.trim();
        if (!part) continue;
        const subparts = part.split(itemStartRegex);
        for (let sub of subparts) {
            const cleaned = cleanLine(sub);
            if (cleaned && cleaned.length > 1) {
                items.push(cleaned);
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
