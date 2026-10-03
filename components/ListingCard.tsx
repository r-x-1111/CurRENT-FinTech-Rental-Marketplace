import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Listing } from "../types";
import { colors } from "../constants/theme";
import { useMarketplace } from "../context/Marketplace";
import { router } from "expo-router";
export function ListingCard({
  listing,
  onPress,
}: {
  listing: Listing;
  onPress: () => void;
}) {
  const { user, act } = useMarketplace();
  const saved = user?.favourites.includes(listing.id);
  return (
    <View style={styles.card}>
      <View style={{ position: "relative" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${listing.title}`}
          onPress={onPress}
        >
          <Image source={{ uri: listing.imageUrl }} style={styles.image} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${saved ? "Unsave" : "Save"} ${listing.title}`}
          onPress={() =>
            user
              ? act({ type: "favourite", listingId: listing.id })
              : router.push("/auth")
          }
          style={styles.heart}
        >
          <Ionicons
            name={saved ? "heart" : "heart-outline"}
            size={20}
            color={saved ? colors.blue : colors.navy}
          />
        </Pressable>
        <View style={styles.category}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: colors.navy }}>
            {listing.category.toUpperCase()}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={styles.body}
      >
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>
        <View style={styles.row}>
          <Text style={styles.meta}>
            <Ionicons name="location-outline" size={12} /> {listing.location}
          </Text>
          <Text style={styles.meta}>
            ★ {listing.rating ? listing.rating.toFixed(1) : "New"}
          </Text>
        </View>
        <View style={[styles.row, { marginTop: 12 }]}>
          <Text style={styles.price}>
            RM{listing.dailyPrice}
            <Text style={styles.meta}> / day</Text>
          </Text>
          <Text style={styles.verified}>
            {listing.verifiedOwner ? "✓ Verified" : "New owner"}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 4,
  },
  image: { width: "100%", height: 200, backgroundColor: colors.lightGrey },
  heart: {
    position: "absolute",
    right: 12,
    top: 12,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 9,
  },
  category: {
    position: "absolute",
    left: 12,
    bottom: 12,
    backgroundColor: "#FFFFFFED",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 6,
  },
  body: { padding: 16, gap: 8 },
  title: { fontSize: 16, fontWeight: "700", color: colors.navy },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  meta: { fontSize: 12, color: colors.muted, fontWeight: "400" },
  price: { fontSize: 19, fontWeight: "800", color: colors.navy },
  verified: { fontSize: 11, color: "#20804B", fontWeight: "600" },
});
