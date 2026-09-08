/**
 * Utilidad de registro centralizado con formato y marcas de tiempo
 */
export const logger = {
    info: (...args) => console.log(`[INFO  ${new Date().toLocaleTimeString('es-VE')}]`, ...args),
    success: (...args) => console.log(`[OK    ${new Date().toLocaleTimeString('es-VE')}]`, ...args),
    warn: (...args) => console.warn(`[WARN  ${new Date().toLocaleTimeString('es-VE')}]`, ...args),
    error: (...args) => console.error(`[ERROR ${new Date().toLocaleTimeString('es-VE')}]`, ...args),
};
