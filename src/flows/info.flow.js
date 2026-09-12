import { addKeyword } from '@builderbot/bot';
import { BUSINESS_INFO } from '../config/data.js';
import { STORE_LOCATION } from '../config/delivery.js';
import { storeService } from '../services/storeService.js';
import { getStoreScheduleText } from '../services/scheduleService.js';
import { hasExplicitItems } from '../services/orderParser.js';
import { flowOrder } from './order.flow.js';

export const flowInfo = addKeyword([
    '4', '4️⃣', 'ubicacion', 'ubicación', 'direccion', 'dirección',
    'donde estan', 'donde están', 'donde queda', 'donde quedan',
    'como llegar', 'cómo llegar', 'google maps', 'maps', 'gps',
    'tienda fisica', 'tienda física', 'local', 'sede', 'punto de referencia',
    'horario', 'horarios'
], { sensitive: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow, endFlow }) => {
        const remoteJid = ctx.key?.remoteJid || ctx.from || '';
        if (remoteJid.endsWith('@g.us') || storeService.isPaused()) {
            return endFlow();
        }

        if (hasExplicitItems(ctx.body)) {
            return gotoFlow(flowOrder);
        }

        const rawBody = (ctx.body || '').trim();
        if (/maps\.google\.com|goo\.gl|maps\.app\.goo\.gl/i.test(rawBody) || /(-?\d+\.\d+),(-?\d+\.\d+)/.test(rawBody)) {
            await flowDynamic([
                '📍 *Hemos recibido tu ubicación GPS.* 🛵',
                '',
                '• Si deseas consultar la tarifa de delivery a esta zona, escribe *delivery*.',
                '• Si deseas hacer tu pedido con entrega en esta dirección, escribe directamente lo que deseas pedir o responde *2*.'
            ].join('\n'));
            return endFlow();
        }

        await flowDynamic([
            `📍 *UBICACIÓN Y HORARIOS - ${BUSINESS_INFO.name.toUpperCase()}*`,
            '',
            '🏠 *Dirección de la Tienda:*',
            BUSINESS_INFO.address,
            '',
            '📌 *Punto de Referencia:*',
            'A pocos metros de la zona comercial y Farmatodo de La Trinidad.',
            '',
            '📍 *Abrir en Google Maps / GPS:*',
            `https://maps.google.com/?q=${STORE_LOCATION.latitude},${STORE_LOCATION.longitude}`,
            '',
            getStoreScheduleText(),
            '',
            '🛵 *Servicio de Delivery:*',
            'Contamos con entregas a domicilio en Caracas. Si deseas consultar el costo hasta tu zona, solo pregúntame *costo de delivery*.',
            '',
            `📞 *Teléfono de Contacto:* ${BUSINESS_INFO.phone}`,
            `📸 *Instagram:* ${BUSINESS_INFO.instagram}`,
            '',
            '👉 Si deseas hacer un pedido, escribe directamente lo que necesitas o dime en qué más te puedo ayudar. 👍🍗'
        ].join('\n'));
        return endFlow();
    });
