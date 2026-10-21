import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { Button, Card, Notice, Row, Screen, s } from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import { formatMalaysiaDateTime, money } from "../../services/booking";
import { DELIVERY_REFUND_STATUS_LABEL, deriveDeliveryRefundStatus } from "../../services/delivery";

export default function DeliveryReceipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, user } = useMarketplace();
  const record = state.deliveryHistory?.find((entry) => entry.id === id);
  const booking = state.bookings.find((item) => item.id === record?.bookingId);
  const permitted = record?.renterId === user?.id || Boolean(booking && booking.ownerId === user?.id);
  if (!record || !permitted) return <Screen back title="Demo Delivery Receipt"><Notice text="This receipt is unavailable for your account." error /></Screen>;
  const cancelled = booking?.status === "cancelled" || booking?.status === "rejected";
  // Delivery refunds are the delivery company's responsibility, not CurRENT's — a cancelled
  // rental never by itself means the provider has approved or completed a refund.
  const outboundRefundStatus = cancelled && booking?.deliveryDemo
    ? deriveDeliveryRefundStatus({ cancelled: true, deliveryStatus: booking.deliveryDemo.status, legStarted: !!booking.lenderHandoverAt })
    : null;
  const returnRefundStatus = cancelled && booking?.deliveryDemo
    ? deriveDeliveryRefundStatus({ cancelled: true, deliveryStatus: booking.deliveryDemo.status, legStarted: !!booking.actualReturnTimestamp })
    : null;
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
      {booking?.deliveryDemo?.outboundFee != null && <Row label="Outbound delivery fee" value={money(booking.deliveryDemo.outboundFee)} />}
      {booking?.deliveryDemo?.returnFee != null && <Row label="Return delivery fee" value={money(booking.deliveryDemo.returnFee)} />}
      <Row label="Delivery amount paid" value={money(record.fee)} />
      {booking?.deliveryDemo?.status === "refunded_demo" && <Row label="Delivery refund" value={money(record.fee)} />}
      <Row label="Pricing reference" value={record.pricingReference === "GrabExpress MY FAQ, May 2023" ? "GrabExpress" : record.pricingReference} />
      <Row label="Demo payment date" value={formatMalaysiaDateTime(record.paidAt)} />
      <Row label="Status" value={booking?.deliveryDemo?.status === "refunded_demo" ? "Refunded (Demo)" : "Demo Payment Completed"} />
      {cancelled && outboundRefundStatus && returnRefundStatus && (
        <>
          <Row label="Outbound delivery refund" value={DELIVERY_REFUND_STATUS_LABEL[outboundRefundStatus]} />
          <Row label="Return delivery refund" value={DELIVERY_REFUND_STATUS_LABEL[returnRefundStatus]} />
          <Notice text="Delivery payments and refunds are handled by the applicable delivery company, not CurRENT. This platform currently simulates delivery refund tracking. Actual refund eligibility, amounts and processing times depend on the delivery provider's policies." />
        </>
      )}
      <Notice text="This is a simulated GrabExpress-inspired delivery transaction for the CurRENT university demonstration. No real payment was processed." />
      {record.bookingId && <Button secondary onPress={() => router.push({ pathname: "/listing/[id]", params: { id: state.bookings.find((booking) => booking.id === record.bookingId)?.listingId || "", checkoutId: record.bookingId } })}>Return to CurRENT</Button>}
      <Button secondary onPress={() => router.push({ pathname: "/(tabs)/rentals", params: { tab: "Payment & Transaction History" } })}>Delivery History</Button>
    </Card>
  </Screen>;
}
