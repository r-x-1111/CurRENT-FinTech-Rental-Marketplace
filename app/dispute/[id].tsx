import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import {
  Badge,
  Button,
  Card,
  Chips,
  Empty,
  Field,
  Notice,
  Row,
  Screen,
  s,
} from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import { formatMalaysiaDateTime, money } from "../../services/booking";
import { isLenderDisputeEligible } from "../../services/marketplace";

const DISPUTE_REASONS = [
  "Item damaged",
  "Item not returned",
  "Condition disagreement",
  "Payment issue",
  "Security deposit issue",
];

export default function DisputePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, user, actAndPersist } = useMarketplace();
  const [category, setCategory] = useState(DISPUTE_REASONS[0]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return <Redirect href="/auth" />;

  const booking = state.bookings.find(
    (item) => item.id === id && item.ownerId === user.id,
  );

  if (!booking) {
    return (
      <Screen back>
        <Empty
          title="Dispute unavailable"
          text="This rental could not be loaded or you are not its lender."
        />
      </Screen>
    );
  }

  const renter = state.profiles.find(
    (profile) => profile.id === booking.renterId,
  );
  const existingDispute = state.disputes.find(
    (item) => item.bookingId === booking.id,
  );
  const bookingId = booking.id;
  const eligible = isLenderDisputeEligible(booking, now);
  const canSubmit =
    eligible && !existingDispute && reason.trim().length >= 10 && !saving;

  async function submitDispute() {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      await actAndPersist({
        type: "dispute",
        bookingId,
        category,
        reason,
      });
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen back title="Apply Dispute">
      <Card>
        <Text style={s.h2}>Booking Details</Text>
        <View style={{ marginTop: 8, gap: 6 }}>
          <Row label="Item" value={booking.title} strong />
          <Row label="Renter" value={renter?.name || "Renter"} />
          <Row
            label="Scheduled Start"
            value={formatMalaysiaDateTime(booking.start)}
          />
          <Row
            label="Scheduled End"
            value={formatMalaysiaDateTime(booking.end)}
            strong
          />
        </View>
      </Card>

      {existingDispute ? (
        <Card>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text style={[s.h2, { flex: 1 }]}>Dispute Submitted</Text>
            <Badge
              text={
                existingDispute.status === "under_review"
                  ? "PENDING"
                  : "RESOLVED"
              }
            />
          </View>
          <Row
            label="Dispute Reason"
            value={existingDispute.category || "Dispute"}
          />
          <Text style={s.body}>{existingDispute.reason}</Text>
          <Notice text="This booking already has a dispute. Further submissions are disabled." />
          <Button disabled onPress={() => {}}>
            Dispute Already Submitted
          </Button>
        </Card>
      ) : (
        <>
          <Card>
            <Text style={s.h2}>Dispute Reason</Text>
            <Text style={s.label}>Category</Text>
            <Chips
              options={DISPUTE_REASONS}
              selected={category}
              onSelect={setCategory}
            />
            <Field
              label="Describe the issue in detail"
              value={reason}
              onChangeText={setReason}
              multiline
              placeholder="Provide specific details of the issue."
            />
          </Card>

          <Card>
            <Text style={s.h2}>Confirmation Breakdown</Text>
            <View style={{ marginTop: 8, gap: 6 }}>
              <Row label="Dispute status" value="PENDING" strong />
              <Row
                label="Booking status"
                value={booking.status.replaceAll("_", " ")}
              />
              <Row
                label="Deposit state"
                value={`${money(booking.quote.deposit)} (${booking.deposit.replaceAll("_", " ")})`}
              />
              <Row label="New financial charge" value={money(0)} />
            </View>
            <Notice text="Submitting this dispute does not automatically change the booking status, reverse a released deposit, or create a financial charge." />
            {!eligible && (
              <Notice
                error
                text={
                  booking.status === "cancelled"
                    ? "Cancelled bookings cannot be disputed."
                    : `Apply Dispute is available from ${formatMalaysiaDateTime(booking.end)}.`
                }
              />
            )}
            {!!error && <Notice text={error} error />}
            <Button danger disabled={!canSubmit} onPress={submitDispute}>
              {saving ? "Submitting..." : "Confirm & Submit Dispute"}
            </Button>
          </Card>
        </>
      )}
    </Screen>
  );
}
