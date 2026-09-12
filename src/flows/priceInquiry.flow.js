import { addKeyword } from '@builderbot/bot';
import { storeService } from '../services/storeService.js';
import { catalogSearchService } from '../services/catalogSearchService.js';
import { hasExplicitItems } from '../services/orderParser.js';
import { flowOrder } from './order.flow.js';
import { flowOffers } from './offers.flow.js';

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

        // Si el usuario envió una palabra genérica ("precio", "precios", "lista", "a cómo", "cuánto cuesta") sin especificar corte:
        // Enviamos directamente el Catálogo Oficial Completo (PDF)
        return gotoFlow(flowOffers);
    });
