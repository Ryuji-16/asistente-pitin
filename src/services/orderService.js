/**
 * Servicio para gestión y formateo de pedidos de PitaPollo
 */
export class OrderService {
    /**
     * Construye un resumen legible para el cliente y el equipo de tienda
     * @param {Object} orderData
     * @returns {string}
     */
    static buildSummary({ clientName, items, isDelivery, address, paymentChoice }) {
        const isTransfer = (paymentChoice || '').includes('Pago') || (paymentChoice || '').includes('Zelle');

        const lines = [
            '🎉 *¡RESUMEN DE TU PEDIDO!*',
            '═══════════════════════════════',
            `👤 *Cliente:* ${clientName || 'Cliente'}`,
            `🛒 *Detalle del Pedido:*\n${items || 'No especificado'}`,
            '',
            `🛵 *Modalidad:* ${isDelivery ? 'Delivery' : 'Retiro en tienda (La Trinidad)'}`,
            isDelivery && address ? `📍 *Dirección de entrega:* ${address}` : '',
            `💳 *Método de pago:* ${paymentChoice || 'A convenir'}`,
            '═══════════════════════════════',
            '',
            '✅ *Tu pedido ha sido registrado con éxito.*',
            'En breve uno de nuestros encargados te confirmará el peso exacto y el total a pagar.',
            '',
            isTransfer
                ? '📌 *Recordatorio:* Recuerda enviar la captura del comprobante por este chat para verificar tu pago.\n_(Escribe *3* si necesitas consultar nuevamente las cuentas bancarias)_'
                : '¡Muchas gracias por preferir a PitaPollo! Te esperamos.'
        ];

        return lines.filter(line => line !== '').join('\n');
    }
}
