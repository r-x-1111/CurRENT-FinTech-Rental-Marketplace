import { useState } from "react";
import {
  Image,
  Pressable,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Badge,
  Button,
  Card,
  Chips,
  Empty,
  Field,
  Notice,
  Row,
  Screen,
  Section,
  s,
} from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import {
  availability,
  availabilityCalendar,
  dateAfter,
  money,
  quoteFor,
  riskFor,
} from "../../services/booking";
import { colors } from "../../constants/theme";
import type { CollectionMethod } from "../../types";
import { newId } from "../../services/marketplace";
export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, user, act } = useMarketplace();
  const listing = state.listings.find((l) => l.id === id);
  const [start, setStart] = useState(dateAfter(1));
  const [end, setEnd] = useState(dateAfter(3));
  const [protection, setProtection] = useState(false);
  const [collectionMethod, setCollectionMethod] =
    useState<CollectionMethod>("Meet Owner");
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState("");
  const { width } = useWindowDimensions();
  if (
    !listing ||
    (listing.status !== "published" && listing.ownerId !== user?.id)
  )
    return (
      <Screen back>
        <Empty
          title="Item unavailable"
          text="This listing may have been removed or paused."
        />
      </Screen>
    );
  const owner = state.profiles.find((p) => p.id === listing.ownerId);
  const reviews = state.reviews.filter(
    (r) => r.recipientId === listing.ownerId,
  );
  const calendar = availabilityCalendar(state, listing);
  const methods = listing.collectionMethods || ["Meet Owner"];
  const selectedMethod = methods.includes(collectionMethod)
    ? collectionMethod
    : methods[0];
  const renterRisk = user ? riskFor(state, user) : null;
  let quote;
  let dateError = "";
  try {
    quote = quoteFor(
      state,
      user || {
        id: "",
        name: "",
        email: "",
        verification: "not_verified",
        favourites: [],
      },
      listing,
      start,
      end,
      protection,
    );
    availability(state, listing, start, end);
  } catch (e) {
    dateError = (e as Error).message;
  }
  function request() {
    if (!user) {
      router.push("/auth");
      return;
    }
    try {
      const bookingId = newId();
      act({
        type: "request",
        id: bookingId,
        listingId: id,
        start,
        end,
        protection,
        collectionMethod: selectedMethod,
      });
      router.push(`/rental/${bookingId}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Screen back>
      <View style={[s.split, width < 800 && { flexDirection: "column" }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Image
            source={{ uri: photo || listing.imageUrl }}
            style={{
              width: "100%",
              height: width < 650 ? 270 : 380,
              borderRadius: 20,
            }}
          />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            {(listing.images || [listing.imageUrl]).map((uri) => (
              <Pressable
                key={uri}
                accessibilityRole="button"
                accessibilityLabel="View item photo"
                onPress={() => setPhoto(uri)}
              >
                <Image
                  source={{ uri }}
                  style={{ width: 65, height: 60, borderRadius: 10 }}
                />
              </Pressable>
            ))}
          </View>
          <Section title={listing.title} />
          <Text style={s.caption}>
            {listing.location} · {listing.category} · ★{" "}
            {listing.rating || "New"}
          </Text>
          <Text style={[s.body, { marginVertical: 20 }]}>
            {listing.description}
          </Text>
          <Card>
            <Text style={s.h2}>Meet {owner?.name || "the owner"}</Text>
            <Badge
              text={
                owner?.verification === "verified"
                  ? "Verified owner · demo"
                  : "Not verified"
              }
              green={owner?.verification === "verified"}
            />
            <Text style={s.caption}>
              {
                state.bookings.filter(
                  (b) => b.ownerId === owner?.id && b.status === "completed",
                ).length
              }{" "}
              completed rentals · {reviews.length} community reviews
            </Text>
          </Card>
          <Button
            secondary
            onPress={() =>
              user
                ? act({ type: "favourite", listingId: id })
                : router.push("/auth")
            }
          >
            {user?.favourites.includes(id)
              ? "♥ Saved to favourites"
              : "♡ Save for later"}
          </Button>
          <Section title="Owner reviews" />
          {reviews.length ? (
            reviews.map((r) => (
              <Card key={r.id}>
                <Text style={s.bold}>
                  {"★".repeat(r.rating)} ·{" "}
                  {state.profiles.find((p) => p.id === r.authorId)?.name}
                </Text>
                <Text style={s.body}>
                  {r.text || "A great rental experience."}
                </Text>
              </Card>
            ))
          ) : (
            <Text style={s.caption}>
              No completed-rental reviews yet. Seed listing ratings are sample
              data.
            </Text>
          )}
        </View>
        <View style={{ width: width >= 800 ? 350 : "100%" }}>
          <Card>
            <Text style={s.title}>
              {money(listing.dailyPrice)}
              <Text style={s.caption}> / day</Text>
            </Text>
            <Text style={s.caption}>
              Available {listing.availableFrom || "from today"}
              {listing.availableTo
                ? ` until ${listing.availableTo}`
                : " onwards"}
            </Text>
            <Text style={s.label}>Next 21 days</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
              {calendar.map((day) => (
                <Pressable
                  key={day.date}
                  accessibilityRole="button"
                  accessibilityLabel={`${day.date}, ${day.status}`}
                  accessibilityState={{ disabled: day.status !== "available" }}
                  disabled={day.status !== "available"}
                  onPress={() => {
                    setStart(day.date);
                    setEnd(
                      new Date(Date.parse(`${day.date}T00:00:00Z`) + 86400000)
                        .toISOString()
                        .slice(0, 10),
                    );
                    setError("");
                  }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 9,
                    backgroundColor:
                      day.status === "available"
                        ? start === day.date
                          ? colors.blue
                          : colors.paleBlue
                        : colors.lightGrey,
                    opacity: day.status === "available" ? 1 : 0.6,
                  }}
                >
                  <Text
                    style={{
                      color: start === day.date ? "white" : colors.navy,
                      fontSize: 12,
                    }}
                  >
                    {day.date.slice(5)}{" "}
                    {day.status === "reserved"
                      ? "Booked"
                      : day.status === "unavailable"
                        ? "Closed"
                        : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.caption}>
              Tap an available day for a one-day rental, then adjust the return
              date. Booked and closed days cannot be selected.
            </Text>
            <Text style={s.label}>Collection method</Text>
            <Chips
              options={methods}
              selected={selectedMethod}
              onSelect={(value) =>
                setCollectionMethod(value as CollectionMethod)
              }
            />
            {selectedMethod === "Delivery Available" && (
              <Text style={s.caption}>
                Delivery is a demo option supported by an external logistics
                provider in a live service. No delivery fee is included here;
                confirm arrangements with the owner.
              </Text>
            )}
            <Field
              label="Collection date (YYYY-MM-DD)"
              value={start}
              onChangeText={setStart}
            />
            <Field
              label="Return date (YYYY-MM-DD)"
              value={end}
              onChangeText={setEnd}
            />
            <Text style={s.caption}>
              Return day is not charged. Minimum 1 day.
            </Text>
            {listing.estimatedValue <= 60000 && (
              <View style={s.row}>
                <Text style={[s.body, { flex: 1 }]}>
                  Demo item protection · RM5/day
                </Text>
                <Switch
                  accessibilityLabel="Include demo item protection"
                  value={protection}
                  onValueChange={setProtection}
                />
              </View>
            )}
            {quote && (
              <>
                <Row
                  label={`Rental fee · ${quote.days} days`}
                  value={money(quote.rentalFee)}
                />
                <Row
                  label="Service fee · 5%, min RM5"
                  value={money(quote.serviceFee)}
                />
                <Row label="Refundable deposit" value={money(quote.deposit)} />
                <Text style={s.caption}>
                  {renterRisk
                    ? `Your ${renterRisk.level} risk tier sets a ${renterRisk.level === "low" ? "10" : renterRisk.level === "standard" ? "20" : "30"}% deposit on the item value. This amount is refundable after an accepted return.`
                    : "Sign in to see your risk-based refundable deposit."}
                </Text>
                <Row label="Item protection" value={money(quote.protection)} />
                <View style={s.divider} />
                <Row
                  label="Total after approval"
                  value={money(quote.total)}
                  strong
                />
              </>
            )}
            {!!(error || dateError) && (
              <Notice text={error || dateError} error />
            )}
            <Button
              disabled={!!dateError || listing.ownerId === user?.id}
              onPress={request}
            >
              {listing.ownerId === user?.id
                ? "This is your listing"
                : "Request to rent"}
            </Button>
            <Text style={[s.caption, { textAlign: "center", fontSize: 12 }]}>
              No payment until the owner approves.
            </Text>
          </Card>
          <Notice text="Academic demo: deposits use an explainable risk score. Protection is simulated; real coverage, potentially up to RM60,000, depends on an external partner’s eligibility and terms." />
        </View>
      </View>
    </Screen>
  );
}
