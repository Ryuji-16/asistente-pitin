import { addKeyword } from '@builderbot/bot';
import { orderService } from '../services/orderService.js';
import { storeService } from '../services/storeService.js';
import { getQuotedMessageId, getQuotedText } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';

/**
 * Flujo para gestión de comandos en el grupo de despacho de la tienda (#ok, #camino, #listo, #cancelar)
 */
export const flowGroup = addKeyword(['#ok', '#camino', '#listo', '#cancelar'])
    .addAction(async (ctx, { flowDynamic, provider, endFlow }) => {
        const remoteJid = ctx.key?.remoteJid || ctx.from || '';

        // Solo procesar si proviene de un grupo registrado de pedidos o administracion
        const adminGroups = storeService.getOrdersGroups();
        if (!adminGroups.includes(remoteJid)) {
            return endFlow();
        }

        const quotedMsgId = getQuotedMessageId(ctx);
        const quotedText = getQuotedText(ctx);
        if (!quotedMsgId && !quotedText) {
            return await flowDynamic('⚠️ Para usar este comando, debes **responder citando** el mensaje del pedido o comprobante.');
        }

        let order = quotedMsgId ? orderService.getOrderByThreadMessage(quotedMsgId) : null;
        if (!order && quotedText) {
            const match = quotedText.match(/#(\d{4,})/);
            if (match) {
                order = orderService.getOrderById(parseInt(match[1]));
            }
        }

        if (!order) {
            return await flowDynamic('⚠️ No se encontró ningún pedido vinculado a este mensaje citado.');
        }

        const text = (ctx.body || '').trim().toLowerCase();
        const clientJid = `${order.clientPhone}@s.whatsapp.net`;

        // 1. Comando #ok: Verificar Pago
        if (text === '#ok') {
            orderService.updateOrderStatus(order.id, 'PAYMENT_VERIFIED');

            // Notificar al cliente
            const isPos = order.paymentChoice.includes('Punto de venta');
            const clientMsg = isPos
                ? `✅ *¡Pedido #${order.id} confirmado!*\nTu pedido entra de inmediato a preparación. 🍗`
                : `✅ *¡Tu pago ha sido verificado con éxito!*\nTu pedido #${order.id} entra de inmediato a preparación. 🍗`;

            try {
                await provider.sendMessage(clientJid, clientMsg, {});
            } catch (err) {
                logger.error(`Error enviando confirmación a cliente ${clientJid}:`, err.message);
            }

            // Confirmar en el grupo
            const groupMsg = [
                `✅ *Pago verificado para el Pedido #${order.id} (${order.clientName}).*`,
                '',
                order.isDelivery
                    ? '👉 Responde `#camino` a este mensaje cuando el motorizado salga con el pedido.'
                    : '👉 Responde `#listo` a este mensaje cuando el pedido esté empacado para retiro.'
            ].join('\n');

            const sent = await flowDynamic(groupMsg);
            if (ctx.key?.id) {
                orderService.registerThreadMessage(order.id, ctx.key.id);
            }
            return;
        }

        // 2. Comando #camino: Pedido en camino con Delivery
        if (text === '#camino') {
            orderService.updateOrderStatus(order.id, 'DISPATCHED');

            const clientMsg = [
                '🛵 *¡TU PEDIDO YA VA EN CAMINO!*',
                '═══════════════════════════════',
                `Hola *${order.clientName}*, nuestro motorizado ya salió con tu pedido #${order.id}.`,
                order.paymentChoice.includes('Punto de venta') ? '💳 Recuerda tener tu tarjeta a mano para el punto de venta inalámbrico.' : '',
                '',
                '¡Muchas gracias por preferir a PitaPollo! ¡Buen provecho! ✨🍗'
            ].filter(Boolean).join('\n');

            try {
                await provider.sendMessage(clientJid, clientMsg, {});
            } catch (err) {
                logger.error(`Error enviando notificación en camino a ${clientJid}:`, err.message);
            }

            return await flowDynamic(`🚀 *¡Listo!* Se notificó a *${order.clientName}* que el pedido #${order.id} va en camino.`);
        }

        // 3. Comando #listo: Pedido listo para retirar en tienda
        if (text === '#listo') {
            orderService.updateOrderStatus(order.id, 'READY_FOR_PICKUP');

            const clientMsg = [
                '🏪 *¡TU PEDIDO YA ESTÁ LISTO!*',
                '═══════════════════════════════',
                `Hola *${order.clientName}*, tu pedido #${order.id} ya está empacado y listo para ser retirado en nuestra tienda de La Trinidad.`,
                '',
                '¡Te esperamos! 👍🍗'
            ].join('\n');

            try {
                await provider.sendMessage(clientJid, clientMsg, {});
            } catch (err) {
                logger.error(`Error enviando notificación listo a ${clientJid}:`, err.message);
            }

            return await flowDynamic(`📦 *¡Listo!* Se notificó a *${order.clientName}* que el pedido #${order.id} está listo para retirar.`);
        }

        // 4. Comando #cancelar: Cancelar pedido desde la tienda
        if (text === '#cancelar') {
            orderService.updateOrderStatus(order.id, 'CANCELLED');

            const clientMsg = `⚠️ Tu pedido #${order.id} en PitaPollo ha sido cancelado por la tienda. Si tienes alguna consulta, por favor escríbenos por aquí.`;
            try {
                await provider.sendMessage(clientJid, clientMsg, {});
            } catch (err) {
                logger.error(`Error enviando cancelación a ${clientJid}:`, err.message);
            }

            return await flowDynamic(`❌ *Pedido #${order.id} cancelado.* Se notificó al cliente.`);
        }
    });
