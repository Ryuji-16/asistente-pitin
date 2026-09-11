import './patch-baileys.js';
import 'dotenv/config';
import { createBot, createProvider, createFlow, MemoryDB } from '@builderbot/bot';
import { BaileysProvider } from '@builderbot/provider-baileys';
import { fetchLatestBaileysVersion } from 'baileys';

import { botFlows } from './flows/index.js';
import { logger } from './utils/logger.js';
import { BUSINESS_INFO } from './config/data.js';
import { enableGroupSupport } from './services/baileysGroupAdapter.js';

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
    const adapterProvider = createProvider(BaileysProvider, {
        port: PORT,
        version,
        writeMyself: 'none',
        groupsIgnore: false,
    });

    // Activar receptor de comandos y multimedia en grupos de WhatsApp
    enableGroupSupport(adapterProvider);

    const bot = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    // 1. Proteger contra respuestas automáticas a los mensajes propios del dueño en chats privados
    // 2. Proteger pasos con capture: true contra secuestro por palabras clave globales (ej: '1', '2', productos, delivery)
    const originalHandleMsg = bot.handleMsg.bind(bot);
    bot.handleMsg = async (messageCtxInComing) => {
        const remoteJid = messageCtxInComing.key?.remoteJid || messageCtxInComing.from || '';
        const isGroup = remoteJid.endsWith('@g.us');

        // REGLA CRÍTICA: Si el mensaje fue enviado por el dueño del teléfono (fromMe: true) en un chat privado,
        // IGNORARLO TOTALMENTE para no responderle al cliente como si el cliente hubiera escrito ese mensaje.
        if (messageCtxInComing.key?.fromMe && !isGroup) {
            return;
        }

        const prevMsg = await adapterDB.getPrevByNumber(messageCtxInComing.from);
        const isCapturing = prevMsg?.options?.capture;
        const bodyText = (messageCtxInComing.body || '').trim().toLowerCase();
        const isCancel = ['cancelar', 'cancela', 'salir', 'menu', 'inicio'].includes(bodyText);

        if (isCapturing && !isCancel) {
            const tempFind = bot.flowClass.find;
            bot.flowClass.find = (key, isRef, ...rest) => {
                if (isRef) return tempFind.call(bot.flowClass, key, isRef, ...rest);
                return [];
            };
            try {
                return await originalHandleMsg(messageCtxInComing);
            } finally {
                bot.flowClass.find = tempFind;
            }
        }
        return originalHandleMsg(messageCtxInComing);
    };


    const { httpServer } = bot;
    httpServer(+PORT);

    logger.success(`Servidor web activo en: http://localhost:${PORT}`);
    logger.info('Escanea el código QR desde la consola o abriendo el enlace web.');
    console.log('============================================================\n');
};

main().catch((err) => {
    logger.error('Error fatal al iniciar el bot:', err);
});
