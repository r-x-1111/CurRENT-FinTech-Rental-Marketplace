import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { Button, Card, Notice, Row, Screen, s } from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import { formatMalaysiaDateTime, money } from "../../services/booking";

export default function DeliveryReceipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, user } = useMarketplace();
  const record = state.deliveryHistory?.find((entry) => entry.id === id && entry.renterId === user?.id);
  if (!record) return <Screen back title="Demo Delivery Receipt"><Notice text="This receipt is unavailable for your account." error /></Screen>;
  return <Screen back title="Demo Delivery Receipt">
    <Card>
      <Text style={s.h2}>{record.itemTitle}{record.sample ? " · Sample transaction" : ""}</Text>
      <Row label="Demo transaction ID" value={record.id} />
      <Row label="Pickup location" value={record.origin} />
      <Row label="Delivery address" value={record.destination} />
      <Row label="Service area" value={record.area} />
      {!!record.vehicle && <Row label="Vehicle" value={record.vehicle} />}
      <Row label="Estimated distance" value={record.distanceKm ? `${record.distanceKm} km (estimated, not a measured route)` : "Unavailable"} />
      <Row label="Base fare" value={money(record.baseFare)} />
      <Row label="Distance charges" value={money(record.distanceCharge)} />
      <Row label="Minimum fare" value={money(record.minimumFare)} />
      <Row label="Total delivery fee" value={money(record.fee)} />
      <Row label="Pricing reference" value={record.pricingReference} />
      <Row label="Demo payment date" value={formatMalaysiaDateTime(record.paidAt)} />
      <Row label="Status" value="Demo Payment Completed" />
      <Notice text="This is a simulated GrabExpress-inspired delivery transaction for the CurRENT university demonstration. No real payment was processed." />
      {record.bookingId && <Button secondary onPress={() => router.push({ pathname: "/listing/[id]", params: { id: state.bookings.find((booking) => booking.id === record.bookingId)?.listingId || "", checkoutId: record.bookingId } })}>Return to CurRENT</Button>}
      <Button secondary onPress={() => router.push({ pathname: "/(tabs)/rentals", params: { tab: "Payment & Transaction History" } })}>Delivery History</Button>
    </Card>
  </Screen>;
}
