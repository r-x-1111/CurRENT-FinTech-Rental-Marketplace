import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Card, Notice, Row, Screen, s } from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import { formatMalaysiaDateTime, money } from "../../services/booking";
import { newId } from "../../services/marketplace";
import { colors } from "../../constants/theme";
import { deriveDisplayDelivery } from "../../services/delivery";

export default function DeliveryDemoCheckout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, user, actAndPersist } = useMarketplace();
  const booking = state.bookings.find((item) => item.id === id && item.renterId === user?.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showDeliveryDetails, setShowDeliveryDetails] = useState(false);
  const inProgress = useRef(false);
  const delivery = booking?.deliveryDemo;
  const listing = state.listings.find((item) => item.id === booking?.listingId);
  const displayDelivery = booking ? deriveDisplayDelivery({
    collectionMethod: booking.collectionMethod,
    deliveryDemo: delivery,
    pickupLocation: listing?.privateMeetingVenue || listing?.location || delivery?.origin || "",
    deliveryAddress: booking.deliveryAddress,
    pickupPostcode: listing?.pickupPostcode,
    parcelWeightKg: listing?.parcelWeightKg,
    parcelDimensionsCm: listing?.parcelDimensionsCm,
    deliveryRequirement: listing?.deliveryRequirement,
    title: listing?.title || booking.title,
    category: listing?.category,
    description: listing?.description,
    deliveryPostcode: booking.deliveryPostcode,
    demoBooking: booking.contextMode === "admin_demo" && booking.id.startsWith("demo-"),
    listingId: booking.listingId,
  }) : null;

  async function pay() {
    if (!booking || !delivery || inProgress.current || delivery.status !== "required") return;
    inProgress.current = true;
    setBusy(true);
    setError("");
    try {
      await actAndPersist({ type: "payDeliveryDemo", bookingId: booking.id,
        receiptReference: `DEMO-GE-${newId().slice(0, 8).toUpperCase()}` });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      inProgress.current = false;
      setBusy(false);
    }
  }

  if (!booking || !delivery) return <Screen back title="Delivery Demo Checkout">
    <Notice text="This delivery checkout is unavailable for your account." error />
  </Screen>;

  return <Screen back title="Delivery Demo Checkout">
    <Card style={styles.demoCard}>
      <Text style={styles.demoTitle}>GrabExpress Delivery Payment — Demo Simulation</Text>
      <Text style={styles.demoSubtitle}>Separate from CurRENT rental payment. No real GrabExpress checkout or charge occurs.</Text>
    </Card>
    <Card>
      <Text style={s.h2}>Delivery · GrabExpress (Demo)</Text>
      <Row label="Calculated Delivery Fee (two-way)" value={displayDelivery?.fee != null ? money(displayDelivery.fee) : "Unavailable"} strong />
      <Row label="Automatically Selected Vehicle" value={displayDelivery?.vehicle || "Unavailable"} />
      <Row label="Payment Status" value={delivery.status === "paid_demo" ? "Paid (Demo)" : "Awaiting Payment"} />
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDeliveryDetails }} onPress={() => setShowDeliveryDetails((open) => !open)}>
        <Text style={styles.detailsLink}>{showDeliveryDetails ? "Hide Delivery Details" : "View Delivery Details"}</Text>
      </Pressable>
      {showDeliveryDetails && <View style={styles.detailsBox}>
        <Row label="Pickup Location" value={displayDelivery?.origin || delivery.origin} />
        <Row label="Delivery Address" value={displayDelivery?.destination || delivery.destination} />
        <Row label="Estimated Distance" value={displayDelivery?.distanceKm != null ? `${displayDelivery.distanceKm} km (estimated)` : "Unavailable"} />
        <Row label="Vehicle type" value={displayDelivery?.vehicle || "Unavailable"} />
        {displayDelivery?.outboundFee != null && <Row label="Outbound delivery fee" value={money(displayDelivery.outboundFee)} />}
        {displayDelivery?.returnFee != null && <Row label="Return delivery fee" value={money(displayDelivery.returnFee)} />}
        <Row label="Total two-way delivery fee" value={displayDelivery?.fee != null ? money(displayDelivery.fee) : "Unavailable"} strong />
        <Row label="Amount paid" value={money(delivery.status === "paid_demo" ? delivery.fee : 0)} />
        <Row label="Payment status" value={delivery.status === "paid_demo" ? "Paid (Demo)" : "Awaiting Payment"} />
      </View>}
      <Text style={s.caption}>Demo estimate only, calculated automatically from postcodes. Not a live Grab quotation or verified road route.</Text>
      {!!error && <Notice text={error} error />}
      {delivery.status === "paid_demo" ? <>
        <Text style={s.h2}>Demo Delivery Receipt</Text>
        <Row label="Demo transaction reference" value={delivery.receiptReference || ""} />
        <Row label="Simulated payment date and time" value={delivery.paidAt ? formatMalaysiaDateTime(delivery.paidAt) : ""} />
        <Row label="Payment status" value="Demo Payment Completed" />
        <Notice text="No actual GrabExpress payment was processed and no funds were transferred." />
        <Button secondary onPress={() => router.push({ pathname: "/delivery-receipt/[id]", params: { id: delivery.receiptReference || "" } })}>View Full Receipt</Button>
        <Button onPress={() => router.replace({ pathname: "/listing/[id]", params: { id: booking.listingId, checkoutId: booking.id } })}>
          Continue to CurRENT Rental Payment
        </Button>
      </> : <Button disabled={busy || delivery.status !== "required" || displayDelivery?.estimatedTwoWayFee == null} loading={busy} onPress={() => void pay()}>
        Pay Delivery & Continue · {displayDelivery?.fee != null ? money(displayDelivery.fee) : "Unavailable"}
      </Button>}
    </Card>
  </Screen>;
}

const styles = StyleSheet.create({
  detailsLink: { color: colors.blue, fontWeight: "700", marginTop: 4 },
  detailsBox: { backgroundColor: colors.paleBlue, borderRadius: 10, padding: 10, gap: 4 },
  demoCard: { backgroundColor: colors.navy, borderColor: colors.navy },
  demoTitle: { color: colors.white, fontWeight: "800", fontSize: 19 },
  demoSubtitle: { color: colors.softBlue, lineHeight: 20 },
});
