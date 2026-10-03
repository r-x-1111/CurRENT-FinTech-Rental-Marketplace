import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  Screen,
  Field,
  Chips,
  Button,
  Empty,
  Notice,
  s,
} from "../../components/ui";
import { ListingGrid } from "../../components/ListingGrid";
import { useMarketplace } from "../../context/Marketplace";
import { categories } from "../../constants/categories";
import { availability, rentalDays } from "../../services/booking";
export default function ExploreScreen() {
  const params = useLocalSearchParams<{
    q?: string;
    category?: string;
    saved?: string;
  }>();
  const { state, user } = useMarketplace();
  const [query, setQuery] = useState(params.q || "");
  const [category, setCategory] = useState(params.category || "All items");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saved, setSaved] = useState(params.saved === "1");
  const [filters, setFilters] = useState(false);
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    setQuery(params.q || "");
    setCategory(params.category || "All items");
    setSaved(params.saved === "1");
  }, [params.q, params.category, params.saved]);
  let dateError = "";
  if (start || end) {
    try {
      rentalDays(start, end);
    } catch (e) {
      dateError = (e as Error).message;
    }
  }
  const priceError =
    price !== "" && (!Number.isFinite(Number(price)) || Number(price) < 0)
      ? "Enter a valid maximum price."
      : "";
  const results = state.listings.filter((l) => {
    if (
      l.status !== "published" ||
      (category !== "All items" && l.category !== category) ||
      (saved && !user?.favourites.includes(l.id)) ||
      (verified && !l.verifiedOwner)
    )
      return false;
    if (
      ![l.title, l.description, l.category, l.location]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()) ||
      !l.location.toLowerCase().includes(location.trim().toLowerCase())
    )
      return false;
    if (priceError || dateError || (price && l.dailyPrice > Number(price)))
      return false;
    if (start && end) {
      try {
        availability(state, l, start, end);
      } catch {
        return false;
      }
    }
    return true;
  });
  function clear() {
    setQuery("");
    setCategory("All items");
    setLocation("");
    setPrice("");
    setStart("");
    setEnd("");
    setSaved(false);
    setVerified(false);
  }
  return (
    <Screen
      title="Find your next good thing."
      subtitle="Borrow a little. Do a lot. Explore rentals around Klang Valley."
    >
      <Field
        label="Search the marketplace"
        value={query}
        onChangeText={setQuery}
        placeholder="Camera, camping gear, projector…"
      />
      <Chips options={categories} selected={category} onSelect={setCategory} />
      <View style={[s.row, { marginBottom: 16 }]}>
        <Button secondary onPress={() => setFilters(!filters)}>
          {filters ? "Hide filters" : "Refine your search"}
        </Button>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Text style={s.label}>Saved only</Text>
          <Switch
            accessibilityLabel="Saved items only"
            value={saved}
            onValueChange={setSaved}
          />
        </View>
      </View>
      {filters && (
        <View style={s.card}>
          <Field
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Petaling Jaya"
          />
          <Field
            label="Maximum daily price (RM)"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="Any price"
          />
          <Field
            label="Collection date (YYYY-MM-DD)"
            value={start}
            onChangeText={setStart}
            placeholder="Any date"
          />
          <Field
            label="Return date (YYYY-MM-DD)"
            value={end}
            onChangeText={setEnd}
            placeholder="Any date"
          />
          <View style={s.row}>
            <Text style={s.label}>Verified owners only</Text>
            <Switch
              accessibilityLabel="Verified owners only"
              value={verified}
              onValueChange={setVerified}
            />
          </View>
          <Button secondary onPress={clear}>
            Clear filters
          </Button>
        </View>
      )}
      {!!(dateError || priceError) && (
        <Notice text={dateError || priceError} error />
      )}
      <Text style={[s.caption, { marginBottom: 16 }]}>
        {results.length} finds for you
      </Text>
      {results.length ? (
        <ListingGrid listings={results} />
      ) : (
        <Empty
          title="No matches just yet"
          text="Try another search or give your filters a little more room."
          action="Clear search & filters"
          onPress={clear}
        />
      )}
    </Screen>
  );
}
