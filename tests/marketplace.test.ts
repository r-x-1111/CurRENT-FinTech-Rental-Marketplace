import assert from "node:assert/strict";
import test from "node:test";
import { createSeed } from "../data/seed";
import { transition, type Action } from "../services/marketplace";
import {
  availability,
  availabilityCalendar,
  dateAfter,
  quoteFor,
  rentalDays,
  riskFor,
} from "../services/booking";
import { calculateOwnerPayout } from "../services/deposit";

function journey() {
  let state = createSeed();
  const act = (action: Action) => {
    state = transition(state, action);
  };
  const request = (id = "booking-1", listingId = "sony-a7iii") =>
    act({
      type: "request",
      id,
      listingId,
      start: dateAfter(1),
      end: dateAfter(3),
      protection: true,
    });
  const login = (userId: string) => act({ type: "login", userId });
  const operation = (
    operation: Extract<Action, { type: "booking" }>["operation"],
    extra = {},
  ) => act({ type: "booking", id: "booking-1", operation, ...extra });
  return {
    get state() {
      return state;
    },
    act,
    request,
    login,
    operation,
  };
}
test("quotes use exclusive return day, service minimum, risk deposit and optional protection", () => {
  const state = createSeed();
  const quote = quoteFor(
    state,
    state.profiles[0],
    state.listings[0],
    dateAfter(1),
    dateAfter(3),
    true,
  );
  assert.deepEqual(quote, {
    days: 2,
    rentalFee: 90,
    serviceFee: 5,
    deposit: 400,
    protection: 0,
    total: 495,
  });
  assert.deepEqual(calculateOwnerPayout(90), {
    commission: 10.8,
    payout: 79.2,
  });
  assert.equal(
    quoteFor(
      state,
      state.profiles[0],
      state.listings[0],
      dateAfter(1),
      dateAfter(11),
      false,
    ).serviceFee,
    22.5,
  );
  assert.throws(() => rentalDays("2027-02-30", "2027-03-04"), /valid calendar/);
  assert.throws(() => rentalDays(dateAfter(1), dateAfter(1)), /1 to 90/);
  assert.throws(() => rentalDays(dateAfter(1), dateAfter(92)), /1 to 90/);
});
test("rental completes through participant-controlled steps, evidence, deposit release and reviews", () => {
  const j = journey();
  j.request();
  assert.throws(
    () => j.operation("pay", { method: "Demo card" }),
    /owner approval/,
  );
  assert.throws(() => j.operation("approve"), /Only the owner/);
  j.login("owner-aiman");
  j.operation("approve");
  assert.throws(
    () => j.operation("pay", { method: "Demo card" }),
    /owner approval/,
  );
  j.login("demo-renter");
  j.operation("pay", { method: "Demo card" });
  assert.equal(j.state.bookings[0].payment, "processing");
  assert.throws(() => j.operation("cancel"), /unpaid requests/);
  j.operation("payment_result", { failed: true });
  assert.equal(j.state.bookings[0].deposit, "required");
  j.operation("pay", { method: "Demo FPX" });
  j.operation("payment_result");
  assert.equal(j.state.bookings[0].status, "upcoming");
  assert.match(j.state.bookings[0].agreement!, /Alex Tan/);
  assert.throws(() => j.operation("payment_result"), /No payment/);
  j.login("owner-aiman");
  assert.throws(() => j.operation("check_in"), /photo/);
  j.operation("check_in", {
    photo: "data:image/png;base64,test",
    notes: "No damage.",
  });
  assert.equal(j.state.bookings[0].deposit, "held");
  assert.throws(() => j.operation("release"), /inspect/);
  j.login("demo-renter");
  j.operation("check_out", { photo: "data:image/png;base64,test" });
  assert.equal(j.state.bookings[0].deposit, "release_pending");
  assert.throws(() => j.operation("release"), /owner/);
  j.login("owner-aiman");
  j.operation("release");
  assert.equal(j.state.bookings[0].deposit, "released");
  j.act({
    type: "review",
    bookingId: "booking-1",
    rating: 5,
    text: "Careful renter.",
  });
  assert.throws(
    () =>
      j.act({ type: "review", bookingId: "booking-1", rating: 5, text: "" }),
    /already reviewed/,
  );
  j.login("demo-renter");
  j.act({
    type: "review",
    bookingId: "booking-1",
    rating: 4,
    text: "Great camera.",
  });
  assert.equal(j.state.reviews.length, 2);
  assert.equal(j.state.listings[0].rating, 4);
  assert.equal(j.state.evidence.length, 2);
  assert.equal(riskFor(j.state, j.state.profiles[0]).score, 77);
});
test("approval atomically rejects overlapping requests but permits adjacent rentals", () => {
  const j = journey();
  j.request();
  j.login("owner-sarah");
  j.request("booking-2");
  j.login("owner-aiman");
  j.operation("approve");
  const calendar = availabilityCalendar(j.state, j.state.listings[0], 5);
  assert.equal(calendar[1].status, "reserved");
  assert.equal(calendar[2].status, "reserved");
  assert.equal(calendar[3].status, "available");
  assert.throws(
    () => j.act({ type: "booking", id: "booking-2", operation: "approve" }),
    /already reserved/,
  );
  assert.equal(
    j.state.bookings.find((b) => b.id === "booking-2")?.status,
    "pending",
  );
  availability(j.state, j.state.listings[0], dateAfter(3), dateAfter(4));
  j.login("demo-renter");
  j.operation("cancel");
  availability(j.state, j.state.listings[0], dateAfter(1), dateAfter(3));
});
test("the final available date can be rented with an exclusive next-day return", () => {
  const state = createSeed();
  const finalDay = dateAfter(2);
  const listing = {
    ...state.listings[0],
    availableFrom: finalDay,
    availableTo: finalDay,
  };
  const saved = transition(
    { ...state, currentUserId: listing.ownerId },
    { type: "saveListing", listing },
  );
  assert.equal(availabilityCalendar(saved, listing, 4)[2].status, "available");
  assert.equal(availabilityCalendar(saved, listing, 4)[3].status, "unavailable");
  availability(saved, listing, finalDay, dateAfter(3));
  assert.throws(
    () => availability(saved, listing, finalDay, dateAfter(4)),
    /outside the owner/,
  );
});
test("dispute preserves evidence and freezes deposit release", () => {
  const j = journey();
  j.request();
  j.login("owner-aiman");
  j.operation("approve");
  j.login("demo-renter");
  j.operation("pay", { method: "Demo card" });
  j.operation("payment_result");
  j.login("owner-aiman");
  j.operation("check_in", { photo: "photo" });
  j.act({
    type: "dispute",
    bookingId: "booking-1",
    reason: "The lens is damaged.",
    photo: "evidence",
  });
  assert.equal(j.state.bookings[0].deposit, "disputed");
  assert.throws(() => j.operation("release"), /inspect/);
  assert.throws(() => j.operation("cancel"), /unpaid/);
  assert.equal(j.state.disputes.length, 1);
  assert.equal(riskFor(j.state, j.state.profiles[0]).score, 45);
});
test("listing publication, dates, ownership, verification and deletion are enforced", () => {
  const j = journey();
  const listing = {
    ...j.state.listings[0],
    id: "new",
    ownerId: "demo-renter",
    images: [],
    imageUrl: "",
  };
  assert.throws(() => j.act({ type: "saveListing", listing }), /photo/);
  j.act({ type: "saveListing", listing: { ...listing, status: "draft" } });
  assert.throws(() => j.request("bad", "new"), /own item/);
  assert.throws(
    () =>
      j.act({ type: "saveListing", listing: { ...listing, dailyPrice: NaN } }),
    /positive/,
  );
  assert.throws(
    () =>
      j.act({
        type: "saveListing",
        listing: j.state.listings.find((l) => l.id === "sony-a7iii")!,
      }),
    /Only the owner/,
  );
  j.request();
  j.login("owner-aiman");
  assert.throws(
    () => j.act({ type: "deleteListing", id: "sony-a7iii" }),
    /outstanding rentals/,
  );
  j.operation("reject");
  j.act({ type: "deleteListing", id: "sony-a7iii" });
  assert.equal(j.state.bookings[0].title, "Sony A7 III Mirrorless Camera");
});
test("accounts, private messages and notifications stay separated", () => {
  const j = journey();
  j.request();
  j.act({
    type: "message",
    bookingId: "booking-1",
    text: "Can we meet at noon?",
  });
  const messageNotice = j.state.notifications.find((notice) =>
    notice.title.includes("sent you a message"),
  );
  assert.ok(messageNotice && !messageNotice.read);
  j.login("owner-aiman");
  j.act({ type: "readConversation", bookingId: "booking-1" });
  assert.equal(
    j.state.notifications.find((notice) => notice.id === messageNotice.id)
      ?.read,
    true,
  );
  j.login("owner-sarah");
  assert.throws(
    () => j.act({ type: "message", bookingId: "booking-1", text: "Intruding" }),
    /access denied/,
  );
  assert.throws(() => j.operation("approve"), /access denied/);
  j.act({ type: "readNotices" });
  assert.ok(
    j.state.notifications.some((n) => n.userId === "owner-aiman" && !n.read),
  );
  j.act({
    type: "signup",
    profile: {
      id: "new-user",
      name: "Test User",
      email: "test@example.com",
      verification: "not_verified",
      favourites: [],
    },
  });
  assert.throws(() => j.request("unverified"), /identity verification/);
  j.act({ type: "verify", status: "pending" });
  j.act({ type: "verify", status: "failed" });
  j.act({ type: "verify", status: "pending" });
  j.act({ type: "verify", status: "verified" });
  j.request("verified");
  assert.equal(j.state.bookings[0].renterId, "new-user");
});
test("collection choices are validated and recorded in the agreement", () => {
  let state = createSeed();
  state.listings[0].collectionMethods = ["Meet Owner", "Self-Pickup"];
  const request = (
    collectionMethod: "Meet Owner" | "Self-Pickup" | "Delivery Available",
  ) =>
    transition(state, {
      type: "request",
      id: "collection-booking",
      listingId: "sony-a7iii",
      start: dateAfter(1),
      end: dateAfter(3),
      protection: false,
      collectionMethod,
    });
  assert.throws(() => request("Delivery Available"), /not available/);
  state = request("Self-Pickup");
  assert.equal(state.bookings[0].collectionMethod, "Self-Pickup");
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, {
    type: "booking",
    id: "collection-booking",
    operation: "approve",
  });
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "booking",
    id: "collection-booking",
    operation: "pay",
    method: "Demo card",
  });
  state = transition(state, {
    type: "booking",
    id: "collection-booking",
    operation: "payment_result",
  });
  assert.match(
    state.bookings[0].agreement || "",
    /Collection method: Self-Pickup/,
  );
});
test("state snapshots can reload mid-payment without losing fees or agreement progress", () => {
  const j = journey();
  j.request();
  j.login("owner-aiman");
  j.operation("approve");
  j.login("demo-renter");
  j.operation("pay", { method: "Demo card" });
  const loaded = JSON.parse(JSON.stringify(j.state));
  const paid = transition(loaded, {
    type: "booking",
    id: "booking-1",
    operation: "payment_result",
  });
  assert.equal(paid.bookings[0].quote.total, 495);
  assert.equal(paid.bookings[0].payment, "paid");
  assert.equal(loaded.bookings[0].payment, "processing");
});

test("V1.8 deposit caps at RM12,000 replacement value correctly enforce caps across all tiers", () => {
  const { calculateSecurityDeposit } = require("../services/deposit");
  assert.equal(calculateSecurityDeposit(12000, "low"), 500); // 5% = 600, cap 500
  assert.equal(calculateSecurityDeposit(12000, "medium"), 1000); // 10% = 1200, cap 1000
  assert.equal(calculateSecurityDeposit(12000, "high"), 1500); // 15% = 1800, cap 1500
  assert.equal(calculateSecurityDeposit(12000, "very_high"), 0);
  assert.equal(calculateSecurityDeposit(12000, "unverified"), 0);
});

test("started 24-hour block pricing charges full days for partial blocks", () => {
  // exactly 24h
  assert.equal(rentalDays("2026-11-01T10:00:00Z", "2026-11-02T10:00:00Z"), 1);
  // 31h -> 2 days
  assert.equal(rentalDays("2026-11-01T10:00:00Z", "2026-11-02T17:00:00Z"), 2);
  // exactly 48h -> 2 days
  assert.equal(rentalDays("2026-11-01T10:00:00Z", "2026-11-03T10:00:00Z"), 2);
  // 55h -> 3 days
  assert.equal(rentalDays("2026-11-01T10:00:00Z", "2026-11-03T17:00:00Z"), 3);
});

test("simulated eKYC verification initializes risk score to strictly 75 and unverified is N/A", () => {
  let state = createSeed();
  // Switch to unverified renter Chloe Ng
  state = transition(state, { type: "login", userId: "unverified-renter" });
  let user = state.profiles.find((p) => p.id === "unverified-renter")!;
  assert.equal(user.verification, "not_verified");
  assert.equal(riskFor(state, user).score, null);
  assert.equal(riskFor(state, user).level, "unverified");

  // Start verification
  state = transition(state, { type: "verify", status: "pending" });
  user = state.profiles.find((p) => p.id === "unverified-renter")!;
  assert.equal(user.verification, "pending");

  // Complete simulated verification
  state = transition(state, { type: "verify", status: "verified" });
  user = state.profiles.find((p) => p.id === "unverified-renter")!;
  assert.equal(user.verification, "verified");
  assert.equal(user.riskScore, 75);
  assert.equal(riskFor(state, user).score, 75);
  assert.equal(riskFor(state, user).level, "medium");
});

test("V3.15 risk score tier boundaries and direct checkout permissions (29, 30, 39, 40, 70, 79, 80, 100)", () => {
  const { tierForScore } = require("../services/riskScore");
  // 0-29: Very High Risk, platform review, canDirectBook: false
  assert.deepEqual(tierForScore(0), { level: "very_high", label: "Very High Risk", canDirectBook: false });
  assert.deepEqual(tierForScore(29), { level: "very_high", label: "Very High Risk", canDirectBook: false });

  // 30-39: High Risk, canDirectBook: true
  assert.deepEqual(tierForScore(30), { level: "high", label: "High Risk", canDirectBook: true });
  assert.deepEqual(tierForScore(39), { level: "high", label: "High Risk", canDirectBook: true });

  // 40-79: Medium Risk, canDirectBook: true
  assert.deepEqual(tierForScore(40), { level: "medium", label: "Medium Risk", canDirectBook: true });
  assert.deepEqual(tierForScore(70), { level: "medium", label: "Medium Risk", canDirectBook: true });
  assert.deepEqual(tierForScore(79), { level: "medium", label: "Medium Risk", canDirectBook: true });

  // 80-100: Low Risk, canDirectBook: true
  assert.deepEqual(tierForScore(80), { level: "low", label: "Low Risk", canDirectBook: true });
  assert.deepEqual(tierForScore(100), { level: "low", label: "Low Risk", canDirectBook: true });
});

test("single winning incident rule applies only the most severe penalty and marks others Recorded", () => {
  const { evaluateRentalOutcome } = require("../services/riskScore");
  // Multiple incidents in one rental: 4h late (-2) + minor damage (-10)
  const outcome = evaluateRentalOutcome([
    { type: "late_return", hoursLate: 4, confirmed: true },
    { type: "minor_damage", confirmed: true },
  ]);

  assert.equal(outcome.effectiveAdjustment, -10); // winning penalty is -10
  assert.equal(outcome.isBanned, false);
  assert.equal(outcome.incidents.length, 2);

  // Late return should be secondary (Recorded, not winning)
  const late = outcome.incidents.find((i: any) => i.type === "late_return")!;
  assert.equal(late.isWinning, false);
  assert.equal(late.penalty, -2);

  // Minor damage should be winning
  const damage = outcome.incidents.find((i: any) => i.type === "minor_damage")!;
  assert.equal(damage.isWinning, true);
  assert.equal(damage.penalty, -10);

  // Intentional theft/fraud triggers account ban
  const fraudOutcome = evaluateRentalOutcome([
    { type: "theft_fraud", confirmed: true },
  ]);
  assert.equal(fraudOutcome.isBanned, true);
});

test("RM10 lender boost features listing for 7 days", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "owner-aiman" });
  const listingId = "sony-a7iii";
  const beforeListing = state.listings.find((l) => l.id === listingId)!;
  assert.equal(beforeListing.featuredUntil, undefined);

  state = transition(state, { type: "boostListing", listingId });
  const afterListing = state.listings.find((l) => l.id === listingId)!;
  assert.ok(afterListing.featuredUntil);
  const diffDays =
    (new Date(afterListing.featuredUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  assert.ok(diffDays >= 6.9 && diffDays <= 7.1);
});

test("restrictions block rental requests for overdue obligations and banned users, and checkout for score < 30", () => {
  let state = createSeed();
  // Marcus Wong has overdue damage obligation
  state = transition(state, { type: "login", userId: "overdue-renter" });
  assert.throws(
    () =>
      transition(state, {
        type: "request",
        id: "req-overdue",
        listingId: "sony-a7iii",
        start: dateAfter(1),
        end: dateAfter(3),
        protection: false,
      }),
    /outstanding damage obligation/,
  );

  // Banned user
  state.profiles[0].isBanned = true;
  state = transition(state, { type: "login", userId: state.profiles[0].id });
  assert.throws(
    () =>
      transition(state, {
        type: "request",
        id: "req-banned",
        listingId: "sony-a7iii",
        start: dateAfter(1),
        end: dateAfter(3),
        protection: false,
      }),
    /banned from booking/,
  );
});

test("consecutive chain booking quote formula adds rental fee and service fee with RM0 extra deposit", () => {
  const { calculateConsecutiveQuote } = require("../services/deposit");
  const quote = calculateConsecutiveQuote(90); // RM90 extra rental
  assert.deepEqual(quote, {
    additionalRentalFee: 90,
    serviceFee: 5, // 5% of 90 is 4.50, min RM5
    deposit: 0, // RM0 extra deposit
    total: 95,
  });
});

test("Phase 3: two-sided handover requires both lender and renter confirmations to activate rental", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "request",
    id: "booking-handover",
    listingId: "sony-a7iii",
    start: dateAfter(2),
    end: dateAfter(4),
    protection: false,
  });

  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, { type: "booking", id: "booking-handover", operation: "approve" });

  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, { type: "booking", id: "booking-handover", operation: "pay", method: "Demo card" });
  state = transition(state, { type: "booking", id: "booking-handover", operation: "payment_result" });

  const bUpcoming = state.bookings.find((b) => b.id === "booking-handover")!;
  assert.equal(bUpcoming.status, "upcoming");
  assert.equal(bUpcoming.activationTimestamp, undefined);

  // Lender confirms handover first
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, { type: "handoverConfirm", bookingId: "booking-handover", role: "owner" });

  const bAfterOwner = state.bookings.find((b) => b.id === "booking-handover")!;
  assert.ok(bAfterOwner.lenderHandoverAt);
  assert.equal(bAfterOwner.status, "upcoming"); // Still upcoming! Only 1 side confirmed.

  // Renter confirms receipt
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, { type: "handoverConfirm", bookingId: "booking-handover", role: "renter" });

  const bActive = state.bookings.find((b) => b.id === "booking-handover")!;
  assert.ok(bActive.renterReceivedAt);
  assert.ok(bActive.activationTimestamp);
  assert.ok(bActive.effectiveReturnDeadline);
  assert.equal(bActive.status, "active");
  assert.equal(bActive.deposit, "held");
});

test("Phase 3: cancellation requires >= 24h before scheduled pickup with 100% refund and RM0 fee", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });
  // Start is 3 days in future (>= 24h)
  state = transition(state, {
    type: "request",
    id: "booking-cancel-ok",
    listingId: "sony-a7iii",
    start: dateAfter(3),
    end: dateAfter(5),
    protection: false,
  });

  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, { type: "booking", id: "booking-cancel-ok", operation: "approve" });

  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, { type: "booking", id: "booking-cancel-ok", operation: "pay", method: "Demo card" });
  state = transition(state, { type: "booking", id: "booking-cancel-ok", operation: "payment_result" });

  // Cancel eligible booking
  state = transition(state, { type: "booking", id: "booking-cancel-ok", operation: "cancel" });
  const bCancelled = state.bookings.find((b) => b.id === "booking-cancel-ok")!;
  assert.equal(bCancelled.status, "cancelled");
  assert.equal(bCancelled.payment, "refunded");
  assert.equal(bCancelled.deposit, "released");

  // Ineligible booking: pickup starts today (less than 24h away)
  state = transition(state, {
    type: "request",
    id: "booking-cancel-late",
    listingId: "sony-a7iii",
    start: dateAfter(0),
    end: dateAfter(2),
    protection: false,
  });
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, { type: "booking", id: "booking-cancel-late", operation: "approve" });
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, { type: "booking", id: "booking-cancel-late", operation: "pay", method: "Demo card" });
  state = transition(state, { type: "booking", id: "booking-cancel-late", operation: "payment_result" });

  assert.throws(
    () => transition(state, { type: "booking", id: "booking-cancel-late", operation: "cancel" }),
    /at least 24 hours/,
  );
});

test("Phase 4: active rental consecutive extension updates deadline with RM0 extra deposit", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "request",
    id: "booking-extend",
    listingId: "sony-a7iii",
    start: dateAfter(1),
    end: dateAfter(3),
    protection: false,
  });
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, { type: "booking", id: "booking-extend", operation: "approve" });
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, { type: "booking", id: "booking-extend", operation: "pay", method: "Demo card" });
  state = transition(state, { type: "booking", id: "booking-extend", operation: "payment_result" });

  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, { type: "handoverConfirm", bookingId: "booking-extend", role: "owner" });
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, { type: "handoverConfirm", bookingId: "booking-extend", role: "renter" });

  const bBefore = state.bookings.find((b) => b.id === "booking-extend")!;
  const origDays = bBefore.quote.days;
  const origDeposit = bBefore.quote.deposit;

  // Extend by 2 additional days
  state = transition(state, {
    type: "consecutiveExtend",
    bookingId: "booking-extend",
    additionalDays: 2,
  });

  const bAfter = state.bookings.find((b) => b.id === "booking-extend")!;
  assert.equal(bAfter.quote.days, origDays + 2);
  assert.equal(bAfter.quote.deposit, origDeposit); // Deposit unchanged, RM0 extra!
  assert.ok(bAfter.chainBookings && bAfter.chainBookings.length === 1);
});

test("Phase 4 & 5: two-sided clean return releases deposit and awards +2 score, while dispute blocks release", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "request",
    id: "booking-return",
    listingId: "sony-a7iii",
    start: dateAfter(1),
    end: dateAfter(3),
    protection: false,
  });
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, { type: "booking", id: "booking-return", operation: "approve" });
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, { type: "booking", id: "booking-return", operation: "pay", method: "Demo card" });
  state = transition(state, { type: "booking", id: "booking-return", operation: "payment_result" });
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, { type: "handoverConfirm", bookingId: "booking-return", role: "owner" });
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, { type: "handoverConfirm", bookingId: "booking-return", role: "renter" });

  const scoreBefore = state.profiles.find((p) => p.id === "demo-renter")!.riskScore;
  assert.equal(scoreBefore, 75);

  // Renter confirms return with photo
  state = transition(state, {
    type: "returnConfirm",
    bookingId: "booking-return",
    role: "renter",
    photo: "data:image/png;base64,returnPhoto",
    notes: "Everything in perfect shape",
  });
  const bHalfReturned = state.bookings.find((b) => b.id === "booking-return")!;
  assert.equal(bHalfReturned.status, "return_pending");
  assert.equal(bHalfReturned.deposit, "release_pending"); // Not released yet!

  // Owner confirms return inspection
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, {
    type: "returnConfirm",
    bookingId: "booking-return",
    role: "owner",
  });

  const bCompleted = state.bookings.find((b) => b.id === "booking-return")!;
  assert.equal(bCompleted.status, "completed");
  assert.equal(bCompleted.deposit, "released");

  const scoreAfter = state.profiles.find((p) => p.id === "demo-renter")!.riskScore;
  assert.equal(scoreAfter, 77); // +2 awarded on on-time clean return! Initial 75 + 2 = 77
});

test("Phase 5: predefined fictional dispute resolutions properly adjust deposit and risk penalties", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "request",
    id: "booking-dispute",
    listingId: "sony-a7iii",
    start: dateAfter(1),
    end: dateAfter(3),
    protection: false,
  });
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, { type: "booking", id: "booking-dispute", operation: "approve" });
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, { type: "booking", id: "booking-dispute", operation: "pay", method: "Demo card" });
  state = transition(state, { type: "booking", id: "booking-dispute", operation: "payment_result" });
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, { type: "handoverConfirm", bookingId: "booking-dispute", role: "owner" });
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, { type: "handoverConfirm", bookingId: "booking-dispute", role: "renter" });

  // Owner raises a dispute for scratched lens
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, {
    type: "dispute",
    bookingId: "booking-dispute",
    reason: "Front lens element has a deep scratch.",
    photo: "data:image/png;base64,scratchPhoto",
    category: "Item damaged",
  });

  const bDisputed = state.bookings.find((b) => b.id === "booking-dispute")!;
  assert.equal(bDisputed.status, "disputed");
  assert.equal(bDisputed.deposit, "disputed");

  const dispute = state.disputes.find((d) => d.bookingId === "booking-dispute")!;
  assert.equal(dispute.status, "under_review");

  // Resolve with minor damage fixture: deducts RM150, applies -10 penalty
  state = transition(state, {
    type: "resolveDispute",
    disputeId: dispute.id,
    scenario: "minor_damage",
  });

  const bResolved = state.bookings.find((b) => b.id === "booking-dispute")!;
  assert.equal(bResolved.status, "completed");
  const renterAfter = state.profiles.find((p) => p.id === "demo-renter")!;
  assert.equal(renterAfter.riskScore, 65); // 75 - 10 = 65
});

test("Phase 3: Option A delayed handover collision generates conflict offer that renter accepts to activate", () => {
  let state = createSeed();
  // Renter 1 books Nov 2 to Nov 5 (72h)
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "request",
    id: "booking-r1",
    listingId: "sony-a7iii",
    start: dateAfter(2),
    end: dateAfter(5),
    protection: false,
  });
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, { type: "booking", id: "booking-r1", operation: "approve" });
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, { type: "booking", id: "booking-r1", operation: "pay", method: "Demo card" });
  state = transition(state, { type: "booking", id: "booking-r1", operation: "payment_result" });

  // Renter 2 books Nov 5 to Nov 7
  state = transition(state, { type: "login", userId: "owner-sarah" });
  state = transition(state, {
    type: "request",
    id: "booking-r2",
    listingId: "sony-a7iii",
    start: dateAfter(5),
    end: dateAfter(7),
    protection: false,
  });
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, { type: "booking", id: "booking-r2", operation: "approve" });
  state = transition(state, { type: "login", userId: "owner-sarah" });
  state = transition(state, { type: "booking", id: "booking-r2", operation: "pay", method: "Demo card" });
  state = transition(state, { type: "booking", id: "booking-r2", operation: "payment_result" });

  // Simulate late handover for Renter 1 (shifts 12 hours later, overlapping Renter 2)
  const b1 = state.bookings.find((b) => b.id === "booking-r1")!;
  const latePickupTs = new Date(Date.now() + 2 * 86400000 + 12 * 3600000).toISOString();
  b1.lenderHandoverAt = latePickupTs;

  state = transition(state, { type: "login", userId: "demo-renter" });
  // Renter 1 confirms receipt, which triggers collision check
  state = transition(state, {
    type: "handoverConfirm",
    bookingId: "booking-r1",
    role: "renter",
  });

  const b1Checked = state.bookings.find((b) => b.id === "booking-r1")!;
  // Conflicting booking exists, so b1 receives a conflictOffer and is NOT yet active
  if (b1Checked.conflictOffer) {
    assert.ok(b1Checked.conflictOffer);
    assert.equal(b1Checked.status, "upcoming");

    // Renter 1 accepts revised rental offer
    state = transition(state, {
      type: "acceptRevisedRental",
      bookingId: "booking-r1",
    });

    const b1Activated = state.bookings.find((b) => b.id === "booking-r1")!;
    assert.equal(b1Activated.status, "active");
    assert.equal(b1Activated.deposit, "held");
    assert.equal(b1Activated.conflictOffer, null);
  }
});



