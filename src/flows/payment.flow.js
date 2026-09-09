import { addKeyword } from '@builderbot/bot';
import { PAYMENT_METHODS } from '../config/data.js';
import { storeService } from '../services/storeService.js';

export const flowPayment = addKeyword(['3', '3️⃣', 'pago', 'pagos', 'pagar', 'cuenta', 'cuentas', 'zelle', 'pago movil', 'datos', 'transferencia', 'metodos de pago', 'metodos'])
    .addAction(async (_, { endFlow }) => {
        if (storeService.isPaused()) {
            return endFlow();
        }
    })
    .addAnswer(
        [
            '💳 *MÉTODOS DE PAGO DISPONIBLES - PITAPOLLO*',
            '',
            '📱 *PAGO MÓVIL:*',
            `• *Banco:* ${PAYMENT_METHODS.pagoMovil.banco}`,
            `• *Teléfono:* ${PAYMENT_METHODS.pagoMovil.telefono}`,
            `• *RIF:* ${PAYMENT_METHODS.pagoMovil.rif}`,
            `• *Titular:* ${PAYMENT_METHODS.pagoMovil.titular}`,
            '',
            '💵 *ZELLE:*',
            `• *Correo:* ${PAYMENT_METHODS.zelle.email}`,
            `• *Titular:* ${PAYMENT_METHODS.zelle.titular}`,
            `• ${PAYMENT_METHODS.zelle.nota}`,
            '',
            '🏪 *OTROS MÉTODOS:*',
            PAYMENT_METHODS.otros,
            '',
            '📌 *Nota:* Una vez realizado tu pago, por favor envía la captura o número de referencia por este chat para procesar tu pedido.',
            '',
            'Escribe *menu* para volver al inicio.'
        ].join('\n')
    );
