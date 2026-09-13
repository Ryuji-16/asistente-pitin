import { utils, EVENTS } from '@builderbot/bot';
import { orderService } from './orderService.js';
import { storeService } from './storeService.js';
import { storeConfigLoader } from '../config/storeConfigLoader.js';
import { logger } from '../utils/logger.js';

// Registro de mensajes procesados para evitar duplicados en el socket
const processedMessageIds = new Set();

/**
 * Habilita el soporte de grupos en BuilderBot Baileys.
 * BuilderBot por defecto descarta los mensajes que provienen de '@g.us'.
 * Este adaptador escucha los eventos nativos de Baileys (messages.upsert)
 * e inyecta los mensajes de comandos (#...) y multimedia (tickets) directamente al flujo.
 *
 * @param {Object} adapterProvider Instancia de BaileysProvider
 */
export function enableGroupSupport(adapterProvider) {
    if (!adapterProvider) return;

    // Asegurar que Baileys no ignore los grupos a nivel de socket
    if (adapterProvider.globalVendorArgs) {
        adapterProvider.globalVendorArgs.groupsIgnore = false;
    }

    // Interceptar emit para silenciar mensajes de grupos provenientes del listener interno de BaileysProvider
    // y permitir ÚNICAMENTE los procesados y sanitizados por este adaptador. Esto erradica mensajes duplicados.
    const originalEmit = adapterProvider.emit.bind(adapterProvider);
    adapterProvider.emit = function (event, ...args) {
        if (event === 'message') {
            const payload = args[0];
            const remoteJid = payload?.key?.remoteJid || payload?.from || '';
            if (remoteJid.endsWith('@g.us') && !payload?.__fromGroupAdapter__) {
                return false;
            }
        }
        return originalEmit(event, ...args);
    };

    const originalInitVendor = adapterProvider.initVendor.bind(adapterProvider);

    adapterProvider.initVendor = async function (...args) {
        const sockEv = await originalInitVendor(...args);

        if (sockEv && typeof sockEv.on === 'function') {
            attachGroupListener(adapterProvider, sockEv);
        }

        return sockEv;
    };

    logger.info('Soporte de grupos WhatsApp (Baileys) activado con control exclusivo de eventos.');
}

/**
 * Conecta el listener de eventos de Baileys para procesar mensajes de grupos
 * @param {Object} adapterProvider
 * @param {Object} sockEv Baileys event emitter
 */
function attachGroupListener(adapterProvider, sockEv) {
    // Sincronización automática de grupos al abrir la conexión
    sockEv.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            try {
                const groups = await (adapterProvider.vendor?.groupFetchAllParticipating ? adapterProvider.vendor.groupFetchAllParticipating() : null);
                if (groups) {
                    logger.info(`Sincronizando grupos de WhatsApp de la cuenta (${Object.keys(groups).length} detectados)...`);
                for (const [id, g] of Object.entries(groups)) {
                    const name = (g.subject || '').toLowerCase();
                    const groupKeyword = storeConfigLoader.getGroupKeyword();
                    // Vincular grupos que coincidan con la palabra clave configurada
                    if (groupKeyword && !name.includes(groupKeyword)) {
                        continue;
                    }
                    if (name.includes('pedido') || name.includes('despacho') || name.includes('entrega')) {
                        storeService.registerOrdersGroup(id);
                        logger.success(`[Auto-Grupo] Vinculado para Pedidos: "${g.subject}" (${id})`);
                    }
                    if (name.includes('actualiza') || name.includes('precio') || name.includes('tasa')) {
                        storeService.registerUpdatesGroup(id);
                        logger.success(`[Auto-Grupo] Vinculado para Actualizaciones: "${g.subject}" (${id})`);
                    }
                }
                }
            } catch (err) {
                logger.warn(`No se pudieron auto-sincronizar los grupos: ${err.message}`);
            }
        }
    });

    sockEv.on('messages.upsert', async (upsertEvent) => {
        try {
            const { messages, type } = upsertEvent || {};
            if (!['notify', 'append'].includes(type) || !Array.isArray(messages)) return;

            for (const messageCtx of messages) {
                const remoteJid = messageCtx?.key?.remoteJid || '';

                // Solo procesamos mensajes de grupos de WhatsApp (@g.us)
                // Los chats individuales los procesa BaileysProvider nativamente
                if (!remoteJid.endsWith('@g.us')) {
                    continue;
                }

                // Prevenir procesamiento duplicado local y con BaileysProvider
                const msgId = messageCtx?.key?.id;
                const dedupKey = `${msgId}__${remoteJid}`;
                if (msgId) {
                    if (processedMessageIds.has(dedupKey)) {
                        continue;
                    }
                    if (adapterProvider.idsDuplicates?.includes(dedupKey)) {
                        continue;
                    }
                    processedMessageIds.add(dedupKey);

                    // Mantener tamaño del Set controlado (máximo 300 IDs)
                    if (processedMessageIds.size > 300) {
                        const oldest = processedMessageIds.values().next().value;
                        processedMessageIds.delete(oldest);
                    }
                }

                // Extraer el contenido real considerando mensajes efímeros o de visualización única
                const msgContent =
                    messageCtx.message?.ephemeralMessage?.message ||
                    messageCtx.message?.viewOnceMessage?.message ||
                    messageCtx.message?.viewOnceMessageV2?.message ||
                    messageCtx.message;

                if (!msgContent) continue;

                // Extraer texto o pie de foto
                const textToBody =
                    msgContent?.extendedTextMessage?.text ??
                    msgContent?.conversation ??
                    msgContent?.imageMessage?.caption ??
                    msgContent?.videoMessage?.caption ??
                    msgContent?.documentMessage?.caption ??
                    msgContent?.documentWithCaptionMessage?.message?.documentMessage?.caption ??
                    '';

                const hasImage = !!msgContent?.imageMessage;
                const hasDoc = !!(msgContent?.documentMessage || msgContent?.documentWithCaptionMessage);
                const isMedia = hasImage || hasDoc;

                let trimmedText = textToBody.trim();
                const lowerText = trimmedText.toLowerCase();

                // Extraer stanzaId del mensaje citado si existe
                const quotedStanzaId =
                    msgContent?.extendedTextMessage?.contextInfo?.stanzaId ||
                    msgContent?.imageMessage?.contextInfo?.stanzaId ||
                    msgContent?.documentMessage?.contextInfo?.stanzaId;

                const orderQuoted = quotedStanzaId ? orderService.getOrderByThreadMessage(quotedStanzaId) : null;
                const isQuotedPendingTicket = orderQuoted && orderQuoted.status === 'PENDING_TICKET';

                let isCommand =
                    trimmedText.startsWith('#') ||
                    lowerText.startsWith('grupo ') ||
                    lowerText === '#pedidos' ||
                    lowerText === '#actualizaciones' ||
                    lowerText === '#despacho' ||
                    lowerText === 'pedidos' ||
                    lowerText === 'actualizaciones';

                // Si el mensaje cita un pedido en el grupo, permitir respuestas naturales sin obligar a escribir '#'
                if (!isCommand && !isMedia && orderQuoted) {
                    const cleanSimple = lowerText.replace(/[!.,;]/g, '').trim();
                    if (['ok', 'okey', 'okay', 'confirmado', 'pago ok', 'listo el pago'].includes(cleanSimple)) {
                        isCommand = true;
                        trimmedText = '#ok';
                    } else if (['en camino', 'camino', 'va en camino', 'salio', 'salió', 'despachado'].includes(cleanSimple)) {
                        isCommand = true;
                        trimmedText = '#camino';
                    } else if (['listo', 'listo el pedido', 'empacado', 'preparado'].includes(cleanSimple)) {
                        isCommand = true;
                        trimmedText = '#listo';
                    } else if (cleanSimple.startsWith('cambio ')) {
                        isCommand = true;
                        trimmedText = '#cambio ' + trimmedText.slice(7).trim();
                    } else if (isQuotedPendingTicket && trimmedText) {
                        // Si cita un pedido pendiente de ticket con texto (ej: "Son $25.50"),
                        // convertirlo automáticamente en comando #cuenta para que Pitín lo entregue al cliente
                        isCommand = true;
                        trimmedText = '#cuenta ' + trimmedText;
                    }
                }

                // REGLA CLAVE: En los grupos SOLO procesamos:
                // 1. Comandos que comiencen por '#' (ej: #grupo, #tasa, #precios, #ok, #camino, #listo, #cuenta, #cambio)
                // 2. Mensajes con foto/documento (ej: el cajero enviando la foto del ticket)
                // Las conversaciones casuales se ignoran para no saturar el grupo con respuestas del bot.
                if (!isCommand && !isMedia) {
                    continue;
                }

                // Si el mensaje fue enviado desde el mismo número del bot:
                // Permitimos comandos explícitos (#...), pero ignoramos cualquier otra cosa
                // para que el bot no entre en bucle respondiéndose a sí mismo.
                if (messageCtx.key?.fromMe && !isCommand) {
                    continue;
                }

                // Definir el body para BuilderBot con los eventos constantes correctos
                let body = trimmedText;
                if (hasImage) {
                    body = EVENTS.MEDIA;
                } else if (hasDoc) {
                    body = EVENTS.DOCUMENT;
                }

                // Normalizar participante (en caso de que WhatsApp envíe identificador LID)
                let participant = messageCtx.key?.participantAlt || messageCtx.key?.participant || messageCtx.participant || '';
                if (participant.includes('@lid') && messageCtx.key?.participantAlt) {
                    participant = messageCtx.key.participantAlt;
                }

                const payload = {
                    ...messageCtx,
                    body,
                    caption: trimmedText,
                    name: messageCtx.pushName || '',
                    from: remoteJid, // e.g. 120363xxxx@g.us
                    participant,
                    __fromGroupAdapter__: true,
                };

                logger.info(`[WhatsApp Grupo ${remoteJid}] Comando/Evento detectado: "${body}" (caption: "${trimmedText}", de: ${participant || 'remitente'})`);

                // Emitir directamente al motor de BuilderBot
                adapterProvider.emit('message', payload);
            }
        } catch (err) {
            logger.error('Error en baileysGroupAdapter:', err);
        }
    });
}
