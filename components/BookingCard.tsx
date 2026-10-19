import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Booking } from "../types/marketplace";
import { useMarketplace } from "../context/Marketplace";
import {
  formatMalaysiaDateTime,
  formatScheduledReturnPickup,
  formatShortDate,
  getEffectiveBookingStatus,
  malaysiaDateKey,
  money,
} from "../services/booking";
import { DOMESTIC_COURIER_NAME } from "../services/delivery";
import { colors } from "../constants/theme";

export function BookingCard({
  booking,
  isLender = false,
}: {
  booking: Booking;
  isLender?: boolean;
}) {
  const { state, user } = useMarketplace();
  const mobile = useWindowDimensions().width < 768;

  const counterpartyId = isLender ? booking.renterId : booking.ownerId;
  const counterparty = state.profiles.find((p) => p.id === counterpartyId);
  const counterpartyName =
    counterparty?.name || (isLender ? "Renter" : "Lender");

  const unreadMessages = state.notifications.filter(
    (n) =>
      n.userId === user?.id &&
      n.bookingId === booking.id &&
      !n.read &&
      n.title.includes("sent you a message"),
  ).length;

  const status = getEffectiveBookingStatus(booking);
  const isUpcoming = status === "upcoming";
  const isActive = status === "active";
  const isReturnPending = status === "return_pending";
  const isCompleted = status === "completed";
  const isCancelled =
    status === "cancelled" || status === "rejected";
  const isDisputed = status === "disputed";

  let headerSub = "Confirmed reservation";
  if (isActive) headerSub = "Current rental";
  else if (isReturnPending) headerSub = "Return due";
  else if (isCompleted) headerSub = "Completed rental";
  else if (isCancelled) headerSub = "Cancelled reservation";
  else if (isDisputed) headerSub = "Disputed rental";

  let tagLabel = "Upcoming";
  let tagBg = "#EFF6FF";
  let tagBorder = "#BFDBFE";
  let tagColor = colors.blue;

  if (isActive) {
    tagLabel = "Active";
    tagBg = "#DCFCE7";
    tagBorder = "#BBF7D0";
    tagColor = "#166534";
  } else if (isReturnPending) {
    tagLabel = "Return Due";
    tagBg = "#FEF3C7";
    tagBorder = "#FDE68A";
    tagColor = "#92400E";
  } else if (isCompleted) {
    tagLabel = "Completed";
    tagBg = "#F0FDF4";
    tagBorder = "#BBF7D0";
    tagColor = "#15803D";
  } else if (isCancelled) {
    tagLabel = "Cancelled";
    tagBg = "#FEE2E2";
    tagBorder = "#FECACA";
    tagColor = "#B91C1C";
  } else if (isDisputed) {
    tagLabel = "Disputed";
    tagBg = "#FEE2E2";
    tagBorder = "#FECACA";
    tagColor = "#B91C1C";
  }

  // Cross-state (Domestic Courier) bookings show dates only — courier transit was never
  // scheduled to an exact hour, so showing one would misrepresent it as confirmed. The
  // underlying booking.start/end timestamps are untouched; only this display differs.
  const isCrossState = booking.deliveryDemo?.provider === DOMESTIC_COURIER_NAME;
  const startFormatted = isCrossState
    ? formatShortDate(malaysiaDateKey(booking.start))
    : formatMalaysiaDateTime(booking.start);
  const endFormatted = isCrossState
    ? formatShortDate(malaysiaDateKey(booking.end))
    : formatScheduledReturnPickup(booking);

  let dateInfo = `Scheduled rental start: ${startFormatted}`;
  if (isActive || isReturnPending) {
    dateInfo = `Return due: ${endFormatted}`;
  } else if (isCompleted || isCancelled || isDisputed) {
    dateInfo = `${startFormatted} – ${endFormatted}`;
  }

  let depositStatusText = `${money(booking.quote.deposit)} held`;
  if (booking.deposit === "released") {
    depositStatusText = `${money(booking.quote.deposit)} released`;
  } else if (booking.deposit === "disputed") {
    depositStatusText = `${money(booking.quote.deposit)} held (Disputed)`;
  }

  const statusBadge = <View style={[styles.tag, mobile && styles.mobileTag, { backgroundColor: tagBg, borderColor: tagBorder }]}>
    <Text style={[styles.tagText, { color: tagColor }]}>{tagLabel}</Text>
  </View>;

  return (
    <View style={[styles.card, mobile && styles.mobileCard]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View rental for ${booking.title}`}
        onPress={() => router.push(`/rental/${booking.id}`)}
        style={{ gap: mobile ? 10 : 14 }}
      >
        <View style={[styles.topRow, mobile && styles.mobileTopRow]}>
          <Image source={{ uri: booking.image }} style={[styles.thumb, mobile && styles.mobileThumb]} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.subtext, mobile && styles.mobileSubtext]}>{headerSub}</Text>
            <Text style={styles.title} numberOfLines={1}>
              {booking.title}
            </Text>
            <Text style={styles.dateText}>{dateInfo}</Text>
            {!!booking.paymentMethod && (
              <Text style={styles.statLabel}>Payment method: {booking.paymentMethod}</Text>
            )}
            {booking.insurance?.selected && (
              <View style={styles.insuranceTag}>
                <Ionicons name="shield-checkmark-outline" size={11} color={colors.blue} />
                <Text style={styles.insuranceTagText}>Rental Protection · Third-party demo · {money(booking.insurance.premium)}</Text>
              </View>
            )}
            {mobile && statusBadge}
          </View>
          {!mobile && statusBadge}
        </View>

        <View style={styles.divider} />
      </Pressable>

      <View style={[styles.bottomRow, mobile && styles.mobileBottomRow]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View rental for ${booking.title}`}
          onPress={() => router.push(`/rental/${booking.id}`)}
          style={{ flex: 1, gap: 2 }}
        >
          <Text style={styles.statLabel}>Deposit status</Text>
          <Text style={styles.statValue}>{depositStatusText}</Text>
        </Pressable>

        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.messagesLabelRow}>
            <Text style={styles.statLabel}>Messages:</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open rental conversation"
              onPress={() => router.push({ pathname: "/(tabs)/messages", params: { bookingId: booking.id } })}
              style={styles.msgIconBtn}
            >
              <Ionicons name="chatbubbles" size={16} color={colors.blue} />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Chat with ${counterpartyName}`}
            onPress={() => router.push({ pathname: "/(tabs)/messages", params: { bookingId: booking.id } })}
          >
            <Text style={styles.statValue} numberOfLines={1}>
              {unreadMessages > 0
                ? `${unreadMessages} unread from ${counterpartyName}`
                : `Chat with ${counterpartyName}`}
            </Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View booking details for ${booking.title}`}
          onPress={() => router.push(`/rental/${booking.id}`)}
          style={[styles.viewBookingBtn, mobile && styles.mobileViewBookingBtn]}
        >
          <Text style={styles.viewBookingText}>View booking</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.blue} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewBookingBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  viewBookingText: { color: colors.blue, fontWeight: "700", fontSize: 13 },
  mobileViewBookingBtn: { paddingHorizontal: 11, paddingVertical: 7 },
  mobileBottomRow: { flexWrap: "wrap", gap: 10 },
  mobileCard: { padding: 14, borderRadius: 19, gap: 10, shadowOpacity: 0.07, shadowRadius: 12 },
  mobileTopRow: { alignItems: "flex-start", gap: 11 },
  mobileThumb: { width: 72, height: 72, borderRadius: 12 },
  mobileSubtext: { fontSize: 10, letterSpacing: 0.2 },
  mobileTag: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4 },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0B1F3A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
    marginBottom: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: colors.lightGrey,
  },
  subtext: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.navy,
  },
  dateText: {
    fontSize: 13,
    color: colors.muted,
  },
  insuranceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 2,
  },
  insuranceTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.blue,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: colors.lightGrey,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },
  messagesLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  msgIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
});
