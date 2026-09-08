import { addKeyword, EVENTS } from '@builderbot/bot';
import { BUSINESS_INFO } from '../config/data.js';

export const flowWelcome = addKeyword([
    'hola', 'buenas', 'buen dia', 'buenas tardes', 'buenas noches',
    'menu', 'inicio', 'empezar', 'hey', 'alo', 'saludos',
    EVENTS.WELCOME
])
    .addAnswer(
        [
            `¡Hola! 👋 Te habla *${BUSINESS_INFO.assistantName}*, tu asistente virtual de *${BUSINESS_INFO.name}* 🍗✨`,
            '',
            'Estamos a tu orden con los mejores cortes de pollo fresco, congelados y charcutería al mejor precio.',
            '',
            'Por favor responde con el *número* de tu opción:',
            '',
            '1️⃣ 🍗 *Ver Ofertas y Promociones del Día*',
            '2️⃣ 🛒 *Hacer un Pedido (Delivery o Retiro en Tienda)*',
            '3️⃣ 💳 *Datos y Métodos de Pago (Pago Móvil / Zelle)*',
            '4️⃣ 📍 *Ubicación, Horarios y Zonas de Delivery*',
            '5️⃣ 👤 *Hablar con un Asesor Humano*',
            '',
            '_Escribe el número correspondiente (1, 2, 3, 4 o 5) para continuar._'
        ].join('\n')
    );
