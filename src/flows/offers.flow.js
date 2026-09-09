import { addKeyword } from '@builderbot/bot';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storeService } from '../services/storeService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, '../../assets');

export const flowOffers = addKeyword(['1', '1️⃣', 'oferta', 'ofertas', 'promocion', 'promociones', 'precios', 'catalogo', 'ver ofertas'])
    .addAction(async (_, { endFlow }) => {
        if (storeService.isPaused()) {
            return endFlow();
        }
    })
    .addAnswer('🍗 *¡LISTA DE PRECIOS Y PRODUCTOS EMPAQUETADOS - PITAPOLLO!*')
    .addAction(async (_, { flowDynamic }) => {
        // 1. Si existe un catálogo en PDF en assets, enviarlo como documento
        const pdfCandidates = [
            path.join(assetsDir, 'catalogo.pdf'),
            path.join(assetsDir, 'catalogo_pitapollo.pdf'),
            path.join(assetsDir, 'lista_precios.pdf')
        ];
        const existingPdf = pdfCandidates.find(p => fs.existsSync(p));

        if (existingPdf) {
            await flowDynamic([
                {
                    body: '📄 *Aquí tienes nuestra lista de precios completa en PDF para guardar y compartir:*',
                    media: existingPdf
                }
            ]);
        }

        // 2. Envío de las secciones del catálogo completas y organizadas
        const sections = storeService.getCatalogSections();
        for (const section of sections) {
            await flowDynamic(section);
        }
    })
    .addAnswer(
        [
            '¿Qué te gustaría hacer ahora?',
            '',
            '• Responde *2* para *Hacer un Pedido*',
            '• Responde *3* para ver *Métodos de Pago*',
            '• Responde *menu* para volver al Menú Principal'
        ].join('\n')
    );
