import { addKeyword } from '@builderbot/bot';
import { storeService } from '../services/storeService.js';
import { catalogSearchService } from '../services/catalogSearchService.js';
import { hasExplicitItems } from '../services/orderParser.js';
import { flowOrder } from './order.flow.js';

export const flowPriceInquiry = addKeyword(catalogSearchService.getTriggerKeywords())
    .addAction(async (ctx, { flowDynamic, gotoFlow, endFlow }) => {
        const remoteJid = ctx.key?.remoteJid || ctx.from || '';
        if (remoteJid.endsWith('@g.us') || storeService.isPaused()) {
            return endFlow();
        }

        // Si el cliente tiene intención directa de compra con productos o cantidades (ej: "Hola quiero 10kg de muslo")
        if (hasExplicitItems(ctx.body)) {
            return gotoFlow(flowOrder);
        }

        const answer = catalogSearchService.searchProductPrice(ctx.body);
        if (answer) {
            await flowDynamic(answer);
            return endFlow();
        }

        // Si el usuario envió una palabra genérica ("precio", "a cómo", "cuánto cuesta") sin especificar producto
        await flowDynamic(
            [
                '🍗 *Consulta de Precios y Productos - PitaPollo*',
                '',
                '¿Qué producto o corte deseas consultar? Puedes preguntarme directamente por:',
                '• *Pechuga* (Filet sin piel/hueso o Pechuga con hueso)',
                '• *Milanesa de pechuga* (estilo bistec)',
                '• *Alas* o *Muslos*',
                '• *Pollo entero* o *Pollo picado*',
                '• *Carne molida*, *solomo*, *lomito*, *punta trasera*',
                '• *Chuletas*, *costillas de cerdo*, *pernil*',
                '• *Queso duro*, *mozzarella*, *tequeños*...',
                '',
                '📄 O responde *1* para recibir nuestro *Catálogo Oficial Completo en PDF*.'
            ].join('\n')
        );
        return endFlow();
    });
