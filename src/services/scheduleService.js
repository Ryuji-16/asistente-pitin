/**
 * Servicio para gestión y verificación de horarios comerciales configurables
 */
import { storeConfigLoader } from '../config/storeConfigLoader.js';

/**
 * Obtiene la fecha y hora actual en la zona horaria de la tienda
 * @param {Date} [date]
 * @returns {Date}
 */
export function getStoreDate(date = new Date()) {
    const timezone = storeConfigLoader.getSchedule().timezone || 'America/Caracas';
    const str = date.toLocaleString('en-US', { timeZone: timezone });
    return new Date(str);
}

// Alias para compatibilidad hacia atrás
export const getVenezuelaDate = getStoreDate;

/**
 * Determina si la tienda se encuentra actualmente abierta para atención y delivery
 * @param {Date} [date]
 * @returns {boolean}
 */
export function isStoreOpen(date = new Date()) {
    const storeDate = getStoreDate(date);
    const day = storeDate.getDay(); // 0: Domingo, 1: Lunes, ..., 6: Sábado
    const currentMinutes = storeDate.getHours() * 60 + storeDate.getMinutes();

    const ranges = storeConfigLoader.getSchedule().ranges || [];
    for (const range of ranges) {
        if (Array.isArray(range.days) && range.days.includes(day)) {
            const openMinutes = Number(range.openHour || 0) * 60 + Number(range.openMinute || 0);
            const closeMinutes = Number(range.closeHour || 0) * 60 + Number(range.closeMinute || 0);
            return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
        }
    }

    return true; // Si no hay restricciones definidas para el día, asumir abierto
}

/**
 * Devuelve el texto legible de los horarios de la tienda
 * @returns {string}
 */
export function getStoreScheduleText() {
    const biz = storeConfigLoader.getBusiness();
    const sched = storeConfigLoader.getSchedule();
    const lines = [
        `🕒 *Horario de Atención y Delivery - ${biz.name}:*`
    ];
    for (const r of sched.ranges || []) {
        lines.push(`• ${r.label}`);
    }
    return lines.join('\n');
}

/**
 * Devuelve el aviso informativo cuando el cliente escribe fuera del horario comercial
 * @param {Date} [date]
 * @returns {string|null}
 */
export function getOffHoursNotice(date = new Date()) {
    if (isStoreOpen(date)) {
        return null;
    }

    const sched = storeConfigLoader.getSchedule();
    return sched.offHoursNotice || null;
}
