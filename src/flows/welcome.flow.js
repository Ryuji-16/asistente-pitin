import { addKeyword, EVENTS } from '@builderbot/bot';
import { BUSINESS_INFO } from '../config/data.js';
import { storeService } from '../services/storeService.js';
import { catalogSearchService } from '../services/catalogSearchService.js';

import { getOffHoursNotice } from '../services/scheduleService.js';

export const flowWelcome = addKeyword([
    'hola', 'buenas', 'buen dia', 'buenas tardes', 'buenas noches',
    'menu', 'inicio', 'empezar', 'hey', 'alo', 'saludos',
    EVENTS.WELCOME
])
    .addAction(async (ctx, { flowDynamic, endFlow }) => {
        if (storeService.isPaused()) {
            return endFlow();
        }

        // Nunca responder el menú de bienvenida en grupos de WhatsApp
        if (ctx.from?.endsWith('@g.us') || ctx.key?.remoteJid?.endsWith('@g.us')) {
            return endFlow();
        }

        // Si el cliente consultó un precio o producto directamente y llegó a welcome/fallback
        const productAnswer = catalogSearchService.searchProductPrice(ctx.body);
        if (productAnswer) {
            await flowDynamic(productAnswer);
            return endFlow();
        }

        // Si la tienda se encuentra fuera de horario comercial, avisar amablemente
        const offNotice = getOffHoursNotice();
        if (offNotice) {
            await flowDynamic(offNotice);
        }
    })
    .addAnswer(
        [
            `¡Hola! 👋 Te habla *${BUSINESS_INFO.assistantName}*, tu asistente de *${BUSINESS_INFO.name}* 🍗✨`,
            '',
            'Estamos a la orden con pollo fresco de primera, combos y charcutería.',
            '¿Qué tienes en mente llevar hoy, o prefieres que te comparta la lista de precios en PDF para revisar con calma?',
            '',
            '_(Si buscas delivery, saber dónde estamos o hablar con un asesor, solo dímelo y te ayudo con gusto)_.'
        ].join('\n')
    );
