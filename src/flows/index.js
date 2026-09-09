import { flowGroup } from './group.flow.js';
import { flowAdmin } from './admin.flow.js';
import { flowOffers } from './offers.flow.js';
import { flowOrder } from './order.flow.js';
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
    flowOrder,
    flowPayment,
    flowInfo,
    flowAdvisor,
    flowMedia,
    flowWelcome,
];
