import { addKeyword } from '@builderbot/bot';
import { BUSINESS_INFO } from '../config/data.js';
import { STORE_LOCATION, DELIVERY_ZONES_TEXT } from '../config/delivery.js';
import { storeService } from '../services/storeService.js';
import { getStoreScheduleText, getOffHoursNotice } from '../services/scheduleService.js';

export const flowInfo = addKeyword([
    '4', '4️⃣', 'ubicacion', 'ubicación', 'direccion', 'dirección',
    'donde estan', 'donde están', 'donde queda', 'donde quedan',
    'como llegar', 'cómo llegar', 'google maps', 'maps', 'gps',
    'tienda fisica', 'tienda física', 'local', 'sede', 'punto de referencia',
    'horario', 'horarios', 'delivery', 'zonas de delivery', 'tarifas delivery',
    'costo delivery', 'precio delivery'
], { sensitive: true })
    .addAction(async (ctx, { endFlow }) => {
        const remoteJid = ctx.key?.remoteJid || ctx.from || '';
        if (remoteJid.endsWith('@g.us') || storeService.isPaused()) {
            return endFlow();
        }
    })
    .addAnswer(
        [
            `📍 *UBICACIÓN Y HORARIOS - ${BUSINESS_INFO.name.toUpperCase()}*`,
            '═════════════════════════════════',
            '🏠 *Dirección de la Tienda:*',
            BUSINESS_INFO.address,
            '',
            '📌 *Punto de Referencia:*',
            'A pocos metros de la zona comercial y Farmatodo de La Trinidad.',
            '',
            '🗺️ *Abrir en Google Maps / GPS:*',
            `https://maps.google.com/?q=${STORE_LOCATION.latitude},${STORE_LOCATION.longitude}`,
            '',
            getStoreScheduleText(),
            '',
            DELIVERY_ZONES_TEXT,
            '',
            `📞 *Teléfono de Contacto:* ${BUSINESS_INFO.phone}`,
            `📸 *Instagram:* ${BUSINESS_INFO.instagram}`,
            '═════════════════════════════════',
            '',
            '👉 *¿Qué te gustaría hacer ahora?*',
            '• Responde *1* para ver *Catálogo y Precios (PDF)*',
            '• Responde *2* para *Hacer un Pedido*',
            '• Responde *menu* para volver al Menú Principal'
        ].join('\n')
    );
