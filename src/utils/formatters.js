/**
 * Utilidades de formateo para el Asistente Pitín
 */

/**
 * Formatea una fecha en formato legible para Venezuela
 * @param {Date|string} date
 * @returns {string} Ejemplo: "08/09/2026, 4:30 PM"
 */
export function formatVenezuelaDate(date = new Date()) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('es-VE', {
        timeZone: 'America/Caracas',
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

/**
 * Limpia y normaliza texto eliminando espacios sobrantes
 * @param {string} str
 * @returns {string}
 */
export function cleanText(str = '') {
    return String(str || '').trim();
}

/**
 * Limpia números de teléfono quitando caracteres especiales
 * @param {string} phone
 * @returns {string}
 */
export function sanitizePhone(phone = '') {
    return String(phone || '').replace(/[^0-9]/g, '');
}

/**
 * Compara si dos números de teléfono corresponden a la misma línea
 * considerando formatos locales (0414...) e internacionales (58414...)
 * @param {string} p1
 * @param {string} p2
 * @returns {boolean}
 */
export function arePhoneNumbersEqual(p1 = '', p2 = '') {
    const clean1 = sanitizePhone(p1).replace(/^0+/, '');
    const clean2 = sanitizePhone(p2).replace(/^0+/, '');
    if (!clean1 || !clean2) return false;
    return clean1 === clean2 || clean1.endsWith(clean2) || clean2.endsWith(clean1);
}

/**
 * Extrae el ID del mensaje citado (quoted message) en WhatsApp Baileys
 * @param {Object} ctx
 * @returns {string|null}
 */
export function getQuotedMessageId(ctx) {
    if (!ctx) return null;
    return (
        ctx.message?.extendedTextMessage?.contextInfo?.stanzaId ||
        ctx.message?.imageMessage?.contextInfo?.stanzaId ||
        ctx.message?.documentMessage?.contextInfo?.stanzaId ||
        ctx.contextInfo?.stanzaId ||
        null
    );
}
