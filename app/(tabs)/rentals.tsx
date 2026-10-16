import { useEffect, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Button, Chips, Empty, Screen, s } from "../../components/ui";
import { BookingCard } from "../../components/BookingCard";
import { useMarketplace } from "../../context/Marketplace";
import {
  formatMalaysiaDateTime,
  getEffectiveBookingStatus,
  money,
  parseMalaysiaTimestamp,
} from "../../services/booking";
import { deriveDisplayDelivery } from "../../services/delivery";
import { colors } from "../../constants/theme";
import { GuestAuthGate } from "../../components/GuestAuth";

export default function RentalsScreen() {
  const { tab, bookingId } = useLocalSearchParams<{ tab?: string; bookingId?: string }>();
  const { state, user } = useMarketplace();
  const mobile = useWindowDimensions().width < 768;
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [now, setNow] = useState(() => Date.now());
  const [detailsBookingId, setDetailsBookingId] = useState<string | null>(null);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);

  useEffect(() => {
    if (typeof tab === "string" && ["Upcoming", "Active", "Return Due", "Completed", "Cancelled", "Disputed", "Payment & Transaction History"].includes(tab)) setActiveTab(tab);
  }, [tab]);

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
  }).sort((a, b) => Number(b.id === bookingId) - Number(a.id === bookingId));

  // Helper to build transaction ledger
  function renderPaymentHistory() {
    const deliveryRecords = (state.deliveryHistory || []).filter((record) => record.renterId === user!.id)
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
    if (!userBookings.length && !deliveryRecords.length) {
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
      bookingId: string;
      date: string;
      itemTitle: string;
      type: string;
      amount: number;
      method: string;
      status: string;
      isCredit?: boolean;
    }[] = [];

    [...userBookings].sort((a, b) => Number(b.id === bookingId) - Number(a.id === bookingId)).forEach((b) => {
      const paymentStatus = b.payment === "paid" ? "Paid" : b.payment === "refunded" ? "Refunded" : b.payment === "processing" ? "Processing" : b.payment === "failed" ? "Failed" : "Payment Required";
      // 1. Rental fee paid
      transactions.push({
        id: `${b.id}-rent`, bookingId: b.id,
        date: b.createdAt.slice(0, 10),
        itemTitle: b.title,
        type: "Rental Fee",
        amount: b.quote.rentalFee,
        method: b.paymentMethod || "FPX",
        status: paymentStatus,
      });

      // 2. Platform service fee
      transactions.push({
        id: `${b.id}-svc`, bookingId: b.id,
        date: b.createdAt.slice(0, 10),
        itemTitle: b.title,
        type: "CurRENT Service Fee",
        amount: b.quote.serviceFee,
        method: b.paymentMethod || "FPX",
        status: paymentStatus,
      });

      // 3. Optional Rental Protection premium (only when the renter selected it at checkout)
      if (b.insurance?.selected) {
        transactions.push({
          id: `${b.id}-ins`, bookingId: b.id,
          date: b.createdAt.slice(0, 10),
          itemTitle: b.title,
          type: "Rental Protection (Optional, Demo)",
          amount: b.insurance.premium,
          method: b.paymentMethod || "FPX",
          status: paymentStatus,
        });
      }

      // 4. Security deposit hold
      transactions.push({
        id: `${b.id}-dep`, bookingId: b.id,
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
            : b.deposit === "required"
            ? "Deposit Required"
            : b.deposit === "release_pending"
            ? "Release Pending"
            : "Secured",
      });

      // 5. Security deposit refund — recorded as its own credit once released, separate from the original hold above
      if (b.deposit === "released") {
        transactions.push({
          id: `${b.id}-dep-refund`, bookingId: b.id,
          date: (b.lenderReturnConfirmedAt || b.actualReturnTimestamp || b.cancelledAt || b.createdAt).slice(0, 10),
          itemTitle: b.title,
          type: "Security Deposit Refund",
          amount: b.quote.deposit,
          method: b.paymentMethod || "FPX",
          status: "Completed",
          isCredit: true,
        });
      }

      // 6. Cancellation refund — the original rental fee, service fee and (if any) insurance premium returned in full
      if (b.status === "cancelled" && b.payment === "refunded") {
        transactions.push({
          id: `${b.id}-cancel-refund`, bookingId: b.id,
          date: (b.cancelledAt || b.createdAt).slice(0, 10),
          itemTitle: b.title,
          type: "Cancellation Refund (Demo, Full Refund)",
          amount: Math.round((b.quote.rentalFee + b.quote.serviceFee + b.quote.protection) * 100) / 100,
          method: b.paymentMethod || "FPX",
          status: "Completed",
          isCredit: true,
        });
      }
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
          <Pressable
            key={tx.id}
            accessibilityRole="button"
            accessibilityLabel={`View transaction details for ${tx.type}, ${tx.itemTitle}`}
            onPress={() => { setDetailsBookingId(tx.bookingId); setShowFeeBreakdown(false); }}
            style={styles.txCard}
          >
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
          </Pressable>
        ))}
      </View>
    );
  }

  const detailsBooking = detailsBookingId ? userBookings.find((b) => b.id === detailsBookingId) : null;
  const detailsListing = detailsBooking ? state.listings.find((l) => l.id === detailsBooking.listingId) : null;
  const detailsLender = detailsBooking ? state.profiles.find((p) => p.id === detailsBooking.ownerId) : null;
  const detailsDelivery = detailsBooking
    ? deriveDisplayDelivery({
        collectionMethod: detailsBooking.collectionMethod,
        deliveryDemo: detailsBooking.deliveryDemo || null,
        pickupLocation: detailsListing?.location || detailsBooking.deliveryDemo?.origin || "",
        deliveryAddress: detailsBooking.deliveryAddress,
      })
    : null;

  function renderTransactionDetailsModal() {
    return (
      <Modal transparent visible={!!detailsBooking} animationType="fade" onRequestClose={() => setDetailsBookingId(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDetailsBookingId(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {detailsBooking && (
              <ScrollView style={{ gap: 10 }} contentContainerStyle={{ gap: 10 }}>
                <View style={s.row}>
                  <Text style={s.h2}>Transaction Details</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Close transaction details" onPress={() => setDetailsBookingId(null)}>
                    <Ionicons name="close" size={22} color={colors.muted} />
                  </Pressable>
                </View>

                <Text style={s.bold}>{detailsBooking.title}</Text>
                <Text style={s.caption}>Booking Ref: {detailsBooking.id}</Text>
                {detailsLender && <Text style={s.caption}>Lender: {detailsLender.name}</Text>}
                <Text style={s.caption}>
                  {formatMalaysiaDateTime(detailsBooking.start)} – {formatMalaysiaDateTime(detailsBooking.end)}
                </Text>

                <View style={styles.modalDivider} />
                <Text style={styles.modalSectionTitle}>CurRENT Payment Breakdown</Text>
                <View style={s.row}><Text style={s.caption}>Rental fee</Text><Text style={styles.txAmount}>{money(detailsBooking.quote.rentalFee)}</Text></View>
                <View style={s.row}><Text style={s.caption}>CurRENT service fee</Text><Text style={styles.txAmount}>{money(detailsBooking.quote.serviceFee)}</Text></View>
                {detailsBooking.insurance?.selected && (
                  <View style={s.row}><Text style={s.caption}>Rental Protection (Optional, Demo)</Text><Text style={styles.txAmount}>{money(detailsBooking.insurance.premium)}</Text></View>
                )}
                <View style={s.row}><Text style={s.caption}>Refundable security deposit</Text><Text style={styles.txAmount}>{money(detailsBooking.quote.deposit)}</Text></View>
                <View style={s.row}><Text style={s.bold}>CurRENT Total Paid</Text><Text style={[styles.txAmount, { fontSize: 16 }]}>{money(detailsBooking.quote.total)}</Text></View>
                <Text style={s.caption}>Deposit status: {detailsBooking.deposit.replace("_", " ")}</Text>

                <View style={styles.modalDivider} />
                <View style={styles.deliverySectionHeader}>
                  <Ionicons name="bicycle-outline" size={16} color={colors.navy} />
                  <Text style={styles.modalSectionTitle}>GrabExpress Delivery (Demo)</Text>
                </View>
                {detailsDelivery && (
                  <View style={{ gap: 4 }}>
                    <View style={s.row}><Text style={s.caption}>Delivery method</Text><Text style={s.bold}>{detailsDelivery.method}</Text></View>
                    {detailsDelivery.status === "self_pickup" ? (
                      <Badge text="Self-Pickup — No Delivery Fee" />
                    ) : (
                      <>
                        <View style={s.row}><Text style={s.caption}>Pickup</Text><Text style={[s.caption, { color: colors.navy, fontWeight: "600" }]}>{detailsDelivery.origin}</Text></View>
                        <View style={s.row}><Text style={s.caption}>Delivery</Text><Text style={[s.caption, { color: colors.navy, fontWeight: "600" }]}>{detailsDelivery.destination}</Text></View>
                        {detailsDelivery.area && <View style={s.row}><Text style={s.caption}>Service area</Text><Text style={s.caption}>{detailsDelivery.area}</Text></View>}
                        {!!detailsDelivery.distanceKm && <View style={s.row}><Text style={s.caption}>Distance</Text><Text style={s.caption}>{detailsDelivery.distanceKm} km (Demo Route)</Text></View>}
                        {detailsDelivery.vehicle && <View style={s.row}><Text style={s.caption}>Vehicle</Text><Text style={s.caption}>{detailsDelivery.vehicle}</Text></View>}
                        {detailsDelivery.fee != null ? (
                          <View style={s.row}><Text style={s.bold}>Delivery Fee</Text><Text style={styles.txAmount}>{money(detailsDelivery.fee)}</Text></View>
                        ) : (
                          <Text style={[s.caption, { color: colors.danger }]}>Delivery Estimate Unavailable</Text>
                        )}
                        <Badge
                          text={detailsDelivery.status === "paid_demo" ? "Demo Payment Completed" : detailsDelivery.status === "required" ? "Delivery Payment Required (Demo)" : "No Delivery Record"}
                          green={detailsDelivery.status === "paid_demo"}
                        />
                        {detailsDelivery.fee != null && (
                          <Pressable accessibilityRole="button" onPress={() => setShowFeeBreakdown((v) => !v)}>
                            <Text style={{ color: colors.blue, fontWeight: "700", marginTop: 4 }}>
                              {showFeeBreakdown ? "Hide Fee Breakdown" : "View Fee Breakdown"}
                            </Text>
                          </Pressable>
                        )}
                        {showFeeBreakdown && detailsDelivery.fee != null && (
                          <View style={styles.feeBreakdownBox}>
                            <View style={s.row}><Text style={s.caption}>Base Fare</Text><Text style={s.caption}>{money(detailsDelivery.baseFare || 0)}</Text></View>
                            <View style={s.row}>
                              <Text style={s.caption}>Additional Distance Charge</Text>
                              <Text style={s.caption}>{money(detailsDelivery.distanceCharge || 0)}</Text>
                            </View>
                            <View style={s.row}><Text style={s.bold}>Delivery Fee</Text><Text style={s.bold}>{money(detailsDelivery.fee)}</Text></View>
                          </View>
                        )}
                        {detailsDelivery.status === "paid_demo" && detailsDelivery.receiptReference && (
                          <Button secondary onPress={() => {
                            const receiptId = detailsDelivery.receiptReference!;
                            setDetailsBookingId(null);
                            router.push({ pathname: "/delivery-receipt/[id]", params: { id: receiptId } });
                          }}>
                            View Delivery Receipt
                          </Button>
                        )}
                      </>
                    )}
                    <Text style={[s.caption, { marginTop: 4 }]}>
                      GrabExpress delivery fees are separate from CurRENT's rental fee, service fee, security deposit and total paid above.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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

  const protectionBanner = <View style={[styles.headerBanner, mobile && styles.mobileHeaderBanner]}>
    <View style={styles.headerBannerIcon}>
      <Ionicons name="shield-checkmark" size={20} color={colors.blue} />
    </View>
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={styles.headerBannerTitle}>Rental Protection & Escrow</Text>
      <Text style={styles.headerBannerSubtitle}>
        Security deposits held in simulated escrow · Released automatically upon clean two-sided return confirmation
      </Text>
    </View>
  </View>;

  return (
    <Screen
      title="My Rentals"
      subtitle={mobile ? undefined : "From your first request to your next adventure."}
      contentStyle={mobile && styles.mobileContent}
      headerGradient
    >
      {!mobile && protectionBanner}

      <Chips
        options={tabs}
        selected={activeTab}
        onSelect={setActiveTab}
        segmented={mobile}
      />
      {mobile && protectionBanner}

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
      {renderTransactionDetailsModal()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  mobileContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.55)", justifyContent: "center", padding: 18 },
  modalCard: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 480,
    maxHeight: "86%",
    padding: 20,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  modalDivider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  modalSectionTitle: { fontSize: 13, fontWeight: "800", color: colors.navy },
  deliverySectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  feeBreakdownBox: {
    backgroundColor: colors.paleBlue,
    borderRadius: 10,
    padding: 10,
    gap: 4,
    marginTop: 4,
  },
  mobileHeaderBanner: { padding: 10, borderLeftWidth: 0, borderRadius: 16, marginBottom: 12 },
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
    borderLeftWidth: 3,
    borderLeftColor: colors.blue,
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
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navy,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
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
    backgroundColor: colors.lightGrey,
  },
});
