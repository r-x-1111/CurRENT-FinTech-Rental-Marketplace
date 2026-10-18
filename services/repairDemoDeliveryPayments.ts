import type { Booking, DeliveryTransaction, Marketplace } from "../types/marketplace";
import { demoDestinationPostcode, demoPickupLocation } from "./demoDeliveryLocations";
import { estimateAutomaticDelivery } from "./geo";
import { addDaysToDateString, DOMESTIC_COURIER_NAME, estimatedCourierTransitDays, quoteAutomaticDomesticCourier, quoteAutomaticVehicleDelivery } from "./delivery";

const roundMoney = (amount: number) => Math.round(amount * 100) / 100;
const seededBooking = (booking: Booking) =>
  booking.contextMode === "admin_demo" && /^demo-(booking|lender)-/.test(booking.id);

/** Repair only the application's named fictional fixtures. Existing valid two-way receipts win. */
export function repairDemoDeliveryPayments(source: Marketplace): Marketplace {
  if (source.mode !== "admin_demo") return source;
  const state: Marketplace = { ...source, bookings: source.bookings.map((booking) => ({ ...booking })),
    deliveryHistory: [...(source.deliveryHistory || [])] };

  for (const booking of state.bookings) {
    if (!seededBooking(booking) || booking.collectionMethod === "Self-Pickup" ||
      (booking.payment !== "paid" && booking.payment !== "refunded")) continue;
    const listing = state.listings.find((item) => item.id === booking.listingId);
    const legacyPickup = demoPickupLocation(booking.listingId);
    const pickupPostcode = listing?.pickupPostcode || legacyPickup?.postcode;
    const deliveryPostcode = booking.deliveryPostcode || demoDestinationPostcode(booking.deliveryAddress);
    const parcel = { weightKg: listing?.parcelWeightKg, dimensionsCm: listing?.parcelDimensionsCm,
      requirement: listing?.deliveryRequirement, title: listing?.title, category: listing?.category,
      description: listing?.description };
    // GrabExpress covers same-state routes; cross-state routes fall back to the Domestic Courier
    // quote — same precedence used at live checkout, so a repaired historical receipt matches
    // what the renter would actually be charged for that route today.
    const grabOutbound = quoteAutomaticVehicleDelivery({ pickupPostcode, deliveryPostcode, ...parcel });
    const grabInbound = quoteAutomaticVehicleDelivery({ pickupPostcode: deliveryPostcode, deliveryPostcode: pickupPostcode, ...parcel });
    const isCourier = !grabOutbound || !grabInbound;
    const courierParcel = { pickupPostcode, deliveryPostcode, weightKg: listing?.parcelWeightKg,
      dimensionsCm: listing?.parcelDimensionsCm, packages: listing?.parcelPackages };
    const courierOutbound = isCourier ? quoteAutomaticDomesticCourier(courierParcel) : null;
    const courierInbound = isCourier ? quoteAutomaticDomesticCourier({ ...courierParcel,
      pickupPostcode: deliveryPostcode, deliveryPostcode: pickupPostcode }) : null;
    const outbound = grabOutbound || courierOutbound;
    const inbound = grabInbound || courierInbound;
    // Fallback estimate only for deriving a distance-free "historical demo" fee when neither the
    // GrabExpress nor the Courier quote resolves (e.g. an unrecognised postcode) — never invents
    // a vehicle/courier-specific breakdown it can't actually support.
    const fallbackOutbound = !outbound ? estimateAutomaticDelivery(pickupPostcode, deliveryPostcode) : null;
    const fallbackInbound = !inbound ? estimateAutomaticDelivery(deliveryPostcode, pickupPostcode) : null;
    if ((!outbound && !fallbackOutbound) || (!inbound && !fallbackInbound) || !booking.deliveryAddress) continue;
    const fee = roundMoney((outbound?.fee ?? fallbackOutbound!.fee) + (inbound?.fee ?? fallbackInbound!.fee));

    const previous = booking.deliveryDemo;
    const hasValidPaidRecord = previous && previous.status !== "required" &&
      previous.outboundFee != null && previous.returnFee != null &&
      roundMoney(previous.outboundFee + previous.returnFee) === previous.fee &&
      Boolean(previous.receiptReference && previous.paidAt);
    if (!hasValidPaidRecord) {
      const paidAt = previous?.paidAt || new Date(Date.parse(booking.createdAt) - 60_000).toISOString();
      const receiptReference = previous?.receiptReference || `DEMO-GE-${booking.id.toUpperCase()}`;
      const status = booking.payment === "refunded" ? "refunded_demo" : "paid_demo";
      booking.deliveryPostcode = deliveryPostcode;
      const origin = listing?.privateMeetingVenue || listing?.location || legacyPickup?.address || previous?.origin || "";
      if (grabOutbound && grabInbound) {
        booking.deliveryDemo = {
          provider: "GrabExpress (Simulation)", origin, destination: booking.deliveryAddress,
          fee, outboundFee: grabOutbound.fee, returnFee: grabInbound.fee,
          distanceKm: grabOutbound.distanceKm, baseFare: grabOutbound.baseFare,
          distanceCharge: grabOutbound.distanceCharge, minimumFare: grabOutbound.minimumFare,
          pricingReference: grabOutbound.reference,
          status, receiptReference, paidAt,
          refundedAt: status === "refunded_demo" ? previous?.refundedAt || booking.cancelledAt || booking.createdAt : undefined,
          area: grabOutbound.area, vehicle: grabOutbound.vehicle,
          weightKg: listing?.parcelWeightKg, dimensionsCm: listing?.parcelDimensionsCm,
        };
      } else if (courierOutbound && courierInbound) {
        const transit = estimatedCourierTransitDays(courierOutbound.zone);
        const dispatchDate = (previous?.dispatchDate) || booking.createdAt.slice(0, 10);
        const returnDispatchDate = booking.returnDispatchDate || booking.scheduledReturn?.slice(0, 10) || dispatchDate;
        booking.deliveryDemo = {
          provider: DOMESTIC_COURIER_NAME, origin, destination: booking.deliveryAddress,
          fee, outboundFee: courierOutbound.fee, returnFee: courierInbound.fee,
          shippingZone: courierOutbound.zone, chargeableWeightKg: courierOutbound.chargeableWeightKg,
          volumetricWeightKg: courierOutbound.volumetricWeightKg,
          dispatchDate,
          estimatedDeliveryRangeStart: addDaysToDateString(dispatchDate, transit.min),
          estimatedDeliveryRangeEnd: addDaysToDateString(dispatchDate, transit.max),
          returnDispatchDeadline: returnDispatchDate,
          estimatedReturnRangeStart: addDaysToDateString(returnDispatchDate, transit.min),
          estimatedReturnRangeEnd: addDaysToDateString(returnDispatchDate, transit.max),
          pricingReference: courierOutbound.reference,
          status, receiptReference, paidAt,
          refundedAt: status === "refunded_demo" ? previous?.refundedAt || booking.cancelledAt || booking.createdAt : undefined,
        };
        booking.returnDispatchDate = returnDispatchDate;
      } else {
        // Neither quote resolved (unrecognised postcode): keep the pre-existing fallback shape
        // so a receipt still exists, but without claiming a vehicle or courier it can't support.
        booking.deliveryDemo = {
          provider: "GrabExpress (Simulation)", origin, destination: booking.deliveryAddress,
          fee, outboundFee: fallbackOutbound?.fee, returnFee: fallbackInbound?.fee,
          distanceKm: fallbackOutbound?.distanceKm, baseFare: fallbackOutbound?.baseFee,
          distanceCharge: fallbackOutbound?.distanceCharge, minimumFare: 5,
          pricingReference: "CurRENT demo two-way postcode estimate",
          status, receiptReference, paidAt,
          refundedAt: status === "refunded_demo" ? previous?.refundedAt || booking.cancelledAt || booking.createdAt : undefined,
          area: previous?.area, vehicle: previous?.vehicle,
          weightKg: previous?.weightKg, dimensionsCm: previous?.dimensionsCm,
        };
      }
    }
    const saved = booking.deliveryDemo!;

    const receipt: DeliveryTransaction = {
      id: saved.receiptReference!, renterId: booking.renterId, bookingId: booking.id,
      itemTitle: booking.title, origin: saved.origin,
      destination: saved.destination, area: saved.area || "Historical demo",
      distanceKm: saved.distanceKm ?? fallbackOutbound?.distanceKm ?? 0, vehicle: saved.vehicle || "Motorcycle",
      weightKg: saved.weightKg || 0,
      dimensionsCm: saved.dimensionsCm || { length: 0, width: 0, height: 0 },
      baseFare: saved.baseFare ?? fallbackOutbound?.baseFee ?? saved.fee, distanceCharge: saved.distanceCharge ?? fallbackOutbound?.distanceCharge ?? 0,
      minimumFare: saved.minimumFare ?? 5, fee: saved.fee,
      pricingReference: saved.pricingReference || "CurRENT demo two-way postcode estimate",
      paidAt: saved.paidAt!, sample: false, status: "paid_demo",
    };
    const existing = state.deliveryHistory!.findIndex((item) => item.bookingId === booking.id || item.id === saved.receiptReference);
    if (existing >= 0) state.deliveryHistory![existing] = receipt;
    else state.deliveryHistory!.push(receipt);
  }
  const seenSeedBookingIds = new Set<string>();
  state.deliveryHistory = state.deliveryHistory!.filter((entry) => {
    if (!entry.bookingId || !state.bookings.some((booking) => booking.id === entry.bookingId && seededBooking(booking))) return true;
    if (seenSeedBookingIds.has(entry.bookingId)) return false;
    seenSeedBookingIds.add(entry.bookingId);
    return true;
  }).sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  return state;
}
