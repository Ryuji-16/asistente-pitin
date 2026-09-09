import { addKeyword } from '@builderbot/bot';
import { orderService } from '../services/orderService.js';
import { storeService } from '../services/storeService.js';
import { estimateDeliveryFee } from '../config/delivery.js';

const isCancelRequest = (text = '') => {
    const clean = text.trim().toLowerCase();
    return ['cancelar', 'cancela', 'salir', 'menu', 'inicio'].includes(clean);
};

export const flowOrder = addKeyword(['2', '2️⃣', 'pedido', 'pedir', 'comprar', 'orden', 'hacer pedido'])
    .addAction(async (_, { endFlow }) => {
        if (storeService.isPaused()) {
            return endFlow();
        }
    })
    .addAnswer(
        '🛒 *INICIAR PEDIDO - PITAPOLLO*\n\n¡Excelente! Vamos a tomar los datos de tu pedido paso a paso.\n_(Escribe *cancelar* en cualquier momento si deseas salir)_\n\nPor favor, escribe tu *Nombre y Apellido*:',
        { capture: true },
        async (ctx, { state, flowDynamic, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }
            const name = ctx.body?.trim() || 'Cliente';
            await state.update({ clientName: name });
            await flowDynamic(`¡Mucho gusto, *${name}*! 👍`);
        }
    )
    .addAnswer(
        '¿Qué *productos y cantidades* deseas pedir?\n\n_Ejemplo: 2 kg de milanesa de pechuga, 1 pack de tenders, 1 kg de alas sin punta..._',
        { capture: true },
        async (ctx, { state, flowDynamic, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }
            await state.update({ items: ctx.body?.trim() || 'No especificado' });
            await flowDynamic('Anotado ✔️');
        }
    )
    .addAnswer(
        '¿Cómo deseas recibir tu pedido?\n\nResponde con el número:\n1️⃣ *Retiro en tienda* (La Trinidad)\n2️⃣ *Delivery*',
        { capture: true },
        async (ctx, { state, flowDynamic, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }
            const text = (ctx.body || '').trim().toLowerCase();
            const isDelivery = text.includes('2') || text.includes('delivery');
            await state.update({ isDelivery });
            if (isDelivery) {
                await flowDynamic('🛵 Seleccionaste *Delivery*.');
            } else {
                await flowDynamic('🏪 Seleccionaste *Retiro en tienda* (La Trinidad).');
            }
        }
    )
    .addAnswer(
        [
            '📍 *DIRECCIÓN DE ENTREGA:*',
            '',
            'Si elegiste *Delivery*, para cotizar tu envío con precisión y que el motorizado llegue directo a tu puerta:',
            '👉 Envíanos tu *ubicación GPS* (toca el clip 📎 y selecciona "Ubicación") o escribe tu *zona y dirección exacta* con punto de referencia.',
            '',
            '_(Si elegiste retiro en tienda, solo responde "tienda" o "ok")_:'
        ].join('\n'),
        { capture: true },
        async (ctx, { state, flowDynamic, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }

            const s = state.getMyState() || {};
            const isDelivery = Boolean(s.isDelivery);

            // 1. Detectar si enviaron ubicación nativa de WhatsApp
            let latitude = ctx.message?.locationMessage?.degreesLatitude || null;
            let longitude = ctx.message?.locationMessage?.degreesLongitude || null;
            let address = ctx.body?.trim() || (latitude ? 'Ubicación GPS' : 'Tienda');

            // 2. Si enviaron enlace de Maps por texto
            if (!latitude && address.includes('maps')) {
                const match = address.match(/(-?\d+\.\d+),(-?\d+\.\d+)/);
                if (match) {
                    latitude = parseFloat(match[1]);
                    longitude = parseFloat(match[2]);
                }
            }

            // 3. Estimar tarifa de delivery
            const feeEst = isDelivery
                ? estimateDeliveryFee({ latitude, longitude, zoneText: address })
                : { fee: null, tier: null, label: '', isEstimated: false };

            await state.update({
                address,
                latitude,
                longitude,
                deliveryFee: feeEst.fee,
                deliveryLabel: feeEst.label
            });

            if (isDelivery && feeEst.fee) {
                await flowDynamic(`🛵 *Tarifa de delivery sugerida:* $${feeEst.fee.toFixed(2)} (${feeEst.label})`);
            }
        }
    )
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

            // 2. Enviar resumen al cliente
            const summary = orderService.buildSummary(order);
            await flowDynamic(summary);

            // 3. Notificar al grupo de despacho de la tienda e iniciar el hilo
            const storeNotice = orderService.buildStoreNotification(order);
            const adminGroups = storeService.getStore().adminGroups || [];

            for (const groupId of adminGroups) {
                try {
                    const sentMsg = await provider.sendMessage(groupId, storeNotice, {});
                    if (sentMsg?.key?.id) {
                        orderService.registerThreadMessage(order.id, sentMsg.key.id);
                    }
                } catch (err) {
                    console.error(`Error enviando pedido #${order.id} al grupo ${groupId}:`, err.message);
                }
            }
        }
    );
