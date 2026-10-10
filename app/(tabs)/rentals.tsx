import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Chips, Empty, Screen, s } from "../../components/ui";
import { BookingCard } from "../../components/BookingCard";
import { useMarketplace } from "../../context/Marketplace";
import { dateAfter, money } from "../../services/booking";
import { colors } from "../../constants/theme";
import type { Booking } from "../../types/marketplace";

export default function RentalsScreen() {
  const { state, user } = useMarketplace();

  // In Admin Demo, show classroom presentation fixtures or user's requests; in Normal mode, show only user's own requests
  const visiblePlatformRequests = state.platformReviewRequests.filter((r) =>
    state.mode === "admin_demo"
      ? r.renterId === user?.id || r.contextMode === "admin_demo"
      : r.renterId === user?.id,
  );

  const tabs = [
    "All",
    "Upcoming",
    "Active",
    "Return Due",
    "Completed",
    "Cancelled",
    "Disputed",
    "Platform Review Requests",
    "Payment & Transaction History",
  ];

  const [activeTab, setActiveTab] = useState("All");

  const userBookings = state.bookings.filter((b) => b.renterId === user?.id);

  // Filter bookings based on activeTab
  const filteredBookings = userBookings.filter((b) => {
    switch (activeTab) {
      case "All":
        return true;
      case "Upcoming":
        return b.status === "upcoming";
      case "Active":
        return b.status === "active";
      case "Return Due":
        return (
          b.status === "return_pending" ||
          (b.status === "active" && b.end <= dateAfter(1))
        );
      case "Completed":
        return b.status === "completed";
      case "Cancelled":
        return b.status === "cancelled" || b.status === "rejected";
      case "Disputed":
        return b.status === "disputed";
      default:
        return false;
    }
  });

  // Find upcoming or active booking for the relocated Dashboard Preview summary card
  const upcomingBooking = userBookings.find((b) => b.status === "upcoming");
  const activeBooking = userBookings.find(
    (b) => b.status === "active" || b.status === "return_pending",
  );

  // Helper to render the relocated summary card
  function renderRelocatedSummaryCard(booking: Booking, variant: "upcoming" | "active") {
    const owner = state.profiles.find((p) => p.id === booking.ownerId);
    const unreadMessages = state.notifications.filter(
      (n) =>
        n.userId === user?.id &&
        n.bookingId === booking.id &&
        !n.read &&
        n.title.includes("sent you a message"),
    ).length;

    const returnDueStr = booking.effectiveReturnDeadline
      ? new Date(booking.effectiveReturnDeadline).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : booking.end.slice(0, 10);

    const isUpcoming = variant === "upcoming";

    return (
      <View style={styles.summaryCardWrapper} key={booking.id}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/rental/${booking.id}`)}
          style={styles.dashboardPreviewCard}
        >
          <View style={styles.previewTop}>
            <Image source={{ uri: booking.image }} style={styles.previewThumb} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.previewSub}>
                {isUpcoming ? "Confirmed reservation" : "Current rental"}
              </Text>
              <Text style={styles.previewItemTitle}>{booking.title}</Text>
              <Text style={styles.previewDue}>
                {isUpcoming
                  ? `Scheduled pickup: ${booking.scheduledPickup ? new Date(booking.scheduledPickup).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : booking.start}`
                  : `Return due: ${returnDueStr}`}
              </Text>
            </View>
            <View
              style={[
                styles.activeTag,
                isUpcoming && { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
              ]}
            >
              <Text
                style={[
                  styles.activeTagText,
                  isUpcoming && { color: colors.blue },
                ]}
              >
                {isUpcoming ? "Confirmed - Upcoming" : "Active rental"}
              </Text>
            </View>
          </View>

          <View style={styles.previewDivider} />

          <View style={styles.previewBottom}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.previewStatLabel}>Deposit status</Text>
              <Text style={styles.previewStatValue}>
                {money(booking.quote.deposit)} held (Demo)
              </Text>
            </View>

            {/* Messages with working deep-link icon beside label */}
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.messagesLabelRow}>
                <Text style={styles.previewStatLabel}>Messages:</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open rental conversation"
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push(`/conversation/${booking.id}`);
                  }}
                  style={styles.messageDeepLinkIcon}
                >
                  <Ionicons name="chatbubbles" size={16} color={colors.blue} />
                </Pressable>
              </View>
              <Pressable
                onPress={() => router.push(`/conversation/${booking.id}`)}
              >
                <Text style={styles.previewStatValue}>
                  {unreadMessages > 0
                    ? `${unreadMessages} unread from ${owner?.name || "Owner"}`
                    : `Chat with ${owner?.name || "Owner"}`}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </View>
    );
  }

  // Helper to build transaction ledger
  function renderPaymentHistory() {
    if (!userBookings.length) {
      return (
        <Empty
          title="No transaction history yet"
          text="Complete your first rental to see your simulated receipt, held deposit and settlement ledger."
          action="Explore rentals"
          onPress={() => router.push("/(tabs)/explore")}
        />
      );
    }

    const transactions: {
      id: string;
      date: string;
      itemTitle: string;
      type: string;
      amount: number;
      method: string;
      status: string;
      isCredit?: boolean;
    }[] = [];

    userBookings.forEach((b) => {
      // 1. Rental fee paid
      transactions.push({
        id: `${b.id}-rent`,
        date: b.createdAt.slice(0, 10),
        itemTitle: b.title,
        type: "Rental Fee",
        amount: b.quote.rentalFee,
        method: b.paymentMethod || "Demo FPX",
        status: b.payment === "refunded" ? "Refunded" : "Paid",
      });

      // 2. Platform service fee
      transactions.push({
        id: `${b.id}-svc`,
        date: b.createdAt.slice(0, 10),
        itemTitle: b.title,
        type: "CurRENT Service Fee",
        amount: b.quote.serviceFee,
        method: b.paymentMethod || "Demo FPX",
        status: b.payment === "refunded" ? "Refunded" : "Paid",
      });

      // 3. Security deposit
      transactions.push({
        id: `${b.id}-dep`,
        date: b.createdAt.slice(0, 10),
        itemTitle: b.title,
        type: "Security Deposit (Refundable)",
        amount: b.quote.deposit,
        method: b.paymentMethod || "Demo FPX",
        status:
          b.deposit === "released"
            ? "Released · Full Deposit Refund"
            : b.deposit === "held"
            ? "Held Securely (Demo)"
            : b.deposit === "disputed"
            ? "Held for Dispute Review"
            : "Processed",
        isCredit: b.deposit === "released",
      });
    });

    return (
      <View style={{ gap: 12, marginTop: 12 }}>
        <View style={styles.historyNoticeBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.navy} />
          <Text style={styles.historyNoticeText}>
            Simulated classroom ledger. Transparently tracks rental fees, 5% platform service fees, and refundable security deposits.
          </Text>
        </View>

        {transactions.map((tx) => (
          <View key={tx.id} style={styles.txCard}>
            <View style={s.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.txType}>{tx.type}</Text>
                <Text style={styles.txItemTitle}>{tx.itemTitle}</Text>
                <Text style={styles.txDate}>
                  {tx.date} · via {tx.method}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={styles.txAmount}>
                  {tx.isCredit ? "+ " : ""}RM{tx.amount.toFixed(2)}
                </Text>
                <Badge
                  text={tx.status}
                  green={tx.status.includes("Released") || tx.status === "Paid"}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  }

  // Helper to render platform review requests
  function renderPlatformReviewRequests() {
    if (!visiblePlatformRequests.length) {
      return (
        <Empty
          title="No platform review requests"
          text="Applications submitted for CurRENT platform review will appear here."
          action="Explore rentals"
          onPress={() => router.push("/(tabs)/explore")}
        />
      );
    }

    return (
      <View style={{ gap: 12, marginTop: 12 }}>
        <View style={styles.reviewNoticeBox}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#0284C7" />
          <View style={{ flex: 1 }}>
            <Text style={styles.reviewNoticeTitle}>
              Platform Review Requests
            </Text>
            <Text style={styles.reviewNoticeDesc}>
              Applications submitted for CurRENT platform review. You can track your application review status here.
            </Text>
          </View>
        </View>

        {visiblePlatformRequests.map((req) => (
          <Pressable
            key={req.id}
            style={styles.platformCard}
            onPress={() =>
              router.push({
                pathname: "/rental-request",
                params: { id: req.id },
              })
            }
          >
            <Image source={{ uri: req.image }} style={styles.platformThumb} />
            <View style={{ flex: 1, gap: 4 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Text style={s.bold}>{req.title}</Text>
                <Badge text={req.statusLabel || "Pending Review"} />
              </View>
              <Text style={[s.caption, { color: colors.blue, fontWeight: "700" }]}>
                Ref: {req.id}
              </Text>
              <Text style={s.caption}>
                Start: {req.start}{req.pickupTime ? `, ${req.pickupTime}` : ""}
              </Text>
              <Text style={s.caption}>
                Return: {req.end}{req.returnTime ? `, ${req.returnTime}` : ""}
              </Text>
              {req.lenderName && (
                <Text style={s.caption}>Lender: {req.lenderName}</Text>
              )}
              <Text style={s.caption}>
                Fulfilment: Delivery Only {req.location ? `· 📍 ${req.location}` : ""}
              </Text>
              <Text style={[s.caption, { color: colors.muted, marginTop: 2 }]}>
                Submitted {new Date(req.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · No deposit or payment charged · Tap to view details →
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <Screen
      title="Your rentals"
      subtitle="From your first request to your next adventure."
    >
      <Chips
        options={tabs}
        selected={activeTab}
        onSelect={setActiveTab}
      />

      {activeTab === "Payment & Transaction History" && renderPaymentHistory()}

      {activeTab === "Platform Review Requests" && renderPlatformReviewRequests()}

      {activeTab !== "Payment & Transaction History" &&
        activeTab !== "Platform Review Requests" && (
          <View style={{ marginTop: 12, gap: 14 }}>
            {/* Show relocated summary card if viewing Upcoming tab or Active tab */}
            {activeTab === "Upcoming" && upcomingBooking && (
              renderRelocatedSummaryCard(upcomingBooking, "upcoming")
            )}

            {activeTab === "Active" && activeBooking && (
              renderRelocatedSummaryCard(activeBooking, "active")
            )}

            {filteredBookings.length > 0 ? (
              filteredBookings.map((b) => <BookingCard key={b.id} booking={b} />)
            ) : (
              // If we already rendered the summary card, don't show empty
              (activeTab === "Upcoming" && upcomingBooking) ||
              (activeTab === "Active" && activeBooking) ? null : (
                <Empty
                  title="No rentals in this category"
                  text="Your upcoming, active, and completed bookings will appear here."
                  action="Explore rentals"
                  onPress={() => router.push("/(tabs)/explore")}
                />
              )
            )}
          </View>
        )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCardWrapper: {
    marginBottom: 6,
  },
  dashboardPreviewCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  previewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  previewThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  previewSub: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewItemTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.navy,
  },
  previewDue: {
    fontSize: 13,
    color: colors.muted,
  },
  activeTag: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  activeTagText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "700",
  },
  previewDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  previewBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  previewStatLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  previewStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },
  messagesLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  messageDeepLinkIcon: {
    padding: 2,
  },
  historyNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.paleBlue,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.softBlue,
  },
  historyNoticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.navy,
    lineHeight: 18,
  },
  txCard: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  txType: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },
  txItemTitle: {
    fontSize: 13,
    color: colors.muted,
  },
  txDate: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.navy,
  },
  reviewNoticeBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#F0F9FF",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  reviewNoticeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0369A1",
  },
  reviewNoticeDesc: {
    fontSize: 12,
    color: "#0C4A6E",
    marginTop: 2,
    lineHeight: 16,
  },
  platformCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  platformThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
});
