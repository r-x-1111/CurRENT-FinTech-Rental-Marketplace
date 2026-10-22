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
  RentalStatusBadge,
  Row,
  Screen,
  Section,
  s,
} from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import { HoldToConfirmButton } from "../../components/HoldToConfirm";
import { BookingSummary } from "../../components/BookingSummary";
import { ActivityTimeline, buildActivityTimeline } from "../../components/ActivityTimeline";
import { deriveDisplayDelivery, DOMESTIC_COURIER_NAME } from "../../services/delivery";
import {
  effectiveDepositStatus,
  formatMalaysiaDateTime,
  formatScheduledReturnPickup,
  formatShortDate,
  getEffectiveBookingStatus,
  isCancellationEligible,
  lenderInspectionDeadline,
  rentalOperationalStatus,
  rentalTabForBooking,
  malaysiaDateKey,
  money,
  parseMalaysiaTimestamp,
  riskFor,
} from "../../services/booking";
import {
  getIssueReportPermissions,
  isLenderDisputeEligible,
  type Action,
} from "../../services/marketplace";
import type { Booking } from "../../types/marketplace";

export default function RentalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, user, actAndPersist } = useMarketplace();
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [cancelSummaryVisible, setCancelSummaryVisible] = useState(false);
  const [cancelConfirmationVisible, setCancelConfirmationVisible] =
    useState(false);
  const [cancelError, setCancelError] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [rentalCompleteConfirmVisible, setRentalCompleteConfirmVisible] = useState(false);
  const [rentalCompleteSuccessVisible, setRentalCompleteSuccessVisible] = useState(false);
  const [rentalCompleteError, setRentalCompleteError] = useState("");
  const [isCompletingRental, setIsCompletingRental] = useState(false);
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
  const [lenderRatingChosen, setLenderRatingChosen] = useState(false);
  const [lenderBeforePhotos, setLenderBeforePhotos] = useState<string[]>([]);
  const [lenderBeforeVideos, setLenderBeforeVideos] = useState<string[]>([]);
  const [lenderBeforeNotes, setLenderBeforeNotes] = useState("");
  const [lenderBeforeIssue, setLenderBeforeIssue] = useState("");
  const [lenderAfterPhotos, setLenderAfterPhotos] = useState<string[]>([]);
  const [lenderAfterVideos, setLenderAfterVideos] = useState<string[]>([]);
  const [lenderAfterNotes, setLenderAfterNotes] = useState("");
  const [lenderAfterIssue, setLenderAfterIssue] = useState("");
  const [review, setReview] = useState("");
  const [returnNotice, setReturnNotice] = useState("");
  const [checkOutOffset, setCheckOutOffset] = useState<number | null>(null);
  const [scrollToY, setScrollToY] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [correctedDeliveryAddress, setCorrectedDeliveryAddress] = useState("");
  const [correctedDeliveryPostcode, setCorrectedDeliveryPostcode] = useState("");
  const [showProposeDispatchDate, setShowProposeDispatchDate] = useState(false);
  const [proposedDispatchDate, setProposedDispatchDate] = useState("");

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
    parcelWeightKg: listing?.parcelWeightKg,
    parcelDimensionsCm: listing?.parcelDimensionsCm,
    parcelPackages: listing?.parcelPackages,
    deliveryRequirement: listing?.deliveryRequirement,
    title: listing?.title || b.title,
    category: listing?.category,
    description: listing?.description,
    deliveryPostcode: b.deliveryPostcode,
    demoBooking: b.contextMode === "admin_demo" && b.id.startsWith("demo-"),
    listingId: b.listingId,
  });
  const isCrossStateDelivery = displayDelivery.method === "Domestic Courier (Demo)";
  // Mirrors BookingSummary's lender-facing delivery status wording, collapsed to the
  // arrangement/payment states a lender needs to know to prepare and hand off the item.
  const deliveryArrangementStatus = displayDelivery.status === "paid_demo" ? "Arranged (Demo)"
    : displayDelivery.status === "refunded_demo" ? "Cancelled — Refunded (Demo)"
    : displayDelivery.status === "required" ? "Awaiting Renter Payment"
    : displayDelivery.status === "self_pickup" ? "Self-Pickup"
    : displayDelivery.estimatedTwoWayFee != null ? "Estimate — Not Yet Arranged"
    : "Not Recorded";
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
      if (action.type === "conditionEvidence" && action.kind === "lender_before_delivery") {
        setLenderBeforePhotos([]); setLenderBeforeVideos([]); setLenderBeforeNotes("");
      }
      if (action.type === "conditionEvidence" && action.kind === "lender_after_return") {
        setLenderAfterPhotos([]); setLenderAfterVideos([]); setLenderAfterNotes("");
      }
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
        setSuccessNotice("Issue report submitted and saved for this rental.");
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
      // The structured "Booking Cancelled" card below reads the actual post-cancellation
      // booking fields (quote.deposit, depositReleasedAt) rather than this fixed string, so it
      // always shows the real refundable amount and deadline. This flag only decides whether
      // that card is shown, not what it says.
      setCancelSummaryVisible(true);
    } catch (e) {
      setCancelError((e as Error).message);
    } finally {
      cancellationInProgress.current = false;
      setIsCancelling(false);
    }
  }

  async function confirmRentalCompletion() {
    if (isCompletingRental) return;
    setIsCompletingRental(true);
    setRentalCompleteError("");
    try {
      await actAndPersist({
        type: "returnConfirm",
        bookingId: id,
        role: "owner",
        notes: "Owner inspection confirmed clean — No Issue",
      });
      setRentalCompleteConfirmVisible(false);
      setRentalCompleteSuccessVisible(true);
    } catch (e) {
      setRentalCompleteError((e as Error).message);
    } finally {
      setIsCompletingRental(false);
    }
  }

  const rentalConfirmationTab = rentalTabForBooking(b, now);
  const cancelEligible = isCancellationEligible(b.start);
  const lenderCancelEligible =
    effectiveStatus === "upcoming" && b.payment === "paid" && cancelEligible;
  const existingDispute = state.disputes.find((d) => d.bookingId === b.id);
  const disputeEligible = isLenderDisputeEligible(b, now);
  const rentalCompleteEligible =
    ["active", "return_pending"].includes(effectiveStatus) &&
    !!b.renterReturnConfirmedAt &&
    !!b.lenderReturnReceivedAt &&
    state.evidence.some((e) => e.bookingId === b.id && e.authorId === user.id && e.kind === "lender_after_return") &&
    !b.lenderReturnConfirmedAt &&
    !existingDispute;
  const rentalCompleteReason = !b.renterReturnConfirmedAt
    ? "Rental Complete is disabled until the renter confirms return."
    : !b.lenderReturnReceivedAt
      ? "Confirm receipt of the returned item before completing the rental."
      : !state.evidence.some((e) => e.bookingId === b.id && e.authorId === user.id && e.kind === "lender_after_return")
        ? "Submit After Return condition evidence before completing the rental."
        : existingDispute
          ? "An unresolved dispute must be settled before the rental can be completed."
          : b.lenderReturnConfirmedAt
            ? "This rental has already been completed."
            : "";
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
  const isDelivered = !!b.renterReceivedAt || !!checkInEvidence;
  const isReturnEvidenceAvailable = isDelivered && effectiveStatus === "active";
  function lenderEvidenceState(stage: "lender_before_delivery" | "lender_after_return") {
    const booking = b!;
    const actor = user!;
    const before = stage === "lender_before_delivery";
    const recorded = state.evidence.find((item) => item.bookingId === booking.id && item.kind === stage && item.authorId === actor.id);
    const report = state.issueReports?.find((item) => item.bookingId === booking.id && item.stage === stage && item.authorId === actor.id);
    const available = before
      ? effectiveStatus === "upcoming" && booking.payment === "paid" && !booking.renterReceivedAt && !booking.lenderHandoverAt && !booking.lenderOutboundDispatchConfirmedAt
      : effectiveStatus === "return_pending" && !!booking.lenderReturnReceivedAt && !booking.lenderReturnConfirmedAt;
    const inspectionReady = available;
    const deadline = before ? null : lenderInspectionDeadline(booking.lenderReturnReceivedAt);
    const overdue = !before && !!deadline && now > parseMalaysiaTimestamp(deadline) && !recorded && !booking.lenderReturnConfirmedAt;
    return { booking, actor, before, recorded, report, available, inspectionReady, deadline, overdue };
  }
  // Standard evidence-card structure (reference: Check-in — Before Delivery): title + status badge,
  // helper description, requirement chips + upload blocks (via MediaPicker), condition notes, Submit
  // Evidence. `showIssueReport` is false for the After Return stage so the caller can place the
  // Report an Issue block after the Return Management and Renter Evidence panel instead — see
  // renderLenderIssueReport below and its call site after that panel.
  function renderLenderEvidence(stage: "lender_before_delivery" | "lender_after_return", opts: { showIssueReport?: boolean } = {}) {
    const showIssueReport = opts.showIssueReport ?? true;
    const { booking, actor, before, recorded, available, inspectionReady, deadline, overdue } = lenderEvidenceState(stage);
    const photos = before ? lenderBeforePhotos : lenderAfterPhotos;
    const videos = before ? lenderBeforeVideos : lenderAfterVideos;
    const notes = before ? lenderBeforeNotes : lenderAfterNotes;
    const title = before ? "Check-in — Before Delivery" : "Check-out — After Return";
    // Never hide this card once the booking exists — a Completed, Cancelled or Disputed rental
    // without a recorded checkpoint shows "No Evidence Submitted" (read-only) rather than
    // disappearing entirely, so evidence history is never lost just because the status changed.
    const finalized = ["completed", "cancelled", "disputed"].includes(effectiveStatus);
    return <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Text style={s.h2}>{title}</Text>
        <Badge
          text={
            recorded ? "Submitted"
              : overdue ? "Inspection Overdue"
              : inspectionReady ? "Inspection Required"
              : finalized ? "No Evidence Submitted"
              : before && !available ? "Inspection Unavailable"
              : before ? "Pending Delivery" : "Pending Return"
          }
          green={!!recorded}
        />
      </View>
      {recorded ? (
        <Text style={s.caption}>{before ? "Condition evidence submitted successfully before delivery." : "Condition evidence submitted successfully after the returned item was received."}</Text>
      ) : (
        <Text style={s.caption}>{before ? "Document the item's condition before courier collection or handover to the renter." : "Document the returned item's condition after you confirm receipt of it."}</Text>
      )}
      {!before && !recorded && booking.lenderReturnReceivedAt && <Text style={s.caption}>Return received {formatMalaysiaDateTime(booking.lenderReturnReceivedAt)} MYT. Inspect within 3 Malaysia working days{deadline ? ` (estimated deadline ${formatMalaysiaDateTime(deadline)} MYT)` : "; exact holiday-adjusted deadline unavailable"}.</Text>}
      {overdue && <Notice text="Inspection Overdue. Submit the required evidence and choose clean return or report an issue. No completion or deposit release has been assumed." />}
      {!before && !recorded && !booking.lenderReturnReceivedAt && booking.renterReturnConfirmedAt && <Button secondary disabled={isSavingAction} onPress={() => run({ type: "confirmReturnReceipt", bookingId: booking.id })}>Confirm Returned Item Received</Button>}
      {recorded ? <>
        <Text style={s.caption}>Submitted {formatMalaysiaDateTime(recorded.createdAt)} MYT by {actor.name}</Text>
        <MediaPicker disabled photos={recorded.photos || (recorded.photo ? [recorded.photo] : [])} onPhotosChange={() => {}} videos={recorded.videos || []} onVideosChange={() => {}} minPhotos={6} minVideos={1} />
        <Text style={s.body}>{recorded.notes}</Text>
      </> : inspectionReady ? <>
        <MediaPicker photos={photos} onPhotosChange={before ? setLenderBeforePhotos : setLenderAfterPhotos} videos={videos} onVideosChange={before ? setLenderBeforeVideos : setLenderAfterVideos} minPhotos={6} minVideos={1} samplePrefix={before ? "lender-before-delivery" : "lender-after-return"} />
        <Field label="Condition notes" value={notes} onChangeText={before ? setLenderBeforeNotes : setLenderAfterNotes} multiline />
        <Button disabled={photos.length < 6 || videos.length < 1 || isSavingAction} onPress={() => run({ type: "conditionEvidence", bookingId: booking.id, kind: stage, photos, videos, notes })}>Submit Evidence</Button>
      </> : finalized ? (
        <Notice text="No condition evidence was submitted for this checkpoint." />
      ) : (
        <Notice text={before ? "Before-delivery inspection is no longer available after dispatch or handover." : "After-return inspection begins when the lender confirms actual receipt of the returned item."} />
      )}
      {showIssueReport && !finalized && renderLenderIssueReportFields(stage)}
    </Card>;
  }
  // The "Report an Issue" sub-block shared by both lender evidence stages. Rendered inline inside
  // renderLenderEvidence for Before Delivery, but pulled out and rendered after the Return Management
  // and Renter Evidence panel for After Return (see JSX order below) per the required section order.
  function renderLenderIssueReportFields(stage: "lender_before_delivery" | "lender_after_return") {
    const { booking, actor, report, inspectionReady } = lenderEvidenceState(stage);
    const before = stage === "lender_before_delivery";
    const issue = before ? lenderBeforeIssue : lenderAfterIssue;
    return <View style={{ marginTop: 14, gap: 8 }}>
      <Text style={s.bold}>Report an Issue</Text>
      <Field label="Issue details" value={report?.text || issue} onChangeText={before ? setLenderBeforeIssue : setLenderAfterIssue} editable={inspectionReady && !report} multiline />
      {report ? <Text style={s.caption}>Submitted {formatMalaysiaDateTime(report.createdAt)} MYT by {actor.name}</Text> : inspectionReady ? <Button secondary disabled={!issue.trim() || isSavingAction} onPress={() => run({ type: "reportIssue", bookingId: booking.id, stage, text: issue })}>Submit Report</Button> : null}
    </View>;
  }
  // Standalone Report an Issue card for the After Return stage, placed after the Return Management
  // and Renter Evidence panel.
  function renderLenderIssueReport(stage: "lender_before_delivery" | "lender_after_return") {
    const { recorded, report } = lenderEvidenceState(stage);
    if (!recorded && !report && !["upcoming", "active", "return_pending"].includes(effectiveStatus)) return null;
    return <Card>{renderLenderIssueReportFields(stage)}</Card>;
  }
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
  // One shared Report an Issue section for the renter — never duplicated per checkpoint — covers
  // whichever renter checkpoint is currently relevant: Check-in until the item has actually been
  // returned, Check-out once return evidence becomes available or return has been confirmed.
  function renderRenterIssueReportSection() {
    const stage: "check_in" | "check_out" =
      state.issueReports?.some((r) => r.bookingId === b!.id && r.stage === "check_out")
        ? "check_out"
        : state.issueReports?.some((r) => r.bookingId === b!.id && r.stage === "check_in")
          ? "check_in"
          : isReturnEvidenceAvailable || effectiveStatus === "return_pending" || !!b!.renterReturnConfirmedAt
            ? "check_out"
            : "check_in";
    const stageAvailable = stage === "check_in" ? isDelivered : isReturnEvidenceAvailable || effectiveStatus === "return_pending";
    return <Card>{renderIssueReport(stage, stageAvailable)}</Card>;
  }


  // Mirrors BookingSummary's lender-facing deposit status wording, for the post-cancellation
  // summary card below — always read from the booking's actual current state, never fixed text.
  const depositStatusLabel: Record<Booking["deposit"], string> = {
    required: "Not Charged",
    secured: "Held in Escrow",
    held: "Held in Escrow",
    release_pending: "Release Pending",
    // This map is only ever read for the post-cancellation summary card below, so "released"
    // here always means the cancellation's simulated deposit refund has actually completed.
    released: "Security Deposit Refunded (Demo)",
    disputed: "Held — Dispute Under Review",
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
          <RentalStatusBadge
            label={rentalConfirmationTab === "Payment & Transaction History" ? "Payment Required" : rentalConfirmationTab}
          />
        </View>
        <Text style={[s.bold, { fontSize: 17 }]}>{b.title}</Text>
        <Text style={s.body}>
          Renter: {renterName} · Lender: {lenderName}
        </Text>
        {rentalOperationalStatus(b, now) && <Text style={s.caption}>{rentalOperationalStatus(b, now)}</Text>}
        <View style={[s.divider, { marginVertical: 4 }]} />
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
        >
          <Text style={[s.body, { flex: 1, fontWeight: "700" }]}>
            Rental period
          </Text>
          <View style={{ alignItems: "flex-end", gap: 2 }}>
            {displayDelivery.method === "Domestic Courier (Demo)" ? (
              <>
                {/* Cross-state: dates only — courier transit was never scheduled to an exact
                    hour, so showing one (e.g. "06:00 PM") would misrepresent it as confirmed.
                    b.start/b.end themselves are untouched; this only changes how they're shown. */}
                <Text style={[s.body, { textAlign: "right" }]}>
                  {formatShortDate(malaysiaDateKey(b.start))} – {formatShortDate(malaysiaDateKey(b.end))}
                </Text>
                <Text style={s.caption}>
                  Duration: {b.quote.days * 24} hours ({b.quote.days} {b.quote.days === 1 ? "day" : "days"}) · Delivery Only
                </Text>
              </>
            ) : (
              <>
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
              </>
            )}
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
              disabled={!rentalCompleteEligible}
              onPress={() => {
                setRentalCompleteError("");
                setRentalCompleteConfirmVisible(true);
              }}
            >
              Rental Complete
            </Button>
            {!rentalCompleteEligible && !!rentalCompleteReason && (
              <Text style={[s.caption, { textAlign: "center" }]}>
                {rentalCompleteReason}
              </Text>
            )}
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

      {owner && effectiveStatus === "upcoming" && b.deliveryDemo?.provider === DOMESTIC_COURIER_NAME &&
        b.deliveryDemo.status === "paid_demo" &&
        b.deliveryDemo.outboundDispatchStatus !== "confirmed" && b.deliveryDemo.outboundDispatchStatus !== "drop_off" && (
        <Card>
          <Text style={s.h2}>Confirm Outbound Dispatch Arrangement</Text>
          <Text style={s.caption}>
            CurRENT recommends a dispatch date so the item arrives before the rental starts.
            Accept it, propose a different date, or use a simulated drop-off arrangement instead.
          </Text>
          <Row label="Recommended dispatch date" value={b.deliveryDemo.dispatchDate || "Delivery Timing Confirmation Required"} />
          <Row label="Estimated delivery arrival" value={
            b.deliveryDemo.estimatedDeliveryRangeStart && b.deliveryDemo.estimatedDeliveryRangeEnd
              ? `${b.deliveryDemo.estimatedDeliveryRangeStart} – ${b.deliveryDemo.estimatedDeliveryRangeEnd}`
              : "To Be Confirmed"} />
          {b.deliveryDemo.outboundDispatchStatus === "proposed_alternate" && (
            <Text style={[s.caption, { color: colors.danger }]}>
              Proposed date {b.deliveryDemo.lenderProposedDispatchDate} is awaiting renter approval
              (it may arrive after the rental start).
            </Text>
          )}
          <View style={{ marginTop: 10, gap: 8 }}>
            <Button onPress={() => run({ type: "confirmOutboundDispatch", bookingId: b.id, decision: "accept" })}>
              Confirm Recommended Dispatch Date
            </Button>
            <Button secondary onPress={() => setShowProposeDispatchDate((open) => !open)}>
              {showProposeDispatchDate ? "Cancel Proposing a Date" : "Propose Another Feasible Dispatch Date"}
            </Button>
            {showProposeDispatchDate && (
              <>
                <Field label="Proposed dispatch date" value={proposedDispatchDate} onChangeText={setProposedDispatchDate} placeholder="YYYY-MM-DD" />
                <Button onPress={() => run({ type: "confirmOutboundDispatch", bookingId: b.id, decision: "propose", proposedDate: proposedDispatchDate.trim() })}>
                  Submit Proposed Date
                </Button>
              </>
            )}
            <Button secondary onPress={() => run({ type: "confirmOutboundDispatch", bookingId: b.id, decision: "dropoff" })}>
              Confirm Item Can Be Dropped Off at Courier Branch
            </Button>
          </View>
        </Card>
      )}

      {!owner && b.deliveryDemo?.requiresRenterDispatchApproval && (
        <Card>
          <Text style={s.h2}>Review Proposed Dispatch Date</Text>
          <Notice text={`Lender proposed dispatching on ${b.deliveryDemo.lenderProposedDispatchDate}, which may arrive after your rental start. Approve it, or decline so the lender can arrange something else.`} />
          <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
            <Button onPress={() => run({ type: "respondToDispatchProposal", bookingId: b.id, approve: true })}>
              Approve
            </Button>
            <Button secondary onPress={() => run({ type: "respondToDispatchProposal", bookingId: b.id, approve: false })}>
              Decline
            </Button>
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

      {/* Post-cancellation summary — reads b's actual current fields (never fixed text), so the
          amount and deadline shown here always match Payment & Transaction History. */}
      {cancelSummaryVisible && b.status === "cancelled" && (
        <Card>
          <Text style={s.h2}>Booking Cancelled</Text>
          <Text style={s.body}>Your booking has been successfully cancelled.</Text>
          <View style={[s.divider, { marginVertical: 8 }]} />
          <Text style={[s.bold, { marginBottom: 4 }]}>Security Deposit Refund</Text>
          {b.quote.deposit > 0 ? (
            <>
              <Row label="Refundable deposit" value={money(b.quote.deposit)} />
              <Row label="Refund status" value={depositStatusLabel[effectiveDepositStatus(b)]} />
              <Row label="Refund processing" value="Within 5 Malaysia working days" />
              <Row
                label="Expected refund deadline"
                value={b.depositReleasedAt ? formatMalaysiaDateTime(b.depositReleasedAt) : "Not recorded"}
              />
              <Text style={[s.caption, { marginTop: 6 }]}>
                Your security deposit refund is being processed. You can track its status under
                Payment & Transaction History → Release pending.
              </Text>
            </>
          ) : (
            <Text style={s.body}>No deposit refund required.</Text>
          )}
        </Card>
      )}

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
              value={formatScheduledReturnPickup(b) || b.end}
            />
            {!owner && (
              <Row
                label="Delivery Receipt"
                value={
                  b.renterReceivedAt
                    ? `✓ Delivery Received (${new Date(b.renterReceivedAt).toLocaleTimeString()})`
                    : "Awaiting Delivery Receipt"
                }
                strong={!!b.renterReceivedAt}
              />
            )}
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

      {/* DELIVERY & RETURN DETAILS — lender-facing only, shown inline inside Upcoming so the
          lender never has to leave this screen to prepare and hand off the item. Addresses and
          schedule come from the confirmed booking/displayDelivery, never the renter's current
          default address, so they stay correct even if the renter later edits their profile. */}
      {owner && effectiveStatus === "upcoming" && (
        <Card>
          <Text style={s.h2}>Delivery & Return Details</Text>
          {displayDelivery.status === "unavailable" || (!displayDelivery.origin && !displayDelivery.destination) ? (
            <Notice text="Delivery address information is missing for this booking." />
          ) : (
            <View style={{ marginTop: 8, gap: 8 }}>
              <Row label="Delivery provider" value={displayDelivery.method} />
              <Row label="Lender pickup address" value={displayDelivery.origin || "Not recorded"} />
              <Row label="Renter delivery address" value={displayDelivery.destination || "Not recorded"} />
              {isCrossStateDelivery ? (
                <>
                  <Row label="Scheduled dispatch date" value={displayDelivery.dispatchDate || "To Be Confirmed"} />
                  <Row label="Planned return date" value={displayDelivery.returnDispatchDeadline || "To Be Confirmed"} />
                </>
              ) : (
                <>
                  <Row
                    label="Scheduled delivery arrival"
                    value={displayDelivery.estimatedDeliveryRangeStart && displayDelivery.estimatedDeliveryRangeEnd
                      ? `${displayDelivery.estimatedDeliveryRangeStart} – ${displayDelivery.estimatedDeliveryRangeEnd}` : "To Be Confirmed"}
                  />
                  <Row
                    label="Scheduled return pickup"
                    value={displayDelivery.estimatedReturnRangeStart && displayDelivery.estimatedReturnRangeEnd
                      ? `${displayDelivery.estimatedReturnRangeStart} – ${displayDelivery.estimatedReturnRangeEnd}` : "To Be Confirmed"}
                  />
                  <Row label="Automatically selected vehicle" value={displayDelivery.vehicle || "Unavailable"} />
                </>
              )}
              <View style={[s.divider, { marginVertical: 4 }]} />
              <Row label="Return collection address" value={displayDelivery.destination || "Not recorded"} />
              <Row label="Return destination" value={displayDelivery.origin || "Not recorded"} />
              <Row label="Delivery arrangement status" value={deliveryArrangementStatus} />
            </View>
          )}
        </Card>
      )}

      {owner && <Section title="Condition Evidence" />}
      {owner && renderLenderEvidence("lender_before_delivery", { showIssueReport: false })}

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
                value={formatScheduledReturnPickup(b) || b.end}
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
      {!owner && <Section title="Condition Evidence" />}

      {owner && renderLenderEvidence("lender_after_return", { showIssueReport: false })}

      {/* Renter's after-delivery checkpoint; lender may inspect the recorded media below. */}
      {!owner && <Card>
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
            <Badge text="Evidence Submitted" green />
          ) : isDelivered ? (
            <Badge text="Inspection Available" />
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
      </Card>}

      {owner && checkInEvidence && <Card>
        <Text style={s.h2}>Renter After Delivery Evidence</Text>
        <Badge text="Evidence Submitted" green />
        <Text style={s.caption}>Submitted {formatMalaysiaDateTime(checkInEvidence.createdAt)} MYT by {state.profiles.find((p) => p.id === checkInEvidence.authorId)?.name || "Renter"}</Text>
        <MediaPicker disabled photos={checkInEvidence.photos || (checkInEvidence.photo ? [checkInEvidence.photo] : [])} onPhotosChange={() => {}} videos={checkInEvidence.videos || []} onVideosChange={() => {}} minPhotos={6} minVideos={1} />
        <Text style={s.body}>{checkInEvidence.notes}</Text>
        {state.issueReports?.filter((report) => report.bookingId === b.id && report.stage === "check_in").map((report) => <Text key={report.id} style={s.caption}>Renter issue: {report.text} · {formatMalaysiaDateTime(report.createdAt)} MYT</Text>)}
      </Card>}

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
          <Text style={s.h2}>{owner ? "Return Management and Renter Evidence" : "Check-out — Before Return"}</Text>
          {owner ? (
            <Badge text={b.lenderReturnConfirmedAt ? "Inspection Completed" : checkOutEvidence ? "Evidence Submitted" : "Pending Return"} green={!!b.lenderReturnConfirmedAt} />
          ) : effectiveStatus === "completed" ? (
            <Badge text="Settled — No Issues" green />
          ) : checkOutEvidence || b.renterReturnConfirmedAt ? (
            <Badge text="Return Confirmed" />
          ) : isReturnEvidenceAvailable ? (
            <Badge text="Inspection Available" />
          ) : (
            <Badge text="Pending Active Rental" />
          )}
        </View>
        {owner && <Text style={s.caption}>Review the renter's return evidence below and confirm a clean return once your own After Return inspection is submitted.</Text>}

        {!!returnNotice && (
          <View style={{ marginBottom: 10 }}>
            <Notice text={returnNotice} />
          </View>
        )}

        {!owner && !isReturnEvidenceAvailable && !checkOutEvidence && !b.renterReturnConfirmedAt ? (
          <>
            <Text style={s.caption}>
              Check-out condition evidence becomes available during the active rental after delivery.
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
        ) : !owner ? (
          <>
            {b.renterReturnConfirmedAt || checkOutEvidence ? (
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
                      {b.renterReturnConfirmedAt ? "✓ Return Confirmed · Awaiting Lender Review" : "✓ Evidence Submitted · Return Not Yet Confirmed"}
                    </Text>
                    <Text
                      style={[s.caption, { color: "#047857", marginTop: 2 }]}
                    >
                      {b.renterReturnConfirmedAt
                        ? "Your return evidence has been submitted. Your simulated security deposit remains held until the lender completes the return inspection."
                        : "Your condition evidence is saved. Confirm Return when the scheduled rental end is reached and the item is handed to the return courier."}
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
                {!b.renterReturnConfirmedAt && (isEndReached ? <Button disabled={isSavingAction} onPress={() => run({ type: "returnConfirm", bookingId: id, role: "renter" })}>Confirm Return</Button> : <Notice text={`Confirm Return becomes available at ${formatMalaysiaDateTime(endMs)}. Your evidence is already saved.`} />)}
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
                <Button disabled={returnPhotos.length < 6 || returnVideos.length < 1 || isSavingAction} onPress={() => run({ type: "conditionEvidence", bookingId: id, kind: "check_out", photos: returnPhotos, videos: returnVideos, notes: returnNotes })}>Submit Check-out Evidence</Button>
                {isEndReached && <Button
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
                </Button>}
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
            ) : !b.lenderReturnConfirmedAt ? (
              // Only a genuinely outstanding wait — never shown once the lender has already
              // confirmed a clean return (Inspection Completed), even if no renter check-out
              // media happens to be on record for this booking.
              <Notice text="Waiting for renter to upload return condition evidence and submit check-out confirmation." />
            ) : null}

            {state.issueReports?.filter((report) => report.bookingId === b.id && report.stage === "check_out").map((report) => <Text key={report.id} style={s.caption}>Renter issue: {report.text} · {formatMalaysiaDateTime(report.createdAt)} MYT</Text>)}

            {["active", "return_pending"].includes(effectiveStatus) && (
              <View style={{ marginTop: 14, gap: 10 }}>
                <Button
                  disabled={isSavingAction || !b.renterReturnConfirmedAt || !b.lenderReturnReceivedAt || !state.evidence.some((e) => e.bookingId === b.id && e.authorId === user.id && e.kind === "lender_after_return")}
                  onPress={() =>
                    run({
                      type: "returnConfirm",
                      bookingId: id,
                      role: "owner",
                      notes: "Owner inspection confirmed clean — No Issue",
                    })
                  }
                >
                  Confirm Clean Return
                </Button>
                {!b.renterReturnConfirmedAt && (
                  <Text style={[s.caption, { textAlign: "center" }]}>
                    Clean return confirmation is disabled until renter completes
                    check-out and confirms return.
                  </Text>
                )}
                {b.renterReturnConfirmedAt && (!b.lenderReturnReceivedAt || !state.evidence.some((e) => e.bookingId === b.id && e.authorId === user.id && e.kind === "lender_after_return")) && <Text style={s.caption}>Confirm receipt and submit After Return evidence before confirming a clean return.</Text>}
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

      {/* One Report an Issue section for the lender — never duplicated per checkpoint — sits after
          the Return Management and Renter Evidence panel above, per the required section order.
          It covers whichever lender checkpoint is currently relevant: Before Delivery until the
          item has actually been returned, After Return once the renter has confirmed return. */}
      {owner && renderLenderIssueReport(
        state.issueReports?.some((r) => r.bookingId === b.id && r.stage === "lender_after_return")
          ? "lender_after_return"
          : state.issueReports?.some((r) => r.bookingId === b.id && r.stage === "lender_before_delivery")
            ? "lender_before_delivery"
            : effectiveStatus === "return_pending" ? "lender_after_return" : "lender_before_delivery",
      )}

      {/* One Report an Issue section for the renter — never duplicated per checkpoint — sits
          after both Condition Evidence cards. */}
      {!owner && renderRenterIssueReportSection()}

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
      {/* The delivery payment is simulated as going to the external courier, not CurRENT, so only
          the renter who actually made that payment can see its receipt — the lender gets the
          operational details instead (see the Delivery & Return Details card above). */}
      {!owner && (displayDelivery.status === "paid_demo" || displayDelivery.status === "refunded_demo") && displayDelivery.receiptReference && (
        <Button secondary onPress={() => router.push({ pathname: "/delivery-receipt/[id]", params: { id: displayDelivery.receiptReference! } })}>
          View Delivery Receipt
        </Button>
      )}
      {/* ACTIVITY TIMELINE — a consistent two-column checklist (see components/ActivityTimeline),
          derived entirely from existing booking/dispute timestamps, no new storage. The checklist
          contents switch by effective status (standard / cancelled / disputed); the visual design
          is identical across all statuses. */}
      <Section title="Activity Timeline" />
      <Card>
        <ActivityTimeline items={buildActivityTimeline(b, existingDispute, Date.now(), state.evidence)} />
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

      {/* REVIEWS — HOW DID IT GO? Renter-only: lenders don't submit or see a review prompt here. */}
      {!owner && <>
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
                ? `Rate your experience with ${other?.name || "the renter"}.`
                : `Rate your rental experience with ${other?.name || "the lender"}.`}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginVertical: 8 }}>
              {["1", "2", "3", "4", "5"].map((val) => {
                const isSelected = rating === val && (!owner || lenderRatingChosen);
                return (
                  <TouchableOpacity
                    key={val}
                    accessibilityRole="button"
                    accessibilityLabel={`${val} star rating`}
                    accessibilityState={{ disabled: !reviewEligible }}
                    disabled={!reviewEligible}
                    onPress={() => { setRating(val); if (owner) setLenderRatingChosen(true); }}
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
              disabled={!reviewEligible || (owner && !lenderRatingChosen) || isSavingAction}
              onPress={() =>
                run({
                  type: "review",
                  bookingId: id,
                  rating: Number(rating),
                  text: review,
                })
              }
            >
              {owner ? `Leave a review for ${other?.name || "the renter"}` : `Leave ${rating}-star review`}
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
      </>}
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
      <Modal
        visible={rentalCompleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isCompletingRental) setRentalCompleteConfirmVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            accessibilityRole="alert"
            accessibilityViewIsModal
            style={styles.modalCard}
          >
            <Text style={s.h2}>Complete This Rental?</Text>
            <Text style={s.body}>
              Please confirm that the item has been returned and all required
              inspections have been completed. Once confirmed, the rental will
              be marked as completed.
            </Text>
            {!!rentalCompleteError && <Notice text={rentalCompleteError} error />}
            <Button
              disabled={isCompletingRental}
              onPress={confirmRentalCompletion}
            >
              {isCompletingRental ? "Completing…" : "Confirm Completion"}
            </Button>
            <Button
              secondary
              disabled={isCompletingRental}
              onPress={() => setRentalCompleteConfirmVisible(false)}
            >
              Cancel
            </Button>
          </View>
        </View>
      </Modal>
      <Modal
        visible={rentalCompleteSuccessVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRentalCompleteSuccessVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            accessibilityRole="alert"
            accessibilityViewIsModal
            style={styles.modalCard}
          >
            <Text style={s.h2}>Rental Completed Successfully</Text>
            <Text style={s.body}>
              This rental has been completed successfully. The rental status
              and transaction history have been updated.
            </Text>
            <Button onPress={() => setRentalCompleteSuccessVisible(false)}>
              Close
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
};
