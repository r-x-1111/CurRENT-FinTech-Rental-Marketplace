import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Empty, Screen, s } from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
export default function MessagesScreen() {
  const { state, user } = useMarketplace();
  const bookings = state.bookings.filter((b) =>
    [b.ownerId, b.renterId].includes(user?.id || ""),
  );
  return (
    <Screen
      title="A little conversation"
      subtitle="Keep plans, pickup details and rental questions in one place."
    >
      {bookings.length ? (
        bookings.map((b) => {
          const other = state.profiles.find(
            (p) => p.id === (b.ownerId === user?.id ? b.renterId : b.ownerId),
          );
          const messages = state.messages.filter((m) => m.bookingId === b.id);
          const last = messages[messages.length - 1];
          return (
            <Pressable
              accessibilityRole="button"
              key={b.id}
              onPress={() => router.push(`/conversation/${b.id}`)}
              style={s.card}
            >
              <View style={s.row}>
                <Text style={s.h2}>{other?.name}</Text>
                <Text style={s.link}>Open →</Text>
              </View>
              <Text style={s.label}>{b.title}</Text>
              <Text numberOfLines={1} style={s.caption}>
                {last?.text || "Say hello and arrange your rental."}
              </Text>
            </Pressable>
          );
        })
      ) : (
        <Empty
          title="Good rentals start with hello"
          text="Request an item to start a conversation with its owner."
          action="Find an item"
          onPress={() => router.push("/(tabs)/explore")}
        />
      )}
    </Screen>
  );
}
