import { useEffect, useState } from "react";
import { Pressable, Switch, Text, View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Field,
  Chips,
  Empty,
  s,
} from "../../components/ui";
import { ListingGrid } from "../../components/ListingGrid";
import { useMarketplace } from "../../context/Marketplace";
import { categories } from "../../constants/categories";
import { colors } from "../../constants/theme";

export default function ExploreScreen() {
  const params = useLocalSearchParams<{
    q?: string;
    category?: string;
    saved?: string;
    location?: string;
  }>();
  const { state, user } = useMarketplace();
  const [query, setQuery] = useState(params.q || "");
  const [category, setCategory] = useState(params.category || "All items");
  const [saved, setSaved] = useState(params.saved === "1");

  useEffect(() => {
    setQuery(params.q || "");
    setCategory(params.category || "All items");
    setSaved(params.saved === "1");
  }, [params.q, params.category, params.saved]);

  const results = state.listings
    .filter((l) => {
      if (l.status !== "published") return false;
      if (category !== "All items" && l.category !== category) return false;
      if (saved && !user?.favourites.includes(l.id)) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const matches = [l.title, l.description, l.category, l.location]
          .join(" ")
          .toLowerCase()
          .includes(q);
        if (!matches) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const now = Date.now();
      const aBoosted = a.featuredUntil && new Date(a.featuredUntil).getTime() > now ? 1 : 0;
      const bBoosted = b.featuredUntil && new Date(b.featuredUntil).getTime() > now ? 1 : 0;
      return bBoosted - aBoosted;
    });

  function clear() {
    setQuery("");
    setCategory("All items");
    setSaved(false);
  }

  const hasFilter = query.trim() !== "" || category !== "All items" || saved;

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

      <View style={{ marginVertical: 8 }}>
        <Chips options={categories} selected={category} onSelect={setCategory} />
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.savedToggleRow}>
          <Ionicons
            name={saved ? "heart" : "heart-outline"}
            size={18}
            color={saved ? colors.danger : colors.navy}
          />
          <Text style={styles.savedLabel}>Saved only</Text>
          <Switch
            accessibilityLabel="Saved items only"
            value={saved}
            onValueChange={setSaved}
            trackColor={{ false: "#CBD5E1", true: colors.blue }}
          />
        </View>

        {hasFilter && (
          <Pressable accessibilityRole="button" onPress={clear} style={styles.clearBtn}>
            <Ionicons name="close-circle-outline" size={16} color={colors.muted} />
            <Text style={styles.clearBtnText}>Reset search</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {results.length} {results.length === 1 ? "item" : "items"} available
        </Text>
      </View>

      {results.length ? (
        <ListingGrid listings={results} />
      ) : (
        <Empty
          title="No matches found"
          text="Try another keyword or select a different category to discover available gear."
          action="Reset search"
          onPress={clear}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 14,
    paddingHorizontal: 2,
  },
  savedToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  savedLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.navy,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  clearBtnText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "600",
  },
  resultsHeader: {
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
