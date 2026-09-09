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
    otros: '💳 Punto de venta inalámbrico (¡El motorizado lleva el punto a tu puerta!)\n🏪 Punto de venta disponible en tienda\n💵 Efectivo en divisas (billetes en buen estado)\n🇻🇪 Bolívares en efectivo o transferencia a tasa oficial BCV'
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
📦 *PROMEDIO COSTO DE BOLSA DE POLLO*
_(Precios aproximados según peso final de la bolsa empaquetada)_

🍗 *Bolsa de 5 Unidades (~10 Kg aprox):*
• 5 Pollos enteros: $27.90 ($2.79/Kg)

🍗 *Bolsas de 5 Kg:*
• 5 Kg Pollo entero (2 Unid): $14.25
• 5 Kg Muslos enteros: $13.45
• 5 Kg Alas enteras: $16.25
• 6 Kg Pollo Picado: $21.90
• 5 Kg Pechuga con hueso: $23.00
• 5 Kg Filet de pechuga: $29.50
• 5 Kg Milanesa de pechuga: $39.50
• 5 Kg Cuadril A: $13.50

🍗 *Línea Mini (Bolsas de 2 y 3 Kg):*
• 2 Kg Muslos enteros: $5.60
• 2 Kg Alas enteras: $7.00
• 2 Kg Pechuga con hueso: $9.30
• 2 Kg Filet de pechuga: $11.90
• 3 Kg Cuadril eco: $8.00

🍗 *Cortes de Pollo por Kilo & Menudencias:*
• Pollo entero (a partir de 5 Kg): $2.85/Kg
• Muslos enteros: $2.69/Kg | Muslos sin piel: $3.70/Kg
• Alas enteras: $3.25/Kg | Churrasco: $6.70/Kg
• Pollo picado: $3.65/Kg | Milanesa: $7.90/Kg
• Pechuga con hueso: $4.60/Kg | Filet de pechuga: $5.90/Kg
• Hígado / Mollejas / Corazón: $2.80/Kg
• Trío menudo (2.5 Kg): $8.00 | Trío molido: $29.00
• Packs Hígado / Molleja / Corazón (2.5 Kg): $8.00
• Patas limpias: $2.50/Kg | Carapachos: $1.30/Kg
• Gallina congelada: $3.75/Kg | Pescuezos: $1.50/Kg
• Huevos frescos: $3.50 (15 Unid) | Recortes pechuga: $3.40/Kg

🍗 *Línea Premier Maella (Empacados en bandeja):*
• Milanesa de pechuga: $9.70/Kg | Filet de Muslo: $9.00/Kg
• Pechuga sin piel: $6.60/Kg | Muslos sin piel: $6.00/Kg
• Muslos: $4.90/Kg | Muslitos: $4.00/Kg
• Tenders de pechuga: $5.00/Kg | Alas sin punta: $5.70/Kg
• Chupetas de pollo: $6.00/Kg | Brochetas de pollo: $12.00/Kg
• Pollo molido puro: $9.00/1Kg | Pollo picado: $5.70/Kg
• Patas limpias: $3.50/1Kg | Mollejas / Hígados / Corazón: $3.50/1Kg
• Cuellos sin piel: $2.00/500g | Gallina picada: $5.10/Kg
`;

export const CATALOG_SECTIONS = [
    `📦 *PROMEDIO COSTO DE BOLSA DE POLLO*
_(Precios aproximados según peso final de la bolsa empaquetada)_

🍗 *Bolsa de 5 Unidades (~10 Kg aprox):*
• 5 Pollos enteros: $27.90 ($2.79/Kg)

🍗 *Bolsas de 5 Kg:*
• 5 Kg Pollo entero (2 Unid): $14.25
• 5 Kg Muslos enteros: $13.45
• 5 Kg Alas enteras: $16.25
• 6 Kg Pollo Picado: $21.90
• 5 Kg Pechuga con hueso: $23.00
• 5 Kg Filet de pechuga: $29.50
• 5 Kg Milanesa de pechuga: $39.50
• 5 Kg Cuadril A: $13.50

🍗 *Línea Mini (Bolsas de 2 y 3 Kg):*
• 2 Kg Muslos enteros: $5.60
• 2 Kg Alas enteras: $7.00
• 2 Kg Pechuga con hueso: $9.30
• 2 Kg Filet de pechuga: $11.90
• 3 Kg Cuadril eco: $8.00

🍗 *Cortes de Pollo por Kilo & Menudencias:*
• Pollo entero (a partir de 5 Kg): $2.85/Kg
• Muslos enteros: $2.69/Kg | Muslos sin piel: $3.70/Kg
• Alas enteras: $3.25/Kg | Churrasco: $6.70/Kg
• Pollo picado: $3.65/Kg | Milanesa: $7.90/Kg
• Pechuga con hueso: $4.60/Kg | Filet de pechuga: $5.90/Kg
• Hígado / Mollejas / Corazón: $2.80/Kg
• Trío menudo (2.5 Kg): $8.00 | Trío molido: $29.00
• Packs Hígado / Molleja / Corazón (2.5 Kg): $8.00
• Patas limpias: $2.50/Kg | Carapachos: $1.30/Kg
• Gallina congelada: $3.75/Kg | Pescuezos: $1.50/Kg
• Huevos frescos: $3.50 (15 Unid) | Recortes pechuga: $3.40/Kg

🍗 *Línea Premier Maella (Empacados en bandeja):*
• Milanesa de pechuga: $9.70/Kg | Filet de Muslo: $9.00/Kg
• Pechuga sin piel: $6.60/Kg | Muslos sin piel: $6.00/Kg
• Muslos: $4.90/Kg | Muslitos: $4.00/Kg
• Tenders de pechuga: $5.00/Kg | Alas sin punta: $5.70/Kg
• Chupetas de pollo: $6.00/Kg | Brochetas de pollo: $12.00/Kg
• Pollo molido puro: $9.00/1Kg | Pollo picado: $5.70/Kg
• Patas limpias: $3.50/1Kg | Mollejas / Hígados / Corazón: $3.50/1Kg
• Cuellos sin piel: $2.00/500g | Gallina picada: $5.10/Kg`,

    `🥩 *CARNES DE RES & CERDO*

🥩 *Línea de Carne de Res:*
• Carne molida: $12.50/1Kg | $29.60/2.5Kg
• Carne molida Especial: $15.70/1Kg | $36.50/2.5Kg
• Hamburguesa de carne: $7.50/1Kg
• Bistec Solomo AA: $24.00/1Kg | Solomo Madurado AA: $26.00/Kg
• Punta Trasera AA: $18.00/Kg | Punta Odi Madurada: $32.00/Kg
• Lomito entero limpio: $24.00/Kg | Bistec de Lomito: $26.50/Kg
• Medallones de Lomito: $26.50/1Kg
• Ribeye AA: $25.50 (2U / 700g) | New York AA: $25.50 (2U / 700g)
• Carne para desmechar / guisar: $13.20/Kg
• Bistec de primera: $14.70/Kg | Muchacho redondo: $15.00/Kg
• Osobuco: $9.70/Kg | Costillas de Res: $7.40/Kg
• Carbón Vegetal Zulia: $5.30 (1.5Kg) | Carbón Premium: $5.90

🐷 *Línea de Cerdo:*
• Chuleta ahumada / fresca: $9.30/Kg
• Costilla de cerdo: $12.40/Kg | Falda de cerdo: $11.00/1Kg
• Bistec de cerdo: $13.00/Kg | Cerdo molido: $13.00/1Kg
• Lomo de cerdo: $12.60/Kg | Pork Belly: $14.40/Kg
• Tocineta entera: $11.70/Kg | Huesito ahumado: $5.60/1Kg
• Pernil entero: $9.90/Kg | Pernil deshuesado: $11.80/Kg
• Paleta de cerdo: $8.20/Kg | Paleta deshuesada: $10.20/Kg
• Paticas de cerdo: $4.50/Kg`,

    `🧀 *QUESOS, CHARCUTERÍA, PARRILLA Y CONGELADOS*

🧀 *Línea de Quesos & Lácteos:*
• Queso duro: $8.40/Kg | Semiduro Merideño: $9.00/Kg
• Queso Mozzarella: $12.00/Kg | Tipo Paisa: $11.50/Kg
• Queso Pecorino: $20.50/Kg | Tipo Parmesano: $25.00/Kg
• Queso Amarillo: $13.30/Kg | Amarillo Bola: $13.80/Kg
• Queso Ricotta: $4.50/Kg | Crema de Leche T: $4.40 (400g)
• Queso Cheddar: $3.15 (250g) | Queso crema T: $3.15 (350g)
• Facilistas Kaldini: $4.50 (200g)

🥓 *Charcutería Selecta:*
• Mortadela Corral: $4.60/1Kg | Mortadela Avanti: $2.50/900g
• Salchicha perro caliente: $3.80/1Kg | Salchichas Polacas: $3.80/paq
• Salchiprado: $3.00 (7U) | Keskinoglu: $2.50 (340g)
• Jamón Serrano: $8.30/100g | Chorizo Español: $6.40/100g
• Salchichón / Salami: $6.40/100g | Coppa: $9.60/100g
• *Plumrose:* Jamón Arepero: $13.00/1.5Kg | Tocineta: $6.50/160g | Salchicha Wiener: $6.70/12U
• *L' Prado:* Mini Jamón Pierna/Pavo: $10.00/1Kg | Taco Pavo/Pierna: $5.00/500g

🔥 *Línea Parrillera:*
• *La Montserratina:* Chorizo ahumado/ajo: $6.50 | Carupanero/Picante: $5.00 | Chistorra: $8.40 | Morcilla: $4.50-$5.00 | Choripanas: $2.85 | Salchicha blanca: $9.00
• *AvantiGina:* Chorizo ahumado/ajo: $3.60 | Pollo/Res: $4.10 | Chistorra: $4.80 | Salchicha blanca: $3.30
• *Taste:* Salsicce Siciliana / Pizzaiola / Chistorra: $7.00/paq

❄️ *Congelados, Pasapalos & Mascotas:*
• Nuggets La Granja (1.7Kg): $19.00 | Granjero (2Kg): $21.00
• Papas Mydibel 9x9 (2.5Kg): $12.00 | Papas La Granja (1Kg): $9.00
• Yuca congelada: $3.00/Kg | Yuca Sticks: $4.80/Kg
• Maella: Nuggets: $7.50 | Tenders: $5.90 | Sticks: $6.90
• Tequeños Premier: $8.00/25U | Tequeños PP: $7.20/50U | Mini Pizzas: $6.00/24U
• Línea Mascotas: Alimento Bon Apetit: $5.00 | Snacks Patas/Cuello: $3.00-$5.00 | Orejas de cerdo: $4.00`
];
