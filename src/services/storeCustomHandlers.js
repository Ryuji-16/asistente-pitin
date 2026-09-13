/**
 * Registro de manejadores personalizados para productos con reglas de negocio específicas.
 * Permite mantener explicaciones detalladas para PitaPollo mientras el motor general
 * sigue siendo 100% agnóstico y dinámico para cualquier otro negocio.
 */

export const STORE_CUSTOM_HANDLERS = {
    pechuga: (cleanText) => {
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

        return (
            '🍗 *Pechuga en PitaPollo:*\n\n' +
            'En PitaPollo, la **pechuga entera sin piel y sin hueso** es lo que nosotros llamamos **Filet de Pechuga**:\n' +
            '• 🏷️ *Al kilo:* $5.90 / Kg\n' +
            '• 📦 *Bolsa Mini de 2 Kg:* $11.90\n' +
            '• 📦 *Bolsa de 5 Kg:* $29.50\n\n' +
            '*(Si buscas la **pechuga tradicional con hueso**, la tenemos a $4.60 / Kg, bolsa de 2 Kg en $9.30 y bolsa de 5 Kg en $23.00)*\n' +
            '*(También contamos con **pechuga sin piel Premier Maella** en bandeja a $6.60 / Kg y **recortes de pechuga** a $3.40 / Kg)*'
        );
    },

    milanesa: () => {
        return (
            '🥩 *Milanesa de Pechuga (Estilo Bistec):*\n\n' +
            'Nuestra **Milanesa de Pechuga** viene cortada y fileteada **estilo bistec**, fresca y lista para la plancha o empanizar:\n' +
            '• 🏷️ *Al kilo:* $7.90 / Kg\n' +
            '• 📦 *Bolsa de 5 Kg:* $39.50\n' +
            '• ✨ *Línea Premier Maella (bandeja ~1 Kg empacada al vacío):* $9.70 / Kg'
        );
    },

    pollo_entero: () => {
        return (
            '🍗 *Pollo Entero Fresco y Bolsas:*\n\n' +
            '• 🏷️ *Al kilo (a partir de 5 Kg):* $2.85 / Kg\n' +
            '• 🏷️ *Al kilo (a partir de 10 Kg):* $2.79 / Kg\n' +
            '• 📦 *Bolsa de 5 Kg (2 pollos aprox):* $14.25\n' +
            '• 📦 *Bolsa de 5 Pollos (~10 Kg aprox):* $27.90 ($2.79 / Kg)'
        );
    },

    alas: (cleanText) => {
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
    },

    muslo: (cleanText) => {
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
    },

    pollo_picado: () => {
        return (
            '🍗 *Pollo Picado:*\n\n' +
            '• 🏷️ *Al kilo:* $3.65 / Kg\n' +
            '• 📦 *Bolsa de 6 Kg:* $21.90\n' +
            '• ✨ *Línea Premier Maella (bandeja ~1 Kg):* $5.70 / Kg\n' +
            '• ✨ *Premier Maella sin piel:* $5.80 / Kg'
        );
    },

    pollo_molido: () => {
        return (
            '🥩 *Pollo Molido (100% Pulpa Fresca):*\n\n' +
            '• 🏷️ *Al kilo / Bandeja 1 Kg:* $9.00 / Kg\n' +
            '• 🔥 *Oferta Bolsa de 2 Kg:* $9.00 ($4.50 / Kg)\n' +
            '• 📦 *Trío Molido (2.5 Kg):* $29.00'
        );
    },

    tenders: (cleanText) => {
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
    },

    menudencias: (cleanText) => {
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
    },

    huevos: () => {
        return (
            '🥚 *Huevos Frescos:*\n\n' +
            '• 🏷️ *Medio Cartón (15 Unidades):* $3.50'
        );
    },

    carne_res: (cleanText) => {
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
    },

    cerdo: (cleanText) => {
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
    },

    quesos: (cleanText) => {
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
    },

    embutidos_parrilla: () => {
        return (
            '🥓 *Charcutería, Embutidos y Parrilla:*\n\n' +
            '• 🏷️ *Mortadela Corral:* $4.60 / Kg | Mortadela Avanti: $2.50 (900g)\n' +
            '• 🏷️ *Salchichas Perro Caliente:* $3.80 / Kg | Polacas: $3.80 / paq\n' +
            '• 🔥 *La Montserratina:* Chorizo ahumado/ajo: $6.50 | Chistorra: $8.40 | Morcilla: $4.50 - $5.00\n' +
            '• 🔥 *AvantiGina:* Chorizos: $3.60 - $4.10 | Chistorra: $4.80\n' +
            '• 🥪 *Plumrose / L\'Prado:* Jamón Arepero: $13.00 (1.5 Kg) | Mini Jamón Pierna/Pavo: $10.00 / Kg'
        );
    }
};
