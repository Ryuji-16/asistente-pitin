import { addKeyword } from '@builderbot/bot';
import { OrderService } from '../services/orderService.js';
import { storeService } from '../services/storeService.js';

const isCancelRequest = (text = '') => {
    const clean = text.trim().toLowerCase();
    return ['cancelar', 'cancela', 'salir', 'menu', 'inicio'].includes(clean);
};

export const flowOrder = addKeyword(['2', 'pedido', 'pedir', 'comprar', 'orden', 'hacer pedido'])
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
        'Si elegiste *Delivery*, escribe tu *dirección exacta con punto de referencia*.\n\n_(Si elegiste retiro en tienda, solo responde "tienda" o "ok")_:',
        { capture: true },
        async (ctx, { state, flowDynamic, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }
            await state.update({ address: ctx.body?.trim() || 'Tienda' });
        }
    )
    .addAnswer(
        '¿Cuál será tu método de pago?\n\nResponde con el número:\n1️⃣ *Pago Móvil (Banesco)*\n2️⃣ *Zelle*\n3️⃣ *Efectivo (Divisas / Bs)*\n4️⃣ *Punto de venta en tienda*',
        { capture: true },
        async (ctx, { state, flowDynamic, provider, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Pedido cancelado.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }

            let paymentChoice = (ctx.body || '').trim();
            if (paymentChoice === '1') paymentChoice = 'Pago Móvil (Banesco)';
            else if (paymentChoice === '2') paymentChoice = 'Zelle';
            else if (paymentChoice === '3') paymentChoice = 'Efectivo';
            else if (paymentChoice === '4') paymentChoice = 'Punto de venta en tienda';

            await state.update({ paymentChoice });
            const s = state.getMyState() || {};

            const summary = OrderService.buildSummary({
                clientName: s.clientName,
                items: s.items,
                isDelivery: s.isDelivery,
                address: s.address,
                paymentChoice
            });

            // Enviar resumen al cliente
            await flowDynamic(summary);

            // Notificar a los canales administrativos de la tienda
            const clientPhone = ctx.from || 'Desconocido';
            const adminNotice = [
                '🚨 *¡NUEVO PEDIDO REGISTRADO!*',
                '═══════════════════════════════',
                `📱 *Cliente WhatsApp:* https://wa.me/${clientPhone}`,
                '',
                summary
            ].join('\n');

            await storeService.notifyAdmins(provider, adminNotice);
        }
    );
