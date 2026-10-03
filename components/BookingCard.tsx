import { Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { Booking } from "../types/marketplace";
import { Badge, s } from "./ui";
import { money } from "../services/booking";
export function BookingCard({ booking }: { booking: Booking }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/rental/${booking.id}`)}
      style={s.card}
    >
      <View style={{ flexDirection: "row", gap: 15 }}>
        <Image
          source={{ uri: booking.image }}
          style={{ width: 74, height: 82, borderRadius: 12 }}
        />
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={s.bold}>{booking.title}</Text>
          <Text style={s.caption}>
            {booking.start} → {booking.end}
          </Text>
          <Badge text={booking.status} green={booking.status === "completed"} />
        </View>
      </View>
      <View style={s.row}>
        <Text style={s.body}>{money(booking.quote.total)}</Text>
        <Text style={s.link}>View rental →</Text>
      </View>
    </Pressable>
  );
}
