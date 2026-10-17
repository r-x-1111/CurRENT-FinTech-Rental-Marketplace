import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Booking } from "../types/marketplace";
import type { Listing } from "../types";
import { getBookingTotals, money } from "../services/booking";
import { deriveDisplayDelivery } from "../services/delivery";
import { calculateOwnerPayout, DEPOSIT_TIERS, LEGACY_LENDER_COMMISSION_RATE } from "../services/deposit";
import { tierForScore } from "../services/riskScore";
import { Badge, colors, s } from "./ui";

type Props = { booking: Booking; listing?: Listing; lender?: boolean };

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <View style={styles.row}>
    <Text style={[styles.rowLabel, strong && styles.strong]}>{label}</Text>
    <Text style={[styles.rowValue, strong && styles.strong]}>{value}</Text>
  </View>;
}

/** Read-only summary of the amounts saved on a booking. Never replaces checkout pricing. */
export function BookingSummary({ booking, listing, lender = false }: Props) {
  const [showDeliveryBreakdown, setShowDeliveryBreakdown] = useState(false);
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

  // Compact GrabExpress Delivery (Demo) summary: one status badge + one total figure,
  // with the outbound/return split tucked behind "View Delivery Breakdown".
  const isPaidDelivery = booking.deliveryDemo?.status === "paid_demo";
  const isRefundedDelivery = booking.deliveryDemo?.status === "refunded_demo";
  const isAwaitingDelivery = unpaidDeliveryQuote;
  const isPaidOrRefundedDelivery = isPaidDelivery || isRefundedDelivery;
  const totalDeliveryFee = summaryDeliveryFee;
  const deliveryOutboundFee = delivery.outboundFee ?? delivery.estimatedOutboundFee ?? null;
  const deliveryReturnFee = delivery.returnFee ?? delivery.estimatedReturnFee ?? null;
  const sameRouteDistance = delivery.distanceKm != null && delivery.returnDistanceKm != null && delivery.distanceKm === delivery.returnDistanceKm;
  const deliveryStatusLabel = isPaidDelivery ? "Paid (Demo)"
    : isRefundedDelivery ? "Refunded (Demo)"
    : isAwaitingDelivery ? "Awaiting Payment"
    : totalDeliveryFee != null ? "Estimate"
    : "Not Recorded";
  const deliveryStatusTone = isPaidDelivery ? "green" : isRefundedDelivery ? "grey" : isAwaitingDelivery ? "amber" : "blue";

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
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.section}>GrabExpress Delivery (Demo)</Text>
        <Badge text={deliveryStatusLabel} tone={deliveryStatusTone} />
      </View>
      <Row label="Pickup" value={delivery.origin || "Not recorded"} />
      <Row label="Deliver to" value={delivery.destination || "Not recorded"} />
      {delivery.distanceKm != null && (
        <Row
          label="Round-trip distance"
          value={
            sameRouteDistance
              ? `${delivery.distanceKm} km each way`
              : `${delivery.distanceKm} km out · ${delivery.returnDistanceKm ?? "—"} km back`
          }
        />
      )}
      {totalDeliveryFee != null ? (
        <Row
          label={isPaidOrRefundedDelivery ? "Total delivery fee" : "Total delivery fee (Estimate)"}
          value={money(totalDeliveryFee)}
          strong
        />
      ) : (
        <Text style={styles.note}>Delivery Address Required</Text>
      )}
      {isAwaitingDelivery && totalDeliveryFee != null && <Row label="Outstanding" value={money(totalDeliveryFee)} />}
      {isRefundedDelivery && totalDeliveryFee != null && <Row label="Refunded amount" value={money(totalDeliveryFee)} />}
      {(deliveryOutboundFee != null || deliveryReturnFee != null) && (
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDeliveryBreakdown }} onPress={() => setShowDeliveryBreakdown((v) => !v)}>
          <View style={styles.breakdownToggleRow}>
            <Text style={styles.link}>{showDeliveryBreakdown ? "Hide Delivery Breakdown" : "View Delivery Breakdown"}</Text>
            <Ionicons name={showDeliveryBreakdown ? "chevron-up" : "chevron-down"} size={14} color={colors.blue} />
          </View>
        </Pressable>
      )}
      {showDeliveryBreakdown && (
        <View style={styles.breakdownBox}>
          <Row label="Outbound delivery" value={`${delivery.distanceKm ?? "—"} km · ${money(deliveryOutboundFee ?? 0)}`} />
          <Row label="Return delivery" value={`${delivery.returnDistanceKm ?? "—"} km · ${money(deliveryReturnFee ?? 0)}`} />
          <Row label={isPaidDelivery ? "Total paid" : isRefundedDelivery ? "Total refunded" : "Total delivery fee"} value={money(totalDeliveryFee ?? 0)} strong />
        </View>
      )}

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
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginTop: 8 },
  link: { color: colors.blue, fontWeight: "700", fontSize: 12 },
  breakdownToggleRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  breakdownBox: { backgroundColor: colors.paleBlue, borderRadius: 10, padding: 10, gap: 4, marginTop: 4 },
});
