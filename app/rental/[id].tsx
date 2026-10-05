import { useState } from "react";
import { Image, Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Badge,
  Button,
  Card,
  Chips,
  Empty,
  Field,
  Notice,
  PhotoPicker,
  Row,
  Screen,
  Section,
  s,
} from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import { money, riskFor } from "../../services/booking";
import { calculateOwnerPayout } from "../../services/deposit";
import type { Action } from "../../services/marketplace";
export default function RentalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, user, act } = useMarketplace();
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState("Demo card");
  const [rating, setRating] = useState("5");
  const [review, setReview] = useState("");
  const [dispute, setDispute] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState("Item damaged");
  const b = state.bookings.find(
    (b) => b.id === id && [b.renterId, b.ownerId].includes(user?.id || ""),
  );
  if (!b || !user)
    return (
      <Screen back>
        <Empty
          title="Rental not found"
          text="Sign in as a participant to view this rental."
          action="Sign in"
          onPress={() => router.push("/auth")}
        />
      </Screen>
    );
  const owner = user.id === b.ownerId;
  const other = state.profiles.find(
    (p) => p.id === (owner ? b.renterId : b.ownerId),
  );
  const payout = calculateOwnerPayout(b.quote.rentalFee);
  const renter = state.profiles.find((profile) => profile.id === b.renterId);
  const renterReviews = state.reviews.filter(
    (item) => item.recipientId === b.renterId,
  );
  const completedRentals = state.bookings.filter(
    (item) => item.renterId === b.renterId && item.status === "completed",
  ).length;
  const currentRisk = renter ? riskFor(state, renter) : null;
  const steps = [
    "Request",
    "Approval",
    "Payment",
    "Handover",
    "Return",
    "Complete",
  ];
  const stepIndex =
    (
      {
        pending: 0,
        approved: 1,
        upcoming: 2,
        active: 3,
        return_pending: 4,
        completed: 5,
      } as Record<string, number>
    )[b.status] ?? -1;
  function run(action: Action) {
    try {
      act(action);
      setError("");
      setPhotos([]);
      setNotes("");
      setDispute(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function operation(
    operation: Extract<Action, { type: "booking" }>["operation"],
  ) {
    run({ type: "booking", id, operation, photo: photos[0], notes, method });
  }
  return (
    <Screen back title="Rental details" subtitle={`Reference ${b.id}`}>
      <Card>
        <Image
          source={{ uri: b.image }}
          style={{ width: "100%", height: 190, borderRadius: 12 }}
        />
        <Text style={s.h2}>{b.title}</Text>
        <Badge text={b.status} green={b.status === "completed"} />
        <Text style={s.body}>
          {b.start} → {b.end} · {b.quote.days} days
        </Text>
        <Text style={s.caption}>
          {owner ? "Renter" : "Owner"}: {other?.name} ·{" "}
          {other?.verification.replace("_", " ")}
        </Text>
        <Text style={s.caption}>
          Collection: {b.collectionMethod || "Meet Owner"}
        </Text>
        <Button secondary onPress={() => router.push(`/conversation/${b.id}`)}>
          Message {other?.name.split(" ")[0] || "participant"}
        </Button>
      </Card>
      {stepIndex >= 0 && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 22,
          }}
        >
          {steps.map((step, i) => (
            <Badge
              key={step}
              text={`${i <= stepIndex ? "✓" : i + 1} ${step}`}
              green={i <= stepIndex}
            />
          ))}
        </View>
      )}
      {!!error && <Notice text={error} error />}
      {b.status === "pending" && (
        <Card>
          <Text style={s.h2}>
            {owner ? "A new rental request" : "Waiting for owner approval"}
          </Text>
          <Text style={s.caption}>
            {owner
              ? `Renter risk score at request: ${b.riskScore}/100. Deposit: ${money(b.quote.deposit)}.`
              : "The owner will review your dates. You will be notified here when they respond."}
          </Text>
          {owner && (
            <>
              <Row
                label="Identity"
                value={renter?.verification.replace("_", " ") || "Unknown"}
              />
              <Row label="Completed rentals" value={String(completedRentals)} />
              <Row
                label="Renter rating"
                value={
                  renterReviews.length
                    ? `${(renterReviews.reduce((sum, item) => sum + item.rating, 0) / renterReviews.length).toFixed(1)} / 5`
                    : "No reviews yet"
                }
              />
              <Text style={s.caption}>
                Request score: {b.riskScore}/100. Current tier:{" "}
                {currentRisk?.level || "unknown"}. The demo score uses
                verification, completed rentals, reviews and disputes.
              </Text>
              {renterReviews.slice(-2).map((item) => (
                <Text key={item.id} style={s.caption}>
                  {"★".repeat(item.rating)}{" "}
                  {item.text || "Renter review submitted."}
                </Text>
              ))}
              <Button onPress={() => operation("approve")}>
                Approve request
              </Button>
              <Button secondary onPress={() => operation("reject")}>
                Decline request
              </Button>
            </>
          )}
          <Button secondary onPress={() => operation("cancel")}>
            Cancel request
          </Button>
        </Card>
      )}
      {b.status === "approved" && !owner && (
        <Card>
          <Text style={s.h2}>Your item is reserved</Text>
          <Notice text="Test checkout only. No card details or real money are collected. Financial services require authorised external providers in a live app." />
          <Chips
            options={[
              "Demo card",
              "Demo FPX",
              ...(b.quote.rentalFee >= 200 ? ["Demo BNPL"] : []),
            ]}
            selected={method}
            onSelect={setMethod}
          />
          {method === "Demo BNPL" && (
            <Notice
              text={`Demo BNPL covers rental fees only (${money(b.quote.rentalFee)}). Deposit, service and protection (${money(b.quote.total - b.quote.rentalFee)}) remain payable separately. Eligibility is simulated.`}
            />
          )}
          {b.payment === "processing" ? (
            <>
              <Badge text="Payment processing · awaiting simulated provider" />
              <Button onPress={() => operation("payment_result")}>
                Simulate successful payment
              </Button>
              <Button
                secondary
                onPress={() =>
                  run({
                    type: "booking",
                    id,
                    operation: "payment_result",
                    failed: true,
                  })
                }
              >
                Simulate failed payment
              </Button>
            </>
          ) : (
            <>
              <Button onPress={() => operation("pay")}>
                {b.payment === "failed"
                  ? "Retry demo payment"
                  : `Pay ${money(b.quote.total)} · demo`}
              </Button>
              <Button secondary onPress={() => operation("cancel")}>
                Cancel unpaid rental
              </Button>
            </>
          )}
          {b.payment === "failed" && (
            <Notice
              error
              text="Payment failed. No deposit was secured. Choose a method and retry."
            />
          )}
        </Card>
      )}
      {b.status === "approved" && owner && (
        <Notice text="Approved. Waiting for the renter to complete demo checkout." />
      )}
      {((b.status === "upcoming" && owner) ||
        (b.status === "active" && !owner)) &&
        !dispute && (
          <Card>
            <Text style={s.h2}>
              {owner ? "Record the handover" : "Ready to return?"}
            </Text>
            <Text style={s.caption}>
              Add a clear condition photo and any notes. In this demo you can
              advance the handover without waiting for the collection date.
            </Text>
            <PhotoPicker photos={photos} onChange={setPhotos} single />
            <Field
              label="Condition notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Describe the item’s condition and included accessories."
            />
            <Button onPress={() => operation(owner ? "check_in" : "check_out")}>
              {owner
                ? "Confirm handover & check-in"
                : "Submit return & check-out"}
            </Button>
          </Card>
        )}
      {b.status === "upcoming" && !owner && (
        <Notice text="Your payment and deposit are confirmed in the demo. Arrange collection with the owner, who will record check-in photos." />
      )}
      {b.status === "active" && owner && (
        <Notice text="The item is with the renter. The renter will submit return photos when it is ready for inspection." />
      )}
      {b.status === "return_pending" && (
        <Card>
          <Text style={s.h2}>Return inspection</Text>
          <Text style={s.caption}>
            {owner
              ? "Review the return photos below. Confirm only if the item has been returned in the agreed condition."
              : "Waiting for the owner to inspect the item and release the demo deposit."}
          </Text>
          {owner && (
            <Button onPress={() => operation("release")}>
              Confirm return & release demo deposit
            </Button>
          )}
        </Card>
      )}
      {["active", "return_pending"].includes(b.status) && (
        <>
          <Button
            secondary
            onPress={() => {
              setDispute(!dispute);
              setPhotos([]);
              setNotes("");
            }}
          >
            {dispute ? "Close dispute form" : "Report a problem"}
          </Button>
          {dispute && (
            <Card>
              <Text style={s.h2}>Open a dispute</Text>
              <Text style={s.label}>Reason</Text>
              <Chips
                options={[
                  "Item damaged",
                  "Item not returned",
                  "Condition disagreement",
                  "Payment issue",
                  "Security deposit issue",
                ]}
                selected={disputeCategory}
                onSelect={setDisputeCategory}
              />
              <Field
                label="Explain what happened"
                value={notes}
                onChangeText={setNotes}
                multiline
              />
              <PhotoPicker photos={photos} onChange={setPhotos} single />
              <Button
                danger
                onPress={() =>
                  run({
                    type: "dispute",
                    bookingId: id,
                    reason: notes,
                    category: disputeCategory,
                    photo: photos[0],
                  })
                }
              >
                Submit dispute & hold deposit
              </Button>
            </Card>
          )}
        </>
      )}
      {b.status === "disputed" && (
        <Notice text="Dispute under review. Deposit release and owner payout are paused. This prototype records the case and evidence; resolution requires a future support/admin integration." />
      )}
      {state.disputes
        .filter((d) => d.bookingId === id)
        .map((d) => (
          <Card key={d.id}>
            <Badge text={d.status} />
            {!!d.category && <Text style={s.bold}>{d.category}</Text>}
            <Text style={s.body}>{d.reason}</Text>
          </Card>
        ))}
      <Section title="Payment breakdown" />
      <Card>
        <Row label="Rental fee" value={money(b.quote.rentalFee)} />
        <Row
          label="Service fee · 5%, min RM5"
          value={money(b.quote.serviceFee)}
        />
        <Row
          label="Refundable security deposit"
          value={money(b.quote.deposit)}
        />
        <Row label="Item protection" value={money(b.quote.protection)} />
        <View style={s.divider} />
        <Row label="Total payable" value={money(b.quote.total)} strong />
        <Row label="Payment status" value={b.payment} />
        <Row label="Deposit status" value={b.deposit.replace("_", " ")} />
        {b.paymentMethod && <Row label="Method" value={b.paymentMethod} />}
        {owner && (
          <>
            <View style={s.divider} />
            <Row
              label="Owner commission · 12%"
              value={money(payout.commission)}
            />
            <Row
              label={
                b.status === "completed"
                  ? "Demo payout recorded"
                  : "Estimated owner payout"
              }
              value={money(payout.payout)}
              strong
            />
          </>
        )}
      </Card>
      {b.agreement && (
        <>
          <Section title="Digital rental agreement" />
          <Card>
            <Text selectable style={s.body}>
              {b.agreement}
            </Text>
            <Button
              secondary
              onPress={() => {
                Share.share({ message: b.agreement! }).catch(() =>
                  setError(
                    "Sharing is unavailable here. You can select and copy the agreement above.",
                  ),
                );
              }}
            >
              Share agreement
            </Button>
          </Card>
        </>
      )}
      <Section title="Condition evidence" />
      {state.evidence
        .filter((e) => e.bookingId === id)
        .map((e) => (
          <Card key={e.id}>
            <Badge text={e.kind} />
            <Image
              source={{ uri: e.photo }}
              style={{ width: "100%", height: 200, borderRadius: 12 }}
            />
            <Text style={s.body}>{e.notes || "Condition photo recorded."}</Text>
            <Text style={s.caption}>
              {state.profiles.find((p) => p.id === e.authorId)?.name} ·{" "}
              {new Date(e.createdAt).toLocaleString()}
            </Text>
          </Card>
        ))}
      {!state.evidence.some((e) => e.bookingId === id) && (
        <Text style={s.caption}>Photos will appear after handover.</Text>
      )}
      {b.status === "completed" &&
        !state.reviews.some(
          (r) => r.bookingId === id && r.authorId === user.id,
        ) && (
          <>
            <Section title="How did it go?" />
            <Card>
              <Chips
                options={["1", "2", "3", "4", "5"]}
                selected={rating}
                onSelect={setRating}
              />
              <Field
                label="Your review"
                value={review}
                onChangeText={setReview}
                multiline
                placeholder="Help the community rent with confidence."
              />
              <Button
                onPress={() =>
                  run({
                    type: "review",
                    bookingId: id,
                    rating: Number(rating),
                    text: review,
                  })
                }
              >
                Leave {rating}-star review
              </Button>
            </Card>
          </>
        )}
      {state.reviews
        .filter((r) => r.bookingId === id)
        .map((r) => (
          <Card key={r.id}>
            <Text style={s.bold}>
              {"★".repeat(r.rating)} ·{" "}
              {state.profiles.find((p) => p.id === r.authorId)?.name}
            </Text>
            <Text style={s.body}>{r.text || "Review submitted."}</Text>
          </Card>
        ))}
    </Screen>
  );
}
