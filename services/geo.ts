// Local, API-free distance estimation for CurRENT's GrabExpress-inspired delivery demo.
// No Google Maps / Routes API, no API key, no manual distance entry.
import { POSTCODE_COORDINATES, POSTCODE_PREFIX_FALLBACK, type PostcodeCoordinate } from "../data/postcodeCoordinates";

/** Configurable estimated road-distance factor applied to the straight-line (Haversine) distance. */
export const ROAD_DISTANCE_FACTOR = 1.3;

/** CurRENT demo delivery fee formula: MAX(RM5, RM4 base + distance(km) x RM1/km). */
export const AUTO_DELIVERY_BASE_FEE = 4;
export const AUTO_DELIVERY_PER_KM = 1;
export const AUTO_DELIVERY_MINIMUM_FEE = 5;

/**
 * Resolves a Malaysian postcode to an approximate coordinate using the bundled lookup dataset.
 * Tries an exact 5-digit match first, then falls back to a maintained prefix-based area lookup.
 * Returns null (never a fabricated distance) when the postcode is invalid or unrecognised.
 */
export function resolvePostcodeCoordinate(postcode: string | undefined | null): PostcodeCoordinate | null {
  const trimmed = (postcode || "").trim();
  if (!/^\d{5}$/.test(trimmed)) return null;
  if (POSTCODE_COORDINATES[trimmed]) return POSTCODE_COORDINATES[trimmed];
  return POSTCODE_PREFIX_FALLBACK[trimmed.slice(0, 2)] || null;
}

function haversineKm(a: PostcodeCoordinate, b: PostcodeCoordinate): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return earthRadiusKm * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type AutomaticDeliveryEstimate = {
  distanceKm: number;
  pickup: PostcodeCoordinate;
  delivery: PostcodeCoordinate;
  baseFee: number;
  distanceCharge: number;
  fee: number;
};

/** Distance only. Vehicle and regional pricing are applied in services/delivery.ts. */
export function estimatePostcodeDistance(pickupPostcode: string | undefined | null, deliveryPostcode: string | undefined | null) {
  const pickup = resolvePostcodeCoordinate(pickupPostcode);
  const delivery = resolvePostcodeCoordinate(deliveryPostcode);
  if (!pickup || !delivery) return null;
  const distanceKm = Math.round(haversineKm(pickup, delivery) * ROAD_DISTANCE_FACTOR * 10) / 10;
  return { distanceKm, pickup, delivery };
}

/**
 * Automatically estimates the delivery distance and fee from two Malaysian postcodes —
 * no manual distance entry, no vehicle selection, no external routing API.
 * Returns null when either postcode cannot be resolved (never invents a distance).
 */
export function estimateAutomaticDelivery(pickupPostcode: string | undefined | null, deliveryPostcode: string | undefined | null): AutomaticDeliveryEstimate | null {
  const route = estimatePostcodeDistance(pickupPostcode, deliveryPostcode);
  if (!route) return null;
  const { pickup, delivery, distanceKm } = route;
  const baseFee = AUTO_DELIVERY_BASE_FEE;
  const distanceCharge = Math.round(distanceKm * AUTO_DELIVERY_PER_KM * 100) / 100;
  const fee = Math.round(Math.max(AUTO_DELIVERY_MINIMUM_FEE, baseFee + distanceCharge) * 100) / 100;
  return { distanceKm, pickup, delivery, baseFee, distanceCharge, fee };
}
