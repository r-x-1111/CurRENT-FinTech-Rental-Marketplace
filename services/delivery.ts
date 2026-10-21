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

export function recommendsFragileHandling(title: string, description = ""): boolean {
  return /\b(camera|dslr|mirrorless|lens|drone|projector)\b|\b(?:delicate photography|camera equipment)\b/i
    .test(`${title} ${description}`);
}

/** Use saved parcel facts first; infer a conservative vehicle only when they are absent.
 * Returns null when real weight/dimensions are known but no vehicle qualifies for them — the
 * caller must treat that as "no local vehicle fits" (Special Delivery Quotation Required),
 * never silently guess a vehicle that the parcel's own measurements rule out. */
export function selectListingDeliveryVehicle(params: {
  weightKg?: number; dimensionsCm?: ParcelDimensions;
  requirement?: "standard" | "fragile" | "bulky";
  title?: string; category?: string; description?: string;
}): DeliveryVehicle | null {
  const hasMeasurements = params.weightKg != null && !!params.dimensionsCm;
  if (hasMeasurements) return selectDeliveryVehicle(params.weightKg, params.dimensionsCm, params.requirement);
  const item = `${params.title || ""} ${params.category || ""} ${params.description || ""}`.toLowerCase();
  if (params.requirement === "bulky") return "MPV";
  if (params.requirement === "fragile") return "Car";
  if (/chair|furniture|sofa|table|desk|monitor|appliance|refrigerator|washing machine|large speaker|bulky/.test(item)) return "Car";
  if (recommendsFragileHandling(params.title || "", params.description)) return "Car";
  if (/tablet|small electronic|portable speaker|small speaker|small tool|accessor|gaming device|game console|controller/.test(item)) return "Motorcycle";
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
  if (!route || !vehicle) return null; // No vehicle: the parcel exceeds every local vehicle's limits.
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
  // Domestic Courier (Demo) fields — set only when provider is the courier, not GrabExpress.
  shippingZone?: CourierShippingZone;
  chargeableWeightKg?: number;
  volumetricWeightKg?: number;
  dispatchDate?: string;
  estimatedDeliveryRangeStart?: string;
  estimatedDeliveryRangeEnd?: string;
  returnDispatchDeadline?: string;
  estimatedReturnRangeStart?: string;
  estimatedReturnRangeEnd?: string;
  outboundTrackingRef?: string;
  returnTrackingRef?: string;
  outboundDispatchStatus?: "awaiting_lender_confirmation" | "confirmed" | "proposed_alternate" | "drop_off";
  lenderProposedDispatchDate?: string;
  requiresRenterDispatchApproval?: boolean;
  /** Set once the renter confirms they've dropped the returned parcel at a courier branch
   * (stamped by the existing returnConfirm action for courier bookings). */
  returnDropoffConfirmedAt?: string;
  status: "required" | "paid_demo" | "refunded_demo";
  receiptReference?: string;
  paidAt?: string;
  refundedAt?: string;
};

export type DisplayDelivery = {
  method: DeliveryMethod;
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
  // Domestic Courier (Demo) display fields — null unless method is "Domestic Courier (Demo)".
  courierName: string | null;
  shippingZone: CourierShippingZone | null;
  chargeableWeightKg: number | null;
  volumetricWeightKg: number | null;
  dispatchDate?: string | null;
  estimatedDeliveryRangeStart?: string | null;
  estimatedDeliveryRangeEnd?: string | null;
  returnDispatchDeadline?: string | null;
  estimatedReturnRangeStart?: string | null;
  estimatedReturnRangeEnd?: string | null;
  outboundTrackingRef?: string | null;
  returnTrackingRef?: string | null;
  outboundDispatchStatus?: "awaiting_lender_confirmation" | "confirmed" | "proposed_alternate" | "drop_off" | null;
  lenderProposedDispatchDate?: string | null;
  requiresRenterDispatchApproval?: boolean;
  returnDropoffConfirmedAt?: string | null;
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
 * Delivery fees are paid to the delivery company (GrabExpress / Domestic Courier), not earned by
 * CurRENT — CurRENT only simulates tracking the refund, it never issues one. These are the
 * possible simulated refund-tracking statuses shown for a delivery payment; "refunded" is only
 * ever reported when `deliveryStatus` is itself already "refunded_demo" — an explicitly recorded
 * event elsewhere — never inferred merely because a rental booking was cancelled.
 */
export type DeliveryRefundStatus =
  | "not_paid"
  | "refund_not_required"
  | "refund_pending"
  | "refund_not_eligible"
  | "refunded";

export const DELIVERY_REFUND_STATUS_LABEL: Record<DeliveryRefundStatus, string> = {
  not_paid: "Not Paid",
  refund_not_required: "Refund Not Required",
  refund_pending: "Refund Eligibility Pending (Demo)",
  refund_not_eligible: "Refund Not Eligible (Demo)",
  refunded: "Refunded (Simulated)",
};

/**
 * Derives the refund-tracking status for one delivery leg (outbound or return), from facts
 * already recorded on the booking — never invents a guaranteed refund, a fixed refund deadline,
 * or an approved provider amount.
 *
 *  - Fee never paid                              -> "not_paid" (no refund shown)
 *  - Paid, booking not cancelled                 -> "refund_not_required"
 *  - Paid, cancelled, this leg hasn't started yet -> "refund_pending" (may be eligible, subject to
 *    the provider's own cancellation terms — never assumed approved)
 *  - Paid, cancelled, this leg already dispatched/completed -> "refund_not_eligible" (outbound
 *    fees already spent are not automatically refunded; an in-transit parcel requires provider
 *    review rather than an assumed refund)
 *  - `deliveryStatus` already "refunded_demo"     -> "refunded" (a fact recorded elsewhere, e.g. an
 *    abandoned pre-payment checkout that never reached a confirmed rental)
 */
export function deriveDeliveryRefundStatus(params: {
  cancelled: boolean;
  deliveryStatus: "required" | "paid_demo" | "refunded_demo" | undefined;
  /** Has this specific leg (outbound or return) already been dispatched, collected or completed? */
  legStarted: boolean;
}): DeliveryRefundStatus {
  if (params.deliveryStatus === "refunded_demo") return "refunded";
  if (!params.deliveryStatus || params.deliveryStatus === "required") return "not_paid";
  if (!params.cancelled) return "refund_not_required";
  return params.legStarted ? "refund_not_eligible" : "refund_pending";
}

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
  /** Multi-package listings (e.g. Photo Booth Setup) — when set, the courier quote prices each
   * package independently and combines the charges, per package, instead of using the single
   * parcelWeightKg/parcelDimensionsCm pair above. Not used by the GrabExpress vehicle quote,
   * which only ever covers single-package local deliveries. */
  parcelPackages?: ParcelPackage[];
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
  const nullCourierFields = { courierName: null, shippingZone: null, chargeableWeightKg: null, volumetricWeightKg: null };
  if (collectionMethod === "Self-Pickup") {
    return { method: "Self-Pickup", origin: pickupLocation, destination: pickupLocation, area: null,
      distanceKm: null, vehicle: null, fee: null, outboundFee: null, returnFee: null, baseFare: null,
      distanceCharge: null, minimumFare: null, status: "self_pickup", ...nullCourierFields };
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
  // GrabExpress covers same-state routes. When it doesn't resolve, try the Domestic Courier
  // (cross-state) quote instead, before falling back to "unavailable".
  const courierParcel = { pickupPostcode, deliveryPostcode, weightKg: params.parcelWeightKg,
    dimensionsCm: params.parcelDimensionsCm, packages: params.parcelPackages };
  const courierOutbound = !outbound ? quoteAutomaticDomesticCourier(courierParcel) : null;
  const courierInbound = !inbound ? quoteAutomaticDomesticCourier({ ...courierParcel,
    pickupPostcode: deliveryPostcode, deliveryPostcode: pickupPostcode }) : null;
  const estimatedCourierTwoWayFee = courierOutbound && courierInbound
    ? Math.round((courierOutbound.fee + courierInbound.fee) * 100) / 100 : null;
  if (deliveryDemo) {
    const unpaid = deliveryDemo.status === "required";
    const isCourier = deliveryDemo.provider === DOMESTIC_COURIER_NAME || (unpaid && !outbound && !!courierOutbound);
    if (isCourier) {
      return {
        method: "Domestic Courier (Demo)",
        origin: unpaid ? pickupLocation : deliveryDemo.origin,
        destination: unpaid ? deliveryAddress || deliveryDemo.destination : deliveryDemo.destination,
        area: null, distanceKm: null, vehicle: null, baseFare: null, distanceCharge: null, minimumFare: null,
        courierName: DOMESTIC_COURIER_NAME,
        shippingZone: unpaid ? courierOutbound?.zone ?? null : deliveryDemo.shippingZone ?? null,
        chargeableWeightKg: unpaid ? courierOutbound?.chargeableWeightKg ?? null : deliveryDemo.chargeableWeightKg ?? null,
        volumetricWeightKg: unpaid ? courierOutbound?.volumetricWeightKg ?? null : deliveryDemo.volumetricWeightKg ?? null,
        fee: unpaid ? estimatedCourierTwoWayFee : deliveryDemo.fee,
        outboundFee: unpaid ? courierOutbound?.fee ?? null : deliveryDemo.outboundFee ?? null,
        returnFee: unpaid ? courierInbound?.fee ?? null : deliveryDemo.returnFee ?? null,
        dispatchDate: deliveryDemo.dispatchDate ?? null,
        estimatedDeliveryRangeStart: deliveryDemo.estimatedDeliveryRangeStart ?? null,
        estimatedDeliveryRangeEnd: deliveryDemo.estimatedDeliveryRangeEnd ?? null,
        returnDispatchDeadline: deliveryDemo.returnDispatchDeadline ?? null,
        estimatedReturnRangeStart: deliveryDemo.estimatedReturnRangeStart ?? null,
        estimatedReturnRangeEnd: deliveryDemo.estimatedReturnRangeEnd ?? null,
        outboundTrackingRef: deliveryDemo.outboundTrackingRef ?? null,
        returnTrackingRef: deliveryDemo.returnTrackingRef ?? null,
        outboundDispatchStatus: deliveryDemo.outboundDispatchStatus ?? null,
        lenderProposedDispatchDate: deliveryDemo.lenderProposedDispatchDate ?? null,
        requiresRenterDispatchApproval: deliveryDemo.requiresRenterDispatchApproval ?? false,
        returnDropoffConfirmedAt: deliveryDemo.returnDropoffConfirmedAt ?? null,
        status: deliveryDemo.status, receiptReference: deliveryDemo.receiptReference, paidAt: deliveryDemo.paidAt,
        estimatedTwoWayFee: estimatedCourierTwoWayFee, estimatedOutboundFee: courierOutbound?.fee ?? null,
        estimatedReturnFee: courierInbound?.fee ?? null, returnDistanceKm: null,
      };
    }
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
      ...nullCourierFields,
      status: deliveryDemo.status, receiptReference: deliveryDemo.receiptReference, paidAt: deliveryDemo.paidAt,
      estimatedTwoWayFee, estimatedOutboundFee: outbound?.fee ?? null,
      estimatedReturnFee: inbound?.fee ?? null, returnDistanceKm: inboundDistance?.distanceKm ?? null,
    };
  }
  // No saved delivery record yet: derive a read-only estimate using the exact same automatic
  // quote functions used at renter-side checkout, applied separately to the outbound and
  // return legs and summed — never assuming the return trip costs the same without
  // calculating it. Never reports a payment as completed.
  if (outbound && inbound) {
    return { method: "GrabExpress (Demo)", origin: pickupLocation, destination: deliveryAddress || "",
      area: outbound.area, distanceKm: outbound.distanceKm, vehicle: outbound.vehicle,
      fee: Math.round((outbound.fee + inbound.fee) * 100) / 100,
      outboundFee: outbound.fee, returnFee: inbound.fee,
      baseFare: outbound.baseFare, distanceCharge: outbound.distanceCharge, minimumFare: outbound.minimumFare,
      ...nullCourierFields,
      status: "required", estimatedTwoWayFee, estimatedOutboundFee: outbound.fee,
      estimatedReturnFee: inbound.fee, returnDistanceKm: inbound.distanceKm, estimateOnly: true };
  }
  if (courierOutbound && courierInbound) {
    return { method: "Domestic Courier (Demo)", origin: pickupLocation, destination: deliveryAddress || "",
      area: null, distanceKm: null, vehicle: null, baseFare: null, distanceCharge: null, minimumFare: null,
      courierName: DOMESTIC_COURIER_NAME, shippingZone: courierOutbound.zone,
      chargeableWeightKg: courierOutbound.chargeableWeightKg, volumetricWeightKg: courierOutbound.volumetricWeightKg,
      fee: estimatedCourierTwoWayFee, outboundFee: courierOutbound.fee, returnFee: courierInbound.fee,
      status: "required", estimatedTwoWayFee: estimatedCourierTwoWayFee, estimatedOutboundFee: courierOutbound.fee,
      estimatedReturnFee: courierInbound.fee, returnDistanceKm: null, estimateOnly: true };
  }
  return { method: "GrabExpress (Demo)", origin: pickupLocation, destination: deliveryAddress || "Not provided",
    area: null, distanceKm: null, vehicle: null, fee: null, outboundFee: null, returnFee: null, baseFare: null,
    distanceCharge: null, minimumFare: null, ...nullCourierFields, status: "unavailable" };
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

// ============================================================================
// Domestic Courier (Demo) — covers routes the GrabExpress-style local quote above
// doesn't (cross-state routes, since routeArea() requires same state). Modeled as
// "J&T Express (Demo)"; pricing is an explicit CurRENT demo assumption, not a
// published J&T rate, and is labeled as such everywhere it's shown.
// ============================================================================

export type CourierShippingZone = "West Malaysia" | "East Malaysia";
export type DeliveryMethod = "GrabExpress (Demo)" | "Domestic Courier (Demo)" | "Self-Pickup";

export const DOMESTIC_COURIER_NAME = "J&T Express (Demo)";
export const DOMESTIC_COURIER_PRICING_REFERENCE =
  "CurRENT demo courier rate, informed by typical J&T Malaysia zone structure — not an official J&T quotation.";

/** Longest side a standard domestic courier parcel accepts in this demo. Beyond this, show
 * Special Delivery Quotation Required rather than a fabricated postage fee. */
export const COURIER_MAX_DIMENSION_CM = 120;

const eastMalaysiaState = (state: string) => /^(sabah|sarawak|labuan)$/i.test(state);

function courierShippingZone(pickupState: string, deliveryState: string): CourierShippingZone {
  return eastMalaysiaState(pickupState) || eastMalaysiaState(deliveryState) ? "East Malaysia" : "West Malaysia";
}

/** Volumetric Weight (kg) = Length x Width x Height / 6000. */
export function calculateVolumetricWeightKg(dimensions: ParcelDimensions): number {
  return (dimensions.length * dimensions.width * dimensions.height) / 6000;
}

/** Chargeable Weight = MAX(Actual Weight, Volumetric Weight), rounded up to the courier's usual 0.5kg step. */
export function calculateChargeableWeightKg(actualKg: number, dimensions: ParcelDimensions): number {
  const heavier = Math.max(actualKg, calculateVolumetricWeightKg(dimensions));
  return Math.ceil(heavier * 2) / 2;
}

export type ParcelPackage = { weightKg: number; dimensionsCm: ParcelDimensions };

/**
 * Cross-state delivery (Domestic Courier) eligibility for a listing — state-independent, so it
 * can be shown on the product page and the booking panel before any delivery address is entered:
 *  - "same_state_only": at least one recorded package exceeds the courier's accepted size, so no
 *    cross-state route can ever quote (mirrors quoteDomesticCourierPackage's own oversize check —
 *    this doesn't invent a new rule, it precomputes the existing one without needing a route).
 *  - "requires_review": the listing hasn't recorded usable parcel weight/dimensions yet, so
 *    eligibility can't be determined until that information is provided.
 *  - "available": every recorded package is within the courier's accepted size.
 */
export type CrossStateDeliveryEligibility = "available" | "same_state_only" | "requires_review";

/** Shared product-page / lender-form badge wording — one source so every screen agrees. */
export const CROSS_STATE_ELIGIBILITY_BADGE: Record<CrossStateDeliveryEligibility, string> = {
  available: "Cross-State Delivery Available (Demo)",
  same_state_only: "Same-State Delivery Only",
  requires_review: "Delivery Details Required",
};

/** Shared explanation shown next to the badge, on the lender form and the product page. */
export const CROSS_STATE_ELIGIBILITY_EXPLANATION: Record<CrossStateDeliveryEligibility, string> = {
  available: "Your item meets CurRENT's simulated standard courier requirements based on its recorded parcel details.",
  same_state_only: "This item does not meet CurRENT's cross-state shipping requirements. It can still be listed for eligible same-state delivery.",
  requires_review: "Enter your item's packaged weight and dimensions to determine cross-state delivery availability.",
};

/** Shared renter-facing booking-panel warning (title + body) for a blocked cross-state attempt. */
export const CROSS_STATE_BOOKING_WARNING: Record<"same_state_only" | "requires_review", { title: string; body: string }> = {
  same_state_only: {
    title: "Cross-State Delivery Unavailable",
    body: "This item cannot be delivered across states due to its size, weight or shipping requirements. Please select a delivery address within the same state to continue.",
  },
  requires_review: {
    title: "Delivery Details Required",
    body: "This item's shipping details have not been fully provided yet, so cross-state delivery availability cannot be confirmed. Please select a delivery address within the same state, or check back once the lender completes this item's shipping information.",
  },
};

/** Shipping characteristics the lender can flag — informs eligibility (Step 4) alongside size. */
export type ShippingCharacteristic = "fragile" | "bulky" | "lithium_battery" | "restricted_liquid";

/**
 * The five demo listings CurRENT explicitly restricts to same-state delivery. Checked by listing
 * id here as a backstop — independent of whatever a specific stored record's own
 * `crossStateRestricted` field says — so a listing loaded from outdated persisted data (an older
 * record saved before this field existed, a stale cache, etc.) is still correctly restricted
 * rather than silently falling through to a parcel-size check it happens to pass.
 */
export const PLATFORM_RESTRICTED_LISTING_IDS = new Set([
  "office-chair", // Ergonomic Office Chair
  "pressure-washer", // Pressure Washer
  "standing-air-cooler", // Standing Air Cooler
  "power-station", // Portable Power Station
  "photo-booth", // Photo Booth Setup
]);

export function crossStateDeliveryEligibility(listing: {
  id?: string;
  parcelWeightKg?: number;
  parcelDimensionsCm?: ParcelDimensions;
  parcelPackages?: ParcelPackage[];
  shippingCharacteristics?: ShippingCharacteristic[];
  /** Explicit CurRENT/platform restriction (e.g. the five named demo listings), independent of
   * the computed parcel size — never overridden by a lender toggle. Checked first (Step 1). */
  crossStateRestricted?: boolean;
}): CrossStateDeliveryEligibility {
  // Step 1 — platform restriction always wins, regardless of recorded parcel size. Checked both
  // from the stored flag and, as a backstop against stale/outdated persisted data, by listing id.
  if (listing.crossStateRestricted || (listing.id && PLATFORM_RESTRICTED_LISTING_IDS.has(listing.id))) {
    return "same_state_only";
  }

  // Step 4 — restricted contents (e.g. flammable liquids) are not accepted by the demo's
  // standard courier regardless of size. A lithium battery or fragile/bulky flag alone does not
  // disqualify an item — only an actual size/weight violation (Steps 2–3) does, so electronics
  // and fragile items aren't automatically rejected just for being electronics or fragile.
  if (listing.shippingCharacteristics?.includes("restricted_liquid")) return "same_state_only";

  // Steps 2–3 — package dimensions and weight, every package evaluated independently.
  const packages: ParcelPackage[] = listing.parcelPackages?.length
    ? listing.parcelPackages
    : listing.parcelWeightKg != null && listing.parcelDimensionsCm
      ? [{ weightKg: listing.parcelWeightKg, dimensionsCm: listing.parcelDimensionsCm }]
      : [];
  if (packages.length === 0) return "requires_review";
  for (const pkg of packages) {
    if (!Number.isFinite(pkg.weightKg) || pkg.weightKg <= 0) return "requires_review";
    const sides = [pkg.dimensionsCm.length, pkg.dimensionsCm.width, pkg.dimensionsCm.height];
    if (sides.some((side) => !Number.isFinite(side) || side <= 0)) return "requires_review";
    if (sides.some((side) => side > COURIER_MAX_DIMENSION_CM)) return "same_state_only";
  }
  return "available";
}

export type DomesticCourierQuote = {
  courierName: string;
  zone: CourierShippingZone;
  chargeableWeightKg: number;
  volumetricWeightKg: number;
  fee: number;
  reference: string;
};

const courierZoneRate: Record<CourierShippingZone, { base: number; perKg: number }> = {
  "West Malaysia": { base: 9, perKg: 3.5 },
  "East Malaysia": { base: 18, perKg: 6.5 }, // Sabah/Sarawak zone: higher base + per-kg, sea-crossing demo assumption.
};

function quoteDomesticCourierPackage(zone: CourierShippingZone, weightKg: number, dimensions: ParcelDimensions): DomesticCourierQuote | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
  const sides = [dimensions.length, dimensions.width, dimensions.height];
  if (sides.some((side) => !Number.isFinite(side) || side <= 0)) return null;
  if (sides.some((side) => side > COURIER_MAX_DIMENSION_CM)) return null; // Oversized: Special Delivery Quotation Required.
  const volumetricWeightKg = Math.round(calculateVolumetricWeightKg(dimensions) * 100) / 100;
  const chargeableWeightKg = calculateChargeableWeightKg(weightKg, dimensions);
  const rate = courierZoneRate[zone];
  const fee = Math.round((rate.base + rate.perKg * chargeableWeightKg) * 100) / 100;
  return { courierName: DOMESTIC_COURIER_NAME, zone, chargeableWeightKg, volumetricWeightKg, fee, reference: DOMESTIC_COURIER_PRICING_REFERENCE };
}

/**
 * New unpaid courier quotes only; paid bookings always use their stored receipt amount.
 * Triggers only for cross-state routes (routeArea() null) — same-state routes stay on the
 * GrabExpress path above. When `packages` has more than one entry (e.g. a two-piece Photo
 * Booth Setup shipment), each package is priced independently per the task's requirement and
 * the charges combined; a single weightKg/dimensionsCm pair is treated as one package.
 * Returns null (→ Courier Quotation Required) rather than ever fabricating a price — for an
 * unresolved postcode, a same-state route (GrabExpress territory), or any oversized/invalid package.
 */
export function quoteAutomaticDomesticCourier(params: {
  pickupPostcode?: string; deliveryPostcode?: string;
  weightKg?: number; dimensionsCm?: ParcelDimensions;
  packages?: ParcelPackage[];
}): DomesticCourierQuote | null {
  const route = estimatePostcodeDistance(params.pickupPostcode, params.deliveryPostcode);
  if (!route) return null;
  const area = routeArea(route.pickup, route.delivery);
  if (area) return null; // Same-state: GrabExpress covers this, not the courier.
  const packages: ParcelPackage[] = params.packages?.length
    ? params.packages
    : params.weightKg != null && params.dimensionsCm
      ? [{ weightKg: params.weightKg, dimensionsCm: params.dimensionsCm }]
      : [];
  if (packages.length === 0) return null;
  const zone = courierShippingZone(route.pickup.state, route.delivery.state);
  const quotes = packages.map((pkg) => quoteDomesticCourierPackage(zone, pkg.weightKg, pkg.dimensionsCm));
  if (quotes.some((quote) => !quote)) return null; // Any oversized/invalid package blocks the whole quote.
  const resolved = quotes as DomesticCourierQuote[];
  return {
    courierName: DOMESTIC_COURIER_NAME,
    zone,
    chargeableWeightKg: Math.round(resolved.reduce((sum, q) => sum + q.chargeableWeightKg, 0) * 100) / 100,
    volumetricWeightKg: Math.round(resolved.reduce((sum, q) => sum + q.volumetricWeightKg, 0) * 100) / 100,
    fee: Math.round(resolved.reduce((sum, q) => sum + q.fee, 0) * 100) / 100,
    reference: DOMESTIC_COURIER_PRICING_REFERENCE,
  };
}

/** J&T Express Malaysia's published estimated delivery time for applicable Peninsular Malaysia
 * deliveries is 2-3 days (https://www.jtexpress.my/faq) — used here as a planning reference,
 * not a guaranteed delivery period. East Malaysia (Sabah/Sarawak) has no equivalent published
 * figure this demo can cite, so it's deliberately left out of this table — see
 * hasReliableCourierTransitEstimate(). */
export function estimatedCourierTransitDays(zone: CourierShippingZone): { min: number; max: number } {
  return { min: 2, max: 3 };
}

/** True only for zones this demo has an actual published courier transit reference for
 * (currently just J&T's Peninsular Malaysia figure). East Malaysia returns false — callers
 * must show "Delivery Timing Confirmation Required" / "To Be Confirmed" rather than invent a
 * transit estimate CurRENT has no source for. */
export function hasReliableCourierTransitEstimate(zone: CourierShippingZone): boolean {
  return zone === "West Malaysia";
}

/** YYYY-MM-DD + N days, as a YYYY-MM-DD string (UTC-safe, no timezone drift). */
export function addDaysToDateString(date: string, days: number): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * CurRENT's automatically recommended outbound dispatch date for a Domestic Courier (Demo)
 * booking: Latest Planned Dispatch Date = Preferred Rental Start Date - (estimated transit
 * allowance + CurRENT's own 1-day safety buffer). With J&T's published 2-3 day Peninsular
 * estimate, that's rental start - 4 days. Pure calendar-day arithmetic — this demo has no
 * Malaysian public-holiday or working-day table, so it never claims to skip weekends/holidays,
 * only states the simplification via this doc comment. Returns null when the zone has no
 * reliable transit reference (see hasReliableCourierTransitEstimate) — never a fabricated date.
 * The renter never picks this date directly; the lender can accept it or propose an alternate
 * via confirmOutboundDispatch.
 */
export function recommendDispatchDate(targetArrivalDate: string, zone: CourierShippingZone, bufferDays = 1): string | null {
  if (!hasReliableCourierTransitEstimate(zone)) return null;
  const transit = estimatedCourierTransitDays(zone);
  return addDaysToDateString(targetArrivalDate, -(transit.max + bufferDays));
}

/** Whether a computed dispatch date still leaves time to dispatch — i.e. it isn't already in
 * the past relative to referenceDate (both YYYY-MM-DD). A rental start chosen too soon for the
 * estimated transit allowance must never silently show a past date as available. */
export function isDispatchDateFeasible(dispatchDate: string, referenceDate: string): boolean {
  return dispatchDate.slice(0, 10) >= referenceDate.slice(0, 10);
}
