import { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Badge,
  Button,
  Card,
  Chips,
  colors,
  Empty,
  Field,
  MediaPicker,
  Notice,
  Row,
  Screen,
  Section,
  s,
} from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import {
  calculateBorrowerServiceFee,
  calculateOwnerPayout,
} from "../../services/deposit";
import {
  formatMalaysiaDateTime,
  isCancellationEligible,
  money,
  parseMalaysiaTimestamp,
  riskFor,
} from "../../services/booking";
import type { Action } from "../../services/marketplace";

export default function RentalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, user, act } = useMarketplace();
  const [error, setError] = useState("");
  const [checkInPhotos, setCheckInPhotos] = useState<string[]>([]);
  const [checkInVideos, setCheckInVideos] = useState<string[]>([]);
  const [checkInNotes, setCheckInNotes] = useState("");
  const [checkInIssue, setCheckInIssue] = useState("");
  const [returnPhotos, setReturnPhotos] = useState<string[]>([]);
  const [returnVideos, setReturnVideos] = useState<string[]>([]);
  const [returnNotes, setReturnNotes] = useState("");
  const [checkOutIssue, setCheckOutIssue] = useState("");
  const [disputePhotos, setDisputePhotos] = useState<string[]>([]);
  const [disputeVideos, setDisputeVideos] = useState<string[]>([]);
  const [disputeNotes, setDisputeNotes] = useState("");
  const [method, setMethod] = useState("Demo card");
  const [rating, setRating] = useState("5");
  const [review, setReview] = useState("");
  const [dispute, setDispute] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState("Item damaged");
  const [extensionDays, setExtensionDays] = useState("1");
  const [returnNotice, setReturnNotice] = useState("");

  const b = state.bookings.find(
    (b) => b.id === id && [b.renterId, b.ownerId].includes(user?.id || ""),
  );

  if (!user) {
    return <Redirect href="/auth" />;
  }

  if (!b)
    return (
      <Screen back>
        <Empty
          title="Rental not found"
          text="This rental record could not be loaded or you are not a participant."
          action="Back to Rentals"
          onPress={() => router.push("/(tabs)/rentals")}
        />
      </Screen>
    );

  const rental = b;
  const owner = user.id === b.ownerId;
  const other = state.profiles.find(
    (p) => p.id === (owner ? b.renterId : b.ownerId),
  );
  const renterName = state.profiles.find((p) => p.id === b.renterId)?.name || "Renter";
  const lenderName = state.profiles.find((p) => p.id === b.ownerId)?.name || "Lender";
  const payout = calculateOwnerPayout(b.quote.rentalFee);
  const renter = state.profiles.find((profile) => profile.id === b.renterId);
  const currentRisk = renter ? riskFor(state, renter) : null;
  const listing = state.listings.find((l) => l.id === b.listingId);

  const steps = [
    "Confirmed",
    "Delivery",
    "Active",
    "Return",
    "Complete",
  ];
  const stepIndex =
    (
      {
        pending: 0,
        approved: 0,
        upcoming: 0,
        active: 2,
        return_pending: 3,
        completed: 4,
        disputed: 3,
        cancelled: -1,
      } as Record<string, number>
    )[b.status] ?? -1;

  function run(action: Action) {
    try {
      act(action);
      setError("");
      setCheckInPhotos([]);
      setCheckInVideos([]);
      setCheckInNotes("");
      setCheckInIssue("");
      setReturnPhotos([]);
      setReturnVideos([]);
      setReturnNotes("");
      setCheckOutIssue("");
      setDisputePhotos([]);
      setDisputeVideos([]);
      setDisputeNotes("");
      setDispute(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function operation(
    operation: Extract<Action, { type: "booking" }>["operation"],
  ) {
    run({ type: "booking", id, operation, method });
  }

  const cancelEligible = b.scheduledPickup
    ? isCancellationEligible(b.scheduledPickup)
    : isCancellationEligible(b.start);

  const extDaysNum = parseInt(extensionDays, 10) || 1;
  const extRentalFee = listing ? listing.dailyPrice * extDaysNum : 0;
  const extServiceFee = calculateBorrowerServiceFee(extRentalFee);
  const extTotal = extRentalFee + extServiceFee;

  const checkInEvidence = state.evidence.find(
    (e) => e.bookingId === id && e.kind === "check_in",
  );
  const checkOutEvidence = state.evidence.find(
    (e) => e.bookingId === id && e.kind === "check_out",
  );
  const myReview = state.reviews.find(
    (r) => r.bookingId === id && r.authorId === user.id,
  );
  const otherReview = state.reviews.find(
    (r) => r.bookingId === id && r.authorId !== user.id,
  );
  const isDelivered =
    !!b.renterReceivedAt ||
    ["active", "return_pending", "completed", "disputed"].includes(b.status);
  const isReturnEligible = [
    "active",
    "return_pending",
    "completed",
    "disputed",
  ].includes(b.status);
  function renderIssueReport(stage: "check_in" | "check_out", stageAvailable: boolean) {
    const report = state.issueReports?.find(
      (item) => item.bookingId === rental.id && item.stage === stage,
    );
    const canSubmit =
      !owner &&
      stageAvailable &&
      ["active", "return_pending", "disputed"].includes(rental.status);
    const value = stage === "check_in" ? checkInIssue : checkOutIssue;
    const setValue = stage === "check_in" ? setCheckInIssue : setCheckOutIssue;

    return (
      <View style={{ marginTop: 14, gap: 8 }}>
        <Text style={s.bold}>Report an Issue</Text>
        {report ? (
          <>
            <Text style={s.body}>{report.text}</Text>
            <Text style={s.caption}>
              Submitted by renter · {formatMalaysiaDateTime(report.createdAt)} MYT
            </Text>
          </>
        ) : (
          <>
            <Text style={s.caption}>No issue reported.</Text>
            {canSubmit ? (
              <>
                <Field
                  label="Describe any damage, missing parts or other issues"
                  value={value}
                  onChangeText={setValue}
                  multiline
                  placeholder="Describe the issue (optional)."
                />
                <Button
                  secondary
                  disabled={!value.trim()}
                  onPress={() =>
                    run({
                      type: "reportIssue",
                      bookingId: id,
                      stage,
                      text: value,
                    })
                  }
                >
                  Submit Report
                </Button>
              </>
            ) : (
              <Text style={s.caption}>
                This report area is read-only until the rental reaches this stage.
              </Text>
            )}
          </>
        )}
      </View>
    );
  }

  const startMs = parseMalaysiaTimestamp(b.scheduledPickup || b.start);
  const endMs = parseMalaysiaTimestamp(
    b.effectiveReturnDeadline || b.scheduledReturn || b.end,
  );
  const nowMs = Date.now();
  const isStartReached = nowMs >= startMs;
  const isEndReached = nowMs >= endMs;
  const confirmationStatus: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    upcoming: "Confirmed",
    confirmed: "Confirmed",
    active: "Active",
    return_pending: "Return pending",
    completed: "Completed",
    cancelled: "Cancelled",
    rejected: "Rejected",
    disputed: "Disputed",
  };

  function renderRenterActionButtons() {
    if (!b) return null;
    return (
      <View style={{ marginTop: 12, gap: 10 }}>
        {/* Upper Button: Confirm Received */}
        {b.renterReceivedAt ? (
          <Button disabled secondary onPress={() => {}}>
            {`✓ Delivery Received (${new Date(b.renterReceivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`}
          </Button>
        ) : isStartReached ? (
          <Button
            onPress={() =>
              run({ type: "handoverConfirm", bookingId: id, role: "renter" })
            }
          >
            Confirm Received — Delivered item successfully received
          </Button>
        ) : (
          <View style={{ gap: 4 }}>
            <Button disabled secondary onPress={() => {}}>
              Confirm Received
            </Button>
            <Text style={[s.caption, { textAlign: "center", color: colors.muted }]}>
              {`Available from ${formatMalaysiaDateTime(startMs)}`}
            </Text>
          </View>
        )}

        {/* Lower Button: Confirm Item Return */}
        {b.renterReturnConfirmedAt ? (
          <Button disabled secondary onPress={() => {}}>
            ✓ Return Confirmed · Awaiting Lender Review
          </Button>
        ) : isEndReached ? (
          <Button
            onPress={() => {
              setReturnNotice(
                "Add at least 6 photos and 1 video before confirming return.",
              );
            }}
          >
            Confirm Item Return
          </Button>
        ) : (
          <View style={{ gap: 4 }}>
            <Button disabled secondary onPress={() => {}}>
              {`Available from ${formatMalaysiaDateTime(endMs)}`}
            </Button>
            <Text style={[s.caption, { textAlign: "center", color: colors.muted }]}>
              {`Item return unlocks at ${formatMalaysiaDateTime(endMs)}`}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <Screen back title="Rental details">
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Text style={[s.h2, { flex: 1 }]}>Rental Confirmation</Text>
          <Badge
            text={confirmationStatus[b.status] || b.status}
            green={["upcoming", "confirmed", "active", "completed"].includes(b.status)}
          />
        </View>
        <Text style={[s.bold, { fontSize: 17 }]}>{b.title}</Text>
        <Text style={s.body}>
          Renter: {renterName} · Lender: {lenderName}
        </Text>
        <View style={[s.divider, { marginVertical: 4 }]} />
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <Text style={[s.body, { flex: 1, fontWeight: "700" }]}>Rental period</Text>
          <View style={{ alignItems: "flex-end", gap: 2 }}>
            <Text style={[s.body, { textAlign: "right" }]}>
              {formatMalaysiaDateTime(b.start)}
            </Text>
            <Text style={[s.body, { textAlign: "right" }]}>
              to {formatMalaysiaDateTime(b.effectiveReturnDeadline || b.scheduledReturn || b.end)}
            </Text>
            <Text style={s.caption}>
              {b.quote.days} {b.quote.days === 1 ? "day" : "days"} · Delivery Only
            </Text>
          </View>
        </View>
      </Card>

      <Card>
        <Image
          source={{ uri: b.image }}
          style={{ width: "100%", height: 190, borderRadius: 12 }}
        />
        <Text style={s.h2}>{b.title}</Text>
        <Text style={s.caption}>
          {owner ? "Renter" : "Lender"}: {other?.name} ·{" "}
          {other?.verification.replace("_", " ")}
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

      {/* PENDING APPROVAL */}
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
              <Row
                label="Rental Risk Score"
                value={`${b.riskScore}/100 (${currentRisk?.label || "Low"})`}
              />
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

      {/* APPROVED / CHECKOUT */}
      {b.status === "approved" && !owner && (
        <Card>
          <Text style={s.h2}>Your item is reserved</Text>
          <Notice text="Simulated FPX Checkout (Demo). No real funds or banking credentials required. Booking will be confirmed automatically." />
          <Chips
            options={[
              "Demo FPX",
            ]}
            selected="Demo FPX"
            onSelect={() => {}}
          />
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
        </Card>
      )}

      {b.status === "approved" && owner && (
        <Notice text="Approved. Waiting for renter to complete demo checkout." />
      )}

      {/* UPCOMING / DELIVERY FULFILMENT */}
      {b.status === "upcoming" && (
        <Card>
          <Text style={s.h2}>Upcoming Rental (Confirmed)</Text>
          <Text style={s.caption}>
            Fulfilment is delivery-only. Rental automatically activates at scheduled start time ({b.scheduledPickup || b.start}).
          </Text>

          <View style={{ marginVertical: 12, gap: 8 }}>
            <Row
              label="Scheduled Rental Start"
              value={formatMalaysiaDateTime(b.scheduledPickup || b.start) || (b.scheduledPickup || b.start)}
              strong
            />
            <Row
              label="Scheduled Return"
              value={formatMalaysiaDateTime(b.scheduledReturn || b.end) || (b.scheduledReturn || b.end)}
            />
            <Row
              label="Delivery Receipt"
              value={
                b.renterReceivedAt
                  ? `✓ Delivery Received (${new Date(b.renterReceivedAt).toLocaleTimeString()})`
                  : "Awaiting Delivery Receipt"
              }
              strong={!!b.renterReceivedAt}
            />
          </View>

          {/* Option A Delayed Schedule Conflict Card (if applicable) */}
          {b.conflictOffer && (
            <View style={{ backgroundColor: "#FFF8E7", borderColor: "#FFE08A", borderWidth: 1, borderRadius: 10, padding: 14, marginVertical: 10 }}>
              <Text style={[s.bold, { color: "#975A16" }]}>
                ⚠️ Scheduling Conflict — Revised Rental Offer Required (Demo)
              </Text>
              <Text style={[s.caption, { color: "#744210", marginTop: 4 }]}>
                A schedule overlap was detected with a subsequent confirmed booking. In accordance with Founder Option A, the next booking is protected. Review your revised rental terms below:
              </Text>
              <View style={{ marginTop: 8, gap: 4 }}>
                <Row label="Revised Return Deadline" value={new Date(b.conflictOffer.revisedEnd).toLocaleString()} />
                <Row label="Revised Billable Days" value={`${b.conflictOffer.revisedRentalDays} days`} />
                <Row label="Original Rental Fee" value={money(b.conflictOffer.originalRentalFee)} />
                <Row label="Revised Rental Fee" value={money(b.conflictOffer.revisedRentalFee)} />
                <Row label="Simulated Refund" value={money(b.conflictOffer.refundAmount)} strong />
                <Row label="Deposit Retained" value={money(b.conflictOffer.depositRetained)} />
              </View>
              {!owner ? (
                <Button
                  onPress={() => run({ type: "acceptRevisedRental", bookingId: id })}
                >
                  Accept Revised Rental Offer & Activate
                </Button>
              ) : (
                <Notice text="Waiting for renter to review and accept the revised conflict-free schedule." />
              )}
            </View>
          )}

          {/* Renter Action Buttons (Two-Button Time-Gated Design) */}
          {!owner && !b.conflictOffer && renderRenterActionButtons()}

          {/* Cancellation Window */}
          <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: "#EEE", paddingTop: 12 }}>
            <Text style={s.caption}>
              Cancellation Cutoff: Free cancellation until at least 24 hours before scheduled start ({formatMalaysiaDateTime(b.scheduledPickup || b.start) || (b.scheduledPickup || b.start)}).
            </Text>
            {cancelEligible ? (
              <Button
                secondary
                onPress={() => operation("cancel")}
              >
                Cancel Booking (100% Refund & RM0 Fee)
              </Button>
            ) : (
              <Notice text="Cancellation window closed. Free cancellation is only available at least 24 hours before scheduled start." />
            )}
          </View>
        </Card>
      )}

      {/* ACTIVE RENTAL / CONSECUTIVE EXTENSION (PHASE 4) */}
      {b.status === "active" && (
        <>
          <Card>
            <Text style={s.h2}>Rental is Active</Text>
            <Text style={s.body}>
              Item is currently in renter's possession. The rental clock runs toward the scheduled return deadline.
            </Text>
            <View style={{ marginVertical: 10, gap: 6 }}>
              <Row
                label="Scheduled Rental Start"
                value={formatMalaysiaDateTime(b.scheduledPickup || b.start) || (b.scheduledPickup || b.start)}
              />
              <Row
                label="Effective Return Deadline"
                value={formatMalaysiaDateTime(b.effectiveReturnDeadline || b.scheduledReturn || b.end) || (b.effectiveReturnDeadline || b.scheduledReturn || b.end)}
                strong
              />
              <Row label="Refundable Deposit" value={`${money(b.quote.deposit)} (Held)`} />
              <Row
                label="Delivery Receipt"
                value={
                  b.renterReceivedAt
                    ? `✓ Delivery Received (${new Date(b.renterReceivedAt).toLocaleTimeString()})`
                    : "Awaiting acknowledgement"
                }
                strong={!!b.renterReceivedAt}
              />
            </View>

            {/* Renter Action Buttons (Two-Button Time-Gated Design) */}
            {!owner && renderRenterActionButtons()}

            {/* Consecutive Chain Extension (Phase 4) */}
            {!owner && (
              <View style={{ backgroundColor: "#F0F9FF", borderColor: "#BAE6FD", borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 12 }}>
                <Text style={[s.bold, { color: "#0369A1" }]}>
                  Extend Rental (Consecutive Chain)
                </Text>
                <Text style={[s.caption, { color: "#0284C7", marginTop: 4 }]}>
                  Keep the item longer without interrupting your rental. Charges additional daily rental and 5% service fee (min RM5) with RM0 extra deposit.
                </Text>
                <Chips
                  options={["1", "2", "3", "5"]}
                  selected={extensionDays}
                  onSelect={setExtensionDays}
                />
                <View style={{ marginVertical: 6, gap: 4 }}>
                  <Row label="Additional Days" value={`${extDaysNum} days`} />
                  <Row label="Additional Rental Fee" value={money(extRentalFee)} />
                  <Row label="Additional Service Fee" value={money(extServiceFee)} />
                  <Row label="Extra Security Deposit" value="RM0.00 (Retains first deposit)" strong />
                  <Row label="Total Extension Charge" value={money(extTotal)} strong />
                </View>
                <Button
                  onPress={() =>
                    run({
                      type: "consecutiveExtend",
                      bookingId: id,
                      additionalDays: extDaysNum,
                    })
                  }
                >
                  Confirm Extension ({money(extTotal)} · Demo)
                </Button>
              </View>
            )}

            {b.chainBookings && b.chainBookings.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={s.bold}>Chain Extension History:</Text>
                {b.chainBookings.map((chain, idx) => (
                  <Text key={idx} style={s.caption}>
                    • {chain}
                  </Text>
                ))}
              </View>
            )}
          </Card>
        </>
      )}

      {/* CONDITION EVIDENCE (SECTION 4.4 & 14.3 - NEVER EMPTY) */}
      <Section title="Condition Evidence" />

      {/* STAGE 1: CHECK-IN — AFTER DELIVERY */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <Text style={s.h2}>Check-in — After Delivery</Text>
          {checkInEvidence ? (
            <Badge text="Check-in Recorded" green />
          ) : isDelivered ? (
            <Badge text="Check-in Active" />
          ) : (
            <Badge text="Pending Delivery" />
          )}
        </View>

        {!isDelivered ? (
          <>
            <Text style={s.caption}>
              Condition evidence will be available after the item is delivered.
            </Text>
            <MediaPicker
              disabled
              photos={[]}
              onPhotosChange={() => {}}
              videos={[]}
              onVideosChange={() => {}}
              minPhotos={6}
              minVideos={1}
            />
          </>
        ) : checkInEvidence ? (
          <View style={{ gap: 8, marginTop: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[s.caption, { fontWeight: "700", color: colors.navy }]}>
                {(checkInEvidence.photos?.length || (checkInEvidence.photo ? 1 : 0))} photos · {(checkInEvidence.videos?.length || 0)} video(s)
              </Text>
              <Text style={s.caption}>
                {new Date(checkInEvidence.createdAt).toLocaleString()}
              </Text>
            </View>
            <MediaPicker
              disabled
              photos={
                checkInEvidence.photos && checkInEvidence.photos.length > 0
                  ? checkInEvidence.photos
                  : (checkInEvidence.photo ? [checkInEvidence.photo] : [])
              }
              onPhotosChange={() => {}}
              videos={checkInEvidence.videos || []}
              onVideosChange={() => {}}
              minPhotos={6}
              minVideos={1}
            />
            <Text style={s.body}>{checkInEvidence.notes || "Check-in condition evidence recorded."}</Text>
            <Text style={s.caption}>
              Submitted by {state.profiles.find((p) => p.id === checkInEvidence.authorId)?.name || "Renter"}
            </Text>
          </View>
        ) : !owner ? (
          <>
            <Text style={s.caption}>
              Upload condition media upon delivery. You must submit at least 6 photos and 1 video to record check-in condition.
            </Text>
            <MediaPicker
              photos={checkInPhotos}
              onPhotosChange={setCheckInPhotos}
              videos={checkInVideos}
              onVideosChange={setCheckInVideos}
              minPhotos={6}
              minVideos={1}
              samplePrefix="renter-checkin"
            />
            <Field
              label="Check-in condition notes"
              value={checkInNotes}
              onChangeText={setCheckInNotes}
              multiline
              placeholder="Confirm delivered item condition, included accessories, and initial inspection."
            />
            <Button
              disabled={checkInPhotos.length < 6 || checkInVideos.length < 1}
              onPress={() =>
                run({
                  type: "conditionEvidence",
                  bookingId: id,
                  kind: "check_in",
                  photos: checkInPhotos,
                  videos: checkInVideos,
                  notes: checkInNotes,
                })
              }
            >
              Submit Check-in Evidence
            </Button>
          </>
        ) : (
          <>
            <Notice text="Waiting for renter to upload check-in condition evidence upon delivery." />
            <MediaPicker
              disabled
              photos={[]}
              onPhotosChange={() => {}}
              videos={[]}
              onVideosChange={() => {}}
              minPhotos={6}
              minVideos={1}
            />
          </>
        )}
        {renderIssueReport("check_in", isDelivered)}
      </Card>

      {/* STAGE 2: CHECK-OUT — BEFORE RETURN */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <Text style={s.h2}>Check-out — Before Return</Text>
          {b.status === "completed" ? (
            <Badge text="Settled — No Issues" green />
          ) : checkOutEvidence || b.renterReturnConfirmedAt ? (
            <Badge text="Return Confirmed" />
          ) : isReturnEligible ? (
            <Badge text="Return Active" />
          ) : (
            <Badge text="Pending Active Rental" />
          )}
        </View>

        {!!returnNotice && (
          <View style={{ marginBottom: 10 }}>
            <Notice text={returnNotice} />
          </View>
        )}

        {!isReturnEligible ? (
          <>
            <Text style={s.caption}>
              Check-out condition evidence will be available before return.
            </Text>
            <MediaPicker
              disabled
              photos={[]}
              onPhotosChange={() => {}}
              videos={[]}
              onVideosChange={() => {}}
              minPhotos={6}
              minVideos={1}
            />
            {renderIssueReport("check_out", false)}
          </>
        ) : !owner ? (
          <>
            {b.renterReturnConfirmedAt ? (
              <>
                <View style={{ gap: 8, marginTop: 4 }}>
                  <View style={{ backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0", padding: 10, borderRadius: 8 }}>
                    <Text style={[s.bold, { color: "#065F46" }]}>
                      ✓ Return Confirmed · Awaiting Lender Review
                    </Text>
                    <Text style={[s.caption, { color: "#047857", marginTop: 2 }]}>
                      Your return evidence has been submitted. Your simulated security deposit remains held until the lender completes the return inspection.
                    </Text>
                  </View>
                  {checkOutEvidence && (
                    <>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={[s.caption, { fontWeight: "700", color: colors.navy }]}>
                          {(checkOutEvidence.photos?.length || (checkOutEvidence.photo ? 1 : 0))} photos · {(checkOutEvidence.videos?.length || 0)} video(s)
                        </Text>
                        <Text style={s.caption}>
                          {new Date(checkOutEvidence.createdAt).toLocaleString()}
                        </Text>
                      </View>
                      <MediaPicker
                        disabled
                        photos={
                          checkOutEvidence.photos && checkOutEvidence.photos.length > 0
                            ? checkOutEvidence.photos
                            : (checkOutEvidence.photo ? [checkOutEvidence.photo] : [])
                        }
                        onPhotosChange={() => {}}
                        videos={checkOutEvidence.videos || []}
                        onVideosChange={() => {}}
                        minPhotos={6}
                        minVideos={1}
                      />
                      <Text style={s.body}>{checkOutEvidence.notes || "Check-out condition evidence recorded."}</Text>
                    </>
                  )}
                </View>
                {renderIssueReport("check_out", isReturnEligible)}
              </>
            ) : (
              <>
                <Text style={s.caption}>
                  Upload return condition media. You must submit at least 6 photos and 1 video before confirming return.
                </Text>
                <MediaPicker
                  photos={returnPhotos}
                  onPhotosChange={setReturnPhotos}
                  videos={returnVideos}
                  onVideosChange={setReturnVideos}
                  minPhotos={6}
                  minVideos={1}
                  samplePrefix="renter-return"
                />
                <Field
                  label="Return condition notes"
                  value={returnNotes}
                  onChangeText={setReturnNotes}
                  multiline
                  placeholder="Confirm all accessories are included and condition is clean."
                />
                {renderIssueReport("check_out", isReturnEligible)}
                <Button
                  disabled={returnPhotos.length < 6 || returnVideos.length < 1}
                  onPress={() =>
                    run({
                      type: "returnConfirm",
                      bookingId: id,
                      role: "renter",
                      photos: returnPhotos,
                      videos: returnVideos,
                      notes: returnNotes,
                    })
                  }
                >
                  Confirm Return
                </Button>
              </>
            )}
          </>
        ) : (
          /* LENDER VIEW: Read-only shared media + Two Decision Buttons */
          <>
            {checkOutEvidence ? (
              <View style={{ gap: 8, marginTop: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={[s.caption, { fontWeight: "700", color: colors.navy }]}>
                    Renter Return Media: {(checkOutEvidence.photos?.length || (checkOutEvidence.photo ? 1 : 0))} photos · {(checkOutEvidence.videos?.length || 0)} video(s)
                  </Text>
                  <Text style={s.caption}>
                    {new Date(checkOutEvidence.createdAt).toLocaleString()}
                  </Text>
                </View>
                <MediaPicker
                  disabled
                  photos={
                    checkOutEvidence.photos && checkOutEvidence.photos.length > 0
                      ? checkOutEvidence.photos
                      : (checkOutEvidence.photo ? [checkOutEvidence.photo] : [])
                  }
                  onPhotosChange={() => {}}
                  videos={checkOutEvidence.videos || []}
                  onVideosChange={() => {}}
                  minPhotos={6}
                  minVideos={1}
                />
                <Text style={s.body}>{checkOutEvidence.notes || "Check-out condition evidence recorded by renter."}</Text>
                <Text style={s.caption}>
                  Submitted by {state.profiles.find((p) => p.id === checkOutEvidence.authorId)?.name || "Renter"}
                </Text>
              </View>
            ) : (
              <>
                <Notice text="Waiting for renter to upload return condition evidence and submit check-out confirmation." />
                <MediaPicker
                  disabled
                  photos={[]}
                  onPhotosChange={() => {}}
                  videos={[]}
                  onVideosChange={() => {}}
                  minPhotos={6}
                  minVideos={1}
                />
              </>
            )}

            {renderIssueReport("check_out", isReturnEligible)}

            {["active", "return_pending"].includes(b.status) && (
              <View style={{ marginTop: 14, gap: 10 }}>
                <Button
                  disabled={!b.renterReturnConfirmedAt || !!dispute}
                  onPress={() =>
                    run({
                      type: "returnConfirm",
                      bookingId: id,
                      role: "owner",
                      notes: "Owner inspection confirmed clean — No Issue",
                    })
                  }
                >
                  No Issue – End Rental
                </Button>

                <Button
                  danger
                  secondary
                  onPress={() => {
                    setDispute(!dispute);
                    setDisputePhotos([]);
                    setDisputeVideos([]);
                    setDisputeNotes("");
                  }}
                >
                  {dispute ? "Close Dispute Form" : "Apply Dispute"}
                </Button>

                {!b.renterReturnConfirmedAt && (
                  <Text style={[s.caption, { textAlign: "center" }]}>
                    "No Issue – End Rental" is disabled until renter completes check-out and confirms return.
                  </Text>
                )}
              </View>
            )}

            {b.status === "completed" && (
              <View style={{ backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0", padding: 10, borderRadius: 8, marginTop: 12 }}>
                <Text style={[s.bold, { color: "#065F46" }]}>
                  ✓ Rental Concluded — No Issues
                </Text>
                <Text style={[s.caption, { color: "#047857", marginTop: 2 }]}>
                  Full simulated deposit released to renter. Clean completion settled.
                </Text>
              </View>
            )}
          </>
        )}
      </Card>

      {/* DISPUTE FORM (WHEN OPEN) */}
      {dispute && (
        <Card>
          <Text style={s.h2}>Raise a Dispute</Text>
          <Text style={s.caption}>
            Reporting damage or an issue immediately pauses clean completion and holds the simulated deposit.
          </Text>
          <Text style={s.label}>Category</Text>
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
            label="Describe the issue in detail"
            value={disputeNotes}
            onChangeText={setDisputeNotes}
            multiline
            placeholder="Provide specific details of damage or missing items."
          />
          <MediaPicker
            title="Dispute Evidence Media"
            subtitle="Attach photos and/or videos documenting damage, defect or missing accessories."
            photos={disputePhotos}
            onPhotosChange={setDisputePhotos}
            videos={disputeVideos}
            onVideosChange={setDisputeVideos}
            minPhotos={1}
            minVideos={0}
            samplePrefix="dispute"
          />
          <Button
            danger
            disabled={disputeNotes.trim().length < 10 || disputePhotos.length === 0}
            onPress={() =>
              run({
                type: "dispute",
                bookingId: id,
                reason: disputeNotes,
                category: disputeCategory,
                photo: disputePhotos[0],
              })
            }
          >
            Submit Dispute & Freeze Deposit
          </Button>
        </Card>
      )}

      {/* DISPUTE RESOLUTION FIXTURES (PHASE 5) */}
      {b.status === "disputed" && (
        <Card>
          <Text style={s.h2}>⚠️ Dispute Under Review (Demo)</Text>
          <Notice text="Deposit release is paused. CurRENT does not expose admin powers to users; use these founder-authorised fictional scenarios to demonstrate dispute resolution and scoring effects." />

          {state.disputes
            .filter((d) => d.bookingId === id)
            .map((d) => (
              <View key={d.id} style={{ marginVertical: 10, padding: 12, backgroundColor: "#FFF5F5", borderRadius: 8 }}>
                <Badge text={d.status} />
                <Text style={[s.bold, { marginTop: 4 }]}>{d.category || "Dispute"}</Text>
                <Text style={s.body}>{d.reason}</Text>

                {d.status === "under_review" && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    <Text style={s.bold}>Demo Resolution Fixtures:</Text>
                    <Button
                      secondary
                      onPress={() =>
                        run({
                          type: "resolveDispute",
                          disputeId: d.id,
                          scenario: "minor_damage",
                        })
                      }
                    >
                      Resolve: Minor Damage (-10 Score, RM150 Deducted, Remainder Released)
                    </Button>
                    <Button
                      secondary
                      onPress={() =>
                        run({
                          type: "resolveDispute",
                          disputeId: d.id,
                          scenario: "serious_damage",
                        })
                      }
                    >
                      Resolve: Serious Damage (-30 Score, Full Deposit Applied)
                    </Button>
                    <Button
                      secondary
                      onPress={() =>
                        run({
                          type: "resolveDispute",
                          disputeId: d.id,
                          scenario: "rejected",
                        })
                      }
                    >
                      Resolve: Claim Rejected (100% Deposit Released, No Penalty)
                    </Button>
                  </View>
                )}
              </View>
            ))}
        </Card>
      )}

      {/* COMPLETED STATUS */}
      {b.status === "completed" && (
        <Card>
          <Text style={[s.h2, { color: "#00875A" }]}>✓ Rental Successfully Completed</Text>
          <Text style={s.body}>
            Mutual clean return confirmed. Refundable deposit has been released in full (Simulated).
          </Text>
        </Card>
      )}

      {/* PAYMENT BREAKDOWN */}
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
        <View style={s.divider} />
        <Row label="Total payable" value={money(b.quote.total)} strong />
        <Row label="Payment status" value={b.payment} />
        <Row label="Deposit status" value={b.deposit.replace("_", " ")} />
        {b.paymentMethod && <Row label="Method" value={b.paymentMethod} />}
        {owner && (
          <>
            <View style={s.divider} />
            <Row
              label="Platform commission · 12%"
              value={money(payout.commission)}
            />
            <Row
              label={
                b.status === "completed"
                  ? "Net owner payout (Simulated)"
                  : "Estimated net owner payout (88%)"
              }
              value={money(payout.payout)}
              strong
            />
          </>
        )}
      </Card>


      {/* REVIEWS — HOW DID IT GO? */}
      {b.status === "completed" && (
        <>
          <Section title="How did it go?" />
          {myReview ? (
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[s.bold, { fontSize: 16, color: "#D97706" }]}>
                    {"★".repeat(myReview.rating)}{"☆".repeat(5 - myReview.rating)}
                  </Text>
                  <Badge text={`${myReview.rating} / 5 Stars`} green />
                </View>
                <Text style={s.caption}>Your review</Text>
              </View>
              <Text style={s.body}>{myReview.text || "Review submitted."}</Text>
              <Text style={[s.caption, { marginTop: 6 }]}>
                Reviewed by {user.name} ({owner ? "Lender" : "Renter"}) · Counterparty: {other?.name || "Participant"}
              </Text>
            </Card>
          ) : (
            <Card>
              <Text style={[s.caption, { marginBottom: 8 }]}>
                {owner
                  ? `Rate your rental experience with ${other?.name || "the renter"}.`
                  : `Rate your rental experience with ${other?.name || "the lender"}.`}
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginVertical: 8 }}>
                {["1", "2", "3", "4", "5"].map((val) => {
                  const isSelected = rating === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      accessibilityRole="button"
                      accessibilityLabel={`${val} star rating`}
                      onPress={() => setRating(val)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: isSelected ? colors.blue : "#F1F5F9",
                        borderWidth: 1.5,
                        borderColor: isSelected ? colors.blue : "#CBD5E1",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color: isSelected ? "#FFFFFF" : colors.navy,
                        }}
                      >
                        {val}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
          )}

          {otherReview && (
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[s.bold, { fontSize: 16, color: "#D97706" }]}>
                    {"★".repeat(otherReview.rating)}{"☆".repeat(5 - otherReview.rating)}
                  </Text>
                  <Badge text={`${otherReview.rating} / 5 Stars`} />
                </View>
                <Text style={s.caption}>Counterparty review</Text>
              </View>
              <Text style={s.body}>{otherReview.text || "Review submitted."}</Text>
              <Text style={[s.caption, { marginTop: 6 }]}>
                Reviewed by {other?.name || "Counterparty"} ({owner ? "Renter" : "Lender"})
              </Text>
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
