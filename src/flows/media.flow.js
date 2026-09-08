import { addKeyword, EVENTS } from '@builderbot/bot';
import { storeService } from '../services/storeService.js';

export const flowMedia = addKeyword(EVENTS.MEDIA)
    .addAction(async (_, { endFlow }) => {
        if (storeService.isPaused()) {
            return endFlow();
        }
    })
    .addAnswer(
        [
            '📸 *¡Comprobante / Archivo recibido!*',
            '',
            'Hemos recibido tu imagen o comprobante. Nuestro equipo validará el pago y procesará tu despacho a la brevedad. 👍',
            '',
            'Si tienes alguna consulta adicional, déjanos tu mensaje por aquí o escribe *menu* para ver opciones.'
        ].join('\n')
    );
