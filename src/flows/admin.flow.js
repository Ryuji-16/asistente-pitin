import { addKeyword } from '@builderbot/bot';
import { storeService } from '../services/storeService.js';
import { formatVenezuelaDate } from '../utils/formatters.js';

export const flowAdmin = addKeyword(['#precios', '#actualizar', '#ofertas', '#tasa', '#ver', '#estado', '#ayuda', '#grupo', '#pausar', '#activar'])
    .addAction(async (ctx, { flowDynamic }) => {
        const text = (ctx.body || '').trim();
        const sender = ctx.pushName || ctx.from;

        // 0. Comandos de pausa y activación
        if (text.toLowerCase() === '#pausar') {
            storeService.setPaused(true, sender);
            return await flowDynamic([
                '⏸️ *ASISTENTE PITÍN EN PAUSA*',
                '═════════════════════════════════',
                'El bot ha sido pausado. Ya no responderá automáticamente a los clientes.',
                '',
                'Para volver a activarlo, escribe: `#activar`.'
            ].join('\n'));
        }

        if (text.toLowerCase() === '#activar') {
            storeService.setPaused(false, sender);
            return await flowDynamic([
                '🟢 *ASISTENTE PITÍN ACTIVADO*',
                '═════════════════════════════════',
                'El bot está nuevamente en línea y respondiendo normalmente a los clientes.'
            ].join('\n'));
        }

        // 1. Comando de ayuda
        if (text.toLowerCase() === '#ayuda') {
            return await flowDynamic([
                '🛠️ *COMANDOS DE ADMINISTRACIÓN PITAPOLLO*',
                '═════════════════════════════════',
                '• `#pausar` -> Pausa las respuestas automáticas del bot a los clientes.',
                '• `#activar` -> Reactiva las respuestas automáticas.',
                '• `#precios [texto]` -> Actualiza la lista de precios y ofertas.',
                '• `#tasa [monto]` -> Actualiza la tasa del día en bolívares.',
                '• `#ver` o `#estado` -> Muestra la lista y estado actual del bot.',
                '• `#grupo` -> Registra el grupo actual para actualizaciones.',
                '═════════════════════════════════'
            ].join('\n'));
        }

        // 2. Registrar grupo de administración
        if (text.toLowerCase() === '#grupo') {
            const groupId = ctx.key?.remoteJid || ctx.from;
            storeService.registerAdminGroup(groupId);
            return await flowDynamic([
                '✅ *¡Grupo registrado como canal de actualizaciones!*',
                'A partir de ahora puedes enviar o actualizar precios desde aquí.'
            ].join('\n'));
        }

        // 3. Ver lista y estado actual
        if (text.toLowerCase() === '#ver' || text.toLowerCase() === '#estado') {
            const current = storeService.getFormattedCatalog();
            return await flowDynamic([
                '👀 *VISTA PREVIA DEL CATÁLOGO ACTUAL:*',
                '═════════════════════════════════',
                current
            ].join('\n'));
        }

        // 4. Actualizar tasa BCV
        if (text.toLowerCase().startsWith('#tasa')) {
            const rate = text.replace(/^#tasa\s*/i, '').trim();
            if (!rate) {
                return await flowDynamic('⚠️ Por favor indica el monto de la tasa. Ejemplo: `#tasa 65.50`');
            }
            storeService.updateTasa(rate, sender);
            return await flowDynamic(`✅ *Tasa oficial actualizada a ${rate} Bs/$* exitosamente.`);
        }

        // 5. Actualizar lista de precios y ofertas
        if (
            text.toLowerCase().startsWith('#precios') ||
            text.toLowerCase().startsWith('#actualizar') ||
            text.toLowerCase().startsWith('#ofertas')
        ) {
            const cleanContent = text.replace(/^#(precios|actualizar|ofertas)\s*/i, '').trim();
            if (!cleanContent) {
                return await flowDynamic('⚠️ Por favor incluye el texto o la lista de precios después de la etiqueta `#precios`.');
            }

            storeService.updateCatalog(cleanContent, sender);
            return await flowDynamic([
                '✅ *¡LISTA DE PRECIOS Y OFERTAS ACTUALIZADA!*',
                '',
                `📅 *Fecha de actualización:* ${formatVenezuelaDate()}`,
                `👤 *Actualizado por:* ${sender}`,
                '',
                '✨ *A partir de este momento, todos los clientes verán esta información al consultar las ofertas.*'
            ].join('\n'));
        }
    });
