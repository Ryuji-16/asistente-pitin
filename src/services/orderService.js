import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizePhone, arePhoneNumbersEqual } from '../utils/formatters.js';
import { formatOrderItemsSimple } from './orderParser.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ordersFilePath = path.resolve(__dirname, '../data/orders.json');

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
        this.load();
    }

    /**
     * Carga el estado de pedidos desde disco
     */
    load() {
        try {
            if (fs.existsSync(ordersFilePath)) {
                const raw = fs.readFileSync(ordersFilePath, 'utf8');
                const data = JSON.parse(raw);
                if (data.lastOrderId) this.lastOrderId = data.lastOrderId;
                if (Array.isArray(data.orders)) {
                    this.orders = new Map(data.orders);
                }
                if (Array.isArray(data.threadMsgMap)) {
                    this.threadMsgMap = new Map(data.threadMsgMap);
                }
                if (Array.isArray(data.clientActiveOrder)) {
                    this.clientActiveOrder = new Map(data.clientActiveOrder);
                }
                logger.info(`Cargados ${this.orders.size} pedidos previos desde orders.json`);
            }
        } catch (err) {
            logger.error('Error al leer orders.json:', err.message);
        }
    }

    /**
     * Guarda el estado actual de pedidos en disco
     */
    save() {
        try {
            const dir = path.dirname(ordersFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const payload = {
                lastOrderId: this.lastOrderId,
                orders: Array.from(this.orders.entries()),
                threadMsgMap: Array.from(this.threadMsgMap.entries()),
                clientActiveOrder: Array.from(this.clientActiveOrder.entries()),
            };
            fs.writeFileSync(ordersFilePath, JSON.stringify(payload, null, 2), 'utf8');
        } catch (err) {
            logger.error('Error al guardar orders.json:', err.message);
        }
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
        deliveryZone = '',
        paymentChoice
    }) {
        this.lastOrderId += 1;
        const orderId = this.lastOrderId;

        const formattedItems = formatOrderItemsSimple(items);

        let cleanPaymentChoice = paymentChoice || 'A convenir';
        if (cleanPaymentChoice.includes('Pago Móvil')) {
            cleanPaymentChoice = 'Pago Móvil';
        }

        const order = {
            id: orderId,
            clientPhone: sanitizePhone(clientPhone),
            clientName: clientName || 'Cliente',
            items: formattedItems || 'No especificado',
            rawItems: items || 'No especificado',
            isDelivery: Boolean(isDelivery),
            address: address || 'Tienda',
            latitude,
            longitude,
            deliveryFee,
            deliveryLabel,
            deliveryZone: deliveryZone || deliveryLabel || '',
            paymentChoice: cleanPaymentChoice,
            status: 'PENDING_TICKET', // PENDING_TICKET | PENDING_PAYMENT | PAYMENT_VERIFIED | DISPATCHED | READY_FOR_PICKUP | CANCELLED
            createdAt: new Date().toISOString(),
            threadMsgIds: [],
        };

        this.orders.set(orderId, order);
        if (order.clientPhone) {
            this.clientActiveOrder.set(order.clientPhone, orderId);
        }
        this.save();

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
            this.save();
        }
    }

    /**
     * Obtiene el pedido asociado a un ID de mensaje citado en el grupo
     * @param {string} messageId
     * @returns {Object|null}
     */
    getOrderByThreadMessage(messageId) {
        if (!messageId) return null;
        const orderId = this.threadMsgMap.get(messageId);
        if (!orderId) return null;
        return this.orders.get(orderId) || null;
    }

    /**
     * Obtiene un pedido por su ID numérico
     * @param {number} orderId
     * @returns {Object|null}
     */
    getOrderById(orderId) {
        return this.orders.get(Number(orderId)) || null;
    }

    /**
     * Obtiene el pedido activo de un cliente por su número de teléfono
     * @param {string} phone
     * @returns {Object|null}
     */
    getActiveOrderByClient(phone) {
        const clean = sanitizePhone(phone);
        let orderId = this.clientActiveOrder.get(clean);

        if (!orderId) {
            for (const [savedPhone, id] of this.clientActiveOrder.entries()) {
                if (arePhoneNumbersEqual(savedPhone, clean)) {
                    orderId = id;
                    break;
                }
            }
        }

        if (!orderId) return null;
        const order = this.orders.get(orderId);
        if (!order) return null;
        if (['READY_FOR_PICKUP', 'DISPATCHED', 'CANCELLED'].includes(order.status)) {
            return null;
        }
        return order;
    }

    /**
     * Si en toda la tienda solo hay un pedido en estado PENDING_TICKET, lo retorna
     * @returns {Object|null}
     */
    getSinglePendingTicketOrder() {
        const pending = Array.from(this.orders.values()).filter(o => o.status === 'PENDING_TICKET');
        return pending.length === 1 ? pending[0] : null;
    }

    /**
     * Actualiza el estado de un pedido
     * @param {number} orderId
     * @param {string} newStatus
     */
    updateOrderStatus(orderId, newStatus) {
        const order = this.orders.get(Number(orderId));
        if (order) {
            order.status = newStatus;
            order.updatedAt = new Date().toISOString();
            if (['READY_FOR_PICKUP', 'DISPATCHED', 'CANCELLED'].includes(newStatus)) {
                this.clientActiveOrder.delete(order.clientPhone);
            }
            this.save();
            logger.info(`Pedido #${orderId} actualizado a estado: ${newStatus}`);
        }
    }

    /**
     * Construye un resumen legible para el cliente
     * @param {Object} order
     * @returns {string}
     */
    buildSummary({ id, clientName, items, isDelivery, address, latitude, longitude, deliveryFee, deliveryLabel, deliveryZone, paymentChoice }) {
        let cleanPayment = paymentChoice || 'A convenir';
        if (cleanPayment.includes('Pago Móvil')) {
            cleanPayment = 'Pago Móvil';
        }
        const isTransfer = cleanPayment.includes('Pago') || cleanPayment.includes('Zelle');
        const isPosDelivery = cleanPayment.includes('Punto de venta inalámbrico');

        const mapUrl = latitude && longitude ? `https://maps.google.com/?q=${latitude},${longitude}` : '';
        const zoneDesc = deliveryZone || deliveryLabel || '';

        const lines = [
            '🎉 *¡RESUMEN DE TU PEDIDO!*',
            '',
            id ? `🔢 *Número de Pedido:* #${id}` : '',
            `👤 *Cliente:* ${clientName || 'Cliente'}`,
            '',
            `🛒 *Detalle del Pedido:*\n${items || 'No especificado'}`,
            '',
            `🛵 *Modalidad:* ${isDelivery ? 'Delivery' : 'Retiro en tienda (La Trinidad)'}`,
            isDelivery && address ? `📍 *Dirección de entrega:* ${address}` : '',
            isDelivery && mapUrl ? `📍 *Ubicación GPS:* ${mapUrl}` : '',
            isDelivery
                ? (deliveryFee !== null && deliveryFee !== undefined
                    ? `💰 *Delivery:* $${Number(deliveryFee).toFixed(2)}${zoneDesc ? ` - ${zoneDesc}` : ''}`
                    : '💰 *Delivery:* Por verificar con el monto total (Zona a cotizar)')
                : '',
            `💳 *Método de pago:* ${cleanPayment}`,
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

        return lines
            .filter(line => line !== null && line !== undefined && line !== false)
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    /**
     * Construye el mensaje de notificación formal para el grupo de despacho de la tienda
     * @param {Object} order
     * @returns {string}
     */
    buildStoreNotification(order) {
        const mapUrl = order.latitude && order.longitude ? `https://maps.google.com/?q=${order.latitude},${order.longitude}` : '';
        const zoneDesc = order.deliveryZone || order.deliveryLabel || '';

        let cleanPayment = order.paymentChoice || 'A convenir';
        if (cleanPayment.includes('Pago Móvil')) {
            cleanPayment = 'Pago Móvil';
        }

        const lines = [
            `🍗 *NUEVO PEDIDO #${order.id}*`,
            '',
            `👤 *Cliente:* ${order.clientName}`,
            `📱 *WhatsApp:* https://wa.me/${order.clientPhone}`,
            '',
            `🛒 *Detalle del Pedido:*\n${order.items}`,
            order.rawItems && order.rawItems !== order.items && order.rawItems !== 'No especificado'
                ? `📝 _Texto recibido:_ "${order.rawItems.trim()}"`
                : '',
            '',
            `🛵 *Modalidad:* ${order.isDelivery ? 'Delivery' : 'Retiro en tienda (La Trinidad)'}`,
            order.isDelivery && order.address ? `📍 *Dirección:* ${order.address}` : '',
            order.isDelivery && mapUrl ? `📍 *GPS:* ${mapUrl}` : '',
            order.isDelivery
                ? (order.deliveryFee !== null && order.deliveryFee !== undefined
                    ? `💰 *Delivery:* $${Number(order.deliveryFee).toFixed(2)}${zoneDesc ? ` - ${zoneDesc}` : ''}`
                    : '💰 *Delivery:* ⚠️ Por verificar con el monto total (Zona fuera de lista habitual)')
                : '',
            `💳 *Método de Pago:* ${cleanPayment}`,
            '',
            '👉 Si un producto se agotó, responde citando: #cambio [mensaje]'
        ];

        return lines
            .filter(line => line !== null && line !== undefined && line !== false)
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
}

export const orderService = new OrderService();
