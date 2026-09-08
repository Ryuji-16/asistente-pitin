import { addKeyword } from '@builderbot/bot';
import { BUSINESS_INFO } from '../config/data.js';

export const flowInfo = addKeyword(['4', 'ubicacion', 'direccion', 'donde estan', 'horario', 'horarios', 'delivery', 'zona', 'zonas'])
    .addAnswer(
        [
            `📍 *UBICACIÓN Y HORARIOS - ${BUSINESS_INFO.name.toUpperCase()}*`,
            '',
            '🏠 *Dirección de la Tienda:*',
            BUSINESS_INFO.address,
            '',
            '🕒 *Horario de Atención:*',
            BUSINESS_INFO.schedule,
            '',
            '🛵 *Servicio de Delivery:*',
            BUSINESS_INFO.deliveryZones,
            '',
            `📞 *Teléfono de Contacto:* ${BUSINESS_INFO.phone}`,
            `📸 *Instagram:* ${BUSINESS_INFO.instagram}`,
            '',
            'Escribe *menu* para volver al inicio.'
        ].join('\n')
    );
