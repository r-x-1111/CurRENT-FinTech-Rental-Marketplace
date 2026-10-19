import React, { useEffect, useRef } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Listing } from "../types";
import { colors, radius, shadow } from "../constants/theme";
import { useMarketplace } from "../context/Marketplace";
import { router } from "expo-router";

export function ListingCard({
  listing,
  onPress,
  compact = false,
}: {
  listing: Listing;
  onPress: () => void;
  compact?: boolean;
}) {
  const { user, act } = useMarketplace();
  const saved = user?.favourites.includes(listing.id);

  // Icon Morph: the heart scales up and gives a small rotational flourish when it toggles,
  // instead of the icon just instantly swapping.
  const heartMorph = useRef(new Animated.Value(0)).current;
  const wasSaved = useRef(saved);
  useEffect(() => {
    if (wasSaved.current === saved) return;
    wasSaved.current = saved;
    heartMorph.setValue(0);
    Animated.spring(heartMorph, { toValue: 1, friction: 3.5, tension: 180, useNativeDriver: true }).start();
  }, [saved, heartMorph]);
  const heartScale = heartMorph.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.35, 1] });
  const heartRotate = heartMorph.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["0deg", "-12deg", "0deg"] });

  const isFeatured =
    listing.featuredUntil &&
    new Date(listing.featuredUntil).getTime() > Date.now();

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View item details: ${listing.title}`}
        onPress={onPress}
      >
        <View style={styles.imageArea}>
          <Image
            source={{ uri: listing.imageUrl }}
            accessibilityLabel={listing.title}
            style={[styles.image, compact && styles.compactImage]}
            resizeMode="cover"
          />

          {isFeatured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}

          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {listing.category.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={[styles.body, compact && styles.compactBody]}>
          <View style={[styles.topRow, compact && styles.compactTopRow]}>
            <View style={styles.verifiedRow}>
              {listing.verifiedOwner ? (
                <Text style={[styles.verifiedText, compact && styles.compactStatusText]}>✓ Verified Owner</Text>
              ) : (
                <Text style={[styles.unverifiedText, compact && styles.compactStatusText]}>Community listing</Text>
              )}
            </View>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.ratingText}>
                {listing.rating ? listing.rating.toFixed(1) : "New"}
              </Text>
            </View>
          </View>

          <Text style={[styles.title, compact && styles.compactTitle]} numberOfLines={1}>
            {listing.title}
          </Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={colors.muted} />
            <Text style={[styles.locationText, compact && styles.compactLocation]} numberOfLines={1}>{listing.location}</Text>
          </View>

          <View style={styles.bottomRow}>
            <Text style={[styles.priceText, compact && styles.compactPrice]}>
              RM{listing.dailyPrice}
              <Text style={styles.perDayText}>/day</Text>
            </Text>
            {!compact && (
              <View style={styles.detailsBtn}>
                <Text style={styles.detailsBtnText}>View details</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${saved ? "Unsave" : "Save"} ${listing.title}`}
        accessibilityState={{ selected: Boolean(saved) }}
        onPress={() => {
          if (user) act({ type: "favourite", listingId: listing.id });
          else router.push("/auth");
        }}
        style={styles.heart}
        hitSlop={8}
      >
        <Animated.View style={{ transform: [{ scale: heartScale }, { rotate: heartRotate }] }}>
          <Ionicons
            name={saved ? "heart" : "heart-outline"}
            size={18}
            color={saved ? colors.blue : colors.navy}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    backgroundColor: "white",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 4,
    ...shadow.card,
  },
  imageArea: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 190,
    backgroundColor: colors.lightGrey,
  },
  compactImage: { height: 124 },
  heart: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 36,
    height: 36,
    backgroundColor: "white",
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  featuredBadge: {
    position: "absolute",
    left: 12,
    top: 12,
    backgroundColor: colors.blue,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.sm,
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
    borderRadius: radius.sm,
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
  compactBody: { padding: 10, gap: 5 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  compactTopRow: { gap: 2 },
  compactStatusText: { fontSize: 9, flexShrink: 1 },
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
  compactTitle: { fontSize: 13 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: colors.muted,
  },
  compactLocation: { fontSize: 11, flexShrink: 1 },
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
    color: colors.blue,
  },
  compactPrice: { fontSize: 15 },
  perDayText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.muted,
  },
  detailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.blue,
    backgroundColor: "transparent",
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.blue,
  },
});
