import { flowGroup } from './group.flow.js';
import { flowAdmin } from './admin.flow.js';
import { flowOffers } from './offers.flow.js';
import { flowPriceInquiry } from './priceInquiry.flow.js';
import { flowDeliveryInquiry } from './delivery.flow.js';
import {
    flowOrder,
    flowDeliveryAddress,
    flowOrderPayment,
    flowOrderDeliveryOrPickup,
    flowOrderItemsNew,
    flowOrderNewCustomerName,
    flowOrderNameWithItems,
    flowExpressConfirm,
    flowOrderItemsReturning
} from './order.flow.js';
import { flowPayment } from './payment.flow.js';
import { flowInfo } from './info.flow.js';
import { flowAdvisor } from './advisor.flow.js';
import { flowMedia } from './media.flow.js';
import { flowWelcome } from './welcome.flow.js';

/**
 * Array ordenado de flujos del bot
 * (Los flujos específicos van primero, el flujo de bienvenida y fallback al final)
 */
export const botFlows = [
    flowGroup,
    flowAdmin,
    flowOffers,
    flowDeliveryInquiry,
    flowPriceInquiry,
    flowInfo,
    flowOrder,
    flowOrderNameWithItems,
    flowOrderNewCustomerName,
    flowOrderItemsNew,
    flowOrderDeliveryOrPickup,
    flowDeliveryAddress,
    flowOrderPayment,
    flowOrderItemsReturning,
    flowExpressConfirm,
    flowPayment,
    flowAdvisor,
    flowMedia,
    flowWelcome,
];
