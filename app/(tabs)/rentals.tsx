import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Button, Chips, Empty, Row, Screen, s } from "../../components/ui";
import { BookingCard } from "../../components/BookingCard";
import { BookingSummary } from "../../components/BookingSummary";
import { MorphIcon } from "../../components/MorphIcon";
import { useMarketplace } from "../../context/Marketplace";
import {
  formatShortDate,
  getBookingTotals,
  getEffectiveBookingStatus,
  money,
  parseMalaysiaTimestamp,
} from "../../services/booking";
import { deriveDisplayDelivery, type DisplayDelivery } from "../../services/delivery";
import { colors } from "../../constants/theme";
import { GuestAuthGate } from "../../components/GuestAuth";
import type { Booking } from "../../types/marketplace";

export default function RentalsScreen() {
  const { tab, bookingId } = useLocalSearchParams<{ tab?: string; bookingId?: string }>();
  const { state, user } = useMarketplace();
  const mobile = useWindowDimensions().width < 768;
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [now, setNow] = useState(() => Date.now());
  const [expandedLedgerCards, setExpandedLedgerCards] = useState<Set<string>>(new Set());
  const [expandedLedgerDetails, setExpandedLedgerDetails] = useState<Set<string>>(new Set());
  const [expandedDeliveryBreakdown, setExpandedDeliveryBreakdown] = useState<Set<string>>(new Set());
  const [historyFilter, setHistoryFilter] = useState("All");
  const [historySearch, setHistorySearch] = useState("");

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

  function depositStatusLabel(status: Booking["deposit"]): string {
    switch (status) {
      case "held": return "Held securely";
      case "release_pending": return "Release pending";
      case "released": return "Released";
      case "disputed": return "Held for dispute review";
      case "required": return "Required";
      default: return "Secured";
    }
  }

  function statusChipFor(b: Booking): { text: string; tone: "red" | "grey" | "amber" | "blue" | "green" } {
    if (b.status === "disputed") return { text: "Disputed", tone: "red" };
    if (b.status === "cancelled" || b.status === "rejected") return { text: b.payment === "refunded" ? "Cancelled · Refunded" : "Cancelled", tone: "grey" };
    if (b.deposit === "release_pending") return { text: "Deposit release pending", tone: "amber" };
    if (b.deposit === "released") return { text: "Completed · Deposit released", tone: "green" };
    return { text: "Deposit held", tone: "blue" };
  }

  type LedgerCard = {
    booking: Booking;
    listing: ReturnType<typeof state.listings.find>;
    delivery: DisplayDelivery;
    deliveryPaid: boolean;
    totals: ReturnType<typeof getBookingTotals>;
    grandTotal: number;
    refundRows: { label: string; amount: number; date: string }[];
    refundsTotal: number;
    netCost: number;
    statusChip: ReturnType<typeof statusChipFor>;
  };

  function buildLedgerCard(b: Booking): LedgerCard {
    const listing = state.listings.find((l) => l.id === b.listingId);
    const delivery = deriveDisplayDelivery({
      collectionMethod: b.collectionMethod,
      deliveryDemo: b.deliveryDemo || null,
      pickupLocation: listing?.privateMeetingVenue || listing?.location || b.deliveryDemo?.origin || "",
      deliveryAddress: b.deliveryAddress,
      pickupPostcode: listing?.pickupPostcode,
      parcelWeightKg: listing?.parcelWeightKg,
      parcelDimensionsCm: listing?.parcelDimensionsCm,
      deliveryRequirement: listing?.deliveryRequirement,
      title: listing?.title || b.title,
      category: listing?.category,
      description: listing?.description,
      deliveryPostcode: b.deliveryPostcode,
      demoBooking: b.contextMode === "admin_demo" && b.id.startsWith("demo-"),
      listingId: b.listingId,
    });
    const deliveryPaid = delivery.status === "paid_demo" || delivery.status === "refunded_demo";
    const totals = getBookingTotals(b.quote, deliveryPaid ? delivery.fee : null);
    const grandTotal = totals.grandTotal ?? totals.subtotal;

    const refundRows: { label: string; amount: number; date: string }[] = [];
    if (b.status === "cancelled" && b.payment === "refunded") {
      refundRows.push({
        label: "Cancellation refund (Demo, full refund)",
        amount: Math.round((b.quote.rentalFee + b.quote.serviceFee + b.quote.protection) * 100) / 100,
        date: (b.cancelledAt || b.createdAt).slice(0, 10),
      });
    }
    if (b.deposit === "released") {
      refundRows.push({
        label: "Security deposit refund",
        amount: b.quote.deposit,
        date: (b.lenderReturnConfirmedAt || b.actualReturnTimestamp || b.cancelledAt || b.createdAt).slice(0, 10),
      });
    }
    if (delivery.status === "refunded_demo") {
      refundRows.push({
        label: "GrabExpress delivery refund (Demo)",
        amount: delivery.fee ?? 0,
        date: (b.deliveryDemo?.refundedAt || b.cancelledAt || b.createdAt).slice(0, 10),
      });
    }
    const refundsTotal = Math.round(refundRows.reduce((sum, r) => sum + r.amount, 0) * 100) / 100;
    const recordedPaid = (b.payment === "paid" || b.payment === "refunded" ? b.quote.total : 0) +
      (delivery.status === "paid_demo" || delivery.status === "refunded_demo" ? b.deliveryDemo?.fee || 0 : 0);
    const netCost = Math.round((recordedPaid - refundsTotal) * 100) / 100;

    return { booking: b, listing, delivery, deliveryPaid, totals, grandTotal, refundRows, refundsTotal, netCost, statusChip: statusChipFor(b) };
  }

  // Helper to render the "Payment & Transaction History" view: one expandable card per
  // rental, grouped the same way as the listing page's Booking Summary (Paid to CurRENT /
  // Delivery · GrabExpress (Demo) / Refunds and releases), newest first.
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

    const cards = [...userBookings]
      .sort((a, b) => Number(b.id === bookingId) - Number(a.id === bookingId) || b.createdAt.localeCompare(a.createdAt))
      .map(buildLedgerCard);

    const totalPaid = Math.round(cards.reduce((sum, c) => sum +
      (c.booking.payment === "paid" || c.booking.payment === "refunded" ? c.booking.quote.total : 0) +
      (c.booking.deliveryDemo?.status === "paid_demo" || c.booking.deliveryDemo?.status === "refunded_demo" ? c.booking.deliveryDemo.fee : 0), 0) * 100) / 100;
    const totalRefunded = Math.round(cards.reduce((sum, c) => sum + c.refundsTotal, 0) * 100) / 100;
    const depositsInEscrow = Math.round(
      cards.reduce((sum, c) => sum + (c.booking.deposit === "held" || c.booking.deposit === "release_pending" ? c.booking.quote.deposit : 0), 0) * 100,
    ) / 100;

    const filters = ["All", "Paid", "Deposit held", "Release pending", "Refunded", "Delivery"];
    const filtered = cards.filter((c) => {
      if (historySearch.trim() && !c.booking.title.toLowerCase().includes(historySearch.trim().toLowerCase())) return false;
      switch (historyFilter) {
        case "Paid": return c.booking.payment === "paid";
        case "Deposit held": return c.booking.deposit === "held";
        case "Release pending": return c.booking.deposit === "release_pending";
        case "Refunded": return c.refundsTotal > 0;
        case "Delivery": return c.delivery.status !== "self_pickup";
        default: return true;
      }
    });

    return (
      <View style={{ gap: 12, marginTop: 12 }}>
        <View style={styles.historyNoticeBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.navy} />
          <Text style={styles.historyNoticeText}>
            Simulated classroom ledger. Transparently tracks rental fees, 5% platform service fees, refundable security deposits and separate GrabExpress delivery fees.
          </Text>
        </View>

        <View style={styles.summaryTilesRow}>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryTileLabel}>Total paid</Text>
            <Text style={styles.summaryTileValue}>{money(totalPaid)}</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryTileLabel}>Refunded</Text>
            <Text style={styles.summaryTileValue}>{money(totalRefunded)}</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryTileLabel}>Deposits held in escrow</Text>
            <Text style={styles.summaryTileValue}>{money(depositsInEscrow)}</Text>
          </View>
        </View>

        <Chips options={filters} selected={historyFilter} onSelect={setHistoryFilter} />

        <TextInput
          accessibilityLabel="Search transaction history by item name"
          placeholder="Search by item name"
          placeholderTextColor={colors.muted}
          value={historySearch}
          onChangeText={setHistorySearch}
          style={styles.historySearchInput}
        />

        {filtered.length === 0 ? (
          <Empty title="No matching transactions" text="Try a different filter or search term." />
        ) : filtered.map((card) => {
          const b = card.booking;
          const expanded = expandedLedgerCards.has(b.id);
          const showBreakdown = expandedDeliveryBreakdown.has(b.id);
          const paymentStatusLabel = b.payment === "paid" ? "Paid" : b.payment === "refunded" ? "Refunded" : b.payment === "processing" ? "Processing" : b.payment === "failed" ? "Failed" : "Payment required";
          return (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${expanded ? "Collapse" : "Expand"} transaction details for ${b.title}`}
              onPress={() => setExpandedLedgerCards((prev) => {
                const next = new Set(prev);
                if (next.has(b.id)) next.delete(b.id); else next.add(b.id);
                return next;
              })}
              style={styles.ledgerCard}
            >
              {/* Collapsed summary */}
              <View style={s.row}>
                <Image source={{ uri: card.listing?.imageUrl || b.image }} style={styles.ledgerThumb} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={s.row}>
                    <Text style={styles.txType}>{b.title}</Text>
                    <Badge text={card.statusChip.text} tone={card.statusChip.tone} />
                  </View>
                  <Text style={styles.txDate}>Booked {formatShortDate(b.createdAt)} · via {b.paymentMethod || "FPX"}</Text>
                  <View style={s.row}>
                    <Text style={styles.txItemTitle}>{card.deliveryPaid ? "Original total for this rental" : "CurRENT subtotal · delivery estimated separately"}</Text>
                    <Text style={styles.txAmount}>{money(card.grandTotal)}</Text>
                  </View>
                  <View style={s.row}>
                    <Text style={styles.txItemTitle}>Deposit {depositStatusLabel(b.deposit).toLowerCase()}</Text>
                    <Text style={styles.txItemTitle}>{money(b.quote.deposit)}</Text>
                  </View>
                </View>
                <MorphIcon name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} toggleKey={expanded} />
              </View>

              {expanded && (
                <View style={{ gap: 6, marginTop: 10 }}>
                  <BookingSummary booking={b} listing={card.listing} />
                  <Pressable accessibilityRole="button" onPress={() => setExpandedLedgerDetails((previous) => {
                    const next = new Set(previous);
                    if (next.has(b.id)) next.delete(b.id); else next.add(b.id);
                    return next;
                  })}>
                    <Text style={{ color: colors.blue, fontWeight: "700" }}>
                      {expandedLedgerDetails.has(b.id) ? "Hide transaction ledger" : "View transaction ledger"}
                    </Text>
                  </Pressable>
                  {expandedLedgerDetails.has(b.id) && <View style={{ gap: 6 }}>
                  <View style={styles.modalDivider} />
                  <Text style={styles.modalSectionTitle}>Paid to CurRENT</Text>
                  <Row label={`Rental fee · ${b.quote.days ?? ""} days`} value={money(b.quote.rentalFee)} />
                  <Text style={styles.ledgerLineStatus}>{paymentStatusLabel}</Text>
                  <Row label="CurRENT service fee (5%, min RM5)" value={money(b.quote.serviceFee)} />
                  <Text style={styles.ledgerLineStatus}>{paymentStatusLabel}</Text>
                  {b.insurance?.selected && (
                    <>
                      <Row label="Rental Protection (Optional, Demo)" value={money(b.insurance.premium)} />
                      <Text style={styles.ledgerLineStatus}>{paymentStatusLabel}</Text>
                    </>
                  )}
                  <Row label="Refundable security deposit" value={money(b.quote.deposit)} />
                  <Text style={styles.ledgerLineStatus}>{depositStatusLabel(b.deposit)}</Text>
                  <View style={s.row}><Text style={s.bold}>Subtotal</Text><Text style={[styles.txAmount, { fontSize: 14 }]}>{money(card.totals.subtotal)}</Text></View>

                  <View style={styles.modalDivider} />
                  <View style={styles.deliverySectionHeader}>
                    <Ionicons name="bicycle-outline" size={16} color={colors.navy} />
                    <Text style={styles.modalSectionTitle}>Delivery · GrabExpress (Demo)</Text>
                  </View>
                  {card.delivery.status === "self_pickup" ? (
                    <Badge text="Self-Pickup — No Delivery Fee" />
                  ) : card.delivery.fee != null ? (
                    <>
                      <Row label="Calculated Delivery Fee (two-way)" value={money(b.deliveryDemo ? card.delivery.fee : card.delivery.estimatedTwoWayFee ?? card.delivery.fee)} />
                      <Row label="Automatically Selected Vehicle" value={card.delivery.vehicle || "Unavailable"} />
                      <Row label="Payment Status" value={card.delivery.status === "paid_demo" ? "Paid (Demo)" : card.delivery.status === "refunded_demo" ? "Refunded (Demo)" : "Awaiting Payment"} />
                      <Pressable accessibilityRole="button" onPress={() => setExpandedDeliveryBreakdown((prev) => {
                        const next = new Set(prev);
                        if (next.has(b.id)) next.delete(b.id); else next.add(b.id);
                        return next;
                      })}>
                        <Text style={{ color: colors.blue, fontWeight: "700", marginTop: 2 }}>
                          {showBreakdown ? "Hide Delivery Details" : "View Delivery Details"}
                        </Text>
                      </Pressable>
                      {showBreakdown && (
                        <View style={styles.feeBreakdownBox}>
                          <Row label="Pickup Location" value={card.delivery.origin || "Not recorded"} />
                          <Row label="Delivery Address" value={card.delivery.destination || "Not recorded"} />
                          <Row label="Estimated Distance" value={card.delivery.distanceKm != null ? `${card.delivery.distanceKm} km each way` : "Unavailable"} />
                          <Row label="Vehicle type" value={card.delivery.vehicle || "Unavailable"} />
                          {(card.delivery.outboundFee ?? card.delivery.estimatedOutboundFee) != null && <View style={s.row}><Text style={s.caption}>Outbound delivery fee{b.deliveryDemo?.status === "required" || card.delivery.outboundFee == null ? " (estimate)" : ""}</Text><Text style={s.caption}>{money((card.delivery.outboundFee ?? card.delivery.estimatedOutboundFee)!)}</Text></View>}
                          {(card.delivery.returnFee ?? card.delivery.estimatedReturnFee) != null && <View style={s.row}><Text style={s.caption}>Return delivery fee{b.deliveryDemo?.status === "required" || card.delivery.returnFee == null ? " (estimate)" : ""}</Text><Text style={s.caption}>{money((card.delivery.returnFee ?? card.delivery.estimatedReturnFee)!)}</Text></View>}
                          {card.deliveryPaid && b.deliveryDemo
                            ? <View style={s.row}><Text style={s.bold}>Total two-way delivery fee</Text><Text style={s.bold}>{money(b.deliveryDemo.fee)}</Text></View>
                            : card.delivery.estimatedTwoWayFee != null && <View style={s.row}><Text style={s.bold}>Estimated two-way delivery fee</Text><Text style={s.bold}>{money(card.delivery.estimatedTwoWayFee)}</Text></View>}
                          <View style={s.row}><Text style={s.caption}>Delivery amount paid</Text><Text style={s.caption}>{money(card.deliveryPaid ? b.deliveryDemo?.fee || 0 : 0)}</Text></View>
                          <Row label="Payment status" value={card.delivery.status === "paid_demo" ? "Paid (Demo)" : card.delivery.status === "refunded_demo" ? "Refunded (Demo)" : "Awaiting Payment"} />
                        </View>
                      )}
                      {(card.delivery.status === "paid_demo" || card.delivery.status === "refunded_demo") && card.delivery.receiptReference && (
                        <Button secondary onPress={() => router.push({ pathname: "/delivery-receipt/[id]", params: { id: card.delivery.receiptReference! } })}>
                          View Delivery Receipt
                        </Button>
                      )}
                      {card.delivery.status === "required" && b.status === "payment_required" && (
                        <Button onPress={() => router.push(`/delivery-demo/${b.id}` as never)}>
                          Pay delivery fee · {money(card.delivery.fee)}
                        </Button>
                      )}
                    </>
                  ) : (
                    <Text style={s.caption}>{b.deliveryDemo ? "Delivery fee not paid yet" : "No delivery record"}</Text>
                  )}

                  {card.refundRows.length > 0 && (
                    <>
                      <View style={styles.modalDivider} />
                      <Text style={styles.modalSectionTitle}>Refunds and releases</Text>
                      {card.refundRows.map((r) => (
                        <View key={r.label} style={s.row}>
                          <Text style={s.caption}>{r.label}</Text>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={[styles.txAmount, { color: colors.green }]}>+ {money(r.amount)}</Text>
                            <Text style={styles.ledgerLineStatus}>Completed · {formatShortDate(r.date)}</Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}

                  <View style={styles.modalDivider} />
                  <View style={s.row}><Text style={s.bold}>Amount paid (recorded)</Text><Text style={[styles.txAmount, { fontSize: 16 }]}>{money(card.netCost + card.refundsTotal)}</Text></View>
                  {card.refundsTotal > 0 && (
                    <View style={s.row}><Text style={[s.caption, { color: colors.green }]}>Refunded so far</Text><Text style={[styles.txAmount, { color: colors.green }]}>+ {money(card.refundsTotal)}</Text></View>
                  )}
                  <View style={s.row}><Text style={s.bold}>Net cost</Text><Text style={[styles.txAmount, { fontSize: 16 }]}>{money(card.netCost)}</Text></View>
                  <Text style={s.caption}>Includes {money(b.quote.deposit)} refundable deposit ({depositStatusLabel(b.deposit).toLowerCase()})</Text>
                  </View>}
                </View>
              )}
            </Pressable>
          );
        })}
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
      subtitle="From your first request to your next adventure."
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
  mobileHeaderBanner: { padding: 10, borderRadius: 16, marginBottom: 12 },
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
  ledgerCard: {
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
  ledgerThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.lightGrey,
    marginRight: 10,
  },
  ledgerLineStatus: {
    fontSize: 11,
    color: colors.muted,
    marginTop: -2,
    marginBottom: 2,
  },
  summaryTilesRow: {
    flexDirection: "row",
    gap: 8,
  },
  summaryTile: {
    flex: 1,
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  summaryTileLabel: {
    fontSize: 11,
    color: colors.slate,
    fontWeight: "700",
  },
  summaryTileValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.navy,
  },
  historySearchInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
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
