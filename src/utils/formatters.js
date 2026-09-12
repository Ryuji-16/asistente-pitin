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
    const msg =
        ctx.message?.ephemeralMessage?.message ||
        ctx.message?.viewOnceMessage?.message ||
        ctx.message?.viewOnceMessageV2?.message ||
        ctx.message;

    return (
        msg?.extendedTextMessage?.contextInfo?.stanzaId ||
        msg?.imageMessage?.contextInfo?.stanzaId ||
        msg?.documentMessage?.contextInfo?.stanzaId ||
        msg?.videoMessage?.contextInfo?.stanzaId ||
        ctx.contextInfo?.stanzaId ||
        ctx.quoted?.id ||
        null
    );
}

/**
 * Extrae el texto del mensaje citado (quoted message) en WhatsApp Baileys
 * @param {Object} ctx
 * @returns {string}
 */
export function getQuotedText(ctx) {
    if (!ctx) return '';
    const msg =
        ctx.message?.ephemeralMessage?.message ||
        ctx.message?.viewOnceMessage?.message ||
        ctx.message?.viewOnceMessageV2?.message ||
        ctx.message;

    const contextInfo =
        msg?.extendedTextMessage?.contextInfo ||
        msg?.imageMessage?.contextInfo ||
        msg?.documentMessage?.contextInfo ||
        msg?.videoMessage?.contextInfo ||
        ctx.contextInfo ||
        ctx.quoted ||
        null;

    const quotedMsg = contextInfo?.quotedMessage;
    if (!quotedMsg) return '';

    const unwrapped =
        quotedMsg?.ephemeralMessage?.message ||
        quotedMsg?.viewOnceMessage?.message ||
        quotedMsg?.viewOnceMessageV2?.message ||
        quotedMsg;

    return (
        unwrapped?.conversation ||
        unwrapped?.extendedTextMessage?.text ||
        unwrapped?.imageMessage?.caption ||
        unwrapped?.documentMessage?.caption ||
        ''
    );
}

/**
 * Sanitiza el nombre de un cliente eliminando saludos, frases de cortesía,
 * ecos del bot, formato markdown y palabras de pago (extrayendo el método si existe).
 * @param {string} raw
 * @returns {{ cleanName: string, detectedPayment: string|null }}
 */
export function sanitizeCustomerName(raw = '') {
    if (!raw || typeof raw !== 'string') return { cleanName: 'Cliente', detectedPayment: null };

    let text = raw.trim();

    // 1. Detectar si el cliente mencionó su forma de pago en la misma respuesta
    let detectedPayment = null;
    if (/\b(?:pago\s*m[oó]vil|transferencia|bs|bol[ií]vares)\b/i.test(text)) {
        detectedPayment = 'Pago Móvil';
    } else if (/\bzelle\b/i.test(text)) {
        detectedPayment = 'Zelle';
    } else if (/\b(?:efectivo|d[oó]lar(?:es)?|divisas?|\$)\b/i.test(text)) {
        detectedPayment = 'Efectivo (Divisas / Bs)';
    } else if (/\b(?:punto|tarjeta|pos|inal[aá]mbrico)\b/i.test(text)) {
        detectedPayment = 'Punto de venta inalámbrico (Delivery)';
    }

    // 2. Limpiar prefijos de saludos, citas de bot, markdown y emojis
    text = text
        .replace(/[*_~`()[\]{}]/g, ' ')
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
        .replace(/^(?:¡?mucho gusto|hola|buenas tardes|buenas noches|buen d[ií]a|buenos d[ií]as|buenas|soy|me llamo|mi nombre es|mi nombre)\b[:\s,.-]*/gi, '')
        .replace(/\b(?:pago\s*m[oó]vil|transferencia|zelle|efectivo|punto\s*(?:de\s*venta)?)\b/gi, '')
        .replace(/¡|!/g, '')
        .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!text || text.length < 2) {
        return { cleanName: 'Cliente', detectedPayment };
    }

    // Capitalizar cada palabra correctamente (ej: "Reinaldys lovera" -> "Reinaldys Lovera")
    const cleanName = text
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

    return { cleanName, detectedPayment };
}

