import { useState } from "react";
import { router } from "expo-router";
import { Screen, Chips, Empty } from "../../components/ui";
import { BookingCard } from "../../components/BookingCard";
import { useMarketplace } from "../../context/Marketplace";
const filters: Record<string, string[]> = {
  All: [],
  Requests: ["pending", "approved"],
  Upcoming: ["upcoming"],
  Active: ["active", "return_pending", "disputed"],
  History: ["completed", "cancelled", "rejected"],
};
export default function RentalsScreen() {
  const { state, user } = useMarketplace();
  const [filter, setFilter] = useState("All");
  const bookings = state.bookings.filter(
    (b) =>
      b.renterId === user?.id &&
      (!filters[filter].length || filters[filter].includes(b.status)),
  );
  return (
    <Screen
      title="Your rentals"
      subtitle="From your first request to your next adventure."
    >
      <Chips
        options={Object.keys(filters)}
        selected={filter}
        onSelect={setFilter}
      />
      {bookings.length ? (
        bookings.map((b) => <BookingCard key={b.id} booking={b} />)
      ) : (
        <Empty
          title="Your next story starts here"
          text="Find something you love and request your dates. Your rentals will appear here."
          action="Explore rentals"
          onPress={() => router.push("/(tabs)/explore")}
        />
      )}
    </Screen>
  );
}
