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
    deposit: 960,
    protection: 10,
    total: 1065,
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
  assert.equal(paid.bookings[0].quote.total, 1065);
  assert.equal(paid.bookings[0].payment, "paid");
  assert.equal(loaded.bookings[0].payment, "processing");
});
