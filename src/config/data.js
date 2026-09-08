import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, '../../assets');

export const BUSINESS_INFO = {
    name: 'PitaPollo - La Trinidad',
    assistantName: 'Pitín',
    phone: '0414-263-40-53',
    instagram: '@pitapolloccs',
    address: 'Calle principal de La Trinidad, Caracas (Referencia: cerca del Farmatodo / zona comercial).',
    schedule: '🕒 Lunes a Sábado: 8:00 AM a 6:00 PM\n🕒 Domingos: 8:30 AM a 2:00 PM',
    deliveryZones: '🛵 Contamos con servicio de Delivery en La Trinidad, Baruta, El Hatillo, Las Mercedes, Chacao y zonas cercanas de Caracas.',
};

export const PAYMENT_METHODS = {
    pagoMovil: {
        banco: 'Banesco (0134)',
        telefono: '0414-263-40-53',
        rif: 'J-503873973',
        titular: 'Pita Pollo'
    },
    zelle: {
        email: 'pitapolloccs@gmail.com',
        titular: 'Pita Pollo CCS',
        nota: '⚠️ IMPORTANTE: Colocar en concepto/nota: Pollo Trinidad'
    },
    otros: '💵 Efectivo en divisas (billetes sin roturas ni marcas)\n💳 Punto de venta disponible en tienda\n🇻🇪 Bolívares a tasa oficial BCV del día'
};

export const PROMOS = [
    {
        id: 'alas',
        title: '🍗 Alas sin Punta',
        description: 'Alitas frescas listas para freír o asar. ¡La mejor calidad y frescura!',
        image: path.join(assetsDir, 'Alas sin Punta.PNG')
    },
    {
        id: 'cuadril',
        title: '🍗 Cuadril o Muslos',
        description: 'Muslos frescos seleccionados, tiernos y jugosos.',
        image: path.join(assetsDir, 'Cuadril o Muslos.jpg')
    },
    {
        id: 'tenders',
        title: '🥓 Pack de Tenders',
        description: 'Deliciosos tenders de pechuga de pollo, prácticos y listos para cocinar.',
        image: path.join(assetsDir, 'Pack dse Tenders.PNG')
    },
    {
        id: 'molido',
        title: '🥩 Pollo Molido',
        description: '100% pulpa de pollo molido fresca, ideal para albóndigas, pastelitos y dietas.',
        image: path.join(assetsDir, 'Pollo Molido.PNG')
    }
];

export const GENERAL_CATALOG = `
🍗 *CORTES DE POLLO FRESCO:*
• Pechuga con hueso / Filet de pechuga
• Milanesa de pechuga fresca
• Muslos enteros / Cuadril
• Alas sin punta / Alas enteras
• Pollo entero beneficiado
• Pollo molido 100% puro
• Menudencias: Hígado, Mollejas, Corazón, Carapachos, Patas limpias

🥓 *PRODUCTOS CONGELADOS & EMPANIZADOS (Maella / Krispy Frost / La Granja):*
• Tenders de pollo
• Nuggets Maella y La Granja
• Cotufas de pollo Maella
• Milanesas empanizadas listas
• Papas congeladas y Yuca sticks

🥩 *CERDO, CARNES Y CHARCUTERÍA:*
• Chuleta de cerdo fresca y ahumada
• Costillas de cerdo / Falda / Pernil / Paleta
• Tocineta entera y rebanada
• Embutidos Avanti y Gina
• Salchichas, chorizos y morcillas
• Huevos frescos por cartón y medio cartón
`;
