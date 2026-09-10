import { storeService } from './storeService.js';

/**
 * Normaliza un texto para búsqueda (minúsculas, sin tildes, sin signos raros)
 */
export const normalizeQuery = (text = '') => {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[¿?¡!.,:;()_/\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Obtiene la tasa oficial del día formateada si está disponible
 */
const getTasaFooter = () => {
    const store = storeService.getStore();
    if (store && store.tasaBCV) {
        return `\n\n🇻🇪 *Tasa oficial del día:* ${store.tasaBCV} Bs/$`;
    }
    return '';
};

/**
 * Pie de mensaje con opciones de acción rápida
 */
const getActionFooter = () => {
    return [
        '',
        '👉 *¿Deseas incluirlo en tu pedido?*',
        '• Responde *2* para *Hacer un Pedido*',
        '• Responde *1* para ver nuestro *Catálogo Completo en PDF*',
        '• Responde *menu* para volver al Menú Principal'
    ].join('\n');
};

/**
 * Definición detallada de productos y respuestas de precios de PitaPollo
 */
const PRODUCT_DEFINITIONS = [
    // 1. PECHUGA Y FILET DE PECHUGA (REGLA DE NEGOCIO OBLIGATORIA)
    {
        id: 'pechuga',
        keywords: [
            'pechuga entera sin piel y sin hueso',
            'pechuga entera sin piel ni hueso',
            'pechuga sin piel y sin hueso',
            'pechuga sin piel ni hueso',
            'pechuga sin hueso',
            'pechuga sin piel',
            'pechuga entera',
            'pechuga limpia',
            'filet de pechuga',
            'filete de pechuga',
            'filet',
            'filete',
            'pechuga con hueso',
            'recortes de pechuga',
            'recorte de pechuga',
            'pechuga',
            'pechugas'
        ],
        handler: (cleanText) => {
            const isPechugaConHueso = cleanText.includes('con hueso') && !cleanText.includes('sin hueso');
            const isRecortes = cleanText.includes('recorte');

            if (isRecortes) {
                return (
                    '🍗 *Recortes de Pechuga:*\n\n' +
                    '• 🏷️ *Al kilo:* $3.40 / Kg\n' +
                    'Ideales para guisar, moler o preparar en fajitas.'
                );
            }

            if (isPechugaConHueso) {
                return (
                    '🍗 *Pechuga con Hueso Tradicional:*\n\n' +
                    '• 🏷️ *Al kilo:* $4.60 / Kg\n' +
                    '• 📦 *Bolsa Mini de 2 Kg:* $9.30\n' +
                    '• 📦 *Bolsa de 5 Kg:* $23.00\n\n' +
                    '💡 *Nota:* Si buscas la pechuga limpia, entera, sin piel y sin hueso, en PitaPollo la llamamos *Filet de Pechuga* ($5.90 / Kg).'
                );
            }

            // Respuesta estándar y detallada de Pechuga con la aclaratoria de negocio
            return (
                '🍗 *Pechuga en PitaPollo:*\n\n' +
                'En PitaPollo, la **pechuga entera sin piel y sin hueso** es lo que nosotros llamamos **Filet de Pechuga**:\n' +
                '• 🏷️ *Al kilo:* $5.90 / Kg\n' +
                '• 📦 *Bolsa Mini de 2 Kg:* $11.90\n' +
                '• 📦 *Bolsa de 5 Kg:* $29.50\n\n' +
                '*(Si buscas la **pechuga tradicional con hueso**, la tenemos a $4.60 / Kg, bolsa de 2 Kg en $9.30 y bolsa de 5 Kg en $23.00)*\n' +
                '*(También contamos con **pechuga sin piel Premier Maella** en bandeja a $6.60 / Kg y **recortes de pechuga** a $3.40 / Kg)*'
            );
        }
    },

    // 2. MILANESA DE PECHUGA (REGLA DE NEGOCIO OBLIGATORIA)
    {
        id: 'milanesa',
        keywords: [
            'milanesa de pechuga',
            'milanesa de pollo',
            'milanesa estilo bistec',
            'milanesas de pechuga',
            'milanesas de pollo',
            'milanesa',
            'milanesas'
        ],
        handler: () => {
            return (
                '🥩 *Milanesa de Pechuga (Estilo Bistec):*\n\n' +
                'Nuestra **Milanesa de Pechuga** viene cortada y fileteada **estilo bistec**, fresca y lista para la plancha o empanizar:\n' +
                '• 🏷️ *Al kilo:* $7.90 / Kg\n' +
                '• 📦 *Bolsa de 5 Kg:* $39.50\n' +
                '• ✨ *Línea Premier Maella (bandeja ~1 Kg empacada al vacío):* $9.70 / Kg'
            );
        }
    },

    // 3. POLLO ENTERO Y COMBOS
    {
        id: 'pollo_entero',
        keywords: [
            'pollo entero',
            'pollos enteros',
            'combo pollo',
            'combos de pollo',
            'bolsa de pollo',
            'bolsas de pollo',
            'pollo fresco',
            'kilo de pollo',
            'pollos'
        ],
        handler: () => {
            return (
                '🍗 *Pollo Entero Fresco y Bolsas:*\n\n' +
                '• 🏷️ *Al kilo (a partir de 5 Kg):* $2.85 / Kg\n' +
                '• 🏷️ *Al kilo (a partir de 10 Kg):* $2.79 / Kg\n' +
                '• 📦 *Bolsa de 5 Kg (2 pollos aprox):* $14.25\n' +
                '• 📦 *Bolsa de 5 Pollos (~10 Kg aprox):* $27.90 ($2.79 / Kg)'
            );
        }
    },

    // 4. ALAS Y ALITAS
    {
        id: 'alas',
        keywords: [
            'alas sin punta',
            'alas enteras',
            'chupeta de pollo',
            'chupetas de pollo',
            'chupetas',
            'ala',
            'alas',
            'alita',
            'alitas'
        ],
        handler: (cleanText) => {
            if (cleanText.includes('sin punta')) {
                return (
                    '🍗 *Alas sin Punta (Oferta Especial):*\n\n' +
                    '• 🔥 *Bolsa de 2 Kg:* $5.00 ($2.50 / Kg)\n' +
                    '• ✨ *Línea Premier Maella:* $5.70 / Kg'
                );
            }
            return (
                '🍗 *Alas de Pollo:*\n\n' +
                '• 🏷️ *Alas enteras al kilo:* $3.25 / Kg\n' +
                '• 📦 *Bolsa Mini de 2 Kg (Alas enteras):* $7.00\n' +
                '• 📦 *Bolsa de 5 Kg (Alas enteras):* $16.25\n' +
                '• 🔥 *Oferta Alas sin Punta (Bolsa de 2 Kg):* $5.00 ($2.50 / Kg)\n' +
                '• ✨ *Línea Premier Maella:* $5.70 / Kg | Chupetas: $6.00 / Kg'
            );
        }
    },

    // 5. MUSLOS, CUADRIL Y CHURRASCO
    {
        id: 'muslos',
        keywords: [
            'muslos sin piel',
            'muslo sin piel',
            'muslos enteros',
            'muslo entero',
            'filet de muslo',
            'cuadril economico',
            'cuadril y muslo',
            'cuadril a',
            'churrasco de pollo',
            'churrasco',
            'muslito',
            'muslitos',
            'cuadril',
            'muslo',
            'muslos'
        ],
        handler: (cleanText) => {
            if (cleanText.includes('churrasco')) {
                return (
                    '🍗 *Churrasco de Pollo:*\n\n' +
                    '• 🏷️ *Al kilo:* $6.70 / Kg\n' +
                    '• ✨ *Línea Premier Maella (bandeja al vacío):* $8.70 / Kg'
                );
            }
            if (cleanText.includes('sin piel')) {
                return (
                    '🍗 *Muslos sin Piel:*\n\n' +
                    '• 🏷️ *Al kilo:* $3.70 / Kg\n' +
                    '• 🔥 *Oferta Cuadril y Muslo sin piel (Bolsa 3 Kg):* $8.00\n' +
                    '• ✨ *Premier Maella sin piel (bandeja):* $6.00 / Kg'
                );
            }
            return (
                '🍗 *Muslos y Cuadril de Pollo:*\n\n' +
                '• 🏷️ *Muslos enteros al kilo:* $2.69 / Kg\n' +
                '• 🏷️ *Muslos sin piel al kilo:* $3.70 / Kg\n' +
                '• 📦 *Bolsa Mini de 2 Kg (Muslos enteros):* $5.60\n' +
                '• 📦 *Bolsa de 5 Kg (Muslos enteros):* $13.45\n' +
                '• 🏷️ *Cuadril A al kilo:* $2.70 / Kg (Bolsa de 5 Kg: $13.50)\n' +
                '• 📦 *Bolsa 3 Kg Cuadril Económico:* $8.00\n' +
                '• 🔥 *Oferta 3 Kg Cuadril y Muslo sin piel:* $8.00\n' +
                '• ✨ *Premier Maella:* Muslos $4.90 / Kg | Sin piel $6.00 / Kg | Muslitos $4.00 / Kg | Filet de muslo $9.00 / Kg'
            );
        }
    },

    // 6. POLLO PICADO
    {
        id: 'pollo_picado',
        keywords: [
            'pollo picado',
            'pollo troceado',
            'picado'
        ],
        handler: () => {
            return (
                '🍗 *Pollo Picado:*\n\n' +
                '• 🏷️ *Al kilo:* $3.65 / Kg\n' +
                '• 📦 *Bolsa de 6 Kg:* $21.90\n' +
                '• ✨ *Línea Premier Maella (bandeja ~1 Kg):* $5.70 / Kg\n' +
                '• ✨ *Premier Maella sin piel:* $5.80 / Kg'
            );
        }
    },

    // 7. POLLO MOLIDO
    {
        id: 'pollo_molido',
        keywords: [
            'pollo molido',
            'molida de pollo',
            'molido de pollo',
            'trio molido'
        ],
        handler: () => {
            return (
                '🥩 *Pollo Molido (100% Pulpa Fresca):*\n\n' +
                '• 🏷️ *Al kilo / Bandeja 1 Kg:* $9.00 / Kg\n' +
                '• 🔥 *Oferta Bolsa de 2 Kg:* $9.00 ($4.50 / Kg)\n' +
                '• 📦 *Trío Molido (2.5 Kg):* $29.00'
            );
        }
    },

    // 8. TENDERS, NUGGETS Y BROCHETAS
    {
        id: 'tenders_nuggets',
        keywords: [
            'pack de tenders',
            'pack tenders',
            'tenders de pechuga',
            'tenders de pollo',
            'tenders',
            'tender',
            'nugget',
            'nuggets',
            'brocheta',
            'brochetas'
        ],
        handler: (cleanText) => {
            if (cleanText.includes('nugget')) {
                return (
                    '🍗 *Nuggets de Pollo:*\n\n' +
                    '• ✨ *Nuggets Maella:* $7.50 / paquete\n' +
                    '• 📦 *Nuggets La Granja (Bolsa familiar 1.7 Kg):* $19.00'
                );
            }
            if (cleanText.includes('brocheta')) {
                return (
                    '🍢 *Brochetas de Pollo Premier Maella:*\n\n' +
                    '• 🏷️ *Al kilo:* $12.00 / Kg'
                );
            }
            return (
                '🥓 *Tenders y Nuggets de Pollo:*\n\n' +
                '• 🔥 *Pack de Tenders (Bolsa 2.5 Kg):* $10.00 ($4.00 / Kg)\n' +
                '• ✨ *Tenders Maella:* $5.00 / Kg ($5.90 paquete)\n' +
                '• 🍗 *Nuggets Maella:* $7.50 / paquete\n' +
                '• 🍗 *Nuggets La Granja (1.7 Kg):* $19.00\n' +
                '• 🍢 *Brochetas de Pollo:* $12.00 / Kg'
            );
        }
    },

    // 9. MENUDENCIAS, PATAS, CARAPACHO Y HUEVOS
    {
        id: 'menudencias',
        keywords: [
            'patas limpias',
            'patas de pollo',
            'patica de pollo',
            'paticas de pollo',
            'carapachos',
            'carapacho',
            'pescuezos',
            'pescuezo',
            'higado de pollo',
            'higados de pollo',
            'molleja de pollo',
            'mollejas de pollo',
            'corazon de pollo',
            'corazones de pollo',
            'gallina congelada',
            'gallina picada',
            'huevos frescos',
            'medio carton',
            'carton de huevos',
            'menudo',
            'menudencias',
            'higado',
            'higados',
            'molleja',
            'mollejas',
            'corazon',
            'corazones',
            'patas',
            'gallina',
            'huevo',
            'huevos'
        ],
        handler: (cleanText) => {
            if (cleanText.includes('huevo')) {
                return (
                    '🥚 *Huevos Frescos:*\n\n' +
                    '• 🏷️ *Medio Cartón (15 Unidades):* $3.50'
                );
            }
            if (cleanText.includes('pata')) {
                return (
                    '🐾 *Patas de Pollo Limpias:*\n\n' +
                    '• 🏷️ *Al kilo:* $2.50 / Kg\n' +
                    '• ✨ *Premier Maella (bandeja 1 Kg):* $3.50'
                );
            }
            if (cleanText.includes('carapacho')) {
                return (
                    '🦴 *Carapachos de Pollo:*\n\n' +
                    '• 🏷️ *Al kilo:* $1.30 / Kg'
                );
            }
            if (cleanText.includes('pescuezo') || cleanText.includes('cuello')) {
                return (
                    '🥖 *Pescuezos / Cuellos:*\n\n' +
                    '• 🏷️ *Pescuezos al kilo:* $1.50 / Kg\n' +
                    '• ✨ *Cuellos sin piel Maella (500g):* $2.00'
                );
            }
            if (cleanText.includes('gallina')) {
                return (
                    '🐔 *Gallina:*\n\n' +
                    '• 🏷️ *Gallina congelada entera:* $3.75 / Kg\n' +
                    '• ✨ *Gallina picada Maella:* $5.10 / Kg'
                );
            }
            return (
                '🍗 *Menudencias y Cortes Económicos:*\n\n' +
                '• 🏷️ *Hígado / Mollejas / Corazón:* $2.80 / Kg\n' +
                '• 📦 *Pack Hígado / Molleja / Corazón (2.5 Kg):* $8.00\n' +
                '• 📦 *Trío Menudo (2.5 Kg):* $8.00\n' +
                '• 🐾 *Patas limpias:* $2.50 / Kg (Premier Maella: $3.50/Kg)\n' +
                '• 🦴 *Carapachos:* $1.30 / Kg\n' +
                '• 🥖 *Pescuezos:* $1.50 / Kg\n' +
                '• 🐔 *Gallina congelada:* $3.75 / Kg (Picada Maella: $5.10/Kg)\n' +
                '• 🥚 *Huevos frescos (15 Unidades):* $3.50'
            );
        }
    },

    // 10. CARNES DE RES Y PARRILLERA
    {
        id: 'carne_res',
        keywords: [
            'carne molida especial',
            'carne molida estandar',
            'carne molida',
            'molida de res',
            'carne para desmechar',
            'carne para guisar',
            'muchacho redondo',
            'costillas de res',
            'costilla de res',
            'solomo de cuerito',
            'solomo madurado',
            'solomo aa',
            'solomo',
            'lomito entero',
            'bistec de lomito',
            'medallones de lomito',
            'lomito',
            'punta trasera aa',
            'punta trasera',
            'punta odi',
            'ribeye',
            'new york',
            'hamburguesas de carne',
            'hamburguesa de carne',
            'hamburguesa',
            'hamburguesas',
            'bistec de primera',
            'bistec',
            'desmechar',
            'guisar',
            'osobuco',
            'carbon vegetal',
            'carbon',
            'carne',
            'carnes',
            'res'
        ],
        handler: (cleanText) => {
            if (cleanText.includes('molida')) {
                return (
                    '🥩 *Carne Molida de Res:*\n\n' +
                    '• 🏷️ *Carne Molida Estándar:* $12.50 / Kg (Bolsa 2.5 Kg: $29.60)\n' +
                    '• 🏷️ *Carne Molida Especial:* $15.70 / Kg (Bolsa 2.5 Kg: $36.50)'
                );
            }
            if (cleanText.includes('solomo')) {
                return (
                    '🥩 *Solomo de Res:*\n\n' +
                    '• 🏷️ *Solomo de Cuerito AA:* $24.00 / Kg\n' +
                    '• 🏷️ *Solomo Madurado AA:* $26.00 / Kg'
                );
            }
            if (cleanText.includes('lomito')) {
                return (
                    '🥩 *Lomito de Res:*\n\n' +
                    '• 🏷️ *Lomito Entero Limpio:* $24.00 / Kg\n' +
                    '• 🏷️ *Bistec de Lomito:* $26.50 / Kg\n' +
                    '• 🏷️ *Medallones de Lomito:* $26.50 / Kg'
                );
            }
            if (cleanText.includes('punta')) {
                return (
                    '🥩 *Punta Trasera:*\n\n' +
                    '• 🏷️ *Punta Trasera AA:* $18.00 / Kg\n' +
                    '• 🏷️ *Punta Odi Madurada:* $32.00 / Kg'
                );
            }
            if (cleanText.includes('hamburguesa')) {
                return (
                    '🍔 *Hamburguesas de Res:*\n\n' +
                    '• 🏷️ *Paquete de Hamburguesas (1 Kg):* $7.50'
                );
            }
            if (cleanText.includes('carbon')) {
                return (
                    '🔥 *Carbón para Parrilla:*\n\n' +
                    '• 🏷️ *Carbón Vegetal Zulia (1.5 Kg):* $5.30\n' +
                    '• 🏷️ *Carbón Premium:* $5.90'
                );
            }
            return (
                '🥩 *Carnes de Res y Parrillera:*\n\n' +
                '• 🏷️ *Bistec de Primera:* $14.70 / Kg\n' +
                '• 🏷️ *Carne para Desmechar / Guisar:* $13.20 / Kg\n' +
                '• 🏷️ *Carne Molida:* Estándar $12.50 / Kg | Especial $15.70 / Kg\n' +
                '• 🏷️ *Muchacho Redondo:* $15.00 / Kg\n' +
                '• 🏷️ *Osobuco:* $9.70 / Kg\n' +
                '• 🏷️ *Costillas de Res:* $7.40 / Kg\n' +
                '• 🍔 *Hamburguesas (1 Kg):* $7.50\n\n' +
                '🔥 *Cortes Parrilleros:* Solomo AA $24.00 / Kg | Punta Trasera AA $18.00 / Kg | Lomito $24.00 / Kg | Ribeye / New York (2U / 700g) $25.50'
            );
        }
    },

    // 11. CERDO Y COCHINO
    {
        id: 'cerdo',
        keywords: [
            'chuleta ahumada',
            'chuleta fresca',
            'chuletas',
            'chuleta',
            'costilla de cerdo',
            'costillas de cerdo',
            'costillitas de cerdo',
            'costilla',
            'costillas',
            'pork belly',
            'tocineta entera',
            'tocineta',
            'pernil entero',
            'pernil deshuesado',
            'pernil',
            'paleta de cerdo',
            'paleta deshuesada',
            'paleta',
            'lomo de cerdo',
            'lomo',
            'bistec de cerdo',
            'cerdo molido',
            'molida de cerdo',
            'falda de cerdo',
            'huesito ahumado',
            'paticas de cerdo',
            'manteca de cerdo',
            'cerdo',
            'cochino',
            'puerco'
        ],
        handler: (cleanText) => {
            if (cleanText.includes('chuleta')) {
                return (
                    '🐷 *Chuletas de Cerdo:*\n\n' +
                    '• 🏷️ *Chuleta Ahumada:* $9.30 / Kg\n' +
                    '• 🏷️ *Chuleta Fresca:* $9.30 / Kg'
                );
            }
            if (cleanText.includes('costilla')) {
                return (
                    '🐷 *Costillas de Cerdo:*\n\n' +
                    '• 🏷️ *Costilla de Cerdo:* $12.40 / Kg\n' +
                    '• 🏷️ *Huesito Ahumado:* $5.60 / Kg'
                );
            }
            if (cleanText.includes('pernil')) {
                return (
                    '🐷 *Pernil de Cerdo:*\n\n' +
                    '• 🏷️ *Pernil Entero:* $9.90 / Kg\n' +
                    '• 🏷️ *Pernil Deshuesado:* $11.80 / Kg'
                );
            }
            if (cleanText.includes('tocineta') || cleanText.includes('pork belly')) {
                return (
                    '🥓 *Tocineta y Pork Belly:*\n\n' +
                    '• 🏷️ *Pork Belly:* $14.40 / Kg\n' +
                    '• 🏷️ *Tocineta Entera:* $11.70 / Kg\n' +
                    '• 🏷️ *Tocineta Plumrose (160g):* $6.50'
                );
            }
            if (cleanText.includes('lomo')) {
                return (
                    '🐷 *Lomo de Cerdo:*\n\n' +
                    '• 🏷️ *Al kilo:* $12.60 / Kg'
                );
            }
            return (
                '🐷 *Cortes de Cerdo Fresco y Congelado:*\n\n' +
                '• 🏷️ *Chuleta Ahumada / Fresca:* $9.30 / Kg\n' +
                '• 🏷️ *Costilla de Cerdo:* $12.40 / Kg\n' +
                '• 🏷️ *Lomo de Cerdo:* $12.60 / Kg\n' +
                '• 🏷️ *Bistec de Cerdo:* $13.00 / Kg\n' +
                '• 🏷️ *Cerdo Molido:* $13.00 / Kg\n' +
                '• 🏷️ *Pernil:* Entero $9.90 / Kg | Deshuesado $11.80 / Kg\n' +
                '• 🏷️ *Paleta:* Con hueso $8.20 / Kg | Deshuesada $10.20 / Kg\n' +
                '• 🥓 *Pork Belly:* $14.40 / Kg | Tocineta: $11.70 / Kg\n' +
                '• 🏷️ *Falda de Cerdo:* $11.00 / Kg | Huesito Ahumado: $5.60 / Kg'
            );
        }
    },

    // 12. QUESOS Y LÁCTEOS
    {
        id: 'quesos',
        keywords: [
            'queso duro',
            'semiduro merideno',
            'queso semiduro',
            'queso mozzarella',
            'mozzarella',
            'tipo paisa',
            'queso paisa',
            'queso amarillo',
            'queso pecorino',
            'pecorino',
            'tipo parmesano',
            'parmesano',
            'queso ricotta',
            'ricotta',
            'crema de leche',
            'queso crema',
            'queso cheddar',
            'cheddar',
            'queso',
            'quesos'
        ],
        handler: (cleanText) => {
            if (cleanText.includes('duro')) {
                return (
                    '🧀 *Queso Duro Llanero:*\n\n' +
                    '• 🏷️ *Al kilo:* $8.40 / Kg\n' +
                    'Fresco, de excelente sabor y consistencia para rallar.'
                );
            }
            if (cleanText.includes('mozzarella')) {
                return (
                    '🧀 *Queso Mozzarella:*\n\n' +
                    '• 🏷️ *Al kilo:* $12.00 / Kg\n' +
                    'Ideal para pizzas, pastichos y derretir.'
                );
            }
            if (cleanText.includes('paisa')) {
                return (
                    '🧀 *Queso Tipo Paisa:*\n\n' +
                    '• 🏷️ *Al kilo:* $11.50 / Kg'
                );
            }
            if (cleanText.includes('amarillo')) {
                return (
                    '🧀 *Queso Amarillo:*\n\n' +
                    '• 🏷️ *Al kilo:* $13.30 / Kg (Bola: $13.80 / Kg)'
                );
            }
            if (cleanText.includes('pecorino') || cleanText.includes('parmesano')) {
                return (
                    '🧀 *Quesos Madurados:*\n\n' +
                    '• 🏷️ *Pecorino al kilo:* $20.50 / Kg\n' +
                    '• 🏷️ *Tipo Parmesano:* $25.00 / Kg'
                );
            }
            return (
                '🧀 *Quesos y Lácteos:*\n\n' +
                '• 🏷️ *Queso Duro:* $8.40 / Kg\n' +
                '• 🏷️ *Semiduro Merideño:* $9.00 / Kg\n' +
                '• 🏷️ *Mozzarella:* $12.00 / Kg\n' +
                '• 🏷️ *Tipo Paisa:* $11.50 / Kg\n' +
                '• 🏷️ *Queso Amarillo:* $13.30 / Kg (Bola: $13.80 / Kg)\n' +
                '• 🏷️ *Pecorino:* $20.50 / Kg | Tipo Parmesano: $25.00 / Kg\n' +
                '• 🏷️ *Ricotta:* $4.50 / Kg\n' +
                '• 🧈 *Crema de Leche (400g):* $4.40 | Queso Crema (350g): $3.15 | Cheddar (250g): $3.15'
            );
        }
    },

    // 13. CHARCUTERÍA, EMBUTIDOS Y PARRILLA
    {
        id: 'charcuteria',
        keywords: [
            'mortadela corral',
            'mortadela avanti',
            'mortadela',
            'salchicha perro caliente',
            'salchichas polacas',
            'salchicha polaca',
            'salchiprado',
            'salchicha',
            'salchichas',
            'chorizo ahumado',
            'chorizo de ajo',
            'chorizo',
            'chorizos',
            'chistorra',
            'morcilla',
            'jamon arepero',
            'jamon serrano',
            'jamon de pierna',
            'jamon de pavo',
            'jamon',
            'salami',
            'salchichon',
            'montserratina',
            'avantigina',
            'embutidos'
        ],
        handler: () => {
            return (
                '🥓 *Charcutería, Embutidos y Parrilla:*\n\n' +
                '• 🏷️ *Mortadela Corral:* $4.60 / Kg | Mortadela Avanti: $2.50 (900g)\n' +
                '• 🏷️ *Salchichas Perro Caliente:* $3.80 / Kg | Polacas: $3.80 / paq\n' +
                '• 🔥 *La Montserratina:* Chorizo ahumado/ajo: $6.50 | Chistorra: $8.40 | Morcilla: $4.50 - $5.00\n' +
                '• 🔥 *AvantiGina:* Chorizos: $3.60 - $4.10 | Chistorra: $4.80\n' +
                '• 🥪 *Plumrose / L\'Prado:* Jamón Arepero: $13.00 (1.5 Kg) | Mini Jamón Pierna/Pavo: $10.00 / Kg'
            );
        }
    },

    // 14. CONGELADOS, PASAPALOS, TEQUEÑOS Y PAPAS
    {
        id: 'congelados',
        keywords: [
            'tequenos premier',
            'tequenos fiesta',
            'tequeno',
            'tequenos',
            'tequeño',
            'tequeños',
            'mini pizza',
            'mini pizzas',
            'papas congeladas',
            'papas fritas',
            'papas mydibel',
            'papas la granja',
            'papa',
            'papas',
            'yuca congelada',
            'yuca sticks',
            'yuca'
        ],
        handler: (cleanText) => {
            if (cleanText.includes('tequen')) {
                return (
                    '🧀 *Tequeños Congelados:*\n\n' +
                    '• 🏷️ *Tequeños Premier (25 Unidades):* $8.00\n' +
                    '• 🏷️ *Tequeños Fiesta PP (50 Unidades):* $7.20'
                );
            }
            if (cleanText.includes('pizza')) {
                return (
                    '🍕 *Mini Pizzas Congeladas:*\n\n' +
                    '• 🏷️ *Caja de 24 Unidades:* $6.00'
                );
            }
            if (cleanText.includes('papa')) {
                return (
                    '🍟 *Papas Congeladas:*\n\n' +
                    '• 🏷️ *Papas Mydibel 9x9 (Bolsa de 2.5 Kg):* $12.00\n' +
                    '• 🏷️ *Papas La Granja (Bolsa de 1 Kg):* $9.00'
                );
            }
            if (cleanText.includes('yuca')) {
                return (
                    '🍠 *Yuca Congelada:*\n\n' +
                    '• 🏷️ *Yuca Congelada natural:* $3.00 / Kg\n' +
                    '• 🏷️ *Yuca Sticks:* $4.80 / Kg'
                );
            }
            return (
                '❄️ *Congelados y Pasapalos:*\n\n' +
                '• 🧀 *Tequeños Premier (25U):* $8.00 | Tequeños Fiesta (50U): $7.20\n' +
                '• 🍕 *Mini Pizzas (24U):* $6.00\n' +
                '• 🍟 *Papas Mydibel (2.5 Kg):* $12.00 | Papas La Granja (1 Kg): $9.00\n' +
                '• 🍠 *Yuca Congelada:* $3.00 / Kg | Yuca Sticks: $4.80 / Kg'
            );
        }
    },

    // 15. LÍNEA MASCOTAS
    {
        id: 'mascotas',
        keywords: [
            'alimento de perro',
            'comida de perro',
            'bon apetit',
            'orejas de cerdo',
            'snacks patas',
            'perro',
            'perros',
            'mascota',
            'mascotas'
        ],
        handler: () => {
            return (
                '🐶 *Línea para Mascotas:*\n\n' +
                '• 🏷️ *Alimento Bon Apetit:* $5.00\n' +
                '• 🏷️ *Snacks de Patas / Cuello deshidratados:* $3.00 - $5.00\n' +
                '• 🏷️ *Orejas de Cerdo:* $4.00'
            );
        }
    }
];

class CatalogSearchService {
    /**
     * Devuelve una lista de palabras clave para registrar en el flujo de BuilderBot
     */
    getTriggerKeywords() {
        const set = new Set();

        // 1. Todas las palabras clave de los productos
        for (const prod of PRODUCT_DEFINITIONS) {
            for (const kw of prod.keywords) {
                set.add(kw);
            }
        }

        // 2. Frases y palabras comunes al preguntar precios en WhatsApp
        const priceTriggers = [
            'precio',
            'precios',
            'a como',
            'a cuanto',
            'cuanto cuesta',
            'cuanto sale',
            'cuanto vale',
            'que vale',
            'que cuesta',
            'que precio',
            'valor',
            'tienen',
            'disponen',
            'kilo'
        ];

        for (const pt of priceTriggers) {
            set.add(pt);
        }

        return Array.from(set);
    }

    /**
     * Busca si la consulta del usuario corresponde a un producto específico del catálogo
     * @param {string} text Mensaje recibido del usuario
     * @returns {string|null} Respuesta formateada con el precio o null si no se identifica producto
     */
    searchProductPrice(text = '') {
        if (!text || typeof text !== 'string') return null;

        const clean = normalizeQuery(text);
        if (!clean) return null;

        // Comprobamos si el texto busca explícitamente algún producto
        // Se evalúan primero los términos más específicos (longitud mayor)
        for (const prod of PRODUCT_DEFINITIONS) {
            // Ordenar keywords por longitud descendente para emparejar frases compuestas primero
            const sortedKeywords = [...prod.keywords].sort((a, b) => b.length - a.length);

            for (const kw of sortedKeywords) {
                // Si la palabra clave está contenida en el texto limpio
                const normalizedKw = normalizeQuery(kw);
                if (clean.includes(normalizedKw)) {
                    const productAnswer = prod.handler(clean);
                    return productAnswer + getTasaFooter() + '\n' + getActionFooter();
                }
            }
        }

        return null;
    }
}

export const catalogSearchService = new CatalogSearchService();
