import { addKeyword } from '@builderbot/bot';
import { storeService } from '../services/storeService.js';
import { formatVenezuelaDate } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';

export const flowAdmin = addKeyword([
    '#precios', '#actualizar', '#ofertas', '#tasa', '#ver', '#estado', '#ayuda',
    '#grupo', '#grupos', '#pausar', '#activar',
    '#pedidos', '#despacho', '#actualizaciones',
    'grupo pedidos', 'grupo actualizaciones', 'grupo despacho', 'grupo ordenes'
])
    .addAction(async (ctx, { flowDynamic, endFlow }) => {
        // Validación estricta de autorización
        if (!storeService.isAdmin(ctx)) {
            logger.warn(`Intento no autorizado de comando admin (${ctx.body}) desde: ${ctx.from}`);
            return endFlow();
        }

        const text = (ctx.body || '').trim();
        const lower = text.toLowerCase();
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
                '• `#pausar` -> Pausa las respuestas automáticas a los clientes.',
                '• `#activar` -> Reactiva las respuestas automáticas.',
                '• `#tasa [monto]` -> Actualiza la tasa del día (ej: `#tasa 65.50`).',
                '• `#precios [texto]` -> Actualiza la lista de precios y ofertas.',
                '• `#ver` o `#estado` -> Muestra el estado y catálogo actual.',
                '• `#grupo pedidos` -> Vincula el grupo para recibir pedidos y tickets.',
                '• `#grupo actualizaciones` -> Vincula el grupo para tasa y precios.',
                '• `#grupo` -> Vincula el grupo para ambas funciones.',
                '• `#grupos` -> Muestra la lista de grupos vinculados.',
                '═════════════════════════════════'
            ].join('\n'));
        }

        // 1.1 Limpiar o desvincular grupos
        if (text.toLowerCase() === '#grupos limpiar' || text.toLowerCase() === '#grupo reiniciar' || text.toLowerCase() === '#desvincular') {
            if (!storeService.isSuperAdmin(ctx)) {
                return await flowDynamic('⚠️ Solo el administrador principal puede desvincular los grupos.');
            }
            storeService.clearGroups();
            return await flowDynamic([
                '🔄 *GRUPOS DESVINCULADOS CON ÉXITO* 🍗',
                '═════════════════════════════════',
                'Se han desvinculado todos los grupos del sistema.',
                '',
                '👉 Para volver a vincularlos, escribe dentro de cada grupo:',
                '• `#grupo pedidos` (en el grupo de despacho)',
                '• `#grupo actualizaciones` (en el grupo administrativo)'
            ].join('\n'));
        }

        // 2. Ver grupos vinculados
        if (text.toLowerCase() === '#grupos') {
            const orders = storeService.getOrdersGroups();
            const updates = storeService.getUpdatesGroups();
            const generals = storeService.getStore().adminGroups || [];

            return await flowDynamic([
                '👥 *ESTADO DE GRUPOS EN ASISTENTE PITÍN*',
                '═════════════════════════════════',
                `📦 *Grupo de Pedidos y Despacho:* ${orders.length ? `✅ Vinculado (${orders.join(', ')})` : '❌ Pendiente (escribe `#grupo pedidos` en el grupo)'}`,
                `📊 *Grupo de Actualizaciones:* ${updates.length ? `✅ Vinculado (${updates.join(', ')})` : '❌ Pendiente (escribe `#grupo actualizaciones` en el grupo)'}`,
                `🍗 *Grupos Generales (Ambos):* ${generals.length ? `✅ Vinculado (${generals.join(', ')})` : 'Ninguno'}`,
                '═════════════════════════════════',
                '💡 *Para vincular un grupo nuevo:*',
                'Escribe dentro del grupo correspondiente:',
                '• `#grupo pedidos` (para despacho de órdenes y tickets)',
                '• `#grupo actualizaciones` (para tasas y promociones)',
                '• `#grupo` (para todo en un solo grupo)',
                '',
                '🔄 *Para reiniciar:* Escribe `#grupos limpiar`'
            ].join('\n'));
        }

        // 3. Registrar grupo
        if (lower.startsWith('#grupo') || lower.startsWith('grupo ') || lower === '#pedidos' || lower === '#actualizaciones' || lower === '#despacho') {
            if (!storeService.isSuperAdmin(ctx)) {
                return await flowDynamic('⚠️ Solo el número del administrador principal puede autorizar nuevos grupos con `#grupo`.');
            }

            const groupId = ctx.key?.remoteJid || ctx.from;
            if (!groupId.endsWith('@g.us')) {
                return await flowDynamic('⚠️ Este comando debe enviarse **dentro del grupo de WhatsApp** que deseas vincular.');
            }

            let subCmd = lower
                .replace('#grupo', '')
                .replace('grupo', '')
                .replace('#', '')
                .trim();

            if (subCmd === 'pedidos' || subCmd === 'despacho' || subCmd === 'ordenes') {
                storeService.registerOrdersGroup(groupId);
                return await flowDynamic([
                    '✅ *¡GRUPO DE PEDIDOS Y DESPACHO VINCULADO!* 🍗📦',
                    '═════════════════════════════════',
                    `🆔 *ID del Grupo:* \`${groupId}\``,
                    '',
                    'A partir de ahora, todos los nuevos pedidos de los clientes llegarán a este grupo.',
                    '',
                    '👉 *Flujo para cajeros y despachadores:*',
                    '1. Responde al mensaje del pedido con la *FOTO del ticket facturado*.',
                    '2. Responde `#ok` para confirmar el pago.',
                    '3. Responde `#camino` cuando el delivery salga con el pedido.',
                    '4. Responde `#listo` cuando esté empacado para retiro.'
                ].join('\n'));
            }

            if (subCmd === 'actualizaciones' || subCmd === 'precios' || subCmd === 'tasa' || subCmd === 'admin') {
                storeService.registerUpdatesGroup(groupId);
                return await flowDynamic([
                    '✅ *¡GRUPO DE ACTUALIZACIONES VINCULADO!* 📊✨',
                    '═════════════════════════════════',
                    `🆔 *ID del Grupo:* \`${groupId}\``,
                    '',
                    'Este grupo quedó autorizado para administración y actualizaciones de PitaPollo.',
                    '',
                    '👉 *Comandos disponibles aquí:*',
                    '• `#tasa <monto>` -> Actualiza la tasa BCV oficial (ej: `#tasa 65.50`).',
                    '• `#precios <texto>` -> Actualiza el texto de promociones.',
                    '• `#pausar` / `#activar` -> Pausa o reactiva el bot para clientes.',
                    '• `#ver` -> Muestra el estado actual.'
                ].join('\n'));
            }

            // Registro general (#grupo)
            storeService.registerAdminGroup(groupId);
            return await flowDynamic([
                '✅ *¡GRUPO OFICIAL VINCULADO!* 🍗📱',
                '═════════════════════════════════',
                `🆔 *ID del Grupo:* \`${groupId}\``,
                '',
                'Este grupo quedó registrado tanto para recibir *Pedidos y Despacho* como para *Actualizaciones* (#tasa, #precios, #pausar, etc.).'
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
