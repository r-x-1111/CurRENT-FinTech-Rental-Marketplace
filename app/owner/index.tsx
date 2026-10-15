import { useEffect, useRef, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Badge,
  Button,
  Card,
  Chips,
  Empty,
  Notice,
  Row,
  Screen,
  Section,
  s,
} from "../../components/ui";
import { BookingCard } from "../../components/BookingCard";
import { useMarketplace } from "../../context/Marketplace";
import { calculateOwnerPayout } from "../../services/deposit";
import { formatMalaysiaDateTime, getEffectiveBookingStatus, money } from "../../services/booking";
import { newId } from "../../services/marketplace";
import { colors } from "../../constants/theme";

export default function OwnerDashboard() {
  const { state, user, act, actAndPersist } = useMarketplace();
  const { published } = useLocalSearchParams<{ published?: string }>();
  const [tab, setTab] = useState("Listings");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState("");
  const [pendingBoost, setPendingBoost] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [scrollToY, setScrollToY] = useState<number | null>(null);
  const [scrollRequestId, setScrollRequestId] = useState(0);
  const contentY = useRef(0);

  function openSummarySection(section: "Listings" | "Rentals" | "Payout") {
    setTab(section);
    setScrollToY(Math.max(0, contentY.current - 20));
    setScrollRequestId((request) => request + 1);
  }

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (published === "1") setSuccess("Listing published successfully.");
  }, [published]);

  if (!user) {
    return <Redirect href="/auth" />;
  }

  if (user.verification !== "verified" || typeof user.riskScore !== "number") {
    return (
      <Screen
        back
        title="Lender Mode"
        subtitle="Listing management is locked for this account."
      >
        <Card>
          <Text style={s.h2}>
            Complete Identity Verification to manage listings.
          </Text>
          <Notice text="Complete Identity Verification to create or publish a listing." />
          <Button onPress={() => router.push("/(tabs)/profile")}>
            Complete Identity Verification
          </Button>
        </Card>
      </Screen>
    );
  }

  const listings = state.listings.filter((l) => l.ownerId === user.id);
  const transactions = (state.boostTransactions || []).filter((record) => record.ownerId === user.id);
  const receipt = transactions.find((record) => record.id === receiptId);
  const boostListing = listings.find((listing) => listing.id === pendingBoost);
  const bookings = state.bookings.filter((b) => b.ownerId === user.id);
  const complete = bookings.filter((b) => b.status === "completed");
  const earnings = complete.reduce(
    (n, b) => n + calculateOwnerPayout(b.quote.rentalFee).payout,
    0,
  );
  const activeRentalsCount = bookings.filter((b) =>
    ["active", "upcoming", "return_pending"].includes(
      getEffectiveBookingStatus(b, now),
    ),
  ).length;

  return (
    <Screen
      back
      title="Listing"
      subtitle={`Owner Mode · Welcome back, ${user.name}`}
      scrollToY={scrollToY}
      scrollRequestId={scrollRequestId}
    >
      <View style={s.split}>
        {[
          ["Net Earnings (88%)", money(earnings), "Payout"],
          [
            "Live Listings",
            `${listings.filter((l) => l.status === "published").length}`,
            "Listings",
          ],
          [
            "Active / Upcoming Rentals",
            `${activeRentalsCount}`,
            "Rentals",
          ],
        ].map(([label, value, section]) => (
          <Pressable
            key={label as string}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value}. Open ${section}`}
            onPress={() => openSummarySection(section as "Listings" | "Rentals" | "Payout")}
            onHoverIn={() => setHoveredCard(label as string)}
            onHoverOut={() => setHoveredCard(null)}
            style={({ pressed }) => [styles.kpiCard, styles.kpiCardClickable,
              hoveredCard === label && styles.kpiCardHovered, pressed && styles.kpiCardPressed]}
          >
            <Text style={styles.kpiLabel}>{label as string}</Text>
            <Text style={[styles.kpiValue, { color: colors.blue }]}>{value as string}</Text>
            <Text style={styles.kpiSub}>Tap to view →</Text>
          </Pressable>
        ))}
      </View>

      <Button onPress={() => router.push("/owner/edit")}>
        + Create a New Listing
      </Button>
      <Button secondary onPress={() => router.push("/(tabs)/profile")}>
        ← Return to Renter Dashboard
      </Button>

      <Section title="Listing" />
      <Chips
        options={["Listings", "Rentals", "Payout", "Transaction"]}
        selected={tab}
        onSelect={setTab}
      />

      {!!error && <Notice text={error} error />}
      {!!success && <Notice text={success} />}

      <View onLayout={(event) => { contentY.current = event.nativeEvent.layout.y; }} />

      {tab === "Rentals" &&
        (bookings.length ? (
          bookings.map((b) => <BookingCard key={b.id} booking={b} isLender />)
        ) : (
          <Empty
            title="No rentals yet"
            text="Confirmed bookings and their delivery and return updates will appear here."
          />
        ))}

      {tab === "Listings" &&
        (listings.length ? (
          listings.map((l) => {
            const isBoosted =
              l.featuredUntil &&
              new Date(l.featuredUntil).getTime() > Date.now();

            return (
              <Card key={l.id}>
                {/* Header: Thumbnail, Title, Price, Status */}
                <View style={{ flexDirection: "row", gap: 14 }}>
                  <Image
                    source={{ uri: l.imageUrl }}
                    style={{ width: 80, height: 80, borderRadius: 12 }}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.h2} numberOfLines={1}>{l.title}</Text>
                    <Text style={s.caption}>{money(l.dailyPrice)} / day</Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                      <Badge text={l.status} />
                      {isBoosted && (
                        <Badge text="★ Featured" green />
                      )}
                    </View>
                  </View>
                </View>

                {/* Listing Stats Row: Views, Saves, Completed */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="eye-outline" size={13} color={colors.muted} />
                    <Text style={styles.statText}>
                      Views: {l.demoViewCount ?? "—"}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="heart-outline" size={13} color={colors.muted} />
                    <Text style={styles.statText}>
                      Saves: {state.profiles.filter((p) => p.favourites?.includes(l.id)).length}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="bag-check-outline" size={13} color={colors.muted} />
                    <Text style={styles.statText}>
                      Completed: {bookings.filter((b) => b.listingId === l.id && b.status === "completed").length}
                    </Text>
                  </View>
                </View>

                {/* Option-2 Compact Action Bar: Boost, Edit, Pause/Resume, Delete */}
                <View style={styles.actionBar}>
                  {/* Action 1: Boost (RM10 · 7 days) */}
                  <Pressable
                    accessibilityRole="button"
                    disabled={Boolean(isBoosted)}
                    onPress={() => { setPendingBoost(l.id); setReceiptId(null); setError(""); }}
                    style={[styles.actionBtn, isBoosted && styles.actionBtnActive]}
                  >
                    <Ionicons
                      name="rocket-outline"
                      size={14}
                      color={isBoosted ? colors.blue : colors.navy}
                    />
                    <Text
                      style={[styles.actionBtnText, isBoosted && { color: colors.blue, fontWeight: "700" }]}
                      numberOfLines={1}
                    >
                      {isBoosted ? "Boosted" : "Boost (RM10)"}
                    </Text>
                  </Pressable>

                  {/* Action 2: Edit */}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({ pathname: "/owner/edit", params: { id: l.id } })
                    }
                    style={styles.actionBtn}
                  >
                    <Ionicons name="create-outline" size={14} color={colors.navy} />
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </Pressable>

                  {/* Action 3: Pause / Resume */}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      try {
                        act({
                          type: "saveListing",
                          listing: {
                            ...l,
                            images: l.images || [l.imageUrl],
                            status:
                              l.status === "published" ? "paused" : "published",
                          },
                        });
                        setError("");
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                    style={styles.actionBtn}
                  >
                    <Ionicons
                      name={l.status === "published" ? "pause-circle-outline" : "play-circle-outline"}
                      size={14}
                      color={colors.navy}
                    />
                    <Text style={styles.actionBtnText}>
                      {l.status === "published" ? "Pause" : "Resume"}
                    </Text>
                  </Pressable>

                  {/* Action 4: Delete */}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setDeleting(l.id)}
                    style={[styles.actionBtn, styles.deleteActionBtn]}
                  >
                    <Ionicons name="trash-outline" size={14} color="#DC2626" />
                    <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>
                      Delete
                    </Text>
                  </Pressable>
                </View>

                {/* Confirm Delete prompt */}
                {deleting === l.id && (
                  <View style={styles.deleteConfirmBox}>
                    <Notice text="Delete this listing? Existing rental records will remain in your history." />
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                      <Button
                        danger
                        onPress={() => {
                          try {
                            act({ type: "deleteListing", id: l.id });
                            setDeleting("");
                            setError("");
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        Confirm Delete
                      </Button>
                      <Button secondary onPress={() => setDeleting("")}>
                        Cancel
                      </Button>
                    </View>
                  </View>
                )}
              </Card>
            );
          })
        ) : (
          <Empty
            title="Your first listing awaits"
            text="Start with a photo, a fair daily price and the dates your item is available."
            action="Create a listing"
            onPress={() => router.push("/owner/edit")}
          />
        ))}

      {tab === "Payout" && (
        <>
          <Notice text="Demo payouts are recorded after return inspection and deposit release. Platform commission is 12% of the rental fee. Estimated lender payout is 88%. No real funds are transferred." />
          {complete.length ? (
            complete.map((b) => (
              <Card key={b.id}>
                <Text style={s.h2}>{b.title}</Text>
                <Row label="Gross rental fee" value={money(b.quote.rentalFee)} />
                <Row
                  label="Platform commission · 12%"
                  value={money(
                    calculateOwnerPayout(b.quote.rentalFee).commission,
                  )}
                />
                <Row
                  label="Net payout · 88%"
                  value={money(calculateOwnerPayout(b.quote.rentalFee).payout)}
                  strong
                />
              </Card>
            ))
          ) : (
            <Empty
              title="Your earnings will grow here"
              text="Complete a rental to see the payout breakdown."
            />
          )}
        </>
      )}
      {tab === "Transaction" && (
        <>
          <Notice text="Listing Boost payments are simulated. No real money was charged." />
          {transactions.length ? transactions.map((record) => (
            <Card key={record.id}>
              <Text style={s.h2}>{record.listingName}</Text>
              <Row label="Transaction type" value="Listing Boost" />
              <Row label="Amount paid" value="RM10.00" />
              <Row label="Payment method" value="FPX (Demo)" />
              <Row label="Payment status" value="Successful" />
              <Row label="Payment date/time" value={formatMalaysiaDateTime(record.paidAt)} />
              <Row label="Transaction reference" value={record.id} />
              <Row label="Boost activation" value={formatMalaysiaDateTime(record.activatedAt)} />
              <Row label="Boost expiry" value={formatMalaysiaDateTime(record.expiresAt)} />
              <Button secondary onPress={() => setReceiptId(record.id)}>View Receipt</Button>
            </Card>
          )) : <Empty title="No transactions yet" text="Your Listing Boost payments will appear here." />}
        </>
      )}
      <Modal visible={Boolean(boostListing)} transparent animationType="fade" onRequestClose={() => { if (!paying) setPendingBoost(null); }}>
        <View style={styles.paymentOverlay}><View style={styles.paymentPanel}>{boostListing && <Card>
          <Text style={s.h2}>Payment Confirmation</Text>
          <Row label="Listing name" value={boostListing.title} />
          <Row label="Product" value="Listing Boost — 7 Days" />
          <Row label="Boost fee" value="RM10.00" />
          <Row label="Payment method" value="FPX" />
          <Notice text="Simulated payment. No real money will be charged." />
          {!!error && <Notice text={error} error />}
          <Button disabled={paying} onPress={async () => {
            if (paying) return;
            setPaying(true);
            const id = `BOOST-${newId()}`;
            try {
              await actAndPersist({ type: "boostListing", listingId: boostListing.id, transactionId: id });
              setPendingBoost(null);
              setReceiptId(id);
              setTab("Transaction");
            } catch (e) { setError((e as Error).message); }
            finally { setPaying(false); }
          }}>Pay</Button>
          <Button secondary disabled={paying} onPress={() => setPendingBoost(null)}>Cancel</Button>
        </Card>}</View></View>
      </Modal>
      <Modal visible={Boolean(receipt)} transparent animationType="fade" onRequestClose={() => setReceiptId(null)}>
        <View style={styles.paymentOverlay}><View style={styles.paymentPanel}>{receipt && <Card>
          <Text style={s.h2}>Payment Successful</Text>
          <Row label="Listing name" value={receipt.listingName} />
          <Row label="Listing Boost" value="RM10.00" />
          <Row label="Payment method" value="FPX (Demo)" />
          <Row label="Total paid" value="RM10.00" />
          <Row label="Payment date/time" value={formatMalaysiaDateTime(receipt.paidAt)} />
          <Row label="Transaction reference" value={receipt.id} />
          <Row label="Boost expiry date" value={formatMalaysiaDateTime(receipt.expiresAt)} />
          <Notice text="No real money was charged." />
          <Button secondary onPress={() => setReceiptId(null)}>Close Receipt</Button>
        </Card>}</View></View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  paymentOverlay: { flex: 1, justifyContent: "center", padding: 18, backgroundColor: "#0008" },
  paymentPanel: { maxWidth: 520, width: "100%", alignSelf: "center" },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },
  kpiCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    marginBottom: 16,
  },
  kpiCardClickable: {
    borderColor: colors.blue,
    cursor: "pointer",
  },
  kpiCardHovered: { backgroundColor: colors.softBlue },
  kpiCardPressed: { opacity: 0.85 },
  kpiLabel: {
    fontSize: 13,
    color: colors.slate,
    fontWeight: "600",
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.5,
  },
  kpiSub: {
    fontSize: 11,
    color: colors.linkBlue,
    fontWeight: "700",
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  actionBtn: {
    flex: 1,
    minWidth: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnActive: {
    backgroundColor: colors.paleBlue,
    borderColor: colors.blue,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.navy,
  },
  deleteActionBtn: {
    backgroundColor: "#FFF0ED",
    borderColor: "#FFCCC2",
  },
  deleteConfirmBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#FFF0ED",
    borderRadius: 8,
  },
});
