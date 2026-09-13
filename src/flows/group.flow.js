import { addKeyword } from '@builderbot/bot';
import { orderService } from '../services/orderService.js';
import { storeService } from '../services/storeService.js';
import { PAYMENT_METHODS, BUSINESS_INFO } from '../config/data.js';
import { storeConfigLoader } from '../config/storeConfigLoader.js';
import { getQuotedMessageId, getQuotedText } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';

/**
 * Flujo para gestión de comandos en el grupo de despacho de la tienda
 * (#ok, #camino, #listo, #cancelar, #cuenta, #cotizar, #total, #cambio, #aviso)
 */
export const flowGroup = addKeyword([
    '#ok', '#camino', '#listo', '#cancelar',
    '#cuenta', '#cotizar', '#total',
    '#cambio', '#aviso'
])
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

        // Si solo hay un pedido pendiente por ticket en toda la tienda
        if (!order) {
            const singlePending = orderService.getSinglePendingTicketOrder();
            if (singlePending) {
                order = singlePending;
            }
        }

        if (!order) {
            return await flowDynamic('⚠️ No se encontró ningún pedido vinculado a este mensaje citado.');
        }

        const rawBody = (ctx.body || '').trim();
        const lowerBody = rawBody.toLowerCase();
        const clientJid = `${order.clientPhone}@s.whatsapp.net`;

        // 1. Comando #ok: Verificar Pago
        if (lowerBody === '#ok') {
            orderService.updateOrderStatus(order.id, 'PAYMENT_VERIFIED');

            // Notificar al cliente
            const isPos = (order.paymentChoice || '').includes('Punto de venta');
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

            await flowDynamic(groupMsg);
            if (ctx.key?.id) {
                orderService.registerThreadMessage(order.id, ctx.key.id);
            }
            return;
        }

        // 2. Comando #cuenta / #cotizar / #total: Cotización en TEXTO
        if (lowerBody.startsWith('#cuenta') || lowerBody.startsWith('#cotizar') || lowerBody.startsWith('#total')) {
            const quoteText = rawBody.replace(/^#(cuenta|cotizar|total)\s*/i, '').trim();
            if (!quoteText) {
                return await flowDynamic('⚠️ Por favor indica el monto o detalle después del comando (ej: `#cuenta Total: $28.50 por pago móvil`).');
            }

            orderService.updateOrderStatus(order.id, 'PENDING_PAYMENT');
            if (ctx.key?.id) {
                orderService.registerThreadMessage(order.id, ctx.key.id);
            }

            // Preparar instrucciones de pago para el cliente según su método seleccionado
            const isPagoMovil = (order.paymentChoice || '').includes('Pago Móvil');
            const isZelle = (order.paymentChoice || '').includes('Zelle');
            const isPos = (order.paymentChoice || '').includes('Punto de venta');

            let paymentInstructions = '';
            if (isPagoMovil) {
                paymentInstructions = [
                    '📱 *Datos para tu Pago Móvil:*',
                    `• *Banco:* ${PAYMENT_METHODS.pagoMovil.banco}`,
                    `• *Teléfono:* ${PAYMENT_METHODS.pagoMovil.telefono}`,
                    `• *RIF:* ${PAYMENT_METHODS.pagoMovil.rif}`,
                    `• *Titular:* ${PAYMENT_METHODS.pagoMovil.titular}`,
                    '',
                    '📌 *IMPORTANTE:* Envíame la captura del comprobante y por favor *indica el número de teléfono desde el que pagaste* para ubicarlo rápidamente.'
                ].join('\n');
            } else if (isZelle) {
                paymentInstructions = [
                    '💵 *Datos para tu Zelle:*',
                    `• *Correo:* ${PAYMENT_METHODS.zelle.email}`,
                    `• *Titular:* ${PAYMENT_METHODS.zelle.titular}`,
                    `• ${PAYMENT_METHODS.zelle.nota}`,
                    '',
                    '📌 Por favor envíanos la captura del comprobante y el nombre del titular de la cuenta Zelle.'
                ].join('\n');
            } else if (isPos) {
                paymentInstructions = '💳 *Punto de Venta:* Nuestro motorizado llevará el punto inalámbrico a tu puerta (o estará listo en tienda si es retiro).';
            } else {
                paymentInstructions = '💵 Recuerda tener a mano el monto exacto acordado en efectivo.';
            }

            const clientMsg = [
                `¡Hola *${order.clientName}*! Aquí tienes la cotización de tu pedido #${order.id} por parte de nuestro equipo en tienda: 🍗✨`,
                '',
                '📝 *Monto / Total a pagar:*',
                quoteText,
                '',
                paymentInstructions
            ].join('\n');

            try {
                await provider.sendMessage(clientJid, clientMsg, {});
                await flowDynamic(`✅ *Cotización del Pedido #${order.id} enviada con éxito a ${order.clientName}* (+${order.clientPhone}). Esperando comprobante de pago...`);
            } catch (err) {
                logger.error(`Error enviando cotización en texto a ${clientJid}:`, err.message);
                await flowDynamic(`⚠️ Error al enviar cotización al cliente: ${err.message}`);
            }
            return;
        }

        // 3. Comando #cambio / #aviso: Notificar cambio de producto o detalle de stock al cliente
        if (lowerBody.startsWith('#cambio') || lowerBody.startsWith('#aviso')) {
            const noticeText = rawBody.replace(/^#(cambio|aviso)\s*/i, '').trim();
            if (!noticeText) {
                return await flowDynamic('⚠️ Por favor escribe el mensaje después de `#cambio` (ej: `#cambio Se agotó la milanesa, tenemos filet de pechuga`).');
            }

            if (ctx.key?.id) {
                orderService.registerThreadMessage(order.id, ctx.key.id);
            }

            const clientMsg = [
                `📢 *Aviso sobre tu pedido #${order.id} - ${BUSINESS_INFO.name}:*`,
                '',
                `Hola *${order.clientName}*, desde nuestra tienda nos indican el siguiente detalle sobre tu pedido:`,
                '',
                `👉 *${noticeText}*`,
                '',
                'Por favor respóndenos por aquí si deseas realizar el cambio o alguna modificación. 👍'
            ].join('\n');

            try {
                await provider.sendMessage(clientJid, clientMsg, {});
                await flowDynamic(`📢 *Aviso del Pedido #${order.id} enviado con éxito a ${order.clientName}* (+${order.clientPhone}).`);
            } catch (err) {
                logger.error(`Error enviando aviso de cambio a ${clientJid}:`, err.message);
                await flowDynamic(`⚠️ Error al enviar aviso al cliente: ${err.message}`);
            }
            return;
        }

        // 4. Comando #camino: Pedido en camino con Delivery
        if (lowerBody === '#camino') {
            orderService.updateOrderStatus(order.id, 'DISPATCHED');

            const farewell = storeConfigLoader.getOrderFlow().farewellMessage || `¡Muchas gracias por preferir a ${BUSINESS_INFO.name}! ✨`;
            const clientMsg = [
                '🛵 *¡TU PEDIDO YA VA EN CAMINO!*',
                '',
                `Hola *${order.clientName}*, nuestro motorizado ya salió con tu pedido #${order.id}.`,
                (order.paymentChoice || '').includes('Punto de venta') ? '💳 Recuerda tener tu tarjeta a mano para el punto de venta inalámbrico.' : '',
                '',
                farewell
            ].filter(Boolean).join('\n');

            try {
                await provider.sendMessage(clientJid, clientMsg, {});
            } catch (err) {
                logger.error(`Error enviando notificación en camino a ${clientJid}:`, err.message);
            }

            return await flowDynamic(`🚀 *¡Listo!* Se notificó a *${order.clientName}* que el pedido #${order.id} va en camino.`);
        }

        // 5. Comando #listo: Pedido listo para retirar en tienda
        if (lowerBody === '#listo') {
            orderService.updateOrderStatus(order.id, 'READY_FOR_PICKUP');

            const branchText = BUSINESS_INFO.branch ? ` en nuestra tienda de ${BUSINESS_INFO.branch}` : ' en nuestra tienda';
            const clientMsg = [
                '🏪 *¡TU PEDIDO YA ESTÁ LISTO!*',
                '',
                `Hola *${order.clientName}*, tu pedido #${order.id} ya está empacado y listo para ser retirado${branchText}.`,
                '',
                '¡Te esperamos! 👍'
            ].join('\n');

            try {
                await provider.sendMessage(clientJid, clientMsg, {});
            } catch (err) {
                logger.error(`Error enviando notificación listo a ${clientJid}:`, err.message);
            }

            return await flowDynamic(`📦 *¡Listo!* Se notificó a *${order.clientName}* que el pedido #${order.id} está listo para retirar.`);
        }

        // 6. Comando #cancelar: Cancelar pedido desde la tienda
        if (lowerBody === '#cancelar') {
            orderService.updateOrderStatus(order.id, 'CANCELLED');

            const clientMsg = `⚠️ Tu pedido #${order.id} en ${BUSINESS_INFO.name} ha sido cancelado por la tienda. Si tienes alguna consulta, por favor escríbenos por aquí.`;
            try {
                await provider.sendMessage(clientJid, clientMsg, {});
            } catch (err) {
                logger.error(`Error enviando cancelación a ${clientJid}:`, err.message);
            }

            return await flowDynamic(`❌ *Pedido #${order.id} cancelado.* Se notificó al cliente.`);
        }
    });
