import { sanitizePhone } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';

/**
 * Servicio para gestión y ciclo de vida de pedidos de PitaPollo
 */
class OrderService {
    constructor() {
        /** @type {Map<number, Object>} ID -> Order */
        this.orders = new Map();
        /** @type {Map<string, number>} MessageId -> OrderId */
        this.threadMsgMap = new Map();
        /** @type {Map<string, number>} SanitizedPhone -> OrderId */
        this.clientActiveOrder = new Map();
        this.lastOrderId = 1000;
    }

    /**
     * Genera un nuevo pedido y lo registra en el seguimiento activo
     * @param {Object} data
     * @returns {Object} Pedido creado
     */
    createOrder({
        clientPhone,
        clientName,
        items,
        isDelivery,
        address,
        latitude = null,
        longitude = null,
        deliveryFee = null,
        deliveryLabel = '',
        paymentChoice
    }) {
        this.lastOrderId += 1;
        const orderId = this.lastOrderId;

        const order = {
            id: orderId,
            clientPhone: sanitizePhone(clientPhone),
            clientName: clientName || 'Cliente',
            items: items || 'No especificado',
            isDelivery: Boolean(isDelivery),
            address: address || 'Tienda',
            latitude,
            longitude,
            deliveryFee,
            deliveryLabel,
            paymentChoice: paymentChoice || 'A convenir',
            status: 'PENDING_TICKET', // PENDING_TICKET | PENDING_PAYMENT | PAYMENT_VERIFIED | DISPATCHED | READY_FOR_PICKUP | CANCELLED
            createdAt: new Date().toISOString(),
            threadMsgIds: [],
        };

        this.orders.set(orderId, order);
        if (order.clientPhone) {
            this.clientActiveOrder.set(order.clientPhone, orderId);
        }

        logger.info(`Pedido #${orderId} creado para ${order.clientName} (${order.clientPhone})`);
        return order;
    }

    /**
     * Vincula un ID de mensaje del grupo al hilo del pedido
     * @param {number} orderId
     * @param {string} messageId
     */
    registerThreadMessage(orderId, messageId) {
        if (!orderId || !messageId) return;
        const order = this.orders.get(orderId);
        if (order) {
            if (!order.threadMsgIds.includes(messageId)) {
                order.threadMsgIds.push(messageId);
            }
            this.threadMsgMap.set(messageId, orderId);
        }
    }

    /**
     * Obtiene el pedido asociado a cualquier mensaje citado dentro del hilo
     * @param {string} messageId
     * @returns {Object|null}
     */
    getOrderByThreadMessage(messageId) {
        if (!messageId) return null;
        const orderId = this.threadMsgMap.get(messageId);
        if (orderId && this.orders.has(orderId)) {
            return this.orders.get(orderId);
        }
        return null;
    }

    /**
     * Obtiene el pedido activo de un cliente (esperando ticket o pago)
     * @param {string} clientPhone
     * @returns {Object|null}
     */
    getActiveOrderByClient(clientPhone) {
        const clean = sanitizePhone(clientPhone);
        const orderId = this.clientActiveOrder.get(clean);
        if (orderId && this.orders.has(orderId)) {
            const order = this.orders.get(orderId);
            if (!['DISPATCHED', 'READY_FOR_PICKUP', 'CANCELLED'].includes(order.status)) {
                return order;
            }
        }
        return null;
    }

    /**
     * Actualiza el estado de un pedido
     * @param {number} orderId
     * @param {string} newStatus
     */
    updateOrderStatus(orderId, newStatus) {
        const order = this.orders.get(orderId);
        if (order) {
            order.status = newStatus;
            logger.info(`Pedido #${orderId} cambió a estado: ${newStatus}`);
            if (['DISPATCHED', 'READY_FOR_PICKUP', 'CANCELLED'].includes(newStatus)) {
                this.clientActiveOrder.delete(order.clientPhone);
            }
            return order;
        }
        return null;
    }

    /**
     * Construye un resumen legible para el cliente
     * @param {Object} order
     * @returns {string}
     */
    buildSummary({ id, clientName, items, isDelivery, address, latitude, longitude, deliveryFee, deliveryLabel, paymentChoice }) {
        const isTransfer = (paymentChoice || '').includes('Pago') || (paymentChoice || '').includes('Zelle');
        const isPosDelivery = (paymentChoice || '').includes('Punto de venta inalámbrico');

        const mapUrl = latitude && longitude ? `https://maps.google.com/?q=${latitude},${longitude}` : '';

        const lines = [
            '🎉 *¡RESUMEN DE TU PEDIDO!*',
            '═══════════════════════════════',
            id ? `🔢 *Número de Pedido:* #${id}` : '',
            `👤 *Cliente:* ${clientName || 'Cliente'}`,
            `🛒 *Detalle del Pedido:*\n${items || 'No especificado'}`,
            '',
            `🛵 *Modalidad:* ${isDelivery ? 'Delivery' : 'Retiro en tienda (La Trinidad)'}`,
            isDelivery && address ? `📍 *Dirección de entrega:* ${address}` : '',
            isDelivery && mapUrl ? `🗺️ *Ubicación GPS:* ${mapUrl}` : '',
            isDelivery
                ? (deliveryFee !== null && deliveryFee !== undefined
                    ? `💰 *Delivery:* $${Number(deliveryFee).toFixed(2)} (${deliveryLabel || 'Tarifa de zona'})`
                    : '💰 *Delivery:* Por verificar con el monto total (Zona a cotizar)')
                : '',
            `💳 *Método de pago:* ${paymentChoice || 'A convenir'}`,
            '═══════════════════════════════',
            '',
            '✅ *Tu pedido ha sido registrado con éxito.*',
            'En breve uno de nuestros encargados pesará tu pedido y te enviará la foto del ticket con el total exacto.',
            '',
            isTransfer
                ? '📌 *Recordatorio:* Recuerda enviar la captura del comprobante por este chat para verificar tu pago.'
                : isPosDelivery
                    ? '💳 *Punto Inalámbrico:* Nuestro motorizado llevará el punto de venta a tu puerta para que pagues con tu tarjeta.'
                    : '¡Muchas gracias por preferir a PitaPollo! Te esperamos.'
        ];

        return lines.filter(line => line !== '').join('\n');
    }

    /**
     * Construye el mensaje de notificación formal para el grupo de despacho de la tienda
     * @param {Object} order
     * @returns {string}
     */
    buildStoreNotification(order) {
        const mapUrl = order.latitude && order.longitude ? `https://maps.google.com/?q=${order.latitude},${order.longitude}` : '';

        const lines = [
            `🍗 *NUEVO PEDIDO #${order.id}*`,
            '═══════════════════════════════',
            `👤 *Cliente:* ${order.clientName}`,
            `📱 *WhatsApp:* https://wa.me/${order.clientPhone}`,
            '',
            `🛒 *Detalle del Pedido:*\n${order.items}`,
            '',
            `🛵 *Modalidad:* ${order.isDelivery ? 'Delivery' : 'Retiro en tienda (La Trinidad)'}`,
            order.isDelivery && order.address ? `📍 *Dirección:* ${order.address}` : '',
            order.isDelivery && mapUrl ? `🗺️ *GPS:* ${mapUrl}` : '',
            order.isDelivery
                ? (order.deliveryFee !== null && order.deliveryFee !== undefined
                    ? `💰 *Delivery:* $${Number(order.deliveryFee).toFixed(2)} (${order.deliveryLabel})`
                    : '💰 *Delivery:* ⚠️ Por verificar con el monto total (Zona fuera de lista habitual)')
                : '',
            `💳 *Método de Pago:* ${order.paymentChoice}`,
            '═══════════════════════════════',
            '',
            '📸 *Para enviar la cuenta:*',
            '👉 Responde a este mensaje con la *FOTO del ticket facturado*.'
        ];

        return lines.filter(line => line !== '').join('\n');
    }
}

export const orderService = new OrderService();
