import { BUSINESS_INFO, PAYMENT_METHODS } from '../config/data.js';
import { storeService } from '../services/storeService.js';
import { hasExplicitItems } from '../services/orderParser.js';
import { flowOrder } from './order.flow.js';

export const flowPayment = addKeyword(['3', '3️⃣', 'pago', 'pagos', 'pagar', 'cuenta', 'cuentas', 'zelle', 'pago movil', 'datos', 'transferencia', 'metodos de pago', 'metodos'], { sensitive: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow, endFlow }) => {
        const remoteJid = ctx.key?.remoteJid || ctx.from || '';
        if (remoteJid.endsWith('@g.us') || storeService.isPaused()) {
            return endFlow();
        }

        if (hasExplicitItems(ctx.body)) {
            return gotoFlow(flowOrder);
        }

        const blocks = [
            `💳 *MÉTODOS DE PAGO DISPONIBLES - ${BUSINESS_INFO.name.toUpperCase()}*`,
            ''
        ];

        if (PAYMENT_METHODS.pagoMovil && PAYMENT_METHODS.pagoMovil.telefono) {
            blocks.push('📱 *PAGO MÓVIL:*');
            blocks.push(`• *Banco:* ${PAYMENT_METHODS.pagoMovil.banco}`);
            blocks.push(`• *Teléfono:* ${PAYMENT_METHODS.pagoMovil.telefono}`);
            blocks.push(`• *RIF:* ${PAYMENT_METHODS.pagoMovil.rif}`);
            blocks.push(`• *Titular:* ${PAYMENT_METHODS.pagoMovil.titular}`);
            blocks.push('');
        }

        if (PAYMENT_METHODS.zelle && (PAYMENT_METHODS.zelle.email || PAYMENT_METHODS.zelle.enabled)) {
            blocks.push('💵 *ZELLE:*');
            blocks.push(`• *Correo:* ${PAYMENT_METHODS.zelle.email}`);
            blocks.push(`• *Titular:* ${PAYMENT_METHODS.zelle.titular}`);
            if (PAYMENT_METHODS.zelle.nota) {
                blocks.push(`• ${PAYMENT_METHODS.zelle.nota}`);
            }
            blocks.push('');
        }

        if (PAYMENT_METHODS.otros) {
            blocks.push('🏪 *OTROS MÉTODOS:*');
            blocks.push(PAYMENT_METHODS.otros);
            blocks.push('');
        }

        blocks.push('📌 *Nota:* Una vez realizado tu pago, por favor envía la captura o número de referencia por este chat para procesar tu pedido.');
        blocks.push('');
        blocks.push('Escribe *menu* para volver al inicio.');

        await flowDynamic(blocks.join('\n'));
        return endFlow();
    });
