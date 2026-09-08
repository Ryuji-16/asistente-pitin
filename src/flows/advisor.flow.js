import { addKeyword } from '@builderbot/bot';
import { BUSINESS_INFO } from '../config/data.js';
import { storeService } from '../services/storeService.js';

export const flowAdvisor = addKeyword(['5', 'asesor', 'humano', 'persona', 'ayuda', 'operador', 'hablar con asesor'])
    .addAction(async (_, { endFlow }) => {
        if (storeService.isPaused()) {
            return endFlow();
        }
    })
    .addAnswer(
        [
            '👤 *CONECTANDO CON UN ASESOR*',
            '',
            `¡Con gusto! Uno de nuestros compañeros de atención en *${BUSINESS_INFO.name}* te atenderá en este mismo chat en breve.`,
            '',
            'Por favor, déjanos tu consulta o duda por aquí y te responderemos lo antes posible. ⏳',
            '',
            `Si es urgente, también puedes llamarnos al *${BUSINESS_INFO.phone}*.`
        ].join('\n')
    );
