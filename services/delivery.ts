// Historical GrabExpress Malaysia reference table (May 2023), used only for
// CurRENT's classroom simulation. Distances are demonstration inputs, not live routes.
export const DELIVERY_PRICING_REFERENCE = "GrabExpress MY FAQ, May 2023";
export const DELIVERY_PRICING_URL = "https://assets.grab.com/wp-content/uploads/sites/8/2023/05/19221440/pax_express_FAQ_table_MY.pdf";

// Demo delivery pricing is deliberately scoped to Klang Valley and Penang only.
// CurRENT's marketplace itself still covers all 13 states and 3 federal territories —
// this scope limit applies only to the GrabExpress-inspired delivery calculator demo.
export type DeliveryArea = "Klang Valley" | "Penang";
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
  fee: number;
  area?: string;
  distanceKm?: number;
  vehicle?: DeliveryVehicle;
  baseFare?: number;
  distanceCharge?: number;
  minimumFare?: number;
  pricingReference?: string;
  status: "required" | "paid_demo";
  receiptReference?: string;
  paidAt?: string;
};

export type DisplayDelivery = {
  method: "GrabExpress (Demo)" | "Self-Pickup";
  origin: string;
  destination: string;
  area: DeliveryArea | null;
  distanceKm: number | null;
  vehicle: DeliveryVehicle | null;
  fee: number | null;
  baseFare: number | null;
  distanceCharge: number | null;
  minimumFare: number | null;
  status: "paid_demo" | "required" | "unavailable" | "self_pickup";
  receiptReference?: string;
  paidAt?: string;
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
}): DisplayDelivery {
  const { collectionMethod, deliveryDemo, pickupLocation, deliveryAddress } = params;
  if (collectionMethod === "Self-Pickup") {
    return { method: "Self-Pickup", origin: pickupLocation, destination: pickupLocation, area: null,
      distanceKm: null, vehicle: null, fee: null, baseFare: null, distanceCharge: null, minimumFare: null,
      status: "self_pickup" };
  }
  if (deliveryDemo) {
    return {
      method: "GrabExpress (Demo)", origin: deliveryDemo.origin, destination: deliveryDemo.destination,
      area: (deliveryDemo.area as DeliveryArea) || null, distanceKm: deliveryDemo.distanceKm ?? null,
      vehicle: deliveryDemo.vehicle ?? null, fee: deliveryDemo.fee, baseFare: deliveryDemo.baseFare ?? null,
      distanceCharge: deliveryDemo.distanceCharge ?? null, minimumFare: deliveryDemo.minimumFare ?? null,
      status: deliveryDemo.status, receiptReference: deliveryDemo.receiptReference, paidAt: deliveryDemo.paidAt,
    };
  }
  // No saved delivery record yet: derive a read-only estimate from the pickup/delivery addresses where
  // the route is within a supported demo service area. Never reports a payment as completed.
  const pickupArea = pickupDeliveryArea(pickupLocation);
  const destinationArea = deliveryAddress ? pickupDeliveryArea(deliveryAddress) : null;
  if (pickupArea && destinationArea && pickupArea === destinationArea) {
    const scenario = DEMO_ROUTE_SCENARIOS.find((s) => s.area === pickupArea);
    const estimate = scenario ? quoteDemoDelivery(pickupArea, "Motorcycle", scenario.distanceKm) : null;
    if (estimate) {
      return { method: "GrabExpress (Demo)", origin: pickupLocation, destination: deliveryAddress || "",
        area: estimate.area, distanceKm: estimate.distanceKm, vehicle: estimate.vehicle, fee: estimate.fee,
        baseFare: estimate.baseFare, distanceCharge: estimate.distanceCharge, minimumFare: estimate.minimumFare,
        status: "required" };
    }
  }
  return { method: "GrabExpress (Demo)", origin: pickupLocation, destination: deliveryAddress || "Not provided",
    area: null, distanceKm: null, vehicle: null, fee: null, baseFare: null, distanceCharge: null, minimumFare: null,
    status: "unavailable" };
}

export function quoteDemoDelivery(area: DeliveryArea, vehicle: DeliveryVehicle, distanceKm: number): DeliveryEstimate | null {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
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
  } else return null;
  baseFare = Math.round(baseFare * 100) / 100;
  distanceCharge = Math.round(distanceCharge * 100) / 100;
  return { area, vehicle, distanceKm, baseFare, distanceCharge, minimumFare,
    fee: Math.round(Math.max(minimumFare, baseFare + distanceCharge) * 100) / 100,
    reference: DELIVERY_PRICING_REFERENCE };
}
