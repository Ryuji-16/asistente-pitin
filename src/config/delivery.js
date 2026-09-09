/**
 * Configuración de delivery, coordenadas y cálculo de tarifas para PitaPollo - La Trinidad
 */

// Coordenadas base de PitaPollo (Calle Principal de La Trinidad, Caracas)
export const STORE_LOCATION = {
    name: 'PitaPollo - La Trinidad',
    latitude: 10.4326,
    longitude: -66.8601,
};

// Tarifas fijas por nivel de distancia y zonas frecuentes
export const DELIVERY_TIERS = [
    {
        tier: 1,
        fee: 3.50,
        maxKm: 3.5,
        zones: ['la trinidad', 'sorocaima', 'zona industrial', 'los samanes', 'las minas', 'baruta'],
        label: 'Zona Corta (La Trinidad / Baruta cercana)'
    },
    {
        tier: 2,
        fee: 5.00,
        maxKm: 7.0,
        zones: ['prados del este', 'la tahona', 'el hatillo', 'la boyera', 'santa fe', 'cumbres de curumo', 'los campitos', 'santa ines'],
        label: 'Zona Media (El Hatillo / Prados del Este / Santa Fe)'
    },
    {
        tier: 3,
        fee: 7.00,
        maxKm: 11.0,
        zones: ['las mercedes', 'chacao', 'el cafetal', 'chuao', 'los ruices', 'santa paula', 'san roman', 'valle arriba'],
        label: 'Zona Ampliada (Las Mercedes / Chacao / El Cafetal)'
    },
    {
        tier: 4,
        fee: 11.00,
        maxKm: 999.0,
        zones: ['altamira', 'los palos grandes', 'caricuao', 'el valle', 'centro', 'la florida', 'san bernardino'],
        label: 'Zona Distante / Doble Viaje por Volumen'
    }
];

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
 * Estima la tarifa de delivery según coordenadas GPS o texto de zona
 * @param {Object} options
 * @param {number} [options.latitude]
 * @param {number} [options.longitude]
 * @param {string} [options.zoneText]
 * @returns {{ fee: number, tier: number, distanceKm: number|null, label: string, isEstimated: boolean }}
 */
export function estimateDeliveryFee({ latitude, longitude, zoneText = '' }) {
    // 1. Intentar cálculo exacto por GPS
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
                        isEstimated: false
                    };
                }
            }
        }
    }

    // 2. Fallback: Búsqueda por palabras clave en la dirección escrita
    const text = (zoneText || '').toLowerCase();
    for (const tier of DELIVERY_TIERS) {
        if (tier.zones.some(zone => text.includes(zone))) {
            return {
                fee: tier.fee,
                tier: tier.tier,
                distanceKm: null,
                label: tier.label,
                isEstimated: true
            };
        }
    }

    // 3. Tarifa estándar inicial si no se reconoce la zona (Nivel 1 básico)
    return {
        fee: 3.50,
        tier: 1,
        distanceKm: null,
        label: 'Tarifa Base (A confirmar con el ticket)',
        isEstimated: true
    };
}
