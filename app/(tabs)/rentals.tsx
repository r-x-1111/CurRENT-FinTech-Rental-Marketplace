import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Chips, Empty, Screen, s } from "../../components/ui";
import { BookingCard } from "../../components/BookingCard";
import { useMarketplace } from "../../context/Marketplace";
import {
  getEffectiveBookingStatus,
  parseMalaysiaTimestamp,
} from "../../services/booking";
import { colors } from "../../constants/theme";
import { GuestAuthGate } from "../../components/GuestAuth";

export default function RentalsScreen() {
  const { state, user } = useMarketplace();
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!user) {
    return <GuestAuthGate title="Rentals" returnTo="/(tabs)/rentals" />;
  }

  const visiblePlatformRequests = state.platformReviewRequests.filter(
    (request) => request.renterId === user.id,
  );

  const tabs = [
    "Upcoming",
    "Active",
    "Return Due",
    "Completed",
    "Cancelled",
    "Disputed",
    "Payment & Transaction History",
    ...(visiblePlatformRequests.length > 0 ? ["Platform Review Requests"] : []),
  ];

  const userBookings = state.bookings.filter((b) => b.renterId === user?.id);

  // Filter bookings based on activeTab
  const filteredBookings = userBookings.filter((b) => {
    const status = getEffectiveBookingStatus(b, now);
    switch (activeTab) {
      case "Upcoming":
        return status === "upcoming";
      case "Active":
        return status === "active" || status === "return_pending";
      case "Return Due":
        return (
          status === "active" &&
          !b.renterReturnConfirmedAt &&
          parseMalaysiaTimestamp(b.end) <= now
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

  // Helper to build transaction ledger
  function renderPaymentHistory() {
    if (!userBookings.length) {
      return (
        <Empty
          title="No transaction history yet"
          text="Complete your first rental to see your simulated receipt, held deposit and settlement ledger."
          action="Explore rentals"
          onPress={() => router.push("/(tabs)")}
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
        method: b.paymentMethod || "FPX",
        status: b.payment === "refunded" ? "Refunded" : "Paid",
      });

      // 2. Platform service fee
      transactions.push({
        id: `${b.id}-svc`,
        date: b.createdAt.slice(0, 10),
        itemTitle: b.title,
        type: "CurRENT Service Fee",
        amount: b.quote.serviceFee,
        method: b.paymentMethod || "FPX",
        status: b.payment === "refunded" ? "Refunded" : "Paid",
      });

      // 3. Security deposit
      transactions.push({
        id: `${b.id}-dep`,
        date: b.createdAt.slice(0, 10),
        itemTitle: b.title,
        type: "Security Deposit (Refundable)",
        amount: b.quote.deposit,
        method: b.paymentMethod || "FPX",
        status:
          b.deposit === "released"
            ? "Released · Full Deposit Refund"
            : b.deposit === "held"
            ? "Held Securely"
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
          onPress={() => router.push("/(tabs)")}
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
      <View style={styles.headerBanner}>
        <View style={styles.headerBannerIcon}>
          <Ionicons name="shield-checkmark" size={20} color={colors.blue} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.headerBannerTitle}>Rental Protection & Escrow</Text>
          <Text style={styles.headerBannerSubtitle}>
            Security deposits held in simulated escrow · Released automatically upon clean two-sided return confirmation
          </Text>
        </View>
      </View>

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
            {filteredBookings.length > 0 ? (
              filteredBookings.map((b) => <BookingCard key={b.id} booking={b} />)
            ) : (
              <Empty
                title="No rentals in this category"
                text="Your upcoming, active, and completed bookings will appear here."
                action="Explore rentals"
                onPress={() => router.push("/(tabs)")}
              />
            )}
          </View>
        )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBanner: {
    backgroundColor: colors.paleBlue,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.softBlue,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  headerBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.softBlue,
  },
  headerBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },
  headerBannerSubtitle: {
    fontSize: 12,
    color: colors.slate,
    lineHeight: 18,
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
