import { estimatePostcodeDistance } from "./geo";
import { demoDestinationPostcode, demoPickupLocation } from "./demoDeliveryLocations";

// Historical GrabExpress Malaysia reference table (May 2023), used only for
// CurRENT's classroom simulation. Distances are demonstration inputs, not live routes.
export const DELIVERY_PRICING_REFERENCE = "GrabExpress MY FAQ, May 2023";
export const DELIVERY_PRICING_URL = "https://assets.grab.com/wp-content/uploads/sites/8/2023/05/19221440/pax_express_FAQ_table_MY.pdf";

// Demo delivery pricing is deliberately scoped to Klang Valley and Penang only.
// CurRENT's marketplace itself still covers all 13 states and 3 federal territories —
// this scope limit applies only to the GrabExpress-inspired delivery calculator demo.
export type DeliveryArea = "Klang Valley" | "Penang" | "Johor Bahru" | "Negeri Sembilan" | "Melaka" | "Ipoh" | "Kota Kinabalu" | "Kuching" | "Miri" | "Other cities";
export type DeliveryVehicle = "Motorcycle" | "Car" | "MPV";
export type ParcelDimensions = { length: number; width: number; height: number };
export type DeliveryEstimate = {
  area: DeliveryArea;
  vehicle: DeliveryVehicle;
  distanceKm: number;
  baseFare: number;
  distanceCharge: number;
  minimumFare: number;
  fee: number;
  reference: string;
};

export function deliveryRateDescription(area: DeliveryArea, vehicle: DeliveryVehicle): string {
  if (area === "Klang Valley" && vehicle === "Motorcycle") return "RM5 first 5 km; RM1/km after 5 km";
  if (area === "Klang Valley" && vehicle === "Car") return "RM8 first 5 km; RM1/km to 15 km; RM1.50/km after";
  if (area === "Klang Valley" && vehicle === "MPV") return "RM20 first 10 km; RM2/km to 100 km; RM1.50/km after";
  if (vehicle === "MPV") return "CurRENT simulated MPV rate based on Klang Valley tiers";
  if (area === "Penang" || area === "Johor Bahru") return vehicle === "Motorcycle"
    ? "RM5 first 5 km; RM0.80/km to 10 km; RM0.70/km after"
    : "RM8 first 5 km; RM1/km to 15 km; RM1.50/km after";
  if (area === "Melaka" && vehicle === "Car") return "RM6 base; RM0.80/km from 5–10 km; RM1/km from 10–20 km; RM1.30/km after";
  if (area === "Negeri Sembilan" || area === "Melaka") return vehicle === "Motorcycle"
    ? "Max(RM5, RM4 + RM0.60/km)" : "RM6 + RM0.70/km";
  if (area === "Ipoh") return vehicle === "Motorcycle"
    ? "Max(RM5, RM3.80 + RM0.60/km to 10 km + RM0.70/km after)" : "RM6 + RM0.70/km";
  if (area === "Kota Kinabalu" || area === "Kuching") return "RM7 + RM0.80/km";
  if (area === "Miri" && vehicle === "Motorcycle") return "Max(RM4.50, RM3.80 + RM0.54/km to 6 km + RM0.66/km after)";
  return vehicle === "Motorcycle" ? "Max(RM4.50, RM3.80 + RM0.70/km)" : "RM6 + RM0.70/km";
}

export const DEMO_ROUTE_SCENARIOS: { area: DeliveryArea; label: string; distanceKm: number }[] = [
  { area: "Klang Valley", label: "Local 5 km", distanceKm: 5 },
  { area: "Klang Valley", label: "Across town 8 km", distanceKm: 8 },
  { area: "Penang", label: "Local 6 km", distanceKm: 6 },
  { area: "Penang", label: "Across town 12 km", distanceKm: 12 },
];

const limits: Record<DeliveryVehicle, { kg: number; cm: [number, number, number] }> = {
  Motorcycle: { kg: 10, cm: [43, 43, 43] },
  Car: { kg: 50, cm: [100, 50, 50] },
  MPV: { kg: 100, cm: [100, 80, 80] },
};

export function eligibleDeliveryVehicles(weightKg: number, dimensions: ParcelDimensions): DeliveryVehicle[] {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || Object.values(dimensions).some((value) => !Number.isFinite(value) || value <= 0)) return [];
  const sorted = Object.values(dimensions).sort((a, b) => b - a);
  return (Object.keys(limits) as DeliveryVehicle[]).filter((vehicle) =>
    weightKg <= limits[vehicle].kg && sorted.every((size, index) => size <= limits[vehicle].cm[index]));
}

const klangValleyState = (state: string) => /^(Selangor|Kuala Lumpur|Putrajaya)$/i.test(state);

/** Historical regional fare category, not a statement of present courier coverage. */
function routeArea(pickup: { area: string; state: string }, delivery: { area: string; state: string }): DeliveryArea | null {
  if (klangValleyState(pickup.state) && klangValleyState(delivery.state)) return "Klang Valley";
  if (pickup.state.toLowerCase() !== delivery.state.toLowerCase()) return null;
  const state = pickup.state.toLowerCase();
  const city = pickup.area.toLowerCase();
  if (/pulau pinang|penang/.test(state)) return "Penang";
  if (/negeri sembilan/.test(state)) return "Negeri Sembilan";
  if (/melaka|malacca/.test(state)) return "Melaka";
  if (/johor/.test(state) && /johor bahru/.test(city)) return "Johor Bahru";
  if (/perak/.test(state) && /ipoh/.test(city)) return "Ipoh";
  if (/sabah/.test(state) && /kota kinabalu/.test(city)) return "Kota Kinabalu";
  if (/sarawak/.test(state) && /kuching/.test(city)) return "Kuching";
  if (/sarawak/.test(state) && /miri/.test(city)) return "Miri";
  return "Other cities";
}

export function selectDeliveryVehicle(weightKg: number | undefined, dimensions: ParcelDimensions | undefined,
  requirement: "standard" | "fragile" | "bulky" = "standard"): DeliveryVehicle | null {
  if (weightKg == null || !dimensions) return null;
  const eligible = eligibleDeliveryVehicles(weightKg, dimensions);
  if (requirement === "bulky") return eligible.includes("MPV") ? "MPV" : null;
  if (requirement === "fragile") return eligible.includes("Car") ? "Car" : eligible.includes("MPV") ? "MPV" : null;
  return eligible[0] || null;
}

/** Use saved parcel facts first; infer a conservative vehicle when they are absent. */
export function selectListingDeliveryVehicle(params: {
  weightKg?: number; dimensionsCm?: ParcelDimensions;
  requirement?: "standard" | "fragile" | "bulky";
  title?: string; category?: string; description?: string;
}): DeliveryVehicle {
  const measured = selectDeliveryVehicle(params.weightKg, params.dimensionsCm, params.requirement);
  if (measured) return measured;
  const item = `${params.title || ""} ${params.category || ""} ${params.description || ""}`.toLowerCase();
  if (params.requirement === "bulky" || /chair|furniture|sofa|table|desk|monitor|appliance|refrigerator|washing machine|large speaker|projector|bulky/.test(item)) return "Car";
  if (params.requirement === "fragile") return "Car";
  if (/camera|lens|drone|tablet|small electronic|portable speaker|small speaker|small tool|accessor|gaming device|game console|controller/.test(item)) return "Motorcycle";
  return "Car";
}

export type AutomaticVehicleDeliveryQuote = DeliveryEstimate & { pricingKind: "historical_grab" | "current_simulation" };

/** New unpaid quotes only; paid bookings always use their stored receipt amount. */
export function quoteAutomaticVehicleDelivery(params: {
  pickupPostcode?: string; deliveryPostcode?: string;
  weightKg?: number; dimensionsCm?: ParcelDimensions;
  requirement?: "standard" | "fragile" | "bulky";
  title?: string; category?: string; description?: string;
}): AutomaticVehicleDeliveryQuote | null {
  const route = estimatePostcodeDistance(params.pickupPostcode, params.deliveryPostcode);
  const vehicle = selectListingDeliveryVehicle(params);
  if (!route) return null;
  const area = routeArea(route.pickup, route.delivery);
  if (!area) return null; // The historical table does not establish interstate delivery.
  const published = quoteDemoDelivery(area, vehicle, route.distanceKm);
  if (published) return { ...published, pricingKind: "historical_grab" };
  if (vehicle !== "MPV") return null;
  // The PDF publishes MPV tiers for Klang Valley only. Elsewhere use an explicit CurRENT assumption.
  const simulated = quoteDemoDelivery("Klang Valley", "MPV", route.distanceKm)!;
  return { ...simulated, area, reference: "CurRENT simulated MPV regional estimate (not published Grab fare)", pricingKind: "current_simulation" };
}

export function deliveryArea(location: string, state: string): DeliveryArea | null {
  const place = location.toLowerCase();
  const region = state.toLowerCase();
  if ((region.includes("selangor") || region.includes("kuala lumpur")) &&
    /petaling jaya|subang|shah alam|puchong|bangsar|mont kiara|kuala lumpur|kl sentral|klcc/.test(place)) return "Klang Valley";
  if ((region.includes("penang") || region.includes("pulau pinang")) && /george town|penang|bukit mertajam|bayan lepas/.test(place)) return "Penang";
  return null;
}

export function pickupDeliveryArea(location: string): DeliveryArea | null {
  const place = location.toLowerCase();
  if (/petaling jaya|subang|shah alam|puchong|bangsar|mont kiara|kuala lumpur|kl sentral|klcc/.test(place)) return "Klang Valley";
  if (/george town|penang|bukit mertajam|bayan lepas/.test(place)) return "Penang";
  return null;
}

export type StoredDeliveryDemo = {
  provider?: string;
  origin: string;
  destination: string;
  /** Combined two-way (outbound + return) delivery fee — the actual amount charged. */
  fee: number;
  /** Outbound leg (pickup → delivery). */
  outboundFee?: number;
  /** Return leg (delivery → pickup), calculated separately with the same formula. */
  returnFee?: number;
  area?: string;
  distanceKm?: number;
  vehicle?: DeliveryVehicle;
  baseFare?: number;
  distanceCharge?: number;
  minimumFare?: number;
  pricingReference?: string;
  status: "required" | "paid_demo" | "refunded_demo";
  receiptReference?: string;
  paidAt?: string;
  refundedAt?: string;
};

export type DisplayDelivery = {
  method: "GrabExpress (Demo)" | "Self-Pickup";
  origin: string;
  destination: string;
  area: DeliveryArea | null;
  distanceKm: number | null;
  vehicle: DeliveryVehicle | null;
  fee: number | null;
  outboundFee: number | null;
  returnFee: number | null;
  baseFare: number | null;
  distanceCharge: number | null;
  minimumFare: number | null;
  status: "paid_demo" | "required" | "unavailable" | "self_pickup" | "refunded_demo";
  receiptReference?: string;
  paidAt?: string;
  /** Read-only two-way quote; never substitutes for a historical paid amount. */
  estimatedTwoWayFee?: number | null;
  estimatedOutboundFee?: number | null;
  estimatedReturnFee?: number | null;
  returnDistanceKm?: number | null;
  estimateOnly?: boolean;
};

/**
 * Produces one consistent, display-ready delivery record for a booking, for use anywhere
 * CurRENT shows "GrabExpress Delivery (Demo)" details (Transaction Details, Rental Details, etc).
 * Prefers the booking's own saved deliveryDemo. Only falls back to a derived estimate when none
 * was saved — and even then, only ever reports a demo PAYMENT as completed if the saved record says so.
 */
export function deriveDisplayDelivery(params: {
  collectionMethod?: string;
  deliveryDemo?: StoredDeliveryDemo | null;
  pickupLocation: string;
  deliveryAddress?: string;
  /** Postcodes, when known, let the fallback estimate below reuse the exact same automatic
   * postcode-distance formula used at renter checkout, instead of a separate guess. */
  pickupPostcode?: string;
  deliveryPostcode?: string;
  parcelWeightKg?: number;
  parcelDimensionsCm?: ParcelDimensions;
  deliveryRequirement?: "standard" | "fragile" | "bulky";
  title?: string;
  category?: string;
  description?: string;
  demoBooking?: boolean;
  listingId?: string;
}): DisplayDelivery {
  const { collectionMethod, deliveryDemo, deliveryAddress, demoBooking, listingId } = params;
  const legacyPickup = demoBooking ? demoPickupLocation(listingId) : null;
  const pickupLocation = params.pickupLocation || legacyPickup?.address || "";
  const pickupPostcode = params.pickupPostcode || legacyPickup?.postcode;
  const deliveryPostcode = params.deliveryPostcode || (demoBooking ? demoDestinationPostcode(deliveryAddress) : undefined);
  if (collectionMethod === "Self-Pickup") {
    return { method: "Self-Pickup", origin: pickupLocation, destination: pickupLocation, area: null,
      distanceKm: null, vehicle: null, fee: null, outboundFee: null, returnFee: null, baseFare: null,
      distanceCharge: null, minimumFare: null, status: "self_pickup" };
  }
  const parcel = { weightKg: params.parcelWeightKg, dimensionsCm: params.parcelDimensionsCm,
    requirement: params.deliveryRequirement, title: params.title, category: params.category,
    description: params.description };
  const outbound = quoteAutomaticVehicleDelivery({ pickupPostcode, deliveryPostcode, ...parcel });
  const inbound = quoteAutomaticVehicleDelivery({ pickupPostcode: deliveryPostcode, deliveryPostcode: pickupPostcode, ...parcel });
  const outboundDistance = estimatePostcodeDistance(pickupPostcode, deliveryPostcode);
  const inboundDistance = estimatePostcodeDistance(deliveryPostcode, pickupPostcode);
  const estimatedTwoWayFee = outbound && inbound
    ? Math.round((outbound.fee + inbound.fee) * 100) / 100 : null;
  if (deliveryDemo) {
    const unpaid = deliveryDemo.status === "required";
    return {
      method: "GrabExpress (Demo)",
      origin: unpaid ? pickupLocation : deliveryDemo.origin,
      destination: unpaid ? deliveryAddress || deliveryDemo.destination : deliveryDemo.destination,
      area: unpaid ? outbound?.area ?? null : (deliveryDemo.area as DeliveryArea) || null,
      distanceKm: outboundDistance?.distanceKm ?? deliveryDemo.distanceKm ?? null,
      vehicle: unpaid ? outbound?.vehicle ?? null : deliveryDemo.vehicle ?? null,
      fee: unpaid ? estimatedTwoWayFee : deliveryDemo.fee,
      outboundFee: unpaid ? outbound?.fee ?? null : deliveryDemo.outboundFee ?? null,
      returnFee: unpaid ? inbound?.fee ?? null : deliveryDemo.returnFee ?? null,
      baseFare: unpaid ? outbound?.baseFare ?? null : deliveryDemo.baseFare ?? null,
      distanceCharge: unpaid ? outbound?.distanceCharge ?? null : deliveryDemo.distanceCharge ?? null,
      minimumFare: unpaid ? outbound?.minimumFare ?? null : deliveryDemo.minimumFare ?? null,
      status: deliveryDemo.status, receiptReference: deliveryDemo.receiptReference, paidAt: deliveryDemo.paidAt,
      estimatedTwoWayFee, estimatedOutboundFee: outbound?.fee ?? null,
      estimatedReturnFee: inbound?.fee ?? null, returnDistanceKm: inboundDistance?.distanceKm ?? null,
    };
  }
  // No saved delivery record yet: derive a read-only estimate using the exact same automatic
  // postcode-distance formula as the renter-side GrabExpress Delivery (Demo) checkout
  // (services/geo.ts estimateAutomaticDelivery), applied separately to the outbound and return
  // legs and summed — never assuming the return trip costs the same without calculating it.
  // Never reports a payment as completed.
  if (outbound && inbound) {
    return { method: "GrabExpress (Demo)", origin: pickupLocation, destination: deliveryAddress || "",
      area: outbound.area, distanceKm: outbound.distanceKm, vehicle: outbound.vehicle,
      fee: Math.round((outbound.fee + inbound.fee) * 100) / 100,
      outboundFee: outbound.fee, returnFee: inbound.fee,
      baseFare: outbound.baseFare, distanceCharge: outbound.distanceCharge, minimumFare: outbound.minimumFare,
      status: "required", estimatedTwoWayFee, estimatedOutboundFee: outbound.fee,
      estimatedReturnFee: inbound.fee, returnDistanceKm: inbound.distanceKm, estimateOnly: true };
  }
  return { method: "GrabExpress (Demo)", origin: pickupLocation, destination: deliveryAddress || "Not provided",
    area: null, distanceKm: null, vehicle: null, fee: null, outboundFee: null, returnFee: null, baseFare: null,
    distanceCharge: null, minimumFare: null, status: "unavailable" };
}

export function quoteDemoDelivery(area: DeliveryArea, vehicle: DeliveryVehicle, distanceKm: number): DeliveryEstimate | null {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return null;
  let baseFare: number;
  let minimumFare: number;
  let distanceCharge: number;
  if (area === "Klang Valley" && vehicle === "Motorcycle") {
    baseFare = minimumFare = 5;
    distanceCharge = Math.max(0, distanceKm - 5) * 1;
  } else if (area === "Klang Valley" && vehicle === "Car") {
    baseFare = minimumFare = 8;
    distanceCharge = Math.min(Math.max(0, distanceKm - 5), 10) * 1 + Math.max(0, distanceKm - 15) * 1.5;
  } else if (area === "Klang Valley" && vehicle === "MPV") {
    baseFare = minimumFare = 20;
    distanceCharge = Math.min(Math.max(0, distanceKm - 10), 90) * 2 + Math.max(0, distanceKm - 100) * 1.5;
  } else if (area === "Penang" && vehicle === "Motorcycle") {
    baseFare = minimumFare = 5;
    distanceCharge = Math.min(Math.max(0, distanceKm - 5), 5) * 0.8 + Math.max(0, distanceKm - 10) * 0.7;
  } else if (area === "Penang" && vehicle === "Car") {
    baseFare = minimumFare = 8;
    distanceCharge = Math.min(Math.max(0, distanceKm - 5), 10) * 1 + Math.max(0, distanceKm - 15) * 1.5;
  } else if (area === "Johor Bahru" && vehicle === "Motorcycle") {
    baseFare = minimumFare = 5;
    distanceCharge = Math.min(Math.max(0, distanceKm - 5), 5) * 0.8 + Math.max(0, distanceKm - 10) * 0.7;
  } else if (area === "Johor Bahru" && vehicle === "Car") {
    baseFare = minimumFare = 8;
    distanceCharge = Math.min(Math.max(0, distanceKm - 5), 10) + Math.max(0, distanceKm - 15) * 1.5;
  } else if (area === "Negeri Sembilan" && vehicle === "Motorcycle" || area === "Melaka" && vehicle === "Motorcycle") {
    baseFare = 4; minimumFare = 5; distanceCharge = distanceKm * 0.6;
  } else if (area === "Negeri Sembilan" && vehicle === "Car") {
    baseFare = minimumFare = 6; distanceCharge = distanceKm * 0.7;
  } else if (area === "Melaka" && vehicle === "Car") {
    baseFare = minimumFare = 6;
    distanceCharge = Math.min(Math.max(0, distanceKm - 5), 5) * 0.8 +
      Math.min(Math.max(0, distanceKm - 10), 10) + Math.max(0, distanceKm - 20) * 1.3;
  } else if (area === "Ipoh" && vehicle === "Motorcycle") {
    baseFare = 3.8; minimumFare = 5;
    distanceCharge = Math.min(distanceKm, 10) * 0.6 + Math.max(0, distanceKm - 10) * 0.7;
  } else if (area === "Ipoh" && vehicle === "Car") {
    baseFare = minimumFare = 6; distanceCharge = distanceKm * 0.7;
  } else if ((area === "Kota Kinabalu" || area === "Kuching") && (vehicle === "Motorcycle" || vehicle === "Car")) {
    baseFare = minimumFare = 7; distanceCharge = distanceKm * 0.8;
  } else if (area === "Miri" && vehicle === "Motorcycle") {
    baseFare = 3.8; minimumFare = 4.5;
    distanceCharge = Math.min(distanceKm, 6) * 0.54 + Math.max(0, distanceKm - 6) * 0.66;
  } else if (area === "Miri" && vehicle === "Car") {
    baseFare = minimumFare = 6; distanceCharge = distanceKm * 0.7;
  } else if (area === "Other cities" && vehicle === "Motorcycle") {
    baseFare = 3.8; minimumFare = 4.5; distanceCharge = distanceKm * 0.7;
  } else if (area === "Other cities" && vehicle === "Car") {
    baseFare = minimumFare = 6; distanceCharge = distanceKm * 0.7;
  } else return null;
  baseFare = Math.round(baseFare * 100) / 100;
  distanceCharge = Math.round(distanceCharge * 100) / 100;
  return { area, vehicle, distanceKm, baseFare, distanceCharge, minimumFare,
    fee: Math.round(Math.max(minimumFare, baseFare + distanceCharge) * 100) / 100,
    reference: DELIVERY_PRICING_REFERENCE };
}
