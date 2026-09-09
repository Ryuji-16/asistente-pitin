import { addKeyword, EVENTS } from '@builderbot/bot';
import { storeService } from '../services/storeService.js';

export const flowMedia = addKeyword(EVENTS.MEDIA)
    .addAction(async (ctx, { endFlow, provider }) => {
        if (storeService.isPaused()) {
            return endFlow();
        }

        // Notificar a administradores de la tienda
        const sender = ctx.pushName || ctx.from || 'Cliente';
        const clientPhone = ctx.from || 'Desconocido';
        await storeService.notifyAdmins(
            provider,
            `📸 *Nuevo archivo/comprobante recibido* de *${sender}* (+${clientPhone}). Por favor revisa el chat para verificar.`
        );
    })
    .addAnswer(
        [
            '📸 *¡Archivo recibido!*',
            '',
            'Hemos recibido tu imagen o archivo. Si se trata de un comprobante de pago, nuestro equipo lo verificará de inmediato para procesar tu despacho. 👍',
            '',
            'Si tienes alguna consulta adicional, déjanos tu mensaje por aquí o escribe *menu* para ver opciones.'
        ].join('\n')
    );
