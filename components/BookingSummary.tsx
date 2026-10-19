import { useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Booking } from "../types/marketplace";
import type { Listing } from "../types";
import { effectiveDepositStatus, formatMalaysiaDateTime, formatShortDate, getBookingTotals, money } from "../services/booking";
import { DELIVERY_REFUND_STATUS_LABEL, deriveDeliveryRefundStatus, deriveDisplayDelivery } from "../services/delivery";
import { calculateOwnerPayout, DEPOSIT_TIERS, LEGACY_LENDER_COMMISSION_RATE } from "../services/deposit";
import { tierForScore } from "../services/riskScore";
import { bookingTypography } from "../constants/bookingTypography";
import { Badge, colors, s } from "./ui";

type Props = { booking: Booking; listing?: Listing; lender?: boolean };

/** Read-only summary of the amounts saved on a booking. Never replaces checkout pricing. */
export function BookingSummary({ booking, listing, lender = false }: Props) {
  const [showDeliveryBreakdown, setShowDeliveryBreakdown] = useState(false);
  // Shared booking-interface typography scale — same tokens as the listing checkout panel.
  const typeMobile = useWindowDimensions().width < 768;
  const sectionHeadingStyle = bookingTypography.sectionHeading(typeMobile);
  const subheadingStyle = bookingTypography.subheading(typeMobile);
  const totalAmountStyle = bookingTypography.totalAmount(typeMobile);

  // Closes over totalAmountStyle so the final-total rows ("Original total", "Net lender payout")
  // share the same responsive type scale as the rest of the booking interface.
  function Row({ label, value, strong = false, grand = false }: { label: string; value: string; strong?: boolean; grand?: boolean }) {
    return <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.strong, grand && [styles.grand, totalAmountStyle]]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.strong, grand && [styles.grand, totalAmountStyle]]}>{value}</Text>
    </View>;
  }
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
  // Delivery fees are paid to the delivery company, not CurRENT — a cancelled rental never by
  // itself means GrabExpress/J&T Express has approved or completed a refund. Only shown once the
  // delivery fee was actually paid (nothing to refund otherwise); outbound and return are
  // assessed separately since outbound can already be irreversible while return isn't.
  const showDeliveryRefundStatus = cancelled && booking.deliveryDemo?.status !== "required" && !!booking.deliveryDemo;
  const outboundRefundStatus = showDeliveryRefundStatus
    ? deriveDeliveryRefundStatus({ cancelled, deliveryStatus: booking.deliveryDemo!.status, legStarted: !!booking.lenderHandoverAt })
    : null;
  const returnRefundStatus = showDeliveryRefundStatus
    ? deriveDeliveryRefundStatus({ cancelled, deliveryStatus: booking.deliveryDemo!.status, legStarted: !!booking.actualReturnTimestamp })
    : null;

  return (
    <View style={[s.card, styles.card]}>
      <Text style={[sectionHeadingStyle, { marginBottom: 2 }]}>Booking Summary</Text>
      <Text style={styles.item}>{booking.title} · {booking.quote.days} {booking.quote.days === 1 ? "day" : "days"}</Text>

      <Text style={[bookingTypography.smallLabel, styles.section]}>{cancelled ? "Rental Payment and Refund (Demo)" : "Paid to CurRENT"}</Text>
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
        <Text style={[bookingTypography.smallLabel, styles.section]}>
          {cancelled ? "Delivery Payment and Refund (Provider Demo)" : isCourier ? "Domestic Courier (Demo)" : "GrabExpress Delivery (Demo)"}
        </Text>
        <Badge text={deliveryStatusLabel} tone={deliveryStatusTone} />
      </View>
      {cancelled && <Text style={styles.note}>Delivery provider: {booking.deliveryDemo?.provider || (isCourier ? "Domestic Courier (Demo)" : "GrabExpress (Demo)")}</Text>}
      {totalDeliveryFee != null ? (
        <Row
          label={isCourier ? "Calculated Two-Way Postage" : "Calculated Delivery Fee (two-way)"}
          value={money(totalDeliveryFee)}
          strong
        />
      ) : (
        <Text style={styles.note}>Delivery Address Required</Text>
      )}
      {cancelled && deliveryOutboundFee != null && <Row label="Outbound delivery charge" value={money(deliveryOutboundFee)} />}
      {cancelled && deliveryReturnFee != null && <Row label="Return delivery charge" value={money(deliveryReturnFee)} />}
      <Row label={isCourier ? "Automatically Selected Courier" : "Automatically Selected Vehicle"}
        value={isCourier ? (delivery.courierName || "Unavailable") : (delivery.vehicle || "Unavailable")} />
      <Row label="Payment Status" value={deliveryStatusLabel} />
      {showDeliveryRefundStatus && (
        <>
          <Row label="Outbound delivery refund" value={DELIVERY_REFUND_STATUS_LABEL[outboundRefundStatus!]} />
          <Row label="Return delivery refund" value={DELIVERY_REFUND_STATUS_LABEL[returnRefundStatus!]} />
          {isRefundedDelivery && <Row label="Simulated approved refund amount" value={money(booking.deliveryDemo?.fee || 0)} />}
          <Text style={styles.note}>
            Delivery payments and refunds are handled by the applicable delivery company, not CurRENT. This platform currently simulates delivery refund tracking. Actual refund eligibility, amounts and processing times depend on the delivery provider's policies.
          </Text>
        </>
      )}
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
          {!!delivery.dispatchDate && <Row label="Preferred Delivery Date" value={delivery.dispatchDate} />}
          <Row label="Lender confirmation" value={
            delivery.outboundDispatchStatus === "confirmed" ? "Confirmed"
              : delivery.outboundDispatchStatus === "drop_off" ? "Drop-off Arrangement"
              : delivery.outboundDispatchStatus === "proposed_alternate" ? `Lender Proposed ${delivery.lenderProposedDispatchDate || "a New Date"}`
              : delivery.outboundDispatchStatus === "awaiting_lender_confirmation" ? "Awaiting Lender Confirmation"
              : "Not Recorded"} />
          <Row label="Estimated Delivery" value={
            delivery.estimatedDeliveryRangeStart && delivery.estimatedDeliveryRangeEnd
              ? `${delivery.estimatedDeliveryRangeStart} – ${delivery.estimatedDeliveryRangeEnd}` : "Pending Update"} />
          <Row label="Confirmed Delivery Date and Time" value={booking.renterReceivedAt ? formatMalaysiaDateTime(booking.renterReceivedAt) : "Pending — Not Yet Confirmed"} />
          {!!delivery.outboundTrackingRef && <Row label="Outbound tracking reference" value={delivery.outboundTrackingRef} />}
          {!!delivery.returnDispatchDeadline && <Row label="Planned Return Date" value={delivery.returnDispatchDeadline} />}
          <Row label="Return Method" value="Courier Branch Drop-off" />
          <Row label="Return drop-off status" value={delivery.returnDropoffConfirmedAt ? `Confirmed ${delivery.returnDropoffConfirmedAt.slice(0, 10)}` : "Pending renter drop-off"} />
          <Row label="Actual Return Handover Date and Time" value={booking.actualReturnTimestamp ? formatMalaysiaDateTime(booking.actualReturnTimestamp) : "Pending — Not Yet Confirmed"} />
          {!!delivery.returnTrackingRef && <Row label="Return tracking reference" value={delivery.returnTrackingRef} />}
          <Row label="Estimated Return Arrival" value={
            delivery.estimatedReturnRangeStart && delivery.estimatedReturnRangeEnd
              ? `${delivery.estimatedReturnRangeStart} – ${delivery.estimatedReturnRangeEnd}` : "Pending Update"} />
          <Row label="Outbound postage" value={money(deliveryOutboundFee ?? 0)} />
          <Row label="Return postage" value={money(deliveryReturnFee ?? 0)} />
          <Row label="Total two-way postage" value={totalDeliveryFee != null ? money(totalDeliveryFee) : "Unavailable"} strong />
          <Row label="Payment status" value={deliveryStatusLabel} />
          <Text style={styles.note}>Cross-state courier delivery and return dates are subject to transit conditions and courier availability. Exact arrival and pickup times cannot be guaranteed.</Text>
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
      <Text style={[subheadingStyle, styles.section]}>Total for this rental</Text>
      <Row label={unpaidDeliveryQuote ? "Estimated total payable" : "Original total"} value={totals.grandTotal == null ? "Delivery not recorded" : money(totals.grandTotal)} strong grand />
      {totals.grandTotal == null && delivery.estimatedTwoWayFee != null && <Row label="Estimated total (not charged)" value={money(booking.quote.total + delivery.estimatedTwoWayFee)} />}
      <Text style={styles.note}>Includes {money(booking.quote.deposit)} refundable security deposit.</Text>
      <Row label="Amount paid (recorded)" value={money(amountPaid)} />
      {outstanding > 0 && !cancelled && <Row label="Outstanding" value={money(outstanding)} />}
      <Row label="Rental payment" value={booking.payment.replace("_", " ")} />
      <Row label="Deposit" value={(() => {
        const status = effectiveDepositStatus(booking);
        if (cancelled && status === "required") return "Deposit Not Charged";
        if (cancelled && status === "release_pending" && booking.depositReleasedAt) {
          return `release pending (by ${formatShortDate(booking.depositReleasedAt)})`;
        }
        return status.replace("_", " ");
      })()} />
      {booking.payment === "refunded" && <Row label="Rental payment refund" value={money(booking.quote.total)} />}
      {booking.deliveryDemo?.status === "refunded_demo" && <Row label="Delivery refund" value={money(recordedDeliveryFee || 0)} />}
      {booking.conflictOffer?.refundAmount != null && <Row label="Recorded adjustment refund" value={money(booking.conflictOffer.refundAmount)} />}
      {booking.status === "disputed" && <Text style={styles.note}>Deposit held for dispute review; no release is assumed.</Text>}
      {lender && (
        <>
          <View style={styles.divider} />
          <Text style={[subheadingStyle, styles.section]}>Lender payout</Text>
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
  // title unused directly — "Booking Summary" now renders with the shared sectionHeadingStyle.
  item: { ...bookingTypography.note },
  // section only adds spacing now — size/weight/colour come from the shared subheadingStyle.
  section: { marginTop: 10, marginBottom: 2 },
  note: { ...bookingTypography.note },
  divider: { borderTopWidth: 1, borderColor: colors.softBlue, marginVertical: 5 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: "400", color: bookingTypography.description.color },
  rowValue: { ...bookingTypography.pricingValue, flex: 1, textAlign: "right" },
  strong: { fontWeight: "700" },
  // grand only adds colour/weight as a fallback; the final-total rows merge in totalAmountStyle
  // (see the Row component above) for the actual responsive size.
  grand: { fontWeight: "700", color: colors.navy },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginTop: 8 },
  link: { color: bookingTypography.action.color, fontWeight: "700", fontSize: 13 },
  breakdownToggleRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  breakdownBox: { backgroundColor: colors.paleBlue, borderRadius: 10, padding: 10, gap: 4, marginTop: 4 },
});
