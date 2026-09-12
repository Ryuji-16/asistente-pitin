import { addKeyword } from '@builderbot/bot';
import { orderService } from '../services/orderService.js';
import { storeService } from '../services/storeService.js';
import { customerService } from '../services/customerService.js';
import { estimateDeliveryFee } from '../config/delivery.js';
import { formatOrderItemsSimple, hasExplicitItems } from '../services/orderParser.js';
import { logger } from '../utils/logger.js';

const isCancelRequest = (text = '') => {
    const clean = text.trim().toLowerCase();
    return ['cancelar', 'cancela', 'salir', 'menu', 'inicio'].includes(clean);
};

/**
 * Función centralizada para despachar el pedido al grupo de WhatsApp e iniciar el hilo
 * @param {Object} order
 * @param {Object} provider
 */
async function dispatchOrderToGroup(order, provider) {
    const storeNotice = orderService.buildStoreNotification(order);
    const adminGroups = storeService.getOrdersGroups();

    logger.info(`Notificando pedido #${order.id} a ${adminGroups.length} grupo(s) de despacho...`);
    if (adminGroups.length === 0) {
        logger.warn('⚠️ ATENCIÓN: No hay grupos de pedidos vinculados en el bot. Escribe #grupo pedidos dentro del grupo de WhatsApp de despacho.');
    }

    for (const groupId of adminGroups) {
        try {
            logger.info(`Enviando notificación al grupo de WhatsApp: ${groupId}`);
            let sentMsg = null;
            if (provider.vendor?.sendMessage) {
                sentMsg = await provider.vendor.sendMessage(groupId, { text: storeNotice });
            } else if (provider.sendMessage) {
                sentMsg = await provider.sendMessage(groupId, storeNotice, {});
            }
            if (sentMsg?.key?.id) {
                orderService.registerThreadMessage(order.id, sentMsg.key.id);
                logger.success(`Notificación del pedido #${order.id} enviada con éxito al grupo ${groupId} (ID: ${sentMsg.key.id})`);
            }
        } catch (err) {
            logger.error(`Error enviando pedido #${order.id} al grupo ${groupId}:`, err.message);
        }
    }
}

// Subflujo: Métodos de Pago y Confirmación Final del Pedido (Flujo Estándar)
export const flowOrderPayment = addKeyword(['__flow_order_payment__'])
    .addAnswer(
        [
            '¿Cuál será tu método de pago?',
            '',
            'Responde con el número:',
            '1️⃣ *Pago Móvil (Banesco)*',
            '2️⃣ *Zelle*',
            '3️⃣ *Efectivo (Divisas / Bs)*',
            '4️⃣ *Punto de Venta Inalámbrico (Delivery a tu puerta)*',
            '5️⃣ *Punto de Venta en Tienda (Retiro presencial)*'
        ].join('\n'),
        { capture: true },
        async (ctx, { state, flowDynamic, provider, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }

            let paymentChoice = (ctx.body || '').trim();
            if (paymentChoice === '1') paymentChoice = 'Pago Móvil (Banesco)';
            else if (paymentChoice === '2') paymentChoice = 'Zelle';
            else if (paymentChoice === '3') paymentChoice = 'Efectivo (Divisas / Bs)';
            else if (paymentChoice === '4') paymentChoice = 'Punto de venta inalámbrico (Delivery)';
            else if (paymentChoice === '5') paymentChoice = 'Punto de venta en tienda';

            await state.update({ paymentChoice });
            const s = state.getMyState() || {};

            // 1. Crear el pedido en el servicio central
            const order = orderService.createOrder({
                clientPhone: ctx.from,
                clientName: s.clientName,
                items: s.items,
                isDelivery: s.isDelivery,
                address: s.address,
                latitude: s.latitude,
                longitude: s.longitude,
                deliveryFee: s.deliveryFee,
                deliveryLabel: s.deliveryLabel,
                paymentChoice
            });

            // 2. Registrar o actualizar perfil del cliente frecuente
            customerService.recordOrder(order);

            // 3. Enviar resumen al cliente
            const summary = orderService.buildSummary(order);
            await flowDynamic(summary);

            // 4. Notificar al grupo de despacho
            await dispatchOrderToGroup(order, provider);
        }
    );

// Subflujo: Ubicación GPS / Dirección (Exclusivo para pedidos con Delivery)
export const flowDeliveryAddress = addKeyword(['__flow_delivery_address__'])
    .addAnswer(
        [
            '📍 *DIRECCIÓN DE ENTREGA (DELIVERY):*',
            '',
            'Para cotizar tu envío con precisión y que el motorizado llegue directo a tu puerta:',
            '👉 Envíanos tu *ubicación GPS* (toca el clip 📎 y selecciona "Ubicación") o escribe tu *zona y dirección exacta* con punto de referencia.'
        ].join('\n'),
        { capture: true },
        async (ctx, { state, flowDynamic, gotoFlow, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }

            // 1. Detectar si enviaron ubicación nativa de WhatsApp
            let latitude = ctx.message?.locationMessage?.degreesLatitude || null;
            let longitude = ctx.message?.locationMessage?.degreesLongitude || null;
            let rawBody = (ctx.body || '').trim();
            let address = (rawBody.startsWith('_event_location_') || !rawBody)
                ? (latitude ? 'Ubicación GPS' : 'Dirección por confirmar')
                : rawBody;

            // 2. Si enviaron enlace de Maps por texto
            if (!latitude && address.includes('maps')) {
                const match = address.match(/(-?\d+\.\d+),(-?\d+\.\d+)/);
                if (match) {
                    latitude = parseFloat(match[1]);
                    longitude = parseFloat(match[2]);
                }
            }

            // 3. Estimar tarifa de delivery
            const feeEst = estimateDeliveryFee({ latitude, longitude, zoneText: address });

            await state.update({
                address,
                latitude,
                longitude,
                deliveryFee: feeEst.fee,
                deliveryLabel: feeEst.label
            });

            if (feeEst.fee !== null && feeEst.fee !== undefined) {
                await flowDynamic(`🛵 *Tarifa de delivery para tu zona:* $${feeEst.fee.toFixed(2)} (${feeEst.label})`);
            } else {
                await flowDynamic('🛵 *Nota sobre tu zona de entrega:*\nVerificaremos el monto del delivery para tu zona y te diremos cuánto es junto con el monto total de tu pedido.');
            }

            return gotoFlow(flowOrderPayment);
        }
    );

// Subflujo: Elección de Retiro en Tienda o Delivery
export const flowOrderDeliveryOrPickup = addKeyword(['__flow_order_delivery_or_pickup__'])
    .addAnswer(
        '¿Cómo deseas recibir tu pedido?\n\nResponde con el número:\n1️⃣ *Retiro en tienda* (La Trinidad)\n2️⃣ *Delivery*',
        { capture: true },
        async (ctx, { state, flowDynamic, gotoFlow, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }
            const text = (ctx.body || '').trim().toLowerCase();
            const isDelivery = text.includes('2') || text.includes('delivery');

            if (isDelivery) {
                await state.update({ isDelivery: true });
                await flowDynamic('🛵 Seleccionaste *Delivery*.');
                return gotoFlow(flowDeliveryAddress);
            } else {
                await state.update({
                    isDelivery: false,
                    address: 'Retiro en tienda (La Trinidad)',
                    deliveryFee: null,
                    deliveryLabel: 'Retiro presencial'
                });
                await flowDynamic('🏪 Seleccionaste *Retiro en tienda* (La Trinidad).');
                return gotoFlow(flowOrderPayment);
            }
        }
    );

// Subflujo: Captura de Productos para Clientes Nuevos
export const flowOrderItemsNew = addKeyword(['__flow_order_items_new__'])
    .addAnswer(
        [
            '¿Qué *productos o paquetes empaquetados* deseas pedir?',
            '',
            '💡 *Ejemplos de paquetes listos:*',
            '• 1 bolsa de 5 Kg de milanesa de pechuga',
            '• 1 bolsa mini de 2 Kg de muslos enteros',
            '• 1 pack de tenders Maella',
            '• 1 queso duro y 1 paquete de chistorra Montserratina',
            '',
            '_(Escribe los productos y cantidades que deseas en un solo mensaje)_:'
        ].join('\n'),
        { capture: true },
        async (ctx, { state, flowDynamic, gotoFlow, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }
            const formatted = formatOrderItemsSimple(ctx.body);
            await state.update({ items: formatted || 'No especificado' });
            await flowDynamic('Anotado ✔️');
            return gotoFlow(flowOrderDeliveryOrPickup);
        }
    );

// Subflujo: Nombre de Cliente Nuevo
export const flowOrderNewCustomerName = addKeyword(['__flow_order_new_name__'])
    .addAnswer(
        '🛒 *INICIAR PEDIDO - PITAPOLLO*\n\n¡Excelente! Vamos a tomar los datos de tu pedido paso a paso.\n_(Escribe *cancelar* en cualquier momento si deseas salir)_\n\nPor favor, escribe tu *Nombre y Apellido*:',
        { capture: true },
        async (ctx, { state, flowDynamic, gotoFlow, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }
            const name = ctx.body?.trim() || 'Cliente';
            await state.update({ clientName: name });
            await flowDynamic(`¡Mucho gusto, *${name}*! 👍`);
            const s = state.getMyState() || {};
            if (s.items) {
                return gotoFlow(flowOrderDeliveryOrPickup);
            }
            return gotoFlow(flowOrderItemsNew);
        }
    );

// Subflujo: Confirmación Exprés en 1 Toque (Cliente Recurrente)
export const flowExpressConfirm = addKeyword(['__flow_express_confirm__'])
    .addAnswer(
        [
            '¿Te lo despachamos con tus datos habituales?',
            '',
            'Responde con el número:',
            '1️⃣ *Sí, confirmar pedido* (¡Listo en 1 toque! 🚀)',
            '2️⃣ *Cambiar dirección o método de pago*'
        ].join('\n'),
        { capture: true },
        async (ctx, { state, flowDynamic, provider, gotoFlow, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }

            const text = (ctx.body || '').trim().toLowerCase();
            const isConfirm = text === '1' || text === '1️⃣' || text.includes('si') || text.includes('sí') || text.includes('confirmo') || text.includes('ok') || text.includes('dale');

            if (isConfirm) {
                const s = state.getMyState() || {};

                const order = orderService.createOrder({
                    clientPhone: ctx.from,
                    clientName: s.clientName,
                    items: s.items,
                    isDelivery: s.isDelivery,
                    address: s.address,
                    latitude: s.latitude,
                    longitude: s.longitude,
                    deliveryFee: s.deliveryFee,
                    deliveryLabel: s.deliveryLabel,
                    paymentChoice: s.paymentChoice
                });

                customerService.recordOrder(order);

                const summary = orderService.buildSummary(order);
                await flowDynamic(summary);

                await dispatchOrderToGroup(order, provider);
                return;
            } else {
                await flowDynamic('Entendido, vamos a ajustar tus datos para este pedido. 👍');
                return gotoFlow(flowOrderDeliveryOrPickup);
            }
        }
    );

// Subflujo: Captura de Productos para Clientes Recurrentes (Fijos)
export const flowOrderItemsReturning = addKeyword(['__flow_order_items_returning__'])
    .addAnswer(
        [
            '¿Qué *productos o paquetes empaquetados* deseas pedir hoy?',
            '',
            '💡 _(Si deseas repetir lo mismo de tu compra anterior, escribe *lo de siempre* o *repetir*)_',
            '',
            '_(Escribe los productos y cantidades en un solo mensaje)_:'
        ].join('\n'),
        { capture: true },
        async (ctx, { state, flowDynamic, gotoFlow, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }

            const s = state.getMyState() || {};
            let items = (ctx.body || '').trim();
            const lowerItems = items.toLowerCase();

            if ((lowerItems === 'lo de siempre' || lowerItems === 'repetir' || lowerItems === 'lo mismo') && s.lastOrderItems) {
                items = s.lastOrderItems;
                await flowDynamic(`¡Excelente! Tomamos lo de siempre:\n📝 *${items}*`);
            }

            const formatted = formatOrderItemsSimple(items);
            await state.update({ items: formatted || 'No especificado' });

            const cleanAddress = (s.address || '').startsWith('_event_location_') ? 'tu ubicación GPS' : `*${s.address}*`;
            const deliveryDesc = s.isDelivery
                ? `Delivery a ${cleanAddress}`
                : 'Retiro en tienda *(La Trinidad)*';

            await flowDynamic([
                '📋 *DETALLE DEL PEDIDO:*',
                formatted,
                '',
                `📍 *Entrega habitual:* ${deliveryDesc}`,
                `💳 *Pago habitual:* *${s.paymentChoice}*`
            ].join('\n'));

            return gotoFlow(flowExpressConfirm);
        }
    );

// Flujo Principal de Pedido (Punto de Entrada)
export const flowOrder = addKeyword([
    '2', '2️⃣', 'pedido', 'pedir', 'comprar', 'orden', 'hacer pedido',
    'quiero pedir', 'para pedir', 'quiero comprar', 'quiero', 'quisiera',
    'mandame', 'mándame', 'anotame', 'anótame', 'apartame', 'apártame',
    'voy a pedir', 'voy a querer'
], { sensitive: true })
    .addAction(async (ctx, { state, flowDynamic, gotoFlow, endFlow }) => {
        const remoteJid = ctx.key?.remoteJid || ctx.from || '';
        if (remoteJid.endsWith('@g.us') || storeService.isPaused()) {
            return endFlow();
        }

        const customer = customerService.getCustomer(ctx.from);
        const hasItemsInMsg = hasExplicitItems(ctx.body);

        if (customer && customer.name && (customer.address || customer.isDelivery === false)) {
            // Cliente frecuente reconocido
            const items = hasItemsInMsg ? formatOrderItemsSimple(ctx.body) : '';

            await state.update({
                isReturningCustomer: true,
                clientName: customer.name,
                isDelivery: customer.isDelivery,
                address: customer.address || 'Tienda',
                latitude: customer.latitude || null,
                longitude: customer.longitude || null,
                deliveryFee: customer.deliveryFee || null,
                deliveryLabel: customer.deliveryLabel || '',
                paymentChoice: customer.paymentChoice || 'Pago Móvil (Banesco)',
                lastOrderItems: customer.lastOrderItems || '',
                items: items || ''
            });

            if (hasItemsInMsg && items) {
                // El cliente ya indicó su pedido directamente (ej: "Hola quiero 10kg de muslo")
                const cleanAddress = (customer.address || '').startsWith('_event_location_') ? 'tu ubicación GPS' : `*${customer.address}*`;
                const deliveryDesc = customer.isDelivery
                    ? `Delivery a ${cleanAddress}`
                    : 'Retiro en tienda *(La Trinidad)*';

                await flowDynamic([
                    `¡Hola *${customer.name}*! 👋 Qué gusto saludarte de nuevo en *PitaPollo*. 🍗✨`,
                    '',
                    '📋 *DETALLE DEL PEDIDO:*',
                    items,
                    '',
                    `📍 *Entrega habitual:* ${deliveryDesc}`,
                    `💳 *Pago habitual:* *${customer.paymentChoice || 'Pago Móvil (Banesco)'}*`
                ].join('\n'));

                return gotoFlow(flowExpressConfirm);
            }

            // Si no especificó productos en el mensaje inicial
            await flowDynamic([
                `¡Hola *${customer.name}*! 👋 Qué gusto saludarte de nuevo en *PitaPollo*. 🍗✨`,
                customer.lastOrderItems ? `_(Tu última compra fue: ${customer.lastOrderItems})_` : ''
            ].filter(Boolean).join('\n'));

            return gotoFlow(flowOrderItemsReturning);
        } else {
            // Cliente nuevo sin perfil guardado
            const items = hasItemsInMsg ? formatOrderItemsSimple(ctx.body) : '';
            await state.update({
                isReturningCustomer: false,
                items: items || ''
            });
            return gotoFlow(flowOrderNewCustomerName);
        }
    });
