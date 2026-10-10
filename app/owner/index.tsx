import { useState } from "react";
import { Image, Text, View } from "react-native";
import { router } from "expo-router";
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
import { money } from "../../services/booking";
import { colors } from "../../constants/theme";

export default function OwnerDashboard() {
  const { state, user, act } = useMarketplace();
  const [tab, setTab] = useState("Listings");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState("");

  if (!user)
    return (
      <Screen back title="Lender Workspace">
        <Empty
          title="Put your spare gear to work"
          text="Sign in to list your items, track earnings, and manage rentals."
          action="Sign in"
          onPress={() => router.push("/auth")}
        />
      </Screen>
    );

  const listings = state.listings.filter((l) => l.ownerId === user.id);
  const bookings = state.bookings.filter((b) => b.ownerId === user.id);
  const complete = bookings.filter((b) => b.status === "completed");
  const earnings = complete.reduce(
    (n, b) => n + calculateOwnerPayout(b.quote.rentalFee).payout,
    0,
  );
  const filtered =
    tab === "Requests"
      ? bookings.filter((b) => b.status === "pending")
      : bookings;

  return (
    <Screen
      back
      title="Lender Dashboard"
      subtitle={`Owner Mode · Welcome back, ${user.name}`}
    >
      <View style={s.split}>
        {[
          ["Net Demo Earnings (88%)", money(earnings)],
          [
            "Live Listings",
            `${listings.filter((l) => l.status === "published").length}`,
          ],
          [
            "Pending Requests",
            `${bookings.filter((b) => b.status === "pending").length}`,
          ],
        ].map(([label, value]) => (
          <View key={label} style={[s.card, { flex: 1, minWidth: 140 }]}>
            <Text style={s.caption}>{label}</Text>
            <Text style={s.title}>{value}</Text>
          </View>
        ))}
      </View>

      <Button onPress={() => router.push("/owner/edit")}>
        + Create a New Listing
      </Button>
      <Button secondary onPress={() => router.push("/(tabs)/profile")}>
        ← Return to Renter Dashboard
      </Button>
      <Button secondary onPress={() => router.push("/(tabs)/messages")}>
        Rental Messages
      </Button>

      <Section title="Lender Workspace" />
      <Chips
        options={["Listings", "Requests", "Rentals", "Payouts", "Reviews"]}
        selected={tab}
        onSelect={setTab}
      />

      {!!error && <Notice text={error} error />}
      {!!success && <Notice text={success} />}

      {["Requests", "Rentals"].includes(tab) &&
        (filtered.length ? (
          filtered.map((b) => <BookingCard key={b.id} booking={b} />)
        ) : (
          <Empty
            title={
              tab === "Requests"
                ? "You’re all caught up"
                : "No active rentals yet"
            }
            text="Rental requests and their next steps will appear here."
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
                <View style={{ flexDirection: "row", gap: 14 }}>
                  <Image
                    source={{ uri: l.imageUrl }}
                    style={{ width: 80, height: 80, borderRadius: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.h2}>{l.title}</Text>
                    <Text style={s.caption}>{money(l.dailyPrice)} / day</Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                      <Badge text={l.status} />
                      {isBoosted && (
                        <Badge text="★ Featured (Demo)" green />
                      )}
                    </View>
                  </View>
                </View>

                {/* 7-Day Featured Boost section */}
                {isBoosted ? (
                  <View
                    style={{
                      backgroundColor: colors.paleBlue,
                      padding: 10,
                      borderRadius: 8,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginVertical: 4,
                    }}
                  >
                    <Text style={[s.bold, { fontSize: 12, color: colors.blue }]}>
                      ★ Featured Boost Active
                    </Text>
                    <Text style={[s.caption, { color: colors.navy }]}>
                      Expires: {new Date(l.featuredUntil!).toLocaleDateString()}
                    </Text>
                  </View>
                ) : (
                  <Button
                    secondary
                    onPress={() => {
                      try {
                        act({ type: "boostListing", listingId: l.id });
                        setError("");
                        setSuccess(`Boost activated! "${l.title}" is now Featured for 7 days.`);
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    ★ Boost Listing (RM10 · 7 Days Featured)
                  </Button>
                )}

                <Button
                  secondary
                  onPress={() =>
                    router.push({ pathname: "/owner/edit", params: { id: l.id } })
                  }
                >
                  Edit Listing & Photos
                </Button>

                <Button
                  secondary
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
                >
                  {l.status === "published" ? "Pause Listing" : "Publish Listing"}
                </Button>

                {deleting === l.id ? (
                  <>
                    <Notice text="Delete this listing? Existing rental records will remain in your history." />
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
                      Confirm Deletion
                    </Button>
                    <Button secondary onPress={() => setDeleting("")}>
                      Keep Listing
                    </Button>
                  </>
                ) : (
                  <Button danger onPress={() => setDeleting(l.id)}>
                    Delete Listing
                  </Button>
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

      {tab === "Payouts" && (
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
                  label="Net demo payout · 88%"
                  value={money(calculateOwnerPayout(b.quote.rentalFee).payout)}
                  strong
                />
                <Badge text="Recorded · classroom simulation" green />
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

      {tab === "Reviews" &&
        (state.reviews.filter((review) => review.recipientId === user.id)
          .length ? (
          state.reviews
            .filter((review) => review.recipientId === user.id)
            .map((review) => (
              <Card key={review.id}>
                <Text style={s.bold}>
                  {"★".repeat(review.rating)} ·{" "}
                  {
                    state.profiles.find(
                      (profile) => profile.id === review.authorId,
                    )?.name
                  }
                </Text>
                <Text style={s.body}>{review.text || "Review submitted."}</Text>
              </Card>
            ))
        ) : (
          <Empty
            title="No owner reviews yet"
            text="Reviews from completed rentals will appear here."
          />
        ))}
    </Screen>
  );
}
