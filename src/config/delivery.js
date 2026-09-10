/**
 * Configuración de delivery, coordenadas y cálculo de tarifas para PitaPollo - La Trinidad
 */

// Coordenadas base de PitaPollo (Calle Principal de La Trinidad, Caracas)
export const STORE_LOCATION = {
    name: 'PitaPollo - La Trinidad',
    latitude: 10.4326,
    longitude: -66.8601,
};

/**
 * Normaliza texto para búsqueda de zonas (minúsculas, sin tildes, sin signos)
 */
export function normalizeZoneName(text = '') {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[¿?¡!.,:;()_/\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Tarifas fijas oficiales y zonas de cobertura de PitaPollo
 */
export const DELIVERY_TIERS = [
    {
        tier: 1,
        fee: 3.50,
        label: 'Zona 1 ($3.50)',
        maxKm: 4.2,
        zonesList: [
            'La Trinidad',
            'Baruta',
            'La Tahona (parte baja)',
            'Los Samanes',
            'Las Minas',
            'La Maya',
            'Santa Fe',
            'Santa Inés',
            'La Bonita',
            'Las Danielas',
            'El Placer de María',
            'El Peñón',
            'Club Hípico',
            'Los Pinos',
            'La Boyera',
            'Concresa',
            'Manzanares'
        ],
        keywords: [
            'la trinidad',
            'trinidad',
            'baruta',
            'la tahona parte baja',
            'la tahona baja',
            'tahona parte baja',
            'tahona baja',
            'la tahona',
            'tahona',
            'los samanes',
            'samanes',
            'las minas',
            'minas de baruta',
            'la maya',
            'santa fe norte',
            'santa fe sur',
            'santa fe',
            'santa ines',
            'la bonita',
            'las danielas',
            'danielas',
            'el placer de maria',
            'placer de maria',
            'el placer',
            'el penon',
            'penon',
            'club hipico',
            'los pinos',
            'la boyera',
            'boyera',
            'concresa',
            'manzanares',
            'manzanare'
        ]
    },
    {
        tier: 2,
        fee: 5.00,
        label: 'Zona 2 ($5.00)',
        maxKm: 7.5,
        zonesList: [
            'Prados del Este',
            'Alto Prado',
            'Valle Arriba',
            'Las Mercedes',
            'Los Campitos',
            'Colinas de La Tahona',
            'El Cigarral',
            'El Hatillo'
        ],
        keywords: [
            'colinas de la tahona',
            'colinas de tahona',
            'prados del este',
            'alto prado',
            'valle arriba',
            'las mercedes',
            'mercedes',
            'los campitos',
            'campitos',
            'el cigarral',
            'cigarral',
            'el hatillo',
            'hatillo'
        ]
    },
    {
        tier: 3,
        fee: 7.00,
        label: 'Zona 3 ($7.00)',
        maxKm: 12.0,
        zonesList: [
            'La Lagunita',
            'La Unión',
            'Chacao',
            'El Rosal',
            'El Cafetal',
            'Cumbres de Curumo',
            'Plaza Las Américas',
            'Cerro Verde',
            'Los Naranjos',
            'Los Guayabitos',
            'Oripoto',
            'Bello Monte',
            'Santa Mónica',
            'CCCT'
        ],
        keywords: [
            'plaza las americas',
            'cumbres de curumo',
            'colinas de bello monte',
            'bello monte',
            'santa monica',
            'los guayabitos',
            'guayabitos',
            'los naranjos',
            'naranjos',
            'cerro verde',
            'la lagunita',
            'lagunita',
            'la union',
            'chacao',
            'el rosal',
            'rosal',
            'el cafetal',
            'cafetal',
            'curumo',
            'oripoto',
            'ccct',
            'c c c t',
            'centro comercial tamanaco',
            'tamanaco'
        ]
    }
];

/**
 * Texto formateado de las zonas y tarifas para mostrar al cliente
 */
export const DELIVERY_ZONES_TEXT = [
    '🛵 *TARIFAS Y ZONAS DE DELIVERY - PITAPOLLO*',
    '',
    '🟢 *Zona 1 - $3.50:*',
    '• La Trinidad, Baruta, La Tahona (parte baja)',
    '• Los Samanes, Las Minas, La Maya, Santa Fe',
    '• Santa Inés, La Bonita, Las Danielas',
    '• El Placer de María, El Peñón, Club Hípico',
    '• Los Pinos, La Boyera, Concresa, Manzanares',
    '',
    '🟡 *Zona 2 - $5.00:*',
    '• Prados del Este, Alto Prado, Valle Arriba',
    '• Las Mercedes, Los Campitos, Colinas de La Tahona',
    '• El Cigarral, El Hatillo',
    '',
    '🟠 *Zona 3 - $7.00:*',
    '• La Lagunita, La Unión, Chacao, El Rosal',
    '• El Cafetal, Cumbres de Curumo, Plaza Las Américas',
    '• Cerro Verde, Los Naranjos, Los Guayabitos',
    '• Oripoto, Bello Monte, Santa Mónica, CCCT',
    '',
    '📍 *¿Pides a otra zona de Caracas?*',
    '¡Con gusto te atendemos! Si tu dirección está fuera de estas zonas, verificaremos el monto del delivery correspondiente y te lo informaremos junto con el monto total de tu pedido.'
].join('\n');

/**
 * Prepara lista de palabras clave ordenada por longitud descendente para coincidencias precisas
 */
const ALL_ZONE_KEYWORDS = [];
for (const tier of DELIVERY_TIERS) {
    for (const kw of tier.keywords) {
        ALL_ZONE_KEYWORDS.push({
            keyword: normalizeZoneName(kw),
            rawZone: kw,
            tier: tier.tier,
            fee: tier.fee,
            label: tier.label
        });
    }
}
// Ordenar por longitud descendente para que "colinas de la tahona" se evalúe antes de "la tahona"
ALL_ZONE_KEYWORDS.sort((a, b) => b.keyword.length - a.keyword.length);

/**
 * Calcula la distancia en kilómetros entre dos coordenadas GPS usando la fórmula de Haversine
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distancia en kilómetros redondeada a 1 decimal
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    // Factor de ruta vial en Caracas (~1.3x de la distancia en línea recta)
    const distance = R * c * 1.3;

    return Math.round(distance * 10) / 10;
}

/**
 * Estima la tarifa de delivery según el texto de la dirección o coordenadas GPS
 * @param {Object} options
 * @param {number} [options.latitude]
 * @param {number} [options.longitude]
 * @param {string} [options.zoneText]
 * @returns {{ fee: number|null, tier: number|null, distanceKm: number|null, label: string, isOtherZone: boolean, matchedZone?: string }}
 */
export function estimateDeliveryFee({ latitude, longitude, zoneText = '' }) {
    const clean = normalizeZoneName(zoneText);

    // 1. Intentar coincidencia por texto de la zona
    if (clean) {
        for (const item of ALL_ZONE_KEYWORDS) {
            // Coincidencia de subcadena exacta
            if (clean.includes(item.keyword)) {
                return {
                    fee: item.fee,
                    tier: item.tier,
                    distanceKm: null,
                    label: item.label,
                    matchedZone: item.rawZone,
                    isOtherZone: false
                };
            }
        }
    }

    // 2. Intentar cálculo por coordenadas GPS si se enviaron
    if (latitude && longitude) {
        const distance = calculateDistanceKm(
            STORE_LOCATION.latitude,
            STORE_LOCATION.longitude,
            latitude,
            longitude
        );

        if (distance !== null) {
            for (const tier of DELIVERY_TIERS) {
                if (distance <= tier.maxKm) {
                    return {
                        fee: tier.fee,
                        tier: tier.tier,
                        distanceKm: distance,
                        label: `${tier.label} (~${distance} km)`,
                        isOtherZone: false
                    };
                }
            }
            // Si la distancia supera los 12 km (fuera de las 3 zonas fijas)
            return {
                fee: null,
                tier: null,
                distanceKm: distance,
                label: `Zona externa (~${distance} km)`,
                isOtherZone: true
            };
        }
    }

    // 3. Si no coincide con ninguna de las zonas fijas:
    // El bot indica que se verificará el monto para esa zona con el monto total del pedido
    return {
        fee: null,
        tier: null,
        distanceKm: null,
        label: 'Zona por verificar',
        isOtherZone: true
    };
}
