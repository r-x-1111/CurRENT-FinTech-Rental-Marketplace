import { StyleSheet, Text, View } from "react-native";
import type { Booking } from "../types/marketplace";
import type { Listing } from "../types";
import { getBookingTotals, money } from "../services/booking";
import { deriveDisplayDelivery } from "../services/delivery";
import { calculateOwnerPayout, DEPOSIT_TIERS, LEGACY_LENDER_COMMISSION_RATE } from "../services/deposit";
import { tierForScore } from "../services/riskScore";
import { colors, s } from "./ui";

type Props = { booking: Booking; listing?: Listing; lender?: boolean };

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <View style={styles.row}>
    <Text style={[styles.rowLabel, strong && styles.strong]}>{label}</Text>
    <Text style={[styles.rowValue, strong && styles.strong]}>{value}</Text>
  </View>;
}

/** Read-only summary of the amounts saved on a booking. Never replaces checkout pricing. */
export function BookingSummary({ booking, listing, lender = false }: Props) {
  const delivery = deriveDisplayDelivery({
    collectionMethod: booking.collectionMethod,
    deliveryDemo: booking.deliveryDemo,
    pickupLocation: listing?.privateMeetingVenue || listing?.location || booking.deliveryDemo?.origin || "",
    deliveryAddress: booking.deliveryAddress,
    pickupPostcode: listing?.pickupPostcode,
    deliveryPostcode: booking.deliveryPostcode,
    demoBooking: booking.contextMode === "admin_demo" && booking.id.startsWith("demo-"),
    listingId: booking.listingId,
  });
  const unpaidDeliveryQuote = booking.deliveryDemo?.status === "required";
  const recordedDeliveryFee = booking.deliveryDemo?.fee ?? (booking.collectionMethod === "Self-Pickup" ? 0 : null);
  const summaryDeliveryFee = unpaidDeliveryQuote ? delivery.estimatedTwoWayFee ?? recordedDeliveryFee : recordedDeliveryFee;
  const totals = getBookingTotals(booking.quote, summaryDeliveryFee);
  const tier = tierForScore(booking.riskScore);
  const paymentMade = booking.payment === "paid" || booking.payment === "refunded";
  const deliveryPaid = booking.deliveryDemo?.status === "paid_demo" || booking.deliveryDemo?.status === "refunded_demo";
  const deliveryAmountPaid = deliveryPaid ? recordedDeliveryFee || 0 : 0;
  const amountPaid = (paymentMade ? booking.quote.total : 0) + deliveryAmountPaid;
  const outstanding = (!paymentMade ? booking.quote.total : 0) +
    (unpaidDeliveryQuote ? summaryDeliveryFee || 0 : 0);
  const rate = booking.commissionRate ?? LEGACY_LENDER_COMMISSION_RATE;
  const payout = calculateOwnerPayout(booking.quote.rentalFee, rate);
  const cancelled = booking.status === "cancelled" || booking.status === "rejected";

  return (
    <View style={[s.card, styles.card]}>
      <Text style={styles.title}>Booking Summary</Text>
      <Text style={styles.item}>{booking.title} · {booking.quote.days} {booking.quote.days === 1 ? "day" : "days"}</Text>

      <Text style={styles.section}>Paid to CurRENT</Text>
      <Row label="Rental fee" value={money(booking.quote.rentalFee)} />
      <Row label="CurRENT service fee (5%, min RM5)" value={money(booking.quote.serviceFee)} />
      {booking.quote.protection > 0 && <Row label="Rental Protection (Demo)" value={money(booking.quote.protection)} />}
      <Row label="Refundable security deposit" value={money(booking.quote.deposit)} />
      <Text style={styles.note}>Original risk: {tier.label} · Deposit rate: {DEPOSIT_TIERS[tier.level].label}</Text>
      <Row label="CurRENT subtotal" value={money(totals.subtotal)} strong />

      <View style={styles.divider} />
      <Text style={styles.section}>Delivery · GrabExpress (Demo)</Text>
      <Row label="Pickup" value={delivery.origin || "Not recorded"} />
      <Row label="Deliver to" value={delivery.destination || "Not recorded"} />
      {delivery.estimatedTwoWayFee == null && !booking.deliveryDemo && <Text style={styles.note}>Delivery Address Required</Text>}
      {delivery.distanceKm != null && <Row label="Outbound distance" value={`${delivery.distanceKm} km (estimate)`} />}
      {(delivery.outboundFee ?? delivery.estimatedOutboundFee) != null && <Row label={`Outbound delivery fee${unpaidDeliveryQuote || delivery.outboundFee == null ? " (estimate)" : ""}`} value={money((delivery.outboundFee ?? delivery.estimatedOutboundFee)!)} />}
      {(delivery.returnFee ?? delivery.estimatedReturnFee) != null && delivery.returnDistanceKm != null && <Row label="Return distance" value={`${delivery.returnDistanceKm} km (estimate)`} />}
      {(delivery.returnFee ?? delivery.estimatedReturnFee) != null && <Row label={`Return delivery fee${unpaidDeliveryQuote || delivery.returnFee == null ? " (estimate)" : ""}`} value={money((delivery.returnFee ?? delivery.estimatedReturnFee)!)} />}
      {delivery.estimatedTwoWayFee != null && (unpaidDeliveryQuote || delivery.returnFee == null || !booking.deliveryDemo) && <Row label="Estimated two-way delivery fee" value={money(delivery.estimatedTwoWayFee)} strong />}
      {deliveryPaid && <Row label="Total two-way delivery fee" value={money(recordedDeliveryFee || 0)} strong />}
      <Row label="Delivery amount paid" value={money(deliveryAmountPaid)} />
      <Row label="Delivery payment" value={booking.deliveryDemo?.status === "paid_demo" ? "Paid (Demo)" : booking.deliveryDemo?.status === "refunded_demo" ? "Refunded (Demo)" : booking.deliveryDemo?.status === "required" ? "Awaiting payment" : "Not recorded"} />

      <View style={styles.divider} />
      <Text style={styles.section}>Total for this rental</Text>
      <Row label={unpaidDeliveryQuote ? "Estimated total payable" : "Original total"} value={totals.grandTotal == null ? "Delivery not recorded" : money(totals.grandTotal)} strong />
      {totals.grandTotal == null && delivery.estimatedTwoWayFee != null && <Row label="Estimated total (not charged)" value={money(booking.quote.total + delivery.estimatedTwoWayFee)} />}
      <Text style={styles.note}>Includes {money(booking.quote.deposit)} refundable security deposit.</Text>
      <Row label="Amount paid (recorded)" value={money(amountPaid)} />
      {outstanding > 0 && !cancelled && <Row label="Outstanding" value={money(outstanding)} />}
      <Row label="Rental payment" value={booking.payment.replace("_", " ")} />
      <Row label="Deposit" value={booking.deposit.replace("_", " ")} />
      {booking.payment === "refunded" && <Row label="Rental payment refund" value={money(booking.quote.total)} />}
      {booking.deliveryDemo?.status === "refunded_demo" && <Row label="Delivery refund" value={money(recordedDeliveryFee || 0)} />}
      {booking.conflictOffer?.refundAmount != null && <Row label="Recorded adjustment refund" value={money(booking.conflictOffer.refundAmount)} />}
      {booking.status === "disputed" && <Text style={styles.note}>Deposit held for dispute review; no release is assumed.</Text>}
      {lender && (
        <>
          <View style={styles.divider} />
          <Text style={styles.section}>Lender payout</Text>
          <Row label="Gross rental fee" value={money(booking.quote.rentalFee)} />
          <Row label={`Platform commission (${Math.round(rate * 100)}%)`} value={money(payout.commission)} />
          <Row label="Net lender payout" value={money(payout.payout)} strong />
          <Row label="Payout status" value="No payout transaction recorded" />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 5 },
  title: { ...s.h2, color: colors.navy },
  item: { ...s.caption, color: colors.muted },
  section: { color: colors.navy, fontWeight: "800", marginTop: 8 },
  note: { ...s.caption, color: colors.muted },
  divider: { borderTopWidth: 1, borderColor: colors.softBlue, marginVertical: 5 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  rowLabel: { ...s.body, flex: 1 },
  rowValue: { ...s.body, flex: 1, textAlign: "right" },
  strong: { fontWeight: "700" },
});
