import './patch-baileys.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createBot, createProvider, createFlow, MemoryDB, EVENTS } from '@builderbot/bot';
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

    // Servir código QR en vivo en la raíz web http://localhost:PORT
    if (adapterProvider.server) {
        adapterProvider.server.get('/', (_, res) => {
            const qrPath = path.resolve(process.cwd(), 'bot.qr.png');
            if (fs.existsSync(qrPath)) {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                const base64Img = fs.readFileSync(qrPath).toString('base64');
                res.end(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="4">
    <title>Vincular WhatsApp - Asistente Pitín</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #1e293b; border-radius: 16px; padding: 28px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4); text-align: center; max-width: 380px; width: 100%; border: 1px solid #334155; }
        h1 { font-size: 1.3rem; margin: 0 0 8px 0; color: #38bdf8; }
        p { color: #94a3b8; font-size: 0.9rem; margin: 0 0 20px 0; line-height: 1.4; }
        .qr-wrapper { background: #ffffff; padding: 14px; border-radius: 12px; display: inline-block; margin-bottom: 16px; }
        .qr-img { display: block; width: 260px; height: 260px; }
        .badge { background: #0369a1; color: #e0f2fe; padding: 6px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; display: inline-block; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🍗 Asistente Pitín</h1>
        <p>Abre WhatsApp en tu teléfono > <b>Dispositivos vinculados</b> > <b>Vincular un dispositivo</b> y escanea este código QR:</p>
        <div class="qr-wrapper">
            <img class="qr-img" src="data:image/png;base64,${base64Img}" alt="Código QR WhatsApp" />
        </div>
        <div>
            <span class="badge">🔄 Se actualiza en vivo cada 4 segundos</span>
        </div>
    </div>
</body>
</html>`);
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="2"><title>Iniciando...</title></head><body style="background:#0f172a;color:#fff;font-family:sans-serif;text-align:center;padding:50px;"><h2>🍗 Iniciando Asistente Pitín...</h2><p>Generando código QR, recargando en 2 segundos...</p></body></html>`);
            }
        });
    }

    // Activar receptor de comandos y multimedia en grupos de WhatsApp
    enableGroupSupport(adapterProvider);

    const bot = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    // Registro de deduplicación atómica para grupos
    const processedGroupMsgIds = new Set();

    // 1. Proteger contra respuestas automáticas a los mensajes propios del dueño en chats privados
    // 2. Proteger pasos con capture: true contra secuestro por palabras clave globales (ej: '1', '2', productos, delivery)
    // 3. Bloqueo total de flujos de clientes en TODOS los grupos de WhatsApp (@g.us)
    const originalHandleMsg = bot.handleMsg.bind(bot);
    bot.handleMsg = async (messageCtxInComing) => {
        const remoteJid = messageCtxInComing.key?.remoteJid || messageCtxInComing.from || '';
        const isGroup = remoteJid.endsWith('@g.us');

        // REGLA CRÍTICA 1: Si el mensaje fue enviado por el dueño del teléfono (fromMe: true) en un chat privado,
        // IGNORARLO TOTALMENTE para no responderle al cliente como si el cliente hubiera escrito ese mensaje.
        if (messageCtxInComing.key?.fromMe && !isGroup) {
            return;
        }

        // REGLA CRÍTICA 2 (GRUPOS @g.us):
        // En cualquier grupo de WhatsApp SOLO se permiten comandos (#...) o eventos de fotos/documentos (tickets).
        // Bloqueo general contra cualquier respuesta de catálogo, pedidos o atención a clientes dentro de grupos.
        if (isGroup) {
            const msgId = messageCtxInComing.key?.id;
            if (msgId) {
                const dedupKey = `${msgId}__${remoteJid}`;
                if (processedGroupMsgIds.has(dedupKey)) {
                    return;
                }
                processedGroupMsgIds.add(dedupKey);
                setTimeout(() => processedGroupMsgIds.delete(dedupKey), 15000);
            }

            const rawBody = (messageCtxInComing.body || '').trim();
            const isCommand = rawBody.startsWith('#');
            const isMedia =
                rawBody === EVENTS.MEDIA ||
                rawBody === EVENTS.DOCUMENT ||
                rawBody.startsWith('_event_media_') ||
                rawBody.startsWith('_event_document_');

            if (!isCommand && !isMedia) {
                return;
            }
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
