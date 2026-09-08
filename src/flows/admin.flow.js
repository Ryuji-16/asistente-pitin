import { addKeyword } from '@builderbot/bot';
import { storeService } from '../services/storeService.js';
import { formatVenezuelaDate } from '../utils/formatters.js';

export const flowAdmin = addKeyword(['#precios', '#actualizar', '#ofertas', '#tasa', '#ver', '#estado', '#ayuda', '#grupo'])
    .addAction(async (ctx, { flowDynamic }) => {
        const text = (ctx.body || '').trim();
        const sender = ctx.pushName || ctx.from;

        // 1. Comando de ayuda
        if (text.toLowerCase() === '#ayuda') {
            return await flowDynamic([
                '🛠️ *COMANDOS DE ADMINISTRACIÓN PITAPOLLO*',
                '═════════════════════════════════',
                '• `#precios [texto]` -> Actualiza la lista de precios y ofertas.',
                '  _Ejemplo: Copias o reenvías el mensaje y le agregas #precios al inicio._',
                '',
                '• `#tasa [monto]` -> Actualiza la tasa del día en bolívares.',
                '  _Ejemplo: #tasa 65.50_',
                '',
                '• `#ver` o `#estado` -> Muestra la lista de precios que ven los clientes actualmente.',
                '',
                '• `#grupo` -> Registra el grupo actual como canal oficial de actualizaciones.',
                '═════════════════════════════════'
            ].join('\n'));
        }

        // 2. Registrar grupo de administración
        if (text.toLowerCase() === '#grupo') {
            const groupId = ctx.key?.remoteJid || ctx.from;
            storeService.registerAdminGroup(groupId);
            return await flowDynamic([
                '✅ *¡Grupo registrado como canal de actualizaciones!*',
                'A partir de ahora puedes enviar o actualizar precios desde aquí.'
            ].join('\n'));
        }

        // 3. Ver lista y estado actual
        if (text.toLowerCase() === '#ver' || text.toLowerCase() === '#estado') {
            const current = storeService.getFormattedCatalog();
            return await flowDynamic([
                '👀 *VISTA PREVIA DEL CATÁLOGO ACTUAL:*',
                '═════════════════════════════════',
                current
            ].join('\n'));
        }

        // 4. Actualizar tasa BCV
        if (text.toLowerCase().startsWith('#tasa')) {
            const rate = text.replace(/^#tasa\s*/i, '').trim();
            if (!rate) {
                return await flowDynamic('⚠️ Por favor indica el monto de la tasa. Ejemplo: `#tasa 65.50`');
            }
            storeService.updateTasa(rate, sender);
            return await flowDynamic(`✅ *Tasa oficial actualizada a ${rate} Bs/$* exitosamente.`);
        }

        // 5. Actualizar lista de precios y ofertas
        if (
            text.toLowerCase().startsWith('#precios') ||
            text.toLowerCase().startsWith('#actualizar') ||
            text.toLowerCase().startsWith('#ofertas')
        ) {
            const cleanContent = text.replace(/^#(precios|actualizar|ofertas)\s*/i, '').trim();
            if (!cleanContent) {
                return await flowDynamic('⚠️ Por favor incluye el texto o la lista de precios después de la etiqueta `#precios`.');
            }

            storeService.updateCatalog(cleanContent, sender);
            return await flowDynamic([
                '✅ *¡LISTA DE PRECIOS Y OFERTAS ACTUALIZADA!*',
                '',
                `📅 *Fecha de actualización:* ${formatVenezuelaDate()}`,
                `👤 *Actualizado por:* ${sender}`,
                '',
                '✨ *A partir de este momento, todos los clientes verán esta información al consultar las ofertas.*'
            ].join('\n'));
        }
    });
