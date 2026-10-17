import { useEffect, useRef, useState } from "react";
import { Image, Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { Redirect, router, useLocalSearchParams, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Badge,
  Button,
  Card,
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
import { HoldToConfirmButton } from "../../components/HoldToConfirm";
import { BookingSummary } from "../../components/BookingSummary";
import { deriveDisplayDelivery } from "../../services/delivery";
import {
  formatMalaysiaDateTime,
  getEffectiveBookingStatus,
  isCancellationEligible,
  money,
  parseMalaysiaTimestamp,
  riskFor,
} from "../../services/booking";
import {
  getIssueReportPermissions,
  isLenderDisputeEligible,
  type Action,
} from "../../services/marketplace";

export default function RentalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, user, actAndPersist } = useMarketplace();
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [cancelConfirmationVisible, setCancelConfirmationVisible] =
    useState(false);
  const [cancelError, setCancelError] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSavingAction, setIsSavingAction] = useState(false);
  const cancellationInProgress = useRef(false);
  const [checkInPhotos, setCheckInPhotos] = useState<string[]>([]);
  const [checkInVideos, setCheckInVideos] = useState<string[]>([]);
  const [checkInNotes, setCheckInNotes] = useState("");
  const [checkInIssue, setCheckInIssue] = useState("");
  const [returnPhotos, setReturnPhotos] = useState<string[]>([]);
  const [returnVideos, setReturnVideos] = useState<string[]>([]);
  const [returnNotes, setReturnNotes] = useState("");
  const [checkOutIssue, setCheckOutIssue] = useState("");
  const [rating, setRating] = useState("5");
  const [review, setReview] = useState("");
  const [returnNotice, setReturnNotice] = useState("");
  const [checkOutOffset, setCheckOutOffset] = useState<number | null>(null);
  const [scrollToY, setScrollToY] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [correctedDeliveryAddress, setCorrectedDeliveryAddress] = useState("");
  const [correctedDeliveryPostcode, setCorrectedDeliveryPostcode] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

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

  if (b.status === "payment_required" && b.renterId === user.id) {
    return <Screen back title="Finish Rental Checkout">
      <BookingSummary booking={b} listing={state.listings.find((listing) => listing.id === b.listingId)} />
      <Card>
        <Text style={s.h2}>{b.title}</Text>
        <Row label="Rental payment" value="Not completed" />
        <Row label="Delivery demo payment" value={b.deliveryDemo?.status === "paid_demo" ? "Demo Payment Completed" : "Required"} />
        <Notice text="The delivery simulation and CurRENT rental payment are separate. No real funds have been charged." />
        <Button onPress={() => router.push({ pathname: "/listing/[id]", params: { id: b.listingId, checkoutId: b.id } })}>
          Resume Checkout
        </Button>
      </Card>
    </Screen>;
  }

  const effectiveStatus = getEffectiveBookingStatus(b, now);
  const rental = { ...b, status: effectiveStatus };
  const owner = user.id === b.ownerId;
  const other = state.profiles.find(
    (p) => p.id === (owner ? b.renterId : b.ownerId),
  );
  const renterName =
    state.profiles.find((p) => p.id === b.renterId)?.name || "Renter";
  const lenderName =
    state.profiles.find((p) => p.id === b.ownerId)?.name || "Lender";
  const renter = state.profiles.find((profile) => profile.id === b.renterId);
  const currentRisk = renter ? riskFor(state, renter) : null;
  const listing = state.listings.find((l) => l.id === b.listingId);
  const displayDelivery = deriveDisplayDelivery({
    collectionMethod: b.collectionMethod,
    deliveryDemo: b.deliveryDemo || null,
    pickupLocation: listing?.privateMeetingVenue || listing?.location || b.deliveryDemo?.origin || "",
    deliveryAddress: b.deliveryAddress,
    pickupPostcode: listing?.pickupPostcode,
    deliveryPostcode: b.deliveryPostcode,
    demoBooking: b.contextMode === "admin_demo" && b.id.startsWith("demo-"),
    listingId: b.listingId,
  });
  const startMs = parseMalaysiaTimestamp(b.start);
  const endMs = parseMalaysiaTimestamp(b.end);
  const isStartReached = now >= startMs;
  const isEndReached = now >= endMs;

  const steps = ["Confirmed", "Delivery", "Active", "Return", "Complete"];
  const stepIndex =
    (
      {
        upcoming: 0,
        active: 2,
        return_pending: 3,
        completed: 4,
        disputed: 3,
        cancelled: -1,
      } as Record<string, number>
    )[effectiveStatus] ?? -1;

  async function run(action: Action) {
    if (isSavingAction) return;
    try {
      setIsSavingAction(true);
      setError("");
      setSuccessNotice("");
      await actAndPersist(action);
      setCheckInPhotos([]);
      setCheckInVideos([]);
      setCheckInNotes("");
      setReturnPhotos([]);
      setReturnVideos([]);
      setReturnNotes("");
      if (action.type === "returnConfirm" && action.role === "owner") {
        setSuccessNotice(
          "Rental completed. The simulated deposit ledger was released once; no real money was transferred.",
        );
      } else if (action.type === "returnConfirm") {
        setSuccessNotice(
          "Return evidence and confirmation were saved. The simulated deposit remains held for lender review.",
        );
      } else if (action.type === "conditionEvidence") {
        setSuccessNotice("Condition evidence submitted and saved.");
      } else if (action.type === "reportIssue") {
        setSuccessNotice("Issue report submitted and saved for the lender.");
      } else if (action.type === "confirmReceived") {
        setSuccessNotice("Delivery receipt saved.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSavingAction(false);
    }
  }

  function operation(
    operation: Extract<Action, { type: "booking" }>["operation"],
  ) {
    if (operation !== "cancel") return;
    setCancelError("");
    setCancelConfirmationVisible(true);
  }

  async function confirmCancellation() {
    if (cancellationInProgress.current) return;
    cancellationInProgress.current = true;
    setIsCancelling(true);
    setCancelError("");
    try {
      await actAndPersist({ type: "booking", id, operation: "cancel" });
      setCancelConfirmationVisible(false);
      setSuccessNotice(
        "Booking cancelled. The simulated ledger now shows the rental and service fees as refunded and the deposit as released. No real payment or refund occurred.",
      );
    } catch (e) {
      setCancelError((e as Error).message);
    } finally {
      cancellationInProgress.current = false;
      setIsCancelling(false);
    }
  }

  const cancelEligible = isCancellationEligible(b.start);
  const lenderCancelEligible =
    effectiveStatus === "upcoming" && b.payment === "paid" && cancelEligible;
  const existingDispute = state.disputes.find((d) => d.bookingId === b.id);
  const disputeEligible = isLenderDisputeEligible(b, now);
  const reviewEligible = effectiveStatus === "completed" && isEndReached;

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
    ["active", "return_pending", "completed", "disputed"].includes(
      effectiveStatus,
    );
  const isReturnEligible =
    (effectiveStatus === "active" && isEndReached) ||
    ["return_pending", "completed", "disputed"].includes(effectiveStatus);
  function renderIssueReport(
    stage: "check_in" | "check_out",
    stageAvailable: boolean,
  ) {
    const report = state.issueReports?.find(
      (item) => item.bookingId === rental.id && item.stage === stage,
    );
    const { canEdit, canSubmit } = getIssueReportPermissions({
      stage,
      status: rental.status,
      stageAvailable,
      isLender: owner,
      reportSubmitted: Boolean(report),
    });
    const value = stage === "check_in" ? checkInIssue : checkOutIssue;
    const setValue = stage === "check_in" ? setCheckInIssue : setCheckOutIssue;
    const comment = report?.text ?? (owner ? "" : value);

    return (
      <View style={{ marginTop: 14, gap: 8 }}>
        <Text style={s.bold}>Report an Issue</Text>
        <Field
          label="Issue details"
          value={comment}
          onChangeText={owner || report ? undefined : setValue}
          editable={canEdit}
          multiline
          style={
            !canEdit
              ? { backgroundColor: colors.lightGrey, color: colors.muted }
              : undefined
          }
        />
        {report && (
          <Text style={s.caption}>
            Submitted by renter · {formatMalaysiaDateTime(report.createdAt)} MYT
          </Text>
        )}
        {!owner && !report && canSubmit && (
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
        )}
      </View>
    );
  }

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
          <HoldToConfirmButton
            label="Hold to Confirm — Delivered item successfully received"
            disabled={isSavingAction}
            onConfirm={() => run({ type: "confirmReceived", bookingId: id })}
          />
        ) : (
          <View style={{ gap: 4 }}>
            <Button disabled secondary onPress={() => {}}>
              Confirm Received
            </Button>
            <Text
              style={[s.caption, { textAlign: "center", color: colors.muted }]}
            >
              {`Available from ${formatMalaysiaDateTime(startMs)}`}
            </Text>
          </View>
        )}

        {/* Lower Button: Confirm Item Return */}
        {b.renterReturnConfirmedAt ? (
          <Button disabled secondary onPress={() => {}}>
            ✓ Return Confirmed · Awaiting Lender Review
          </Button>
        ) : (
          <View style={{ gap: 4 }}>
            <Button
              disabled={!isEndReached}
              secondary={!isEndReached}
              onPress={() => {
                setReturnNotice(
                  "Add at least 6 photos and 1 video before confirming return.",
                );
                setScrollToY(checkOutOffset);
              }}
            >
              Confirm Item Return
            </Button>
            {!isEndReached && (
              <Text
                style={[
                  s.caption,
                  { textAlign: "center", color: colors.muted },
                ]}
              >
                {`Available from ${formatMalaysiaDateTime(endMs)}`}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <Screen back title="Rental details" scrollToY={scrollToY}>
      <Card>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text style={[s.h2, { flex: 1 }]}>Rental Confirmation</Text>
          <Badge
            text={confirmationStatus[effectiveStatus] || effectiveStatus}
            green={["upcoming", "confirmed", "active", "completed"].includes(
              effectiveStatus,
            )}
          />
        </View>
        <Text style={[s.bold, { fontSize: 17 }]}>{b.title}</Text>
        <Text style={s.body}>
          Renter: {renterName} · Lender: {lenderName}
        </Text>
        <View style={[s.divider, { marginVertical: 4 }]} />
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
        >
          <Text style={[s.body, { flex: 1, fontWeight: "700" }]}>
            Rental period
          </Text>
          <View style={{ alignItems: "flex-end", gap: 2 }}>
            <Text style={[s.body, { textAlign: "right" }]}>
              {formatMalaysiaDateTime(b.start)}
            </Text>
            <Text style={[s.body, { textAlign: "right" }]}>
              to {formatMalaysiaDateTime(b.end)}
            </Text>
            <Text style={s.caption}>
              {b.quote.days} {b.quote.days === 1 ? "day" : "days"} · Delivery
              Only
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
        <Button secondary onPress={() => router.push({ pathname: "/(tabs)/messages", params: { bookingId: b.id } })}>
          Message {other?.name.split(" ")[0] || "participant"}
        </Button>
      </Card>

      {owner && (
        <Card>
          <Text style={s.h2}>Lender Actions</Text>
          <Text style={s.caption}>
            Actions are enabled only when this rental reaches the relevant
            eligibility point.
          </Text>
          <View style={{ marginTop: 12, gap: 10 }}>
            <Button
              secondary
              disabled={!lenderCancelEligible}
              onPress={() => operation("cancel")}
            >
              Cancel Booking (100% Simulated Refund & RM0 Fee)
            </Button>
            <Button
              danger
              secondary
              disabled={!disputeEligible || !!existingDispute}
              onPress={() => router.push(`/dispute/${b.id}` as Href)}
            >
              Apply Dispute
            </Button>
            {existingDispute ? (
              <Text style={[s.caption, { textAlign: "center" }]}>
                Dispute status: PENDING. Further submissions are disabled.
              </Text>
            ) : !disputeEligible ? (
              <Text style={[s.caption, { textAlign: "center" }]}>
                {b.status === "cancelled"
                  ? "Cancelled bookings cannot be disputed."
                  : `Apply Dispute is available from ${formatMalaysiaDateTime(endMs)}.`}
              </Text>
            ) : null}
          </View>
        </Card>
      )}

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
      {!!successNotice && <Notice text={successNotice} />}

      {/* UPCOMING / DELIVERY FULFILMENT */}
      {effectiveStatus === "upcoming" && (
        <Card>
          <Text style={s.h2}>Upcoming Rental (Confirmed)</Text>
          <Text style={s.caption}>
            Fulfilment is delivery-only. The rental automatically displays
            Active at {formatMalaysiaDateTime(b.start)}.
          </Text>

          <View style={{ marginVertical: 12, gap: 8 }}>
            <Row
              label="Scheduled Rental Start"
              value={formatMalaysiaDateTime(b.start) || b.start}
              strong
            />
            <Row
              label="Scheduled Return"
              value={formatMalaysiaDateTime(b.end) || b.end}
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

          {/* Renter Action Buttons (Two-Button Time-Gated Design) */}
          {!owner && renderRenterActionButtons()}

          {/* Cancellation Window */}
          <View
            style={{
              marginTop: 14,
              borderTopWidth: 1,
              borderTopColor: "#EEE",
              paddingTop: 12,
            }}
          >
            <Text style={s.caption}>
              Cancellation Cutoff: Free cancellation until at least 24 hours
              before scheduled start (
              {formatMalaysiaDateTime(b.start) || b.start}
              ).
            </Text>
            {!owner &&
              (cancelEligible ? (
                <Button secondary onPress={() => operation("cancel")}>
                  Cancel Booking (100% Simulated Refund & RM0 Fee)
                </Button>
              ) : (
                <Notice text="Cancellation window closed. Free cancellation is only available at least 24 hours before scheduled start." />
              ))}
          </View>
        </Card>
      )}

      {/* ACTIVE RENTAL */}
      {effectiveStatus === "active" && (
        <>
          <Card>
            <Text style={s.h2}>Rental is Active</Text>
            <Text style={s.body}>
              Item is currently in renter's possession. The rental clock runs
              toward the scheduled return deadline.
            </Text>
            <View style={{ marginVertical: 10, gap: 6 }}>
              <Row
                label="Scheduled Rental Start"
                value={formatMalaysiaDateTime(b.start) || b.start}
              />
              <Row
                label="Scheduled Return"
                value={formatMalaysiaDateTime(b.end) || b.end}
                strong
              />
              <Row
                label="Refundable Deposit"
                value={`${money(b.quote.deposit)} (Held)`}
              />
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
          </Card>
        </>
      )}

      {/* CONDITION EVIDENCE (SECTION 4.4 & 14.3 - NEVER EMPTY) */}
      <Section title="Condition Evidence" />

      {/* STAGE 1: CHECK-IN — AFTER DELIVERY */}
      <Card>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
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
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={[s.caption, { fontWeight: "700", color: colors.navy }]}
              >
                {checkInEvidence.photos?.length ||
                  (checkInEvidence.photo ? 1 : 0)}{" "}
                photos · {checkInEvidence.videos?.length || 0} video(s)
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
                  : checkInEvidence.photo
                    ? [checkInEvidence.photo]
                    : []
              }
              onPhotosChange={() => {}}
              videos={checkInEvidence.videos || []}
              onVideosChange={() => {}}
              minPhotos={6}
              minVideos={1}
            />
            <Text style={s.body}>
              {checkInEvidence.notes || "Check-in condition evidence recorded."}
            </Text>
            <Text style={s.caption}>
              Submitted by{" "}
              {state.profiles.find((p) => p.id === checkInEvidence.authorId)
                ?.name || "Renter"}
            </Text>
          </View>
        ) : !owner ? (
          <>
            <Text style={s.caption}>
              Upload condition media upon delivery. You must submit at least 6
              photos and 1 video to record check-in condition.
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
      <Card
        onLayout={(event) => {
          const offset = event.nativeEvent.layout.y;
          setCheckOutOffset((current) =>
            current === offset ? current : offset,
          );
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <Text style={s.h2}>Check-out — Before Return</Text>
          {effectiveStatus === "completed" ? (
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
              {`Check-out condition evidence will be available from ${formatMalaysiaDateTime(endMs)}.`}
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
                  <View
                    style={{
                      backgroundColor: "#ECFDF5",
                      borderWidth: 1,
                      borderColor: "#A7F3D0",
                      padding: 10,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={[s.bold, { color: "#065F46" }]}>
                      ✓ Return Confirmed · Awaiting Lender Review
                    </Text>
                    <Text
                      style={[s.caption, { color: "#047857", marginTop: 2 }]}
                    >
                      Your return evidence has been submitted. Your simulated
                      security deposit remains held until the lender completes
                      the return inspection.
                    </Text>
                  </View>
                  {checkOutEvidence && (
                    <>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={[
                            s.caption,
                            { fontWeight: "700", color: colors.navy },
                          ]}
                        >
                          {checkOutEvidence.photos?.length ||
                            (checkOutEvidence.photo ? 1 : 0)}{" "}
                          photos · {checkOutEvidence.videos?.length || 0}{" "}
                          video(s)
                        </Text>
                        <Text style={s.caption}>
                          {new Date(
                            checkOutEvidence.createdAt,
                          ).toLocaleString()}
                        </Text>
                      </View>
                      <MediaPicker
                        disabled
                        photos={
                          checkOutEvidence.photos &&
                          checkOutEvidence.photos.length > 0
                            ? checkOutEvidence.photos
                            : checkOutEvidence.photo
                              ? [checkOutEvidence.photo]
                              : []
                        }
                        onPhotosChange={() => {}}
                        videos={checkOutEvidence.videos || []}
                        onVideosChange={() => {}}
                        minPhotos={6}
                        minVideos={1}
                      />
                      <Text style={s.body}>
                        {checkOutEvidence.notes ||
                          "Check-out condition evidence recorded."}
                      </Text>
                    </>
                  )}
                </View>
                {renderIssueReport(
                  "check_out",
                  isReturnEligible && isEndReached,
                )}
              </>
            ) : (
              <>
                <Text style={s.caption}>
                  Upload return condition media. You must submit at least 6
                  photos and 1 video before confirming return.
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
                {renderIssueReport(
                  "check_out",
                  isReturnEligible && isEndReached,
                )}
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
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={[
                      s.caption,
                      { fontWeight: "700", color: colors.navy },
                    ]}
                  >
                    Renter Return Media:{" "}
                    {checkOutEvidence.photos?.length ||
                      (checkOutEvidence.photo ? 1 : 0)}{" "}
                    photos · {checkOutEvidence.videos?.length || 0} video(s)
                  </Text>
                  <Text style={s.caption}>
                    {new Date(checkOutEvidence.createdAt).toLocaleString()}
                  </Text>
                </View>
                <MediaPicker
                  disabled
                  photos={
                    checkOutEvidence.photos &&
                    checkOutEvidence.photos.length > 0
                      ? checkOutEvidence.photos
                      : checkOutEvidence.photo
                        ? [checkOutEvidence.photo]
                        : []
                  }
                  onPhotosChange={() => {}}
                  videos={checkOutEvidence.videos || []}
                  onVideosChange={() => {}}
                  minPhotos={6}
                  minVideos={1}
                />
                <Text style={s.body}>
                  {checkOutEvidence.notes ||
                    "Check-out condition evidence recorded by renter."}
                </Text>
                <Text style={s.caption}>
                  Submitted by{" "}
                  {state.profiles.find(
                    (p) => p.id === checkOutEvidence.authorId,
                  )?.name || "Renter"}
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

            {renderIssueReport("check_out", isReturnEligible && isEndReached)}

            {["active", "return_pending"].includes(effectiveStatus) && (
              <View style={{ marginTop: 14, gap: 10 }}>
                <Button
                  disabled={isSavingAction || !b.renterReturnConfirmedAt}
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
                {!b.renterReturnConfirmedAt && (
                  <Text style={[s.caption, { textAlign: "center" }]}>
                    "No Issue – End Rental" is disabled until renter completes
                    check-out and confirms return.
                  </Text>
                )}
              </View>
            )}

            {effectiveStatus === "completed" && (
              <View
                style={{
                  backgroundColor: "#ECFDF5",
                  borderWidth: 1,
                  borderColor: "#A7F3D0",
                  padding: 10,
                  borderRadius: 8,
                  marginTop: 12,
                }}
              >
                <Text style={[s.bold, { color: "#065F46" }]}>
                  ✓ Rental Concluded — No Issues
                </Text>
                <Text style={[s.caption, { color: "#047857", marginTop: 2 }]}>
                  Full simulated deposit released to renter. Clean completion
                  settled.
                </Text>
              </View>
            )}
          </>
        )}
      </Card>

      {/* DISPUTE RESOLUTION FIXTURES (PHASE 5) */}
      {effectiveStatus === "disputed" && (
        <Card>
          <Text style={s.h2}>⚠️ Dispute Under Review (Demo)</Text>
          <Notice text="Deposit release is paused. CurRENT does not expose admin powers to users; use these founder-authorised fictional scenarios to demonstrate dispute resolution and scoring effects." />

          {state.disputes
            .filter((d) => d.bookingId === id)
            .map((d) => (
              <View
                key={d.id}
                style={{
                  marginVertical: 10,
                  padding: 12,
                  backgroundColor: "#FFF5F5",
                  borderRadius: 8,
                }}
              >
                <Badge text={d.status} />
                <Text style={[s.bold, { marginTop: 4 }]}>
                  {d.category || "Dispute"}
                </Text>
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
                      Resolve: Minor Damage (-10 Score, RM150 Deducted,
                      Remainder Released)
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
                      Resolve: Claim Rejected (100% Deposit Released, No
                      Penalty)
                    </Button>
                  </View>
                )}
              </View>
            ))}
        </Card>
      )}

      {/* COMPLETED STATUS */}
      {effectiveStatus === "completed" && (
        <Card>
          <Text style={[s.h2, { color: "#00875A" }]}>
            ✓ Rental Successfully Completed
          </Text>
          <Text style={s.body}>
            Mutual clean return confirmed. Refundable deposit has been released
            in full (Simulated).
          </Text>
        </Card>
      )}

      <BookingSummary booking={b} listing={listing} lender={owner} />
      {displayDelivery.estimatedTwoWayFee == null && b.contextMode !== "admin_demo" && !b.deliveryDemo && (
        <Card>
          <Text style={s.h2}>Delivery Address Required</Text>
          {!listing?.pickupPostcode ? (
            <>
              <Text style={s.body}>The lender must add a pickup postcode to show a delivery estimate.</Text>
              {owner && listing && <Button secondary onPress={() => router.push({ pathname: "/owner/edit", params: { id: listing.id } })}>Edit listing address</Button>}
            </>
          ) : owner ? (
            <Text style={s.body}>The renter must add a delivery postcode to show a delivery estimate.</Text>
          ) : (
            <>
              <Field label="Delivery address" value={correctedDeliveryAddress} onChangeText={setCorrectedDeliveryAddress} placeholder={b.deliveryAddress || "Enter delivery address"} />
              <Field label="Delivery postcode" value={correctedDeliveryPostcode} onChangeText={setCorrectedDeliveryPostcode} keyboardType="number-pad" maxLength={5} placeholder={b.deliveryPostcode || "5-digit postcode"} />
              <Button onPress={() => run({ type: "correctBookingDeliveryAddress", bookingId: b.id,
                deliveryAddress: correctedDeliveryAddress.trim() || b.deliveryAddress || "",
                deliveryPostcode: correctedDeliveryPostcode.trim() || b.deliveryPostcode || "" })}>
                Update delivery address
              </Button>
            </>
          )}
        </Card>
      )}
      {(displayDelivery.status === "paid_demo" || displayDelivery.status === "refunded_demo") && displayDelivery.receiptReference && (
        <Button secondary onPress={() => router.push({ pathname: "/delivery-receipt/[id]", params: { id: displayDelivery.receiptReference! } })}>
          View Delivery Receipt
        </Button>
      )}
      {/* ACTIVITY TIMELINE — derived from existing booking/dispute timestamps, no new storage */}
      <Section title="Activity Timeline" />
      <Card>
        {(() => {
          const events: { label: string; at: string }[] = [];
          events.push({ label: "Booking confirmed", at: b.createdAt });
          if (b.payment === "paid" || b.payment === "refunded") events.push({ label: "Payment completed (Demo)", at: b.createdAt });
          if (b.lenderHandoverAt) events.push({ label: "Item collected", at: b.lenderHandoverAt });
          if (b.activationTimestamp) events.push({ label: "Rental started", at: b.activationTimestamp });
          if (b.actualReturnTimestamp) events.push({ label: "Item returned", at: b.actualReturnTimestamp });
          if (b.renterReturnConfirmedAt) events.push({ label: "Renter confirmed return", at: b.renterReturnConfirmedAt });
          if (existingDispute) {
            events.push({ label: "Lender reported an issue", at: existingDispute.createdAt });
            events.push({ label: "Renter submitted a response", at: existingDispute.createdAt });
            events.push({ label: "Case under review (Demo)", at: existingDispute.createdAt });
          } else if (b.lenderReturnConfirmedAt) {
            events.push({ label: "Lender confirmed clean return", at: b.lenderReturnConfirmedAt });
          }
          if (!existingDispute && b.deposit === "released") events.push({ label: "Security deposit released", at: b.lenderReturnConfirmedAt || b.actualReturnTimestamp || b.end });
          if (b.status === "completed") events.push({ label: "Rental completed", at: b.lenderReturnConfirmedAt || b.actualReturnTimestamp || b.end });
          if (b.status === "cancelled") events.push({ label: `Booking cancelled${b.cancelledById === b.renterId ? " by renter" : " by lender"}`, at: b.cancelledAt || b.createdAt });
          if (b.payment === "refunded") events.push({ label: "Payment refunded (Demo)", at: b.cancelledAt || b.createdAt });
          events.sort((x, y) => x.at.localeCompare(y.at));
          return events.map((event, index) => (
            <View key={`${event.label}-${index}`} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.bold}>{event.label}</Text>
                <Text style={s.caption}>{formatMalaysiaDateTime(event.at)}</Text>
              </View>
            </View>
          ));
        })()}
        {existingDispute && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View Dispute Details"
            onPress={() => router.push(`/dispute/${b.id}` as Href)}
            style={{ marginTop: 10 }}
          >
            <Text style={{ color: colors.blue, fontWeight: "700" }}>View Dispute Details</Text>
          </Pressable>
        )}
      </Card>

      {/* REVIEWS — HOW DID IT GO? */}
      <>
        <Section title="How did it go?" />
        {!myReview && !reviewEligible && (
          <Notice
            text={`Rating and review will unlock after this rental is completed and the scheduled end time (${formatMalaysiaDateTime(endMs)}) has passed.`}
          />
        )}
        {myReview ? (
          <Card>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Text style={[s.bold, { fontSize: 16, color: "#D97706" }]}>
                  {"★".repeat(myReview.rating)}
                  {"☆".repeat(5 - myReview.rating)}
                </Text>
                <Badge text={`${myReview.rating} / 5 Stars`} green />
              </View>
              <Text style={s.caption}>Your review</Text>
            </View>
            <Text style={s.body}>{myReview.text || "Review submitted."}</Text>
            <Text style={[s.caption, { marginTop: 6 }]}>
              Reviewed by {user.name} ({owner ? "Lender" : "Renter"}) ·
              Counterparty: {other?.name || "Participant"}
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
                    accessibilityState={{ disabled: !reviewEligible }}
                    disabled={!reviewEligible}
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
                      opacity: reviewEligible ? 1 : 0.55,
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
              editable={reviewEligible}
              multiline
              placeholder="Help the community rent with confidence."
              style={
                !reviewEligible
                  ? { backgroundColor: colors.lightGrey, color: colors.muted }
                  : undefined
              }
            />
            <Button
              disabled={!reviewEligible || isSavingAction}
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
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Text style={[s.bold, { fontSize: 16, color: "#D97706" }]}>
                  {"★".repeat(otherReview.rating)}
                  {"☆".repeat(5 - otherReview.rating)}
                </Text>
                <Badge text={`${otherReview.rating} / 5 Stars`} />
              </View>
              <Text style={s.caption}>Counterparty review</Text>
            </View>
            <Text style={s.body}>
              {otherReview.text || "Review submitted."}
            </Text>
            <Text style={[s.caption, { marginTop: 6 }]}>
              Reviewed by {other?.name || "Counterparty"} (
              {owner ? "Renter" : "Lender"})
            </Text>
          </Card>
        )}
      </>
      <Modal
        visible={cancelConfirmationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isCancelling) setCancelConfirmationVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            accessibilityRole="alert"
            accessibilityViewIsModal
            style={styles.modalCard}
          >
            <Text style={s.h2}>Cancel booking?</Text>
            <Text style={s.body}>
              This will cancel the confirmed rental, mark the full rental and
              service fees as refunded in CurRENT&apos;s simulated ledger,
              release the held deposit, and restore availability. No real
              payment or refund will occur.
            </Text>
            {!!cancelError && <Notice text={cancelError} error />}
            <Button
              danger
              disabled={isCancelling}
              onPress={confirmCancellation}
            >
              {isCancelling ? "Saving cancellation…" : "Confirm cancellation"}
            </Button>
            <Button
              secondary
              disabled={isCancelling}
              onPress={() => setCancelConfirmationVisible(false)}
            >
              Keep booking
            </Button>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = {
  modalOverlay: {
    flex: 1,
    justifyContent: "center" as const,
    padding: 20,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  modalCard: {
    alignSelf: "center" as const,
    width: "100%" as const,
    maxWidth: 480,
    gap: 12,
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  timelineRow: {
    flexDirection: "row" as const,
    gap: 10,
    paddingVertical: 6,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.blue,
    marginTop: 6,
  },
};
