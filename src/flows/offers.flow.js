import { addKeyword } from '@builderbot/bot';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storeService } from '../services/storeService.js';
import { hasExplicitItems } from '../services/orderParser.js';
import { flowOrder } from './order.flow.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, '../../assets');

export const flowOffers = addKeyword([
    '1', '1️⃣', 'oferta', 'ofertas', 'promocion', 'promociones',
    'catalogo', 'catálogo', 'lista', 'la lista', 'lista de precios',
    'precios', 'precio', 'ver ofertas', 'ver catalogo', 'ver catálogo'
])
    .addAction(async (ctx, { flowDynamic, gotoFlow, endFlow }) => {
        const remoteJid = ctx.key?.remoteJid || ctx.from || '';
        if (remoteJid.endsWith('@g.us') || storeService.isPaused()) {
            return endFlow();
        }

        // Si el cliente tiene intención directa de compra con productos o cantidades (ej: "Quiero 1 oferta de cada una y 2 pollos")
        if (hasExplicitItems(ctx.body)) {
            return gotoFlow(flowOrder);
        }

        const catalogoPdf = path.join(assetsDir, 'catalogo.pdf');
        const pdfCandidates = [
            catalogoPdf,
            path.join(assetsDir, 'catalogo_pitapollo.pdf'),
            path.join(assetsDir, 'lista_precios.pdf')
        ];
        const existingPdf = pdfCandidates.find(p => fs.existsSync(p));

        if (existingPdf) {
            await flowDynamic([
                {
                    body: [
                        '🍗 *Catálogo y Lista de Precios - PitaPollo*',
                        '',
                        '🛒 *Para ordenar:* Escribe directamente lo que deseas (ej: *2kg de muslo*) o responde *2*.'
                    ].join('\n'),
                    media: existingPdf
                }
            ]);
        } else {
            // Fallback en caso de que no se encuentre el archivo PDF en assets
            await flowDynamic('🍗 *Catálogo y Lista de Precios - PitaPollo*');
            const sections = storeService.getCatalogSections();
            for (const section of sections) {
                await flowDynamic(section);
            }
            await flowDynamic('🛒 *Para ordenar:* Escribe directamente lo que deseas (ej: *2kg de muslo*) o responde *2*.');
        }
        return endFlow();
    });
