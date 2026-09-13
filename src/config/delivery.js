/**
 * Configuración de delivery, coordenadas y cálculo de tarifas dinámico y configurable
 */
import { storeConfigLoader } from './storeConfigLoader.js';

/**
 * Coordenadas base de la tienda
 */
export const STORE_LOCATION = {
    get name() {
        return storeConfigLoader.getBusiness().location?.name || storeConfigLoader.getBusiness().name;
    },
    get latitude() {
        return Number(storeConfigLoader.getBusiness().location?.latitude || 10.4326);
    },
    get longitude() {
        return Number(storeConfigLoader.getBusiness().location?.longitude || -66.8601);
    }
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
 * Tarifas oficiales y zonas de cobertura cargadas desde la configuración
 */
export const DELIVERY_TIERS = storeConfigLoader.getDelivery().tiers || [];

/**
 * Genera el texto formateado de zonas y tarifas para el cliente
 */
export function buildDeliveryZonesText() {
    const biz = storeConfigLoader.getBusiness();
    const deliveryConfig = storeConfigLoader.getDelivery();
    const tiers = deliveryConfig.tiers || [];

    const lines = [
        `🛵 *TARIFAS Y ZONAS DE DELIVERY - ${biz.name.toUpperCase()}*`,
        ''
    ];

    const emojis = ['🟢', '🟡', '🟠', '🔴'];
    tiers.forEach((t, idx) => {
        const emoji = emojis[idx] || '📍';
        lines.push(`${emoji} *Zona ${t.tier} - $${Number(t.fee).toFixed(2)}:*`);
        if (Array.isArray(t.zonesList) && t.zonesList.length > 0) {
            lines.push(`• ${t.zonesList.join(', ')}`);
        }
        lines.push('');
    });

    lines.push('📍 *¿Pides a otra zona?*');
    lines.push('¡Con gusto te atendemos! Si tu dirección está fuera de estas zonas habituales, verificaremos la tarifa exacta al confirmar tu pedido.');

    return lines.join('\n');
}

export const DELIVERY_ZONES_TEXT = buildDeliveryZonesText();

function getReadableZoneName(rawKw, tier) {
    const normKw = normalizeZoneName(rawKw);
    if (Array.isArray(tier.zonesList)) {
        // 1. Coincidencia exacta con algún nombre de zonesList
        const exact = tier.zonesList.find(z => normalizeZoneName(z) === normKw);
        if (exact) return exact;

        // 2. Coincidencia parcial: buscar la más larga/específica
        const matches = tier.zonesList.filter(z => normKw.includes(normalizeZoneName(z)) || normalizeZoneName(z).includes(normKw));
        if (matches.length > 0) {
            matches.sort((a, b) => normalizeZoneName(b).length - normalizeZoneName(a).length);
            return matches[0];
        }
    }

    // 3. Si no, poner en mayúscula cada palabra
    return rawKw.replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Prepara lista de palabras clave ordenada por longitud descendente para coincidencias precisas
 */
export function buildZoneKeywords(tiers = DELIVERY_TIERS) {
    const list = [];
    for (const tier of tiers) {
        if (Array.isArray(tier.keywords)) {
            for (const kw of tier.keywords) {
                list.push({
                    keyword: normalizeZoneName(kw),
                    rawZone: kw,
                    niceName: getReadableZoneName(kw, tier),
                    tier: tier.tier,
                    fee: tier.fee,
                    label: tier.label
                });
            }
        }
    }
    list.sort((a, b) => b.keyword.length - a.keyword.length);
    return list;
}

const ALL_ZONE_KEYWORDS = buildZoneKeywords(DELIVERY_TIERS);

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
    const roadMultiplier = Number(storeConfigLoader.getDelivery().roadMultiplier || 1.35);
    const distance = R * c * roadMultiplier;

    return Math.round(distance * 10) / 10;
}

/**
 * Estima la tarifa de delivery según el texto de la dirección o coordenadas GPS
 * @param {Object} options
 * @param {number} [options.latitude]
 * @param {number} [options.longitude]
 * @param {string} [options.zoneText]
 * @returns {{ fee: number|null, tier: number|null, distanceKm: number|null, label: string, zoneName: string, matchedZone?: string, isOtherZone: boolean }}
 */
export function estimateDeliveryFee({ latitude, longitude, zoneText = '' }) {
    const clean = normalizeZoneName(zoneText);

    // 1. Intentar coincidencia por texto de la zona
    if (clean) {
        for (const item of ALL_ZONE_KEYWORDS) {
            if (clean.includes(item.keyword)) {
                return {
                    fee: item.fee,
                    tier: item.tier,
                    distanceKm: null,
                    label: item.label,
                    zoneName: item.niceName,
                    matchedZone: item.niceName,
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
                        zoneName: `Sector cercano (~${distance} km)`,
                        matchedZone: `Sector cercano (~${distance} km)`,
                        isOtherZone: false
                    };
                }
            }
            // Si la distancia supera las zonas fijas
            return {
                fee: null,
                tier: null,
                distanceKm: distance,
                label: `Zona externa (~${distance} km)`,
                zoneName: `Zona externa (~${distance} km)`,
                matchedZone: `Zona externa (~${distance} km)`,
                isOtherZone: true
            };
        }
    }

    // 3. Si no coincide con ninguna de las zonas fijas:
    const fallbackNotice = storeConfigLoader.getDelivery().fallbackFeeNotice || 'Zona por verificar';
    return {
        fee: null,
        tier: null,
        distanceKm: null,
        label: fallbackNotice,
        zoneName: fallbackNotice,
        matchedZone: fallbackNotice,
        isOtherZone: true
    };
}
