import { View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import type { Listing } from "../types";
import { ListingCard } from "./ListingCard";
export function ListingGrid({ listings }: { listings: Listing[] }) {
  const { width } = useWindowDimensions();
  const columns = width >= 1000 ? 3 : width >= 650 ? 2 : 1;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
      {listings.map((listing) => (
        <View
          key={listing.id}
          style={{
            width: columns === 3 ? "32.1%" : columns === 2 ? "48.5%" : "100%",
          }}
        >
          <ListingCard
            listing={listing}
            onPress={() => router.push(`/listing/${listing.id}`)}
          />
        </View>
      ))}
    </View>
  );
}
