import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Badge, Card, Empty, Screen, s } from "../components/ui";
import { useMarketplace } from "../context/Marketplace";
import { formatMalaysiaDateTime, money } from "../services/booking";
import { colors } from "../constants/theme";

export default function DeliveryHistory() {
  const { state, user } = useMarketplace();
  const records = (state.deliveryHistory || []).filter((record) => record.renterId === user?.id)
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  return <Screen back title="Delivery History" subtitle="GrabExpress-inspired demo payments, separate from CurRENT rental charges.">
    {records.length ? records.map((record) => <Pressable key={record.id} accessibilityRole="button" accessibilityLabel={`View delivery receipt ${record.id}`} onPress={() => router.push({ pathname: "/delivery-receipt/[id]", params: { id: record.id } })}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <Text style={[s.h2, { flex: 1 }]}>{record.itemTitle}</Text>
          <Text style={{ color: colors.blue, fontWeight: "800" }}>{money(record.fee)}</Text>
        </View>
        <Text style={s.caption}>{record.origin} → {record.destination}</Text>
        <Text style={s.caption}>{record.distanceKm} km demo distance{record.vehicle ? ` · ${record.vehicle}` : ""} · {record.area}</Text>
        <Text style={s.caption}>{formatMalaysiaDateTime(record.paidAt)} · {record.id}</Text>
        <Badge text={record.sample ? "Sample · Demo Payment Completed" : "Demo Payment Completed"} green />
      </Card>
    </Pressable>) : <Empty title="No delivery history yet" text="Completed demo delivery payments will appear here." />}
  </Screen>;
}
