import { addKeyword, EVENTS } from '@builderbot/bot';
import { BUSINESS_INFO } from '../config/data.js';
import { storeService } from '../services/storeService.js';
import { catalogSearchService } from '../services/catalogSearchService.js';

export const flowWelcome = addKeyword([
    'hola', 'buenas', 'buen dia', 'buenas tardes', 'buenas noches',
    'menu', 'inicio', 'empezar', 'hey', 'alo', 'saludos',
    EVENTS.WELCOME
])
    .addAction(async (ctx, { flowDynamic, endFlow }) => {
        if (storeService.isPaused()) {
            return endFlow();
        }

        // Si el cliente consultó un precio o producto directamente y llegó a welcome/fallback
        const productAnswer = catalogSearchService.searchProductPrice(ctx.body);
        if (productAnswer) {
            await flowDynamic(productAnswer);
            return endFlow();
        }
    })
    .addAnswer(
        [
            `¡Hola! 👋 Te habla *${BUSINESS_INFO.assistantName}*, tu asistente virtual de *${BUSINESS_INFO.name}* 🍗✨`,
            '',
            'Estamos a tu orden con los mejores cortes de pollo fresco, congelados y charcutería al mejor precio de Caracas.',
            '',
            '╭─────────────────────────╮',
            '│ 🍗 1️⃣  *Ver Catálogo y Precios (PDF)*',
            '│ 🛒 2️⃣  *Hacer un Pedido*',
            '│ 💳 3️⃣  *Métodos de Pago*',
            '│ 📍 4️⃣  *Ubicación y Horarios*',
            '│ 👤 5️⃣  *Hablar con un Asesor*',
            '╰─────────────────────────╯',
            '',
            '👉 *Responde con el número (1, 2, 3, 4 o 5)* para continuar, o pregúntame directamente por el precio de cualquier corte.'
        ].join('\n')
    );
