import { addKeyword, EVENTS } from '@builderbot/bot';
import { downloadMediaMessage } from 'baileys';
import { orderService } from '../services/orderService.js';
import { storeService } from '../services/storeService.js';
import { PAYMENT_METHODS } from '../config/data.js';
import { getQuotedMessageId, getQuotedText } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';

export const flowMedia = addKeyword(EVENTS.MEDIA)
    .addAction(async (ctx, { endFlow, flowDynamic, provider }) => {
        if (storeService.isPaused()) {
            return endFlow();
        }

        const remoteJid = ctx.key?.remoteJid || ctx.from || '';
        const isGroup = remoteJid.endsWith('@g.us');

        // =========================================================================
        // SECCIÓN A: MULTIMEDIA ENVIADA DENTRO DE UN GRUPO DE WHATSAPP (TICKET DE PESAJE)
        // =========================================================================
        if (isGroup) {
            const adminGroups = storeService.getOrdersGroups();
            const isFromAdminGroup = adminGroups.some(g => g.toLowerCase().trim() === remoteJid.toLowerCase().trim());

            if (!isFromAdminGroup) {
                // Si el grupo no está registrado como grupo de despacho, ignorar
                return endFlow();
            }

            const quotedId = getQuotedMessageId(ctx);
            const quotedText = getQuotedText(ctx);
            const caption = ctx.caption || ctx.message?.imageMessage?.caption || ctx.message?.documentMessage?.caption || (typeof ctx.body === 'string' && !ctx.body.startsWith('_event_') ? ctx.body : '') || '';

            logger.info(`[flowMedia] Imagen recibida en grupo de despacho (${remoteJid}). QuotedId: ${quotedId || 'ninguno'}, Caption: "${caption}"`);

            // 1. Buscar el pedido por ID de mensaje citado en el hilo
            let order = quotedId ? orderService.getOrderByThreadMessage(quotedId) : null;

            // 2. Si no se encontró por ID citado, buscar por número de pedido en el pie de foto (ej: #1001 o 1001)
            if (!order && caption) {
                const match = caption.match(/#?(\d{4,})/);
                if (match) {
                    order = orderService.getOrderById(parseInt(match[1]));
                    if (order) logger.info(`[flowMedia] Pedido #${order.id} identificado por pie de foto: "${caption}"`);
                }
            }

            // 3. Si no se encontró, buscar número de pedido en el texto del mensaje citado (ej: #1001)
            if (!order && quotedText) {
                const match = quotedText.match(/#?(\d{4,})/);
                if (match) {
                    order = orderService.getOrderById(parseInt(match[1]));
                    if (order) logger.info(`[flowMedia] Pedido #${order.id} identificado por texto citado: #${match[1]}`);
                }
            }

            // 4. Si aún no se encontró, pero solo hay un pedido esperando ticket en toda la tienda
            if (!order) {
                const singlePending = orderService.getSinglePendingTicketOrder();
                if (singlePending) {
                    order = singlePending;
                    logger.info(`[flowMedia] Vinculando ticket al único pedido pendiente en tienda: #${order.id}`);
                }
            }

            if (!order) {
                return await flowDynamic([
                    '⚠️ *No se pudo identificar a qué pedido corresponde este ticket.*',
                    '',
                    '👉 Puedes enviar el ticket de cualquiera de estas formas:',
                    '1. Responde (**cita**) el mensaje del pedido con la foto del ticket.',
                    '2. O escribe el número de pedido en el pie de la foto (ej: `#1001`).'
                ].join('\n'));
            }

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

            const clientCaption = [
                `¡Hola *${order.clientName}*! Aquí tienes la factura de tu pedido #${order.id} con el pesaje exacto y total a pagar: 🍗✨`,
                '',
                paymentInstructions
            ].join('\n');

            const clientJid = `${order.clientPhone}@s.whatsapp.net`;
            try {
                if (provider.vendor?.sendMessage) {
                    await provider.vendor.sendMessage(clientJid, {
                        image: buffer,
                        caption: clientCaption
                    });
                } else if (provider.sendMessage) {
                    await provider.sendMessage(clientJid, clientCaption, {});
                }
                await flowDynamic(`✅ *Ticket del Pedido #${order.id} enviado con éxito a ${order.clientName}* (+${order.clientPhone}). Esperando comprobante de pago...`);
            } catch (err) {
                logger.error(`Error enviando ticket a cliente ${clientJid}:`, err.message);
                await flowDynamic(`⚠️ Error al enviar ticket al cliente (+${order.clientPhone}): ${err.message}`);
            }
            return;
        }

        // =========================================================================
        // SECCIÓN B: MULTIMEDIA ENVIADA POR UN CLIENTE EN CHAT PRIVADO
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
                '',
                `👤 *Cliente:* ${activeOrder.clientName}`,
                `📱 *WhatsApp:* +${activeOrder.clientPhone}`,
                captionText ? `📝 *Detalle/Teléfono emisor:* ${captionText}` : '',
                '',
                '👉 Responde *Ok* a este mensaje para confirmar el pago y avisar al cliente.'
            ].filter(Boolean).join('\n');

            // Obtener el último mensaje del hilo para responder citándolo
            const lastThreadMsgId = activeOrder.threadMsgIds[activeOrder.threadMsgIds.length - 1];

            const adminGroups = storeService.getOrdersGroups();
            for (const groupId of adminGroups) {
                try {
                    let sent = null;
                    if (lastThreadMsgId && provider.vendor?.sendMessage) {
                        try {
                            sent = await provider.vendor.sendMessage(
                                groupId,
                                { image: buffer, caption: groupCaption },
                                { quoted: { key: { id: lastThreadMsgId, remoteJid: groupId, fromMe: true }, message: { conversation: '' } } }
                            );
                        } catch (quoteErr) {
                            logger.warn(`No se pudo citar mensaje anterior (${quoteErr.message}), enviando comprobante directo`);
                        }
                    }

                    if (!sent && provider.vendor?.sendMessage) {
                        sent = await provider.vendor.sendMessage(
                            groupId,
                            { image: buffer, caption: groupCaption }
                        );
                    } else if (!sent && provider.sendMedia) {
                        sent = await provider.sendMedia(groupId, buffer, groupCaption);
                    }

                    if (sent?.key?.id) {
                        orderService.registerThreadMessage(activeOrder.id, sent.key.id);
                        logger.success(`Comprobante del pedido #${activeOrder.id} reenviado al grupo ${groupId} (ID: ${sent.key.id})`);
                    }
                } catch (err) {
                    logger.error(`Error reenviando comprobante al grupo ${groupId}:`, err.message);
                }
            }
            return;
        }

        // =========================================================================
        // CASO 3: Imagen enviada fuera del contexto de un pedido (Chat privado)
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
