import 'dotenv/config';
import { createBot, createProvider, createFlow, MemoryDB } from '@builderbot/bot';
import { BaileysProvider } from '@builderbot/provider-baileys';
import { fetchLatestBaileysVersion } from 'baileys';

import { botFlows } from './flows/index.js';
import { logger } from './utils/logger.js';
import { BUSINESS_INFO } from './config/data.js';

const PORT = process.env.PORT || 3008;

const main = async () => {
    console.log('\n============================================================');
    console.log(`🍗 ASISTENTE ${BUSINESS_INFO.assistantName.toUpperCase()} - ${BUSINESS_INFO.name.toUpperCase()}`);
    console.log('============================================================');
    logger.info('Iniciando sistema y conectores...');

    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1043857760] }));
    logger.info(`Versión de protocolo WhatsApp: [${version.join(', ')}]`);

    const adapterDB = new MemoryDB();
    const adapterFlow = createFlow(botFlows);
    const adapterProvider = createProvider(BaileysProvider, { port: PORT, version });

    const { httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    httpServer(+PORT);

    logger.success(`Servidor web activo en: http://localhost:${PORT}`);
    logger.info('Escanea el código QR desde la consola o abriendo el enlace web.');
    console.log('============================================================\n');
};

main().catch((err) => {
    logger.error('Error fatal al iniciar el bot:', err);
});
