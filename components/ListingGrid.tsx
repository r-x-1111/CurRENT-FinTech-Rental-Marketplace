import { View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import type { Listing } from "../types";
import { ListingCard } from "./ListingCard";
export function ListingGrid({ listings, compactMobile = false }: { listings: Listing[]; compactMobile?: boolean }) {
  const { width } = useWindowDimensions();
  const mobileGrid = compactMobile && width < 768;
  const columns = width >= 1000 ? 3 : width >= 650 || (mobileGrid && width >= 360) ? 2 : 1;
  const gap = mobileGrid ? 10 : 18;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
      {listings.map((listing) => (
        <View
          key={listing.id}
          style={{
            width: columns === 3 ? "32.1%" : columns === 2 ? (mobileGrid ? "48%" : "48.5%") : "100%",
          }}
        >
          <ListingCard
            listing={listing}
            compact={mobileGrid && columns === 2}
            onPress={() => router.push(`/listing/${listing.id}`)}
          />
        </View>
      ))}
    </View>
  );
}
