import { addKeyword } from '@builderbot/bot';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storeService } from '../services/storeService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, '../../assets');

export const flowOffers = addKeyword([
    '1', '1️⃣', 'oferta', 'ofertas', 'promocion', 'promociones',
    'catalogo', 'catálogo', 'lista de precios', 'ver ofertas', 'ver catalogo', 'ver catálogo'
], { sensitive: true })
    .addAction(async (ctx, { endFlow }) => {
        const remoteJid = ctx.key?.remoteJid || ctx.from || '';
        if (remoteJid.endsWith('@g.us') || storeService.isPaused()) {
            return endFlow();
        }
    })
    .addAnswer('🍗 *¡CATÁLOGO Y LISTA DE PRECIOS - PITAPOLLO!*')
    .addAction(async (_, { flowDynamic }) => {
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
                    body: '📄 *Aquí tienes nuestro Catálogo y Lista de Precios Oficial de PitaPollo en formato PDF con todos nuestros cortes, combos y congelados.*',
                    media: existingPdf
                }
            ]);

            await flowDynamic(
                [
                    '💡 *¿Buscas el precio de algún producto en específico?*',
                    'Puedes preguntarme directamente en cualquier momento (ej: *¿a cómo está la pechuga?*, *precio de las alas*, *milanesa*, *queso duro*, *costillas*, etc.) y te daré el precio al instante.',
                    '',
                    '¿Qué te gustaría hacer ahora?',
                    '• Responde *2* para *Hacer un Pedido*',
                    '• Responde *3* para ver *Métodos de Pago*',
                    '• Responde *menu* para volver al Menú Principal'
                ].join('\n')
            );
        } else {
            // Fallback en caso de que no se encuentre el archivo PDF en assets
            const sections = storeService.getCatalogSections();
            for (const section of sections) {
                await flowDynamic(section);
            }
            await flowDynamic(
                [
                    '¿Qué te gustaría hacer ahora?',
                    '',
                    '• Responde *2* para *Hacer un Pedido*',
                    '• Responde *3* para ver *Métodos de Pago*',
                    '• Responde *menu* para volver al Menú Principal'
                ].join('\n')
            );
        }
    });
