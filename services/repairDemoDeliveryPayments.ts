import type { Booking, DeliveryTransaction, Marketplace } from "../types/marketplace";
import { demoDestinationPostcode, demoPickupLocation } from "./demoDeliveryLocations";
import { estimateAutomaticDelivery } from "./geo";

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
    const outbound = estimateAutomaticDelivery(pickupPostcode, deliveryPostcode);
    const inbound = estimateAutomaticDelivery(deliveryPostcode, pickupPostcode);
    if (!outbound || !inbound || !booking.deliveryAddress) continue;

    const previous = booking.deliveryDemo;
    const hasValidPaidRecord = previous && previous.status !== "required" &&
      previous.outboundFee != null && previous.returnFee != null &&
      roundMoney(previous.outboundFee + previous.returnFee) === previous.fee &&
      Boolean(previous.receiptReference && previous.paidAt);
    if (!hasValidPaidRecord) {
      const paidAt = previous?.paidAt || new Date(Date.parse(booking.createdAt) - 60_000).toISOString();
      const receiptReference = previous?.receiptReference || `DEMO-GE-${booking.id.toUpperCase()}`;
      const fee = roundMoney(outbound.fee + inbound.fee);
      const status = booking.payment === "refunded" ? "refunded_demo" : "paid_demo";
      booking.deliveryPostcode = deliveryPostcode;
      booking.deliveryDemo = {
        provider: "GrabExpress (Simulation)",
        origin: listing?.privateMeetingVenue || listing?.location || legacyPickup?.address || previous?.origin || "",
        destination: booking.deliveryAddress,
        fee, outboundFee: outbound.fee, returnFee: inbound.fee,
        distanceKm: outbound.distanceKm, baseFare: outbound.baseFee,
        distanceCharge: outbound.distanceCharge, minimumFare: 5,
        pricingReference: "CurRENT demo two-way postcode estimate",
        status, receiptReference, paidAt,
        refundedAt: status === "refunded_demo" ? previous?.refundedAt || booking.cancelledAt || booking.createdAt : undefined,
        area: previous?.area, vehicle: previous?.vehicle,
        weightKg: previous?.weightKg, dimensionsCm: previous?.dimensionsCm,
      };
    }
    const saved = booking.deliveryDemo!;

    const receipt: DeliveryTransaction = {
      id: saved.receiptReference!, renterId: booking.renterId, bookingId: booking.id,
      itemTitle: booking.title, origin: saved.origin,
      destination: saved.destination, area: saved.area || "Historical demo",
      distanceKm: saved.distanceKm ?? outbound.distanceKm, vehicle: saved.vehicle || "Motorcycle",
      weightKg: saved.weightKg || 0,
      dimensionsCm: saved.dimensionsCm || { length: 0, width: 0, height: 0 },
      baseFare: saved.baseFare ?? outbound.baseFee, distanceCharge: saved.distanceCharge ?? outbound.distanceCharge,
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
