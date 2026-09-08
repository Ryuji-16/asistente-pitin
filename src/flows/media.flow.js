import { addKeyword, EVENTS } from '@builderbot/bot';

export const flowMedia = addKeyword(EVENTS.MEDIA)
    .addAnswer(
        [
            '📸 *¡Comprobante / Archivo recibido!*',
            '',
            'Hemos recibido tu imagen o comprobante. Nuestro equipo validará el pago y procesará tu despacho a la brevedad. 👍',
            '',
            'Si tienes alguna consulta adicional, déjanos tu mensaje por aquí o escribe *menu* para ver opciones.'
        ].join('\n')
    );
