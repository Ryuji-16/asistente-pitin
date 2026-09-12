import { addKeyword } from '@builderbot/bot';
import { estimateDeliveryFee } from '../config/delivery.js';
import { storeService } from '../services/storeService.js';
import { hasExplicitItems } from '../services/orderParser.js';
import { flowOrder } from './order.flow.js';

const isCancelRequest = (text = '') => {
    const clean = text.trim().toLowerCase();
    return ['cancelar', 'cancela', 'salir', 'menu', 'inicio'].includes(clean);
};

/**
 * Extrae coordenadas GPS (nativas o enlaces de Maps) o texto de zona desde el contexto del mensaje
 * @param {Object} ctx
 * @returns {{ latitude: number|null, longitude: number|null, zoneText: string }}
 */
function parseLocationFromContext(ctx) {
    let latitude = ctx.message?.locationMessage?.degreesLatitude || null;
    let longitude = ctx.message?.locationMessage?.degreesLongitude || null;
    let text = (ctx.body || '').trim();

    if (text.startsWith('_event_location_')) {
        text = '';
    }

    if (!latitude && text.includes('maps')) {
        const match = text.match(/(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
            latitude = parseFloat(match[1]);
            longitude = parseFloat(match[2]);
        }
    }

    return { latitude, longitude, zoneText: text };
}

/**
 * Construye la respuesta amigable y concisa con el costo del delivery calculado
 * @param {Object} feeEst Resultado de estimateDeliveryFee
 * @param {string} rawInput Texto original enviado por el usuario
 * @returns {string}
 */
export function formatDeliveryFeeResponse(feeEst, rawInput = '') {
    const zoneName = feeEst.zoneName || feeEst.matchedZone || feeEst.label || rawInput || 'tu sector';

    if (feeEst.fee !== null && feeEst.fee !== undefined) {
        return [
            '🛵 *Tarifa de Delivery - PitaPollo:*',
            '',
            `• 📍 *Zona / Sector:* ${zoneName}`,
            `• 💰 *Costo de envío:* $${Number(feeEst.fee).toFixed(2)}`,
            '',
            '¿Te gustaría hacer un pedido? 🍗✨',
            'Escribe directamente los productos que deseas (ej: *2kg de muslo*) o dinos en qué más te ayudamos.'
        ].join('\n');
    }

    return [
        '🛵 *Tarifa de Delivery - PitaPollo:*',
        '',
        `• 📍 *Zona / Sector:* ${zoneName}`,
        '• 💰 *Costo de envío:* Zona por verificar con la tienda',
        '',
        'Atendemos con gusto tu zona en Caracas. Para destinos fuera de nuestra ruta habitual, verificaremos la tarifa exacta al confirmar tu pedido.',
        '',
        '¿Te gustaría hacer un pedido? 🍗✨',
        'Escribe directamente los productos que deseas llevar.'
    ].join('\n');
}

/**
 * Flujo conversacional para consultar el costo del delivery
 */
export const flowDeliveryInquiry = addKeyword([
    'delivery', 'delibery', 'deluvery', 'deli',
    'costo delivery', 'costo de delivery',
    'precio delivery', 'precio de delivery',
    'tarifa delivery', 'tarifa de delivery', 'tarifas delivery',
    'cuanto cuesta el delivery', 'cuánto cuesta el delivery',
    'cuanto sale el delivery', 'cuánto sale el delivery',
    'cuanto cobran el delivery', 'cuánto cobran el delivery',
    'cuanto cobran de delivery', 'cuánto cobran de delivery',
    'hacen delivery', 'tienen delivery', 'servicio de delivery',
    'zonas de delivery', 'zona de delivery', 'cobertura delivery',
    'envio', 'envío', 'envios', 'envíos'
])
    .addAction(async (ctx, { flowDynamic, gotoFlow, endFlow }) => {
        const remoteJid = ctx.key?.remoteJid || ctx.from || '';
        if (remoteJid.endsWith('@g.us') || storeService.isPaused()) {
            return endFlow();
        }

        // Si el cliente ya tiene intención directa de compra con productos o cantidades (ej: "Quiero 2 pollos con delivery")
        if (hasExplicitItems(ctx.body)) {
            return gotoFlow(flowOrder);
        }

        // Verificar si el mensaje inicial ya contiene una zona específica conocida
        const { latitude, longitude, zoneText } = parseLocationFromContext(ctx);
        const initialCheck = estimateDeliveryFee({ latitude, longitude, zoneText });

        if (initialCheck && !initialCheck.isOtherZone && initialCheck.fee !== null) {
            await flowDynamic(formatDeliveryFeeResponse(initialCheck, zoneText));
            return endFlow();
        }
    })
    .addAnswer(
        [
            '🛵 *Servicio de Delivery - PitaPollo*',
            '',
            '¡Sí, contamos con servicio de delivery en Caracas! 🍗✨',
            '',
            'Para darte el costo exacto de entrega:',
            '👉 Envíanos tu *ubicación GPS* (tocando el clip 📎 y seleccionando "Ubicación") o escríbenos tu *zona o sector* (ej: La Trinidad, Las Minas, El Hatillo, Chacao, etc.).'
        ].join('\n'),
        { capture: true },
        async (ctx, { flowDynamic, gotoFlow, endFlow }) => {
            if (isCancelRequest(ctx.body)) {
                await flowDynamic('❌ *Consulta finalizada.* Escribe *menu* cuando desees ver las opciones.');
                return endFlow();
            }

            if (hasExplicitItems(ctx.body)) {
                return gotoFlow(flowOrder);
            }

            const { latitude, longitude, zoneText } = parseLocationFromContext(ctx);
            const feeEst = estimateDeliveryFee({ latitude, longitude, zoneText });

            await flowDynamic(formatDeliveryFeeResponse(feeEst, zoneText));
            return endFlow();
        }
    );
