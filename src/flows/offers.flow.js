import { addKeyword } from '@builderbot/bot';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storeService } from '../services/storeService.js';
import { hasExplicitItems } from '../services/orderParser.js';
import { flowOrder } from './order.flow.js';

import { BUSINESS_INFO } from '../config/data.js';
import { storeConfigLoader } from '../config/storeConfigLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, '../../assets');

export const flowOffers = addKeyword([
    '1', '1️⃣',
    'oferta', 'Oferta', 'OFERTA', 'ofertas', 'Ofertas', 'OFERTAS',
    'promocion', 'Promocion', 'PROMOCION', 'promoción', 'Promoción', 'PROMOCIÓN',
    'promociones', 'Promociones', 'PROMOCIONES',
    'catalogo', 'Catalogo', 'CATALOGO', 'catálogo', 'Catálogo', 'CATÁLOGO',
    'lista', 'Lista', 'LISTA', 'la lista', 'La lista', 'lista de precios', 'Lista de precios',
    'precios', 'Precios', 'PRECIOS', 'precio', 'Precio', 'PRECIO',
    'ver ofertas', 'Ver ofertas', 'ver catalogo', 'Ver catalogo', 'ver catálogo', 'Ver catálogo'
], { sensitive: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow, endFlow }) => {
        const remoteJid = ctx.key?.remoteJid || ctx.from || '';
        if (remoteJid.endsWith('@g.us') || storeService.isPaused()) {
            return endFlow();
        }

        // Si el cliente tiene intención directa de compra con productos o cantidades
        if (hasExplicitItems(ctx.body)) {
            return gotoFlow(flowOrder);
        }

        const configuredPdf = storeConfigLoader.getCatalog().pdfFile;
        const pdfCandidates = [
            configuredPdf ? path.join(assetsDir, configuredPdf) : null,
            path.join(assetsDir, 'catalogo.pdf'),
            path.join(assetsDir, 'catalogo_pitapollo.pdf'),
            path.join(assetsDir, 'lista_precios.pdf')
        ].filter(Boolean);
        const existingPdf = pdfCandidates.find(p => fs.existsSync(p));

        const catalogTitle = `${BUSINESS_INFO.icon || '📖'} *Catálogo y Lista de Precios - ${BUSINESS_INFO.name}*`;

        if (existingPdf) {
            await flowDynamic([
                {
                    body: [
                        catalogTitle,
                        '',
                        '🛒 *Para ordenar:* Escribe directamente lo que deseas ordenar o responde *2*.'
                    ].join('\n'),
                    media: existingPdf
                }
            ]);
        } else {
            // Fallback en caso de que no se encuentre el archivo PDF en assets
            await flowDynamic(catalogTitle);
            const sections = storeService.getCatalogSections();
            for (const section of sections) {
                await flowDynamic(section);
            }
            await flowDynamic('🛒 *Para ordenar:* Escribe directamente lo que deseas ordenar o responde *2*.');
        }
        return endFlow();
    });
