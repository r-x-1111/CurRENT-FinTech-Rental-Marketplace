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
export default function OwnerDashboard() {
  const { state, user, act } = useMarketplace();
  const [tab, setTab] = useState("Requests");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState("");
  if (!user)
    return (
      <Screen back title="Owner Mode">
        <Empty
          title="Put your spare gear to work"
          text="Sign in to list your items and manage rentals."
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
      title="Your things. New possibilities."
      subtitle={`Owner Mode · ${user.name}`}
    >
      <View style={s.split}>
        {[
          ["Demo earnings", money(earnings)],
          [
            "Live listings",
            `${listings.filter((l) => l.status === "published").length}`,
          ],
          [
            "New requests",
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
        + Create a listing
      </Button>
      <Button secondary onPress={() => router.push("/(tabs)/messages")}>
        Rental messages
      </Button>
      <Section title="Your owner workspace" />
      <Chips
        options={["Requests", "Listings", "Rentals", "Payouts", "Reviews"]}
        selected={tab}
        onSelect={setTab}
      />
      {!!error && <Notice text={error} error />}
      {["Requests", "Rentals"].includes(tab) &&
        (filtered.length ? (
          filtered.map((b) => <BookingCard key={b.id} booking={b} />)
        ) : (
          <Empty
            title={
              tab === "Requests"
                ? "You’re all caught up"
                : "A little quiet for now"
            }
            text="Rental requests and their next steps will appear here."
          />
        ))}
      {tab === "Listings" &&
        (listings.length ? (
          listings.map((l) => (
            <Card key={l.id}>
              <View style={{ flexDirection: "row", gap: 14 }}>
                <Image
                  source={{ uri: l.imageUrl }}
                  style={{ width: 80, height: 80, borderRadius: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.h2}>{l.title}</Text>
                  <Text style={s.caption}>{money(l.dailyPrice)} / day</Text>
                  <Badge text={l.status} />
                </View>
              </View>
              <Button
                secondary
                onPress={() =>
                  router.push({ pathname: "/owner/edit", params: { id: l.id } })
                }
              >
                Edit listing & photos
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
                {l.status === "published" ? "Pause listing" : "Publish listing"}
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
                    Confirm deletion
                  </Button>
                  <Button secondary onPress={() => setDeleting("")}>
                    Keep listing
                  </Button>
                </>
              ) : (
                <Button danger onPress={() => setDeleting(l.id)}>
                  Delete listing
                </Button>
              )}
            </Card>
          ))
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
          <Notice text="Demo payouts are recorded after return inspection and deposit release. Commission is 12% of the rental fee. No funds are transferred." />
          {complete.length ? (
            complete.map((b) => (
              <Card key={b.id}>
                <Text style={s.h2}>{b.title}</Text>
                <Row label="Gross rental" value={money(b.quote.rentalFee)} />
                <Row
                  label="Commission · 12%"
                  value={money(
                    calculateOwnerPayout(b.quote.rentalFee).commission,
                  )}
                />
                <Row
                  label="Demo payout"
                  value={money(calculateOwnerPayout(b.quote.rentalFee).payout)}
                  strong
                />
                <Badge text="Recorded · simulation" green />
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
