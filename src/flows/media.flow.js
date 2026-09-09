import { addKeyword, EVENTS } from '@builderbot/bot';
import { downloadMediaMessage } from 'baileys';
import { orderService } from '../services/orderService.js';
import { storeService } from '../services/storeService.js';
import { PAYMENT_METHODS } from '../config/data.js';
import { getQuotedMessageId } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';

export const flowMedia = addKeyword(EVENTS.MEDIA)
    .addAction(async (ctx, { endFlow, flowDynamic, provider }) => {
        if (storeService.isPaused()) {
            return endFlow();
        }

        const remoteJid = ctx.key?.remoteJid || ctx.from || '';
        const adminGroups = storeService.getStore().adminGroups || [];
        const isFromAdminGroup = adminGroups.includes(remoteJid);

        // =========================================================================
        // CASO 1: Imagen enviada en el grupo de despacho (El cajero envía el Ticket)
        // =========================================================================
        if (isFromAdminGroup) {
            const quotedId = getQuotedMessageId(ctx);
            if (!quotedId) return endFlow();

            const order = orderService.getOrderByThreadMessage(quotedId);
            if (!order) return endFlow();

            // Descargar la foto del ticket
            const buffer = await downloadMediaMessage(ctx, 'buffer', {}).catch((err) => {
                logger.error('Error al descargar foto del ticket:', err.message);
                return null;
            });

            if (!buffer) {
                return await flowDynamic('⚠️ No se pudo procesar la imagen del ticket. Por favor reenvíala.');
            }

            // Registrar este mensaje en el hilo del pedido
            if (ctx.key?.id) {
                orderService.registerThreadMessage(order.id, ctx.key.id);
            }
            orderService.updateOrderStatus(order.id, 'PENDING_PAYMENT');

            // Preparar instrucciones de pago para el cliente según su método seleccionado
            const isPagoMovil = (order.paymentChoice || '').includes('Pago Móvil');
            const isZelle = (order.paymentChoice || '').includes('Zelle');
            const isPos = (order.paymentChoice || '').includes('Punto de venta');

            let paymentInstructions = '';
            if (isPagoMovil) {
                paymentInstructions = [
                    '📱 *Datos para tu Pago Móvil (Banesco):*',
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

            const clientCaption = [
                `¡Hola *${order.clientName}*! Aquí tienes la factura de tu pedido #${order.id} con el pesaje exacto y total a pagar: 🍗✨`,
                '',
                paymentInstructions
            ].join('\n');

            const clientJid = `${order.clientPhone}@s.whatsapp.net`;
            try {
                await provider.vendor.sendMessage(clientJid, {
                    image: buffer,
                    caption: clientCaption
                });
                await flowDynamic(`✅ *Ticket del Pedido #${order.id} enviado a ${order.clientName}*. Esperando comprobante...`);
            } catch (err) {
                logger.error(`Error enviando ticket a cliente ${clientJid}:`, err.message);
                await flowDynamic(`⚠️ Error al enviar ticket al cliente (+${order.clientPhone}): ${err.message}`);
            }
            return;
        }

        // =========================================================================
        // CASO 2: Imagen enviada por el cliente en privado (Comprobante de Pago)
        // =========================================================================
        const activeOrder = orderService.getActiveOrderByClient(ctx.from);

        if (activeOrder) {
            // 1. Responder al cliente con el mensaje acordado
            await flowDynamic('¡Excelente! Ya estamos verificando tu pago. ⏳ En breves minutos te confirmamos para coordinar tu despacho. 👍🍗');

            // 2. Descargar el comprobante
            const buffer = await downloadMediaMessage(ctx, 'buffer', {}).catch((err) => {
                logger.error('Error al descargar comprobante del cliente:', err.message);
                return null;
            });

            if (!buffer) return;

            // 3. Reenviar el comprobante en hilo al grupo de la tienda
            const captionText = ctx.message?.imageMessage?.caption || ctx.body || '';
            const groupCaption = [
                `💵 *COMPROBANTE RECIBIDO - PEDIDO #${activeOrder.id}*`,
                '═══════════════════════════════',
                `👤 *Cliente:* ${activeOrder.clientName}`,
                `📱 *WhatsApp:* +${activeOrder.clientPhone}`,
                captionText ? `📝 *Detalle/Teléfono emisor:* ${captionText}` : '',
                '',
                '👉 Responde `#ok` a este mensaje para confirmar el pago y avisar al cliente.'
            ].filter(Boolean).join('\n');

            // Obtener el último mensaje del hilo para responder citándolo
            const lastThreadMsgId = activeOrder.threadMsgIds[activeOrder.threadMsgIds.length - 1];

            for (const groupId of adminGroups) {
                try {
                    const quoteOptions = lastThreadMsgId ? { quoted: { key: { id: lastThreadMsgId, remoteJid: groupId } } } : {};
                    const sent = await provider.vendor.sendMessage(
                        groupId,
                        { image: buffer, caption: groupCaption },
                        quoteOptions
                    );
                    if (sent?.key?.id) {
                        orderService.registerThreadMessage(activeOrder.id, sent.key.id);
                    }
                } catch (err) {
                    logger.error(`Error reenviando comprobante al grupo ${groupId}:`, err.message);
                }
            }
            return;
        }

        // =========================================================================
        // CASO 3: Imagen enviada fuera del contexto de un pedido
        // =========================================================================
        const sender = ctx.pushName || ctx.from || 'Cliente';
        const clientPhone = ctx.from || 'Desconocido';

        await flowDynamic([
            '📸 *¡Archivo recibido!*',
            '',
            'Hemos recibido tu imagen o archivo. Si tienes alguna consulta, déjanos tu mensaje por aquí o escribe *menu* para ver las opciones.'
        ].join('\n'));

        await storeService.notifyAdmins(
            provider,
            `📸 *Nuevo archivo recibido* de *${sender}* (+${clientPhone}). Revisa el chat para verificar.`
        );
    });
