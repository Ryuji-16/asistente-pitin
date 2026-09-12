import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizePhone, arePhoneNumbersEqual } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const customersFilePath = path.resolve(__dirname, '../data/customers.json');

/**
 * Servicio para gestión y memoria de perfiles de clientes recurrentes (Clientes Fijos)
 */
class CustomerService {
    constructor() {
        /** @type {Map<string, Object>} SanitizedPhone -> CustomerProfile */
        this.customers = new Map();
        this.load();
    }

    /**
     * Carga los perfiles de clientes desde disco
     */
    load() {
        try {
            if (fs.existsSync(customersFilePath)) {
                const raw = fs.readFileSync(customersFilePath, 'utf8');
                const data = JSON.parse(raw);
                if (Array.isArray(data.customers)) {
                    this.customers = new Map(data.customers);
                }
                logger.info(`Cargados ${this.customers.size} perfiles de clientes desde customers.json`);
            }
        } catch (err) {
            logger.error('Error al leer customers.json:', err.message);
        }
    }

    /**
     * Guarda los perfiles de clientes en disco
     */
    save() {
        try {
            const dir = path.dirname(customersFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const payload = {
                customers: Array.from(this.customers.entries())
            };
            fs.writeFileSync(customersFilePath, JSON.stringify(payload, null, 2), 'utf8');
        } catch (err) {
            logger.error('Error al guardar customers.json:', err.message);
        }
    }

    /**
     * Busca un perfil de cliente por número de teléfono con tolerancia a formatos locales e internacionales
     * @param {string} phone
     * @returns {Object|null}
     */
    getCustomer(phone) {
        if (!phone) return null;
        const clean = sanitizePhone(phone);
        let profile = this.customers.get(clean);

        if (!profile) {
            for (const [savedPhone, p] of this.customers.entries()) {
                if (arePhoneNumbersEqual(savedPhone, clean)) {
                    profile = p;
                    break;
                }
            }
        }

        return profile || null;
    }

    /**
     * Registra o actualiza el perfil de un cliente a partir de un pedido completado o confirmado
     * @param {Object} order
     */
    recordOrder(order) {
        if (!order || !order.clientPhone) return;
        const cleanPhone = sanitizePhone(order.clientPhone);

        const existing = this.getCustomer(cleanPhone) || {
            phone: cleanPhone,
            name: order.clientName || 'Cliente',
            totalOrders: 0,
            firstOrderDate: new Date().toISOString()
        };

        const totalOrders = (existing.totalOrders || 0) + 1;

        const updatedProfile = {
            ...existing,
            phone: cleanPhone,
            name: order.clientName || existing.name || 'Cliente',
            isDelivery: order.isDelivery,
            address: order.address || existing.address || '',
            latitude: order.latitude !== undefined && order.latitude !== null ? order.latitude : existing.latitude || null,
            longitude: order.longitude !== undefined && order.longitude !== null ? order.longitude : existing.longitude || null,
            deliveryFee: order.deliveryFee !== undefined && order.deliveryFee !== null ? order.deliveryFee : existing.deliveryFee || null,
            deliveryLabel: order.deliveryLabel || existing.deliveryLabel || '',
            deliveryZone: order.deliveryZone || existing.deliveryZone || order.deliveryLabel || existing.deliveryLabel || '',
            paymentChoice: (order.paymentChoice || existing.paymentChoice || 'Pago Móvil').replace(/\s*\(Banesco\)/i, ''),
            lastOrderItems: order.items || existing.lastOrderItems || '',
            lastOrderDate: new Date().toISOString(),
            totalOrders
        };

        this.customers.set(cleanPhone, updatedProfile);
        this.save();
        logger.info(`Perfil de cliente guardado/actualizado: ${updatedProfile.name} (${cleanPhone}) - Total compras: ${totalOrders}`);
        return updatedProfile;
    }

    /**
     * Actualiza datos específicos de un cliente
     * @param {string} phone
     * @param {Object} updates
     */
    updateCustomer(phone, updates = {}) {
        const profile = this.getCustomer(phone);
        if (!profile) return null;

        const cleanPhone = sanitizePhone(profile.phone || phone);
        const merged = { ...profile, ...updates };
        this.customers.set(cleanPhone, merged);
        this.save();
        return merged;
    }
}

export const customerService = new CustomerService();
