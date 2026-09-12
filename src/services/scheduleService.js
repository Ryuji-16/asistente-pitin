/**
 * Servicio para gestión y verificación de horarios comerciales de PitaPollo - La Trinidad
 * Zona horaria: America/Caracas (UTC-4)
 */

export const STORE_SCHEDULE = {
    mondayToSaturday: {
        days: [1, 2, 3, 4, 5, 6], // Lunes (1) a Sábado (6)
        openHour: 8,
        openMinute: 0,
        closeHour: 18,
        closeMinute: 0,
        label: 'Lunes a Sábado: 8:00 AM a 6:00 PM'
    },
    sunday: {
        days: [0], // Domingo (0)
        openHour: 8,
        openMinute: 30,
        closeHour: 14,
        closeMinute: 0,
        label: 'Domingos: 8:30 AM a 2:00 PM'
    }
};

/**
 * Obtiene la fecha y hora actual en la zona horaria de Caracas, Venezuela
 * @param {Date} [date]
 * @returns {Date}
 */
export function getVenezuelaDate(date = new Date()) {
    const str = date.toLocaleString('en-US', { timeZone: 'America/Caracas' });
    return new Date(str);
}

/**
 * Determina si la tienda se encuentra actualmente abierta para atención y delivery
 * @param {Date} [date]
 * @returns {boolean}
 */
export function isStoreOpen(date = new Date()) {
    const veDate = getVenezuelaDate(date);
    const day = veDate.getDay(); // 0: Domingo, 1: Lunes, ..., 6: Sábado
    const currentMinutes = veDate.getHours() * 60 + veDate.getMinutes();

    if (day === 0) {
        // Domingo
        const openMinutes = STORE_SCHEDULE.sunday.openHour * 60 + STORE_SCHEDULE.sunday.openMinute;
        const closeMinutes = STORE_SCHEDULE.sunday.closeHour * 60 + STORE_SCHEDULE.sunday.closeMinute;
        return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    } else {
        // Lunes a Sábado
        const openMinutes = STORE_SCHEDULE.mondayToSaturday.openHour * 60 + STORE_SCHEDULE.mondayToSaturday.openMinute;
        const closeMinutes = STORE_SCHEDULE.mondayToSaturday.closeHour * 60 + STORE_SCHEDULE.mondayToSaturday.closeMinute;
        return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }
}

/**
 * Devuelve el texto legible de los horarios de la tienda
 * @returns {string}
 */
export function getStoreScheduleText() {
    return [
        '🕒 *Horario de Atención y Delivery - PitaPollo:*',
        `• ${STORE_SCHEDULE.mondayToSaturday.label}`,
        `• ${STORE_SCHEDULE.sunday.label}`
    ].join('\n');
}

/**
 * Devuelve el aviso informativo cuando el cliente escribe fuera del horario comercial
 * @param {Date} [date]
 * @returns {string|null}
 */
export function getOffHoursNotice(date = new Date()) {
    if (isStoreOpen(date)) return null;

    return [
        '🌙 *¡Hola! En este momento nuestra tienda y delivery se encuentran cerrados.*',
        '',
        getStoreScheduleText(),
        '',
        '✨ *¡Pero no te preocupes!* Puedes consultar nuestro catálogo, ver precios o dejarnos tu pedido anotado por aquí y lo procesaremos a primera hora al abrir la tienda.'
    ].join('\n');
}
