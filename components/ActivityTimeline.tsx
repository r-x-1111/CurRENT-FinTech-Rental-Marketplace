import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, s } from "./ui";
import {
  effectiveDepositStatus,
  formatMalaysiaDateTime,
  getEffectiveBookingStatus,
  lenderInspectionDeadline,
  paymentMethodLabel,
  parseMalaysiaTimestamp,
  rentalTabForBooking,
} from "../services/booking";
import type { Booking, Dispute, Evidence } from "../types/marketplace";

type ActivityState = "completed" | "pending" | "scheduled" | "under_review" | "not_applicable";

export type ActivityTimelineItem = {
  label: string;
  state: ActivityState;
  at?: string | number | null;
};

const STATE_LABEL: Record<ActivityState, string> = {
  completed: "Completed",
  pending: "Pending",
  scheduled: "Scheduled",
  under_review: "Under review",
  not_applicable: "Not applicable",
};

const STATE_ICON: Record<ActivityState, keyof typeof Ionicons.glyphMap> = {
  completed: "checkmark-circle",
  pending: "ellipse-outline",
  scheduled: "time-outline",
  under_review: "time-outline",
  not_applicable: "remove-circle-outline",
};

const STATE_COLOR: Record<ActivityState, string> = {
  completed: colors.green,
  pending: colors.muted,
  scheduled: colors.blue,
  under_review: colors.blue,
  not_applicable: colors.muted,
};

function chronologicalTimeline(items: ActivityTimelineItem[]): ActivityTimelineItem[] {
  const dated = items.filter((item) => item.state === "completed" && item.at);
  dated.sort((a, b) => Date.parse(String(a.at)) - Date.parse(String(b.at)));
  return [...dated, ...items.filter((item) => item.state !== "completed" || !item.at)];
}

/**
 * Builds the Activity Timeline checklist for a booking: the standard nine-step rental
 * lifecycle, the five-step cancellation checklist, or the nine-step dispute checklist —
 * selected by the booking's effective status. Only ever reflects timestamps already
 * recorded on the booking/dispute; never invents a completion date.
 */
export function buildActivityTimeline(
  booking: Booking,
  dispute: Dispute | null | undefined,
  now: number = Date.now(),
  evidence: Evidence[] = [],
): ActivityTimelineItem[] {
  const itemCollectedAt = booking.lenderHandoverAt || booking.renterReceivedAt || null;
  const paymentMade = booking.payment === "paid" || booking.payment === "refunded";
  const evidenceLabels: Record<Exclude<Evidence["kind"], "dispute">, string> = {
    lender_before_delivery: "Lender Before Delivery evidence submitted",
    check_in: "Renter After Delivery evidence submitted",
    check_out: "Renter Before Return evidence submitted",
    lender_after_return: "Lender After Return evidence submitted",
  };
  const recordedEvidence: ActivityTimelineItem[] = evidence.filter((record) => record.bookingId === booking.id && record.kind !== "dispute")
    .map((record) => ({ label: evidenceLabels[record.kind as keyof typeof evidenceLabels], state: "completed", at: record.createdAt }));
  const recordedPayments: ActivityTimelineItem[] = [
    ...(booking.deposit !== "required" && booking.deposit !== "secured" ? [{ label: "Security deposit held", state: "completed" as const }] : []),
    ...(booking.deliveryDemo?.status === "paid_demo" || booking.deliveryDemo?.status === "refunded_demo"
      ? [{ label: `${booking.deliveryDemo.provider} delivery payment`, state: "completed" as const, at: booking.deliveryDemo.paidAt || null }] : []),
  ];

  if (booking.status === "cancelled" || booking.status === "rejected") {
    const cancelledAt = booking.cancelledAt || booking.createdAt;
    const cancelledByLabel = booking.cancelledById === booking.renterId ? "by renter" : "by lender";
    const items: ActivityTimelineItem[] = [
      { label: "Booking confirmed", state: "completed", at: booking.createdAt },
      paymentMade
        ? { label: `${paymentMethodLabel(booking.paymentMethod)} rental payment`, state: "completed" }
        : { label: "Rental payment", state: "not_applicable" },
      { label: `Booking cancelled ${cancelledByLabel}`, state: "completed", at: cancelledAt },
      booking.payment === "refunded"
        ? { label: "Payment refunded (Demo)", state: "completed" }
        : paymentMade
          ? { label: "Payment refunded (Demo)", state: "pending" }
          : { label: "Payment refunded (Demo)", state: "not_applicable" },
    ];
    if (booking.deposit === "required") {
      items.push({ label: "Security deposit release scheduled (Demo)", state: "not_applicable" });
    } else {
      const released = effectiveDepositStatus(booking, now) === "released";
      // The scheduling step and the actual simulated refund are two distinct completed events,
      // not one row that just swaps its own label — both use the same recorded release deadline
      // as their simulated completion date; no separate bank payment timestamp is invented.
      items.push({
        label: "Security deposit release scheduled (Demo)",
        state: released ? "completed" : "scheduled",
        at: booking.depositReleasedAt,
      });
      if (released) {
        items.push({ label: "Security deposit refunded (Demo)", state: "completed", at: booking.depositReleasedAt });
      }
    }
    return chronologicalTimeline([...items, ...recordedPayments, ...recordedEvidence]);
  }

  if (booking.status === "disputed") {
    return chronologicalTimeline([
      { label: "Booking confirmed", state: "completed", at: booking.createdAt },
      { label: `${paymentMethodLabel(booking.paymentMethod)} rental payment`, state: paymentMade ? "completed" : "pending" },
      { label: "Item collected", state: itemCollectedAt ? "completed" : "pending", at: itemCollectedAt },
      { label: "Rental started", state: booking.activationTimestamp ? "completed" : "pending", at: booking.activationTimestamp },
      { label: "Item returned", state: booking.lenderReturnReceivedAt || booking.actualReturnTimestamp ? "completed" : "pending", at: booking.lenderReturnReceivedAt || booking.actualReturnTimestamp },
      { label: "Renter confirmed return", state: booking.renterReturnConfirmedAt ? "completed" : "pending", at: booking.renterReturnConfirmedAt },
      { label: "Lender reported an issue", state: dispute ? "completed" : "pending", at: dispute?.createdAt ?? null },
      { label: "Renter submitted a response", state: "pending" },
      { label: "Case under review (Demo)", state: dispute?.status === "under_review" ? "under_review" : "pending" },
      ...recordedPayments,
      ...recordedEvidence,
    ]);
  }

  // Standard checklist: Upcoming, Active, Return Due, Completed.
  const effectiveStatus = getEffectiveBookingStatus(booking, now);
  const rentalStarted = Boolean(booking.activationTimestamp) ||
    (paymentMade && ["active", "return_pending", "completed"].includes(effectiveStatus) && parseMalaysiaTimestamp(booking.start) <= now);
  const startInFuture = !rentalStarted && (() => {
    const start = parseMalaysiaTimestamp(booking.start);
    return Number.isFinite(start) && start > now;
  })();
  const depositReleased = effectiveDepositStatus(booking, now) === "released";
  const inspectionDeadline = lenderInspectionDeadline(booking.lenderReturnReceivedAt);
  // depositReleasedAt is only ever stamped on the cancellation flow (see services/marketplace.ts) —
  // a normal/dispute-resolution deposit release just flips `deposit` to "released" without its own
  // timestamp, so fall back to the return-confirmation instant that triggered that release.
  const depositReleasedTimestamp = depositReleased ? booking.depositReleasedAt || null : null;

  return chronologicalTimeline([
    { label: "Booking confirmed", state: "completed", at: booking.createdAt },
    { label: `${paymentMethodLabel(booking.paymentMethod)} rental payment`, state: paymentMade ? "completed" : "pending" },
    { label: "Item collected", state: itemCollectedAt ? "completed" : "pending", at: itemCollectedAt },
    rentalStarted
      ? { label: "Rental started", state: "completed", at: booking.activationTimestamp || booking.start }
      : { label: "Rental started", state: startInFuture ? "scheduled" : "pending", at: startInFuture ? booking.start : null },
    { label: "Item returned", state: booking.lenderReturnReceivedAt || booking.actualReturnTimestamp ? "completed" : "pending", at: booking.lenderReturnReceivedAt || booking.actualReturnTimestamp },
    { label: "Renter confirmed return", state: booking.renterReturnConfirmedAt ? "completed" : "pending", at: booking.renterReturnConfirmedAt },
    { label: "Lender confirmed clean return", state: booking.lenderReturnConfirmedAt ? "completed" : "pending", at: booking.lenderReturnConfirmedAt },
    {
      label: "Security deposit released",
      state: depositReleased ? "completed" : "pending",
      at: depositReleased ? depositReleasedTimestamp : null,
    },
    {
      label: "Rental completed",
      state: effectiveStatus === "completed" ? "completed" : "pending",
      at: effectiveStatus === "completed" ? (booking.completedAt || booking.lenderReturnConfirmedAt || null) : null,
    },
    ...(rentalTabForBooking(booking, now) === "Return Due" ? [{ label: "Return due", state: "pending" as const, at: booking.end }] : []),
    ...(inspectionDeadline && now > parseMalaysiaTimestamp(inspectionDeadline) && !booking.lenderReturnConfirmedAt
      ? [{ label: "Inspection Overdue", state: "pending" as const, at: inspectionDeadline }] : []),
    ...recordedPayments,
    ...recordedEvidence,
  ]);
}

export function ActivityTimeline({ items }: { items: ActivityTimelineItem[] }) {
  return (
    <View>
      {items.map((item, index) => {
        const dateLabel = item.at ? formatMalaysiaDateTime(item.at) : null;
        return (
          <View
            key={`${item.label}-${index}`}
            style={[styles.row, index === items.length - 1 && styles.rowLast]}
          >
            <View style={styles.left}>
              <Ionicons name={STATE_ICON[item.state]} size={20} color={STATE_COLOR[item.state]} style={styles.icon} />
              <Text style={[s.bold, styles.label]}>{item.label}</Text>
            </View>
            <View style={styles.right}>
              <Text style={[styles.statusText, { color: STATE_COLOR[item.state] }]}>{STATE_LABEL[item.state]}</Text>
              {dateLabel && <Text style={s.caption}>{dateLabel}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  left: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    flex: 1,
    minWidth: 180,
    flexShrink: 1,
  },
  icon: {
    marginTop: 1,
  },
  label: {
    flex: 1,
    flexShrink: 1,
  },
  right: {
    alignItems: "flex-end",
    minWidth: 110,
  },
  statusText: {
    fontWeight: "700",
    fontSize: 13,
  },
});
