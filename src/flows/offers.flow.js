import { addKeyword } from '@builderbot/bot';
import fs from 'fs';
import { PROMOS } from '../config/data.js';
import { storeService } from '../services/storeService.js';

export const flowOffers = addKeyword(['1', 'oferta', 'ofertas', 'promocion', 'promociones', 'precios', 'catalogo', 'ver ofertas'])
    .addAction(async (_, { endFlow }) => {
        if (storeService.isPaused()) {
            return endFlow();
        }
    })
    .addAnswer('🍗 *¡OFERTAS Y PROMOCIONES DESTACADAS EN PITAPOLLO!*')
    .addAction(async (_, { flowDynamic }) => {
        // Envío de imágenes de promociones activas
        for (const promo of PROMOS) {
            if (fs.existsSync(promo.image)) {
                await flowDynamic([
                    {
                        body: `✨ *${promo.title}*\n${promo.description}`,
                        media: promo.image
                    }
                ]);
            } else {
                await flowDynamic(`✨ *${promo.title}*\n${promo.description}`);
            }
        }
    })
    .addAnswer('Consultando precios actualizados...')
    .addAction(async (_, { flowDynamic }) => {
        // Obtener catálogo y precios (dinámicos o por defecto)
        const currentCatalog = storeService.getFormattedCatalog();
        await flowDynamic(currentCatalog);
    })
    .addAnswer(
        [
            '',
            '¿Qué te gustaría hacer ahora?',
            '• Responde *2* para *Hacer un Pedido*',
            '• Responde *3* para ver *Métodos de Pago*',
            '• Responde *menu* para volver al Menú Principal'
        ].join('\n')
    );
