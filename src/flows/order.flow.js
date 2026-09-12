import { addKeyword } from '@builderbot/bot';
import { orderService } from '../services/orderService.js';
import { storeService } from '../services/storeService.js';
import { customerService } from '../services/customerService.js';
import { estimateDeliveryFee } from '../config/delivery.js';
import { formatOrderItemsSimple, hasExplicitItems, appendOrderItems } from '../services/orderParser.js';
import { sanitizeCustomerName } from '../utils/formatters.js';
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
            '¿Cómo prefieres pagar tu pedido? 💳',
            '',
            'Aceptamos:',
            '• *Pago Móvil*',
            '• *Divisas en efectivo ($ / Bs)*',
            '• *Punto de Venta inalámbrico* (nuestro motorizado lo lleva a tu puerta)',
            '• *Zelle*',
            '',
            'Indícanos cuál método prefieres para procesar tu orden.'
        ].join('\n'),
        { capture: true },
        async (ctx, { state, flowDynamic, provider, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }

            const rawPay = (ctx.body || '').trim().toLowerCase();
            let paymentChoice = 'Pago Móvil'; // Valor por defecto

            if (rawPay === '1' || rawPay.includes('movil') || rawPay.includes('móvil') || rawPay.includes('transferencia') || rawPay.includes('bs') || rawPay.includes('bolivares') || rawPay.includes('bolívares')) {
                paymentChoice = 'Pago Móvil';
            } else if (rawPay === '2' || rawPay.includes('zelle')) {
                paymentChoice = 'Zelle';
            } else if (rawPay === '3' || rawPay.includes('efectivo') || rawPay.includes('dolar') || rawPay.includes('dólar') || rawPay.includes('divisa') || rawPay.includes('$')) {
                paymentChoice = 'Efectivo (Divisas / Bs)';
            } else if (rawPay === '4' || rawPay.includes('punto') || rawPay.includes('tarjeta') || rawPay.includes('pos') || rawPay.includes('inalambrico') || rawPay.includes('inalámbrico')) {
                paymentChoice = 'Punto de venta inalámbrico (Delivery)';
            } else if (rawPay === '5' || rawPay.includes('tienda')) {
                paymentChoice = 'Punto de venta en tienda';
            } else {
                paymentChoice = (ctx.body || '').trim() || 'Pago Móvil';
            }

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
                deliveryZone: s.deliveryZone,
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

            // 2. Si enviaron productos adicionales en vez de una dirección
            if (!latitude && hasExplicitItems(rawBody)) {
                const s = state.getMyState() || {};
                const updatedItems = appendOrderItems(s.items, rawBody);
                await state.update({ items: updatedItems });
                await flowDynamic([
                    '➕ *¡Anotado también a tu pedido!* Sumamos esos productos a tu comanda. 🍗📝',
                    '',
                    '📋 *PEDIDO ACTUALIZADO:*',
                    updatedItems,
                    '',
                    'Ahora por favor envíanos tu *ubicación GPS* (📎 Ubicación) o escribe tu *dirección y zona de entrega* para calcular el delivery:'
                ].join('\n'));
                return;
            }

            // 3. Si enviaron enlace de Maps por texto
            if (!latitude && address.includes('maps')) {
                const match = address.match(/(-?\d+\.\d+),(-?\d+\.\d+)/);
                if (match) {
                    latitude = parseFloat(match[1]);
                    longitude = parseFloat(match[2]);
                }
            }

            // 4. Si enviaron una palabra que no es una dirección real (ej: "delivery", "deluvery", "tienda")
            const isBadAddress = (addr) =>
                !addr ||
                /^(?:delivery|deluvery|delibery|deli|envio|envío|a domicilio|domicilio|tienda|retiro|retiro en tienda|mi casa|la casa|mi direccion|por delivery)$/i.test(String(addr).replace(/[*_.,;]/g, '').trim());

            if (!latitude && isBadAddress(address)) {
                await flowDynamic([
                    '⚠️ *"Delivery"* es el servicio de envío, pero necesitamos tu dirección exacta para que el motorizado llegue a tu puerta. 🛵',
                    '',
                    'Por favor, envíanos tu *ubicación GPS* (tocando el clip 📎 y seleccionando "Ubicación") o escríbenos tu *zona y dirección* (ej: La Trinidad, Las Minas, El Hatillo, etc.):'
                ].join('\n'));
                return;
            }

            // 3. Estimar tarifa de delivery
            const feeEst = estimateDeliveryFee({ latitude, longitude, zoneText: address });
            const zoneName = feeEst.zoneName || feeEst.matchedZone || feeEst.label;

            await state.update({
                address,
                latitude,
                longitude,
                deliveryFee: feeEst.fee,
                deliveryLabel: feeEst.label,
                deliveryZone: zoneName
            });

            if (feeEst.fee !== null && feeEst.fee !== undefined) {
                await flowDynamic(`🛵 *Tarifa de delivery estimada:* $${feeEst.fee.toFixed(2)} (${zoneName})`);
            } else {
                await flowDynamic('🛵 *Nota sobre tu zona de entrega:*\nVerificaremos el monto del delivery para tu zona y te informaremos junto con el monto total de tu pedido.');
            }

            return gotoFlow(flowOrderPayment);
        }
    );

// Subflujo: Elección de Retiro en Tienda o Delivery
export const flowOrderDeliveryOrPickup = addKeyword(['__flow_order_delivery_or_pickup__'])
    .addAnswer(
        [
            '¿Prefieres que te lo enviemos por *delivery* hasta tu dirección, o pasas *retirando* por nuestra tienda en La Trinidad? 🛵🏪',
            '',
            '_(Responde "Delivery" o "Retiro")_'
        ].join('\n'),
        { capture: true },
        async (ctx, { state, flowDynamic, gotoFlow, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }

            // Si el cliente agregó más productos en este paso
            if (hasExplicitItems(ctx.body)) {
                const s = state.getMyState() || {};
                const updatedItems = appendOrderItems(s.items, ctx.body);
                await state.update({ items: updatedItems });
                await flowDynamic([
                    '➕ *¡Anotado también!* Sumamos a tu comanda: 🍗📝',
                    '',
                    '📋 *PEDIDO ACTUALIZADO:*',
                    updatedItems,
                    '',
                    'Ahora indícanos:',
                    '¿Prefieres que te lo enviemos por *Delivery* 🛵 o pasas *Retirando* por la tienda en La Trinidad? 🏪'
                ].join('\n'));
                return;
            }

            const text = (ctx.body || '').trim().toLowerCase();
            const isDelivery = text === '1' ||
                /\b(?:delivery|deluvery|delibery|deli|envio|envío|envios|envíos|domicilio|a domicilio|casa|mi casa|mandar|llevar)\b/i.test(text);
            const isPickup = text === '2' ||
                /\b(?:retiro|retirar|tienda|trinidad|la trinidad|pasar|recojo|buscar)\b/i.test(text);

            if (isDelivery) {
                await state.update({ isDelivery: true });
                await flowDynamic('🛵 ¡Excelente! Vamos a coordinar tu *Delivery*.');
                return gotoFlow(flowDeliveryAddress);
            } else if (isPickup) {
                await state.update({
                    isDelivery: false,
                    address: 'Retiro en tienda (La Trinidad)',
                    deliveryFee: null,
                    deliveryLabel: 'Retiro presencial',
                    deliveryZone: 'Retiro en tienda (La Trinidad)'
                });
                await flowDynamic('🏪 Perfecto, pasas retirando por la tienda en *La Trinidad*.');
                return gotoFlow(flowOrderPayment);
            } else {
                await flowDynamic([
                    'Por favor, indícanos cómo prefieres recibir tu comanda: 🤔',
                    '• Responde *Delivery* (o *1*) si deseas envío a tu dirección.',
                    '• Responde *Retiro* (o *2*) si pasas por nuestra tienda en La Trinidad.'
                ].join('\n'));
                return;
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
            '_(Escribe los productos y cantidades que deseas; puedes detallarlos como prefieras)_:'
        ].join('\n'),
        { capture: true },
        async (ctx, { state, flowDynamic, gotoFlow, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }
            const s = state.getMyState() || {};
            const formatted = appendOrderItems(s.items, ctx.body);
            await state.update({ items: formatted || 'No especificado' });
            await flowDynamic([
                '📋 *PEDIDO ANOTADO:*',
                formatted
            ].join('\n'));
            return gotoFlow(flowOrderDeliveryOrPickup);
        }
    );

// Subflujo: Captura de Nombre cuando el cliente ya envió sus productos
export const flowOrderNameWithItems = addKeyword(['__flow_order_name_with_items__'])
    .addAnswer(
        'Para registrar tu comanda, por favor escribe tu *Nombre y Apellido*:\n_(Escribe *cancelar* si deseas salir)_',
        { capture: true },
        async (ctx, { state, flowDynamic, gotoFlow, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }

            // Si el cliente agregó más productos en vez de su nombre
            if (hasExplicitItems(ctx.body)) {
                const s = state.getMyState() || {};
                const updatedItems = appendOrderItems(s.items, ctx.body);
                await state.update({ items: updatedItems });
                await flowDynamic([
                    '➕ *¡Anotado también!* Sumamos a tu comanda: 🍗📝',
                    '',
                    '📋 *PEDIDO ACTUALIZADO:*',
                    updatedItems,
                    '',
                    'Para poder registrar tu comanda a tu nombre, por favor indícanos tu *Nombre y Apellido*:'
                ].join('\n'));
                return;
            }

            const { cleanName, detectedPayment } = sanitizeCustomerName(ctx.body);
            await state.update({ clientName: cleanName });
            if (detectedPayment) {
                await state.update({ paymentChoice: detectedPayment });
            }
            await flowDynamic(`¡Mucho gusto, *${cleanName}*! 👍`);
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

            // Si el cliente escribió productos directamente
            if (hasExplicitItems(ctx.body)) {
                const s = state.getMyState() || {};
                const updatedItems = appendOrderItems(s.items, ctx.body);
                await state.update({ items: updatedItems });
                await flowDynamic([
                    '➕ *¡Productos anotados!* 🍗📝',
                    '',
                    '📋 *PEDIDO:*',
                    updatedItems,
                    '',
                    'Para poder registrar tu comanda a tu nombre, por favor dinos tu *Nombre y Apellido*:'
                ].join('\n'));
                return;
            }

            const { cleanName, detectedPayment } = sanitizeCustomerName(ctx.body);
            await state.update({ clientName: cleanName });
            if (detectedPayment) {
                await state.update({ paymentChoice: detectedPayment });
            }
            await flowDynamic(`¡Mucho gusto, *${cleanName}*! 👍`);
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
            '¿Deseas confirmarlo con estos mismos datos habituales? 🚀',
            '',
            '_(Responde "Sí" para confirmar, "Cambiar" para modificar entrega/pago, o escribe si deseas agregar más productos)_'
        ].join('\n'),
        { capture: true },
        async (ctx, { state, flowDynamic, provider, gotoFlow, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }

            // 1. Si el cliente envió más productos para agregar a su comanda
            if (hasExplicitItems(ctx.body)) {
                const s = state.getMyState() || {};
                const updatedItems = appendOrderItems(s.items, ctx.body);
                await state.update({ items: updatedItems });

                const cleanAddress = (s.address || '').startsWith('_event_location_') ? 'tu ubicación GPS' : `*${s.address}*`;
                const deliveryDesc = s.isDelivery
                    ? `Delivery a ${cleanAddress}`
                    : 'Retiro en tienda *(La Trinidad)*';
                const cleanPayChoice = (s.paymentChoice || 'Pago Móvil').replace(/\s*\(Banesco\)/i, '');

                await flowDynamic([
                    '➕ *¡Anotado también!* Sumamos a tu comanda: 🍗📝',
                    '',
                    '📋 *DETALLE COMPLETO DEL PEDIDO:*',
                    updatedItems,
                    '',
                    `📍 *Entrega habitual:* ${deliveryDesc}`,
                    `💳 *Pago habitual:* *${cleanPayChoice}*`,
                    '',
                    '¿Deseas confirmarlo con estos datos habituales? 🚀',
                    '_(Responde "Sí" para confirmar de una vez, "Cambiar" para modificar entrega/pago, o sigue agregando productos)_'
                ].join('\n'));
                return;
            }

            // 2. Si el cliente envió una ubicación GPS (nativa o enlace de Maps)
            let latitude = ctx.message?.locationMessage?.degreesLatitude || null;
            let longitude = ctx.message?.locationMessage?.degreesLongitude || null;
            const rawBody = (ctx.body || '').trim();

            if (!latitude && rawBody.includes('maps')) {
                const match = rawBody.match(/(-?\d+\.\d+),(-?\d+\.\d+)/);
                if (match) {
                    latitude = parseFloat(match[1]);
                    longitude = parseFloat(match[2]);
                }
            }

            if (latitude && longitude) {
                const feeEst = estimateDeliveryFee({ latitude, longitude, zoneText: 'Ubicación GPS' });
                const zoneName = feeEst.zoneName || feeEst.matchedZone || feeEst.label;
                await state.update({
                    isDelivery: true,
                    address: 'Ubicación GPS',
                    latitude,
                    longitude,
                    deliveryFee: feeEst.fee,
                    deliveryLabel: feeEst.label,
                    deliveryZone: zoneName
                });
                const s = state.getMyState() || {};
                const feeText = feeEst.fee !== null && feeEst.fee !== undefined
                    ? `$${Number(feeEst.fee).toFixed(2)} (${zoneName})`
                    : 'Por verificar con la tienda';

                await flowDynamic([
                    '📍 *¡Ubicación GPS recibida y actualizada con éxito!* 🛵',
                    `• 💰 *Tarifa de Delivery:* ${feeText}`,
                    '',
                    '📋 *DETALLE ACTUALIZADO DE TU PEDIDO:*',
                    s.items,
                    '',
                    `💳 *Método de Pago:* *${(s.paymentChoice || 'Pago Móvil').replace(/\s*\(Banesco\)/i, '')}*`,
                    '',
                    '¿Deseas confirmar tu pedido con esta ubicación? 🚀',
                    '_(Responde "Sí" para procesar de una vez, "Cambiar" para otros ajustes, o escribe si deseas agregar productos)_'
                ].join('\n'));
                return gotoFlow(flowExpressConfirm);
            }

            const text = (ctx.body || '').trim().toLowerCase();
            const isConfirm = text === '1' || text === '1️⃣' ||
                /\b(?:si|sí|confirmo|confirmar|confirmado|dale|ok|claro|listo|eso es todo|asi esta bien|así está bien|todo bien|perfecto|adelante|manda|mandalo|mándalo|enviar|proceder)\b/i.test(text);

            const isChange = text === '2' || text === '2️⃣' ||
                /\b(?:cambiar|cambio|modificar|ajustar|otra direccion|otra dirección|otro pago|retiro|tienda|delivery|nueva direccion|nueva dirección)\b/i.test(text);

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
                    deliveryZone: s.deliveryZone,
                    paymentChoice: s.paymentChoice
                });

                customerService.recordOrder(order);

                const summary = orderService.buildSummary(order);
                await flowDynamic(summary);

                await dispatchOrderToGroup(order, provider);
                return;
            } else if (isChange) {
                await flowDynamic('Entendido, vamos a ajustar tus datos para este pedido. 👍');
                return gotoFlow(flowOrderDeliveryOrPickup);
            } else {
                // Si el mensaje no fue claro, re-guiar al cliente sin romper el ciclo de captura
                await flowDynamic([
                    '¿Deseas confirmar tu pedido? 🛒',
                    '',
                    '• Responde *Sí* para procesar tu pedido de una vez.',
                    '• Responde *Cambiar* si deseas modificar tu entrega o forma de pago.',
                    '• Envía tu *ubicación GPS* si deseas actualizar la dirección.',
                    '• O escribe directamente cualquier otro producto que quieras agregar.'
                ].join('\n'));
                return gotoFlow(flowExpressConfirm);
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
            '_(Escribe los productos y cantidades que deseas)_:'
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

            const formatted = appendOrderItems(s.items, items);
            await state.update({ items: formatted || 'No especificado' });

            const cleanAddress = (s.address || '').startsWith('_event_location_') ? 'tu ubicación GPS' : `*${s.address}*`;
            const deliveryDesc = s.isDelivery
                ? `Delivery a ${cleanAddress}`
                : 'Retiro en tienda *(La Trinidad)*';
            const cleanPayChoice = (s.paymentChoice || 'Pago Móvil').replace(/\s*\(Banesco\)/i, '');

            await flowDynamic([
                '📋 *DETALLE DEL PEDIDO:*',
                formatted,
                '',
                `📍 *Entrega habitual:* ${deliveryDesc}`,
                `💳 *Pago habitual:* *${cleanPayChoice}*`
            ].join('\n'));

            return gotoFlow(flowExpressConfirm);
        }
    );

// Flujo Principal de Pedido (Punto de Entrada)
export const flowOrder = addKeyword([
    '2', '2️⃣',
    'pedido', 'Pedido', 'PEDIDO', 'pedir', 'Pedir', 'PEDIR',
    'comprar', 'Comprar', 'COMPRAR', 'orden', 'Orden', 'ORDEN',
    'hacer pedido', 'Hacer pedido', 'quiero pedir', 'Quiero pedir', 'para pedir', 'Para pedir',
    'quiero comprar', 'Quiero comprar', 'quiero', 'Quiero', 'QUIERO', 'quisiera', 'Quisiera',
    'mandame', 'Mandame', 'mándame', 'Mándame', 'anotame', 'Anotame', 'anótame', 'Anótame',
    'apartame', 'Apartame', 'apártame', 'Apártame', 'traeme', 'Traeme', 'tráeme', 'Tráeme',
    'enviame', 'Enviame', 'envíame', 'Envíame', 'dame', 'Dame', 'DAME', 'danos', 'Danos', 'dános', 'Dános',
    'vendeme', 'Vendeme', 'véndeme', 'Véndeme', 'voy a pedir', 'Voy a pedir', 'voy a querer', 'Voy a querer'
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
                deliveryZone: customer.deliveryZone || customer.deliveryLabel || '',
                paymentChoice: (customer.paymentChoice || 'Pago Móvil').replace(/\s*\(Banesco\)/i, ''),
                lastOrderItems: customer.lastOrderItems || '',
                items: items || ''
            });

            if (hasItemsInMsg && items) {
                // El cliente ya indicó su pedido directamente (ej: "Hola quiero 10kg de muslo")
                const cleanAddress = (customer.address || '').startsWith('_event_location_') ? 'tu ubicación GPS' : `*${customer.address}*`;
                const deliveryDesc = customer.isDelivery
                    ? `Delivery a ${cleanAddress}`
                    : 'Retiro en tienda *(La Trinidad)*';

                const cleanPayChoice = (customer.paymentChoice || 'Pago Móvil').replace(/\s*\(Banesco\)/i, '');

                await flowDynamic([
                    `¡Hola *${customer.name}*! 👋 Qué gusto saludarte de nuevo en *PitaPollo*. 🍗✨`,
                    '',
                    '📋 *DETALLE DEL PEDIDO:*',
                    items,
                    '',
                    `📍 *Entrega habitual:* ${deliveryDesc}`,
                    `💳 *Pago habitual:* *${cleanPayChoice}*`
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

            if (hasItemsInMsg && items) {
                await flowDynamic([
                    '🛒 *¡PEDIDO ANOTADO!* 🍗📝',
                    items,
                    ''
                ].join('\n'));
                return gotoFlow(flowOrderNameWithItems);
            }

            return gotoFlow(flowOrderNewCustomerName);
        }
    });
