import React from "react";
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

  const isFeatured =
    listing.featuredUntil &&
    new Date(listing.featuredUntil).getTime() > Date.now();

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

        {/* Favourite heart button */}
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
            size={18}
            color={saved ? colors.blue : colors.navy}
          />
        </Pressable>

        {/* Featured badge if boosted */}
        {isFeatured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>Featured (Demo)</Text>
          </View>
        )}

        {/* Category pill */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>
            {listing.category.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Verification & Rating row */}
        <View style={styles.topRow}>
          <View style={styles.verifiedRow}>
            {listing.verifiedOwner ? (
              <Text style={styles.verifiedText}>✓ Verified Owner</Text>
            ) : (
              <Text style={styles.unverifiedText}>Community listing</Text>
            )}
          </View>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {listing.rating ? listing.rating.toFixed(1) : "New"}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Pressable onPress={onPress}>
          <Text style={styles.title} numberOfLines={1}>
            {listing.title}
          </Text>
        </Pressable>

        {/* Location */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={colors.muted} />
          <Text style={styles.locationText}>{listing.location}</Text>
        </View>

        {/* Price Row */}
        <View style={styles.bottomRow}>
          <Text style={styles.priceText}>
            RM{listing.dailyPrice}
            <Text style={styles.perDayText}>/day</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  image: {
    width: "100%",
    height: 190,
    backgroundColor: colors.lightGrey,
  },
  heart: {
    position: "absolute",
    right: 12,
    top: 12,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 7,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featuredBadge: {
    position: "absolute",
    left: 12,
    top: 12,
    backgroundColor: colors.blue,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredText: {
    color: "white",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  categoryBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    backgroundColor: "#FFFFFFEE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.navy,
  },
  body: {
    padding: 16,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  verifiedText: {
    fontSize: 12,
    color: "#15803D",
    fontWeight: "700",
  },
  unverifiedText: {
    fontSize: 12,
    color: colors.muted,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.navy,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: colors.muted,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
  },
  perDayText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.muted,
  },
  detailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.paleBlue,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.blue,
  },
});
