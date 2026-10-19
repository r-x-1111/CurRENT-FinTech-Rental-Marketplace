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

function Row({ label, value, strong = false, grand = false }: { label: string; value: string; strong?: boolean; grand?: boolean }) {
  return <View style={styles.row}>
    <Text style={[styles.rowLabel, strong && styles.strong, grand && styles.grand]}>{label}</Text>
    <Text style={[styles.rowValue, strong && styles.strong, grand && styles.grand]}>{value}</Text>
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
    parcelWeightKg: listing?.parcelWeightKg,
    parcelDimensionsCm: listing?.parcelDimensionsCm,
    parcelPackages: listing?.parcelPackages,
    deliveryRequirement: listing?.deliveryRequirement,
    title: listing?.title || booking.title,
    category: listing?.category,
    description: listing?.description,
    deliveryPostcode: booking.deliveryPostcode,
    demoBooking: booking.contextMode === "admin_demo" && booking.id.startsWith("demo-"),
    listingId: booking.listingId,
  });
  const unpaidDeliveryQuote = booking.deliveryDemo?.status === "required";
  const recordedDeliveryFee = booking.deliveryDemo?.fee ?? (booking.collectionMethod === "Self-Pickup" ? 0 : null);
  const summaryDeliveryFee = unpaidDeliveryQuote || !booking.deliveryDemo ? delivery.estimatedTwoWayFee ?? null : recordedDeliveryFee;
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
  const isAwaitingDelivery = unpaidDeliveryQuote || (!booking.deliveryDemo && delivery.estimatedTwoWayFee != null);
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
  const isCourier = delivery.method === "Domestic Courier (Demo)";

  return (
    <View style={[s.card, styles.card]}>
      <Text style={styles.title}>Booking Summary</Text>
      <Text style={styles.item}>{booking.title} · {booking.quote.days} {booking.quote.days === 1 ? "day" : "days"}</Text>

      <Text style={styles.section}>Paid to CurRENT</Text>
      {!!booking.paymentMethod && (
        <Row label="Payment method" value={booking.paymentMethod === "BNPL (Demo)" ? "BNPL (Demo)" : booking.paymentMethod} />
      )}
      <Row label="Rental fee" value={money(booking.quote.rentalFee)} />
      <Row label="CurRENT service fee (5%, min RM5)" value={money(booking.quote.serviceFee)} />
      {booking.quote.protection > 0 && <Row label="Rental Protection (Demo)" value={money(booking.quote.protection)} />}
      <Row label="Refundable security deposit" value={money(booking.quote.deposit)} />
      <Text style={styles.note}>Original risk: {tier.label} · Deposit rate: {DEPOSIT_TIERS[tier.level].label}</Text>
      <Row label="CurRENT subtotal" value={money(totals.subtotal)} strong />

      <View style={styles.divider} />
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.section}>{isCourier ? "Domestic Courier (Demo)" : "GrabExpress Delivery (Demo)"}</Text>
        <Badge text={deliveryStatusLabel} tone={deliveryStatusTone} />
      </View>
      {totalDeliveryFee != null ? (
        <Row
          label={isCourier ? "Calculated Two-Way Postage" : "Calculated Delivery Fee (two-way)"}
          value={money(totalDeliveryFee)}
          strong
        />
      ) : (
        <Text style={styles.note}>Delivery Address Required</Text>
      )}
      <Row label={isCourier ? "Automatically Selected Courier" : "Automatically Selected Vehicle"}
        value={isCourier ? (delivery.courierName || "Unavailable") : (delivery.vehicle || "Unavailable")} />
      <Row label="Payment Status" value={deliveryStatusLabel} />
      {(deliveryOutboundFee != null || deliveryReturnFee != null || delivery.origin || delivery.destination) && (
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDeliveryBreakdown }} onPress={() => setShowDeliveryBreakdown((v) => !v)}>
          <View style={styles.breakdownToggleRow}>
            <Text style={styles.link}>{showDeliveryBreakdown ? "Hide Delivery Details" : "View Delivery Details"}</Text>
            <Ionicons name={showDeliveryBreakdown ? "chevron-up" : "chevron-down"} size={14} color={colors.blue} />
          </View>
        </Pressable>
      )}
      {showDeliveryBreakdown && isCourier && (
        <View style={styles.breakdownBox}>
          <Row label="Pickup Location" value={delivery.origin || "Not recorded"} />
          <Row label="Delivery Address" value={delivery.destination || "Not recorded"} />
          <Row label="Courier" value={delivery.courierName || "Unavailable"} />
          <Row label="Shipping Zone" value={delivery.shippingZone || "Unavailable"} />
          <Row label="Chargeable Weight" value={delivery.chargeableWeightKg != null ? `${delivery.chargeableWeightKg} kg` : "Unavailable"} />
          {!!delivery.dispatchDate && <Row label="Planned Dispatch Date" value={delivery.dispatchDate} />}
          <Row label="Lender confirmation" value={
            delivery.outboundDispatchStatus === "confirmed" ? "Confirmed"
              : delivery.outboundDispatchStatus === "drop_off" ? "Drop-off Arrangement"
              : delivery.outboundDispatchStatus === "proposed_alternate" ? `Lender Proposed ${delivery.lenderProposedDispatchDate || "a New Date"}`
              : delivery.outboundDispatchStatus === "awaiting_lender_confirmation" ? "Awaiting Lender Confirmation"
              : "Not Recorded"} />
          <Row label="Estimated Delivery" value={
            delivery.estimatedDeliveryRangeStart && delivery.estimatedDeliveryRangeEnd
              ? `${delivery.estimatedDeliveryRangeStart} – ${delivery.estimatedDeliveryRangeEnd}` : "To Be Confirmed"} />
          {!!delivery.outboundTrackingRef && <Row label="Outbound tracking reference" value={delivery.outboundTrackingRef} />}
          {!!delivery.returnDispatchDeadline && <Row label="Return Drop-off Date" value={delivery.returnDispatchDeadline} />}
          <Row label="Return Method" value="Courier Branch Drop-off" />
          <Row label="Return drop-off status" value={delivery.returnDropoffConfirmedAt ? `Confirmed ${delivery.returnDropoffConfirmedAt.slice(0, 10)}` : "Pending renter drop-off"} />
          {!!delivery.returnTrackingRef && <Row label="Return tracking reference" value={delivery.returnTrackingRef} />}
          <Row label="Estimated Return Arrival" value={
            delivery.estimatedReturnRangeStart && delivery.estimatedReturnRangeEnd
              ? `${delivery.estimatedReturnRangeStart} – ${delivery.estimatedReturnRangeEnd}` : "To Be Confirmed"} />
          <Row label="Outbound postage" value={money(deliveryOutboundFee ?? 0)} />
          <Row label="Return postage" value={money(deliveryReturnFee ?? 0)} />
          <Row label="Total two-way postage" value={totalDeliveryFee != null ? money(totalDeliveryFee) : "Unavailable"} strong />
          <Row label="Payment status" value={deliveryStatusLabel} />
        </View>
      )}
      {showDeliveryBreakdown && !isCourier && (
        <View style={styles.breakdownBox}>
          <Row label="Pickup Location" value={delivery.origin || "Not recorded"} />
          <Row label="Delivery Address" value={delivery.destination || "Not recorded"} />
          <Row label="Estimated Distance" value={sameRouteDistance ? `${delivery.distanceKm} km each way` : `${delivery.distanceKm ?? "—"} km out · ${delivery.returnDistanceKm ?? "—"} km back`} />
          <Row label="Vehicle type" value={delivery.vehicle || "Unavailable"} />
          <Row label="Outbound delivery" value={`${delivery.distanceKm ?? "—"} km · ${money(deliveryOutboundFee ?? 0)}`} />
          <Row label="Return delivery" value={`${delivery.returnDistanceKm ?? "—"} km · ${money(deliveryReturnFee ?? 0)}`} />
          <Row label="Total two-way delivery fee" value={totalDeliveryFee != null ? money(totalDeliveryFee) : "Unavailable"} strong />
          <Row label="Payment status" value={deliveryStatusLabel} />
        </View>
      )}

      <View style={styles.divider} />
      <Text style={styles.section}>Total for this rental</Text>
      <Row label={unpaidDeliveryQuote ? "Estimated total payable" : "Original total"} value={totals.grandTotal == null ? "Delivery not recorded" : money(totals.grandTotal)} strong grand />
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
          <Row label="Net lender payout" value={money(payout.payout)} strong grand />
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
  rowLabel: { ...s.body, flex: 1, fontSize: 14 },
  rowValue: { ...s.body, flex: 1, textAlign: "right", fontSize: 14 },
  strong: { fontWeight: "700" },
  grand: { fontWeight: "700", color: colors.blue, fontSize: 16 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginTop: 8 },
  link: { color: colors.blue, fontWeight: "700", fontSize: 12 },
  breakdownToggleRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  breakdownBox: { backgroundColor: colors.paleBlue, borderRadius: 10, padding: 10, gap: 4, marginTop: 4 },
});
