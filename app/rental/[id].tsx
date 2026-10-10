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
import {
  calculateBorrowerServiceFee,
  calculateOwnerPayout,
} from "../../services/deposit";
import { isCancellationEligible, money, riskFor } from "../../services/booking";
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
  const [extensionDays, setExtensionDays] = useState("1");

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
  const currentRisk = renter ? riskFor(state, renter) : null;
  const listing = state.listings.find((l) => l.id === b.listingId);

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
        disputed: 4,
        cancelled: -1,
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

  const cancelEligible = b.scheduledPickup
    ? isCancellationEligible(b.scheduledPickup)
    : isCancellationEligible(b.start);

  const extDaysNum = parseInt(extensionDays, 10) || 1;
  const extRentalFee = listing ? listing.dailyPrice * extDaysNum : 0;
  const extServiceFee = calculateBorrowerServiceFee(extRentalFee);
  const extTotal = extRentalFee + extServiceFee;

  return (
    <Screen back title="Rental details" subtitle={`Reference ${b.id}`}>
      <Card>
        <Image
          source={{ uri: b.image }}
          style={{ width: "100%", height: 190, borderRadius: 12 }}
        />
        <Text style={s.h2}>{b.title}</Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Badge text={b.status} green={b.status === "completed"} />
          {b.activationTimestamp && (
            <Badge text="Rental Clock Active" green />
          )}
        </View>
        <Text style={s.body}>
          {b.start} → {b.end} · {b.quote.days} billable days
        </Text>
        {b.effectiveReturnDeadline && (
          <Text style={[s.bold, { color: "#0066CC" }]}>
            Effective Return Deadline: {new Date(b.effectiveReturnDeadline).toLocaleString()}
          </Text>
        )}
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
          <Notice text="Simulated Checkout (Demo). No real funds or usable cards required. Booking will be confirmed, but rental clock does NOT start until physical handover." />
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
              text={`Demo BNPL covers rental fees only (${money(b.quote.rentalFee)}). Deposit and service fee (${money(b.quote.total - b.quote.rentalFee)}) remain payable separately.`}
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
        </Card>
      )}

      {b.status === "approved" && owner && (
        <Notice text="Approved. Waiting for renter to complete demo checkout." />
      )}

      {/* UPCOMING / TWO-SIDED HANDOVER (PHASE 3) */}
      {b.status === "upcoming" && (
        <Card>
          <Text style={s.h2}>Two-Sided Physical Handover</Text>
          <Text style={s.caption}>
            The rental clock starts ONLY when BOTH participants confirm physical meetup and item inspection.
          </Text>

          <View style={{ marginVertical: 12, gap: 8 }}>
            <Row
              label="Lender Handover"
              value={b.lenderHandoverAt ? `✓ Confirmed (${new Date(b.lenderHandoverAt).toLocaleTimeString()})` : "Awaiting Lender"}
              strong={!!b.lenderHandoverAt}
            />
            <Row
              label="Renter Receipt"
              value={b.renterReceivedAt ? `✓ Confirmed (${new Date(b.renterReceivedAt).toLocaleTimeString()})` : "Awaiting Renter"}
              strong={!!b.renterReceivedAt}
            />
          </View>

          {/* Option A Delayed Handover Conflict Card */}
          {b.conflictOffer && (
            <View style={{ backgroundColor: "#FFF8E7", borderColor: "#FFE08A", borderWidth: 1, borderRadius: 10, padding: 14, marginVertical: 10 }}>
              <Text style={[s.bold, { color: "#975A16" }]}>
                ⚠️ Scheduling Conflict — Revised Rental Offer Required (Demo)
              </Text>
              <Text style={[s.caption, { color: "#744210", marginTop: 4 }]}>
                Delayed physical pickup created an overlap with a subsequent confirmed booking. In accordance with Founder Option A, the next booking is protected. Review your revised rental terms below:
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

          {/* Handover Buttons */}
          {owner && !b.lenderHandoverAt && !b.conflictOffer && (
            <Button
              onPress={() =>
                run({ type: "handoverConfirm", bookingId: id, role: "owner" })
              }
            >
              Confirm Item Handed Over
            </Button>
          )}
          {!owner && !b.renterReceivedAt && !b.conflictOffer && (
            <Button
              onPress={() =>
                run({ type: "handoverConfirm", bookingId: id, role: "renter" })
              }
            >
              Confirm Item Received
            </Button>
          )}

          {/* Cancellation Window */}
          <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: "#EEE", paddingTop: 12 }}>
            <Text style={s.caption}>
              Cancellation Cutoff: At least 24 hours before scheduled pickup ({b.scheduledPickup || b.start}).
            </Text>
            {cancelEligible ? (
              <Button
                secondary
                onPress={() => operation("cancel")}
              >
                Cancel Booking (100% Refund & RM0 Fee)
              </Button>
            ) : (
              <Notice text="Cancellation window closed. Free cancellation is only available at least 24 hours before pickup." />
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
              Item is currently in renter's possession. Return deadline is dynamically calculated from actual pickup time.
            </Text>
            <View style={{ marginVertical: 10, gap: 6 }}>
              <Row
                label="Activation Timestamp"
                value={b.activationTimestamp ? new Date(b.activationTimestamp).toLocaleString() : "Active"}
              />
              <Row
                label="Effective Return Deadline"
                value={b.effectiveReturnDeadline ? new Date(b.effectiveReturnDeadline).toLocaleString() : b.end}
                strong
              />
              <Row label="Refundable Deposit" value={money(b.quote.deposit)} />
            </View>

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

      {/* TWO-SIDED RETURN FLOW (PHASE 4 & 14.3) */}
      {["active", "return_pending"].includes(b.status) && !dispute && (
        <Card>
          <Text style={s.h2}>Two-Sided Clean Return</Text>
          <Text style={s.caption}>
            At the end of your rental, both participants must confirm the physical item return. Renter must provide condition photos. Full deposit is released only when BOTH confirm no issues.
          </Text>

          <View style={{ marginVertical: 10, gap: 6 }}>
            <Row
              label="Renter Condition & Return"
              value={b.renterReturnConfirmedAt ? `✓ Confirmed (${new Date(b.renterReturnConfirmedAt).toLocaleTimeString()})` : "Pending Renter"}
              strong={!!b.renterReturnConfirmedAt}
            />
            <Row
              label="Lender Receipt & Inspection"
              value={b.lenderReturnConfirmedAt ? `✓ Confirmed (${new Date(b.lenderReturnConfirmedAt).toLocaleTimeString()})` : "Pending Lender"}
              strong={!!b.lenderReturnConfirmedAt}
            />
          </View>

          {!owner && !b.renterReturnConfirmedAt && (
            <>
              <Text style={[s.bold, { marginTop: 8 }]}>Upload Return Condition Photo (Required):</Text>
              <PhotoPicker photos={photos} onChange={setPhotos} single />
              <Field
                label="Return condition notes"
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Confirm all accessories are included and condition is clean."
              />
              <Button
                disabled={photos.length === 0}
                onPress={() =>
                  run({
                    type: "returnConfirm",
                    bookingId: id,
                    role: "renter",
                    photo: photos[0],
                    notes,
                  })
                }
              >
                Confirm Return — No Issues
              </Button>
            </>
          )}

          {owner && !b.lenderReturnConfirmedAt && (
            <>
              {b.renterReturnConfirmedAt ? (
                <Button
                  onPress={() =>
                    run({
                      type: "returnConfirm",
                      bookingId: id,
                      role: "owner",
                    })
                  }
                >
                  Confirm Item Received — No Issues (Release Deposit)
                </Button>
              ) : (
                <Notice text="Waiting for renter to upload return condition evidence and submit handback confirmation." />
              )}
            </>
          )}
        </Card>
      )}

      {/* DISPUTE ACTIONS (PHASE 4.4 & 5) */}
      {["active", "return_pending"].includes(b.status) && (
        <>
          <Button
            danger
            secondary
            onPress={() => {
              setDispute(!dispute);
              setPhotos([]);
              setNotes("");
            }}
          >
            {dispute ? "Close Dispute Form" : "Raise Dispute / Request Platform Review"}
          </Button>

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
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Provide specific details of damage or missing items."
              />
              <PhotoPicker photos={photos} onChange={setPhotos} single />
              <Button
                danger
                disabled={notes.trim().length < 10 || photos.length === 0}
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
                Submit Dispute & Freeze Deposit
              </Button>
            </Card>
          )}
        </>
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

      {/* AGREEMENT */}
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

      {/* CONDITION EVIDENCE */}
      <Section title="Condition evidence" />
      {state.evidence
        .filter((e) => e.bookingId === id)
        .map((e) => (
          <Card key={e.id}>
            <Badge text={e.kind.replace("_", " ")} />
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

      {/* REVIEWS */}
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
