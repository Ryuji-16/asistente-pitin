import { utils } from '@builderbot/bot';
import { orderService } from './orderService.js';
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

    const originalInitVendor = adapterProvider.initVendor.bind(adapterProvider);

    adapterProvider.initVendor = async function (...args) {
        const sockEv = await originalInitVendor(...args);

        if (sockEv && typeof sockEv.on === 'function') {
            attachGroupListener(adapterProvider, sockEv);
        }

        return sockEv;
    };

    logger.info('Soporte de grupos WhatsApp (Baileys) activado.');
}

/**
 * Conecta el listener de eventos de Baileys para procesar mensajes de grupos
 * @param {Object} adapterProvider
 * @param {Object} sockEv Baileys event emitter
 */
function attachGroupListener(adapterProvider, sockEv) {
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
                const isMedia = hasImage || hasDoc;

                // Si el cajero cita un pedido pendiente de ticket con texto (ej: "Son $25.50"),
                // convertirlo automáticamente en comando #cuenta para que Pitín lo entregue al cliente
                if (!isCommand && !isMedia && isQuotedPendingTicket && trimmedText) {
                    isCommand = true;
                    trimmedText = '#cuenta ' + trimmedText;
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

                // Definir el body para BuilderBot
                let body = trimmedText;
                if (hasImage) {
                    body = utils.generateRefProvider('_event_media_');
                } else if (hasDoc) {
                    body = utils.generateRefProvider('_event_document_');
                }

                // Normalizar participante (en caso de que WhatsApp envíe identificador LID)
                let participant = messageCtx.key?.participantAlt || messageCtx.key?.participant || messageCtx.participant || '';
                if (participant.includes('@lid') && messageCtx.key?.participantAlt) {
                    participant = messageCtx.key.participantAlt;
                }

                const payload = {
                    ...messageCtx,
                    body,
                    name: messageCtx.pushName || '',
                    from: remoteJid, // e.g. 120363xxxx@g.us
                    participant,
                };

                logger.info(`[WhatsApp Grupo ${remoteJid}] Comando/Evento detectado: "${body}" (de: ${participant || 'remitente'})`);

                // Emitir directamente al motor de BuilderBot
                adapterProvider.emit('message', payload);
            }
        } catch (err) {
            logger.error('Error en baileysGroupAdapter:', err);
        }
    });
}
