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
