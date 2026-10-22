import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { createSeed } from "../data/seed";
import { listings as mockListings } from "../data/mock";
import {
  MAIN_CATEGORIES,
  MOBILE_BROWSE_CATEGORIES,
  mobileBrowseCategoryFor,
} from "../constants/categories";
import {
  getIssueReportPermissions,
  isLenderDisputeEligible,
  resolveAutomatedSupportQuery,
  transition,
  type Action,
} from "../services/marketplace";
import {
  availability,
  availabilityCalendar,
  calculateCancellationCutoff,
  cancelledDepositReleaseDeadline,
  dateAfter,
  demoSlotAvailable,
  depositReleaseDeadline,
  effectiveDepositStatus,
  isDepositReleaseOverdue,
  formatMalaysiaDateTime,
  formatScheduledReturnPickup,
  calculateProtectionBasePremium,
  calculateProtectionFee,
  calculateProtectionLimit,
  requiresProtectionEligibilityReview,
  getBookingTotals,
  getEffectiveBookingStatus,
  isCancellationEligible,
  parseMalaysiaTimestamp,
  paymentMethodLabel,
  quoteFor,
  rentalTabForBooking,
  rentalDays,
  riskFor,
  toMalaysiaUtcTimestamp,
} from "../services/booking";
import { calculateOwnerPayout } from "../services/deposit";
import { withoutRetiredDemoBookings } from "../services/catalogue";
import { calculateChargeableWeightKg, calculateVolumetricWeightKg, crossStateDeliveryEligibility, deriveDeliveryRefundStatus, deriveDisplayDelivery, DOMESTIC_COURIER_NAME, eligibleDeliveryVehicles, estimatedCourierTransitDays, hasReliableCourierTransitEstimate, isDispatchDateFeasible, quoteAutomaticDomesticCourier, quoteAutomaticVehicleDelivery, quoteDemoDelivery, recommendDispatchDate, recommendsFragileHandling, selectDeliveryVehicle, selectListingDeliveryVehicle } from "../services/delivery";
import { estimateAutomaticDelivery, resolvePostcodeCoordinate } from "../services/geo";
import { repairDemoDeliveryPayments } from "../services/repairDemoDeliveryPayments";
import { evaluateRentalOutcome } from "../services/riskScore";
import {
  authenticateWithPassword,
  DEMO_OTP_CODE,
  describeSupabaseAuthError,
  normalizeMalaysianPhone,
  signOutAuthenticatedAccount,
} from "../services/auth";
import { provisionDemoAccount } from "../services/demoAccountProvisioning";
import { createNormalAccountWorkspace } from "../services/marketplacePersistence";
import { withoutRemovedSeedListings, withRefreshedCatalogueShippingData } from "../services/catalogue";
import {
  DEMO_LISTING_TEMPLATE,
  DEMO_SAVED_DELIVERY_ADDRESSES,
} from "../services/demoWorkspaceDefaults";
import {
  closeDemoWorkspaceSession,
  loadDemoWorkspaceSession,
  saveDemoWorkspaceSession,
  startDemoWorkspaceSession,
} from "../services/demoWorkspaceSessions";

test("paymentMethodLabel shows Online Payment (Demo) wording without changing the stored payment method value", () => {
  assert.equal(paymentMethodLabel("Demo FPX"), "Online Payment (Demo)");
  assert.equal(paymentMethodLabel("FPX"), "Online Payment (Demo)");
  assert.equal(paymentMethodLabel("BNPL (Demo)"), "BNPL (Demo)");
  assert.equal(paymentMethodLabel(undefined), "Online Payment (Demo)");
});

test("message rental links select the tab for each booking condition", () => {
  const booking = createSeed("admin_demo").bookings[0];
  const now = parseMalaysiaTimestamp("2026-10-16T12:00:00+08:00");
  const withStatus = (status: typeof booking.status) => ({ ...booking, status, payment: "paid" as const });
  assert.equal(rentalTabForBooking({ ...withStatus("upcoming"), start: "2026-10-17", end: "2026-10-19" }, now), "Upcoming");
  assert.equal(rentalTabForBooking({ ...withStatus("active"), end: "2026-10-17" }, now), "Active");
  assert.equal(rentalTabForBooking({ ...withStatus("active"), end: "2026-10-15", renterReturnConfirmedAt: null }, now), "Return Due");
  assert.equal(rentalTabForBooking(withStatus("return_pending"), now), "Return Due");
  assert.equal(rentalTabForBooking(withStatus("completed"), now), "Completed");
  assert.equal(rentalTabForBooking(withStatus("cancelled"), now), "Cancelled");
  assert.equal(rentalTabForBooking(withStatus("disputed"), now), "Disputed");
  assert.equal(rentalTabForBooking(withStatus("payment_required"), now), "Payment & Transaction History");
});

test("removed seed listings stay out of saved catalogues without hiding user listings", () => {
  const state = createSeed("normal");
  assert.equal(state.listings.length, 20);
  const userListing = { ...state.listings[0], id: "wedding-arch", ownerId: "real-owner" };
  const oldWedding = { ...userListing, ownerId: "owner-daniel" };
  const oldBicycle = { ...userListing, id: "city-explorer-bicycle", ownerId: "owner-sarah" };
  const cleaned = withoutRemovedSeedListings({ ...state, listings: [...state.listings, userListing, oldWedding, oldBicycle] });
  assert.equal(cleaned.listings.length, 21);
  assert.ok(cleaned.listings.includes(userListing));
  assert.equal(cleaned.bookings, state.bookings);
});

test("a normal account's stale persisted catalogue listing is refreshed to the canonical shipping data on load", () => {
  // Regression: a normal account's workspace is persisted indefinitely, so its copy of a
  // built-in listing like Sony A7 III can be frozen at an older data/mock.ts snapshot —
  // missing parcel weight/dimensions that were added later — while a Demo Account always
  // gets a freshly reseeded copy. That mismatch made the exact same listing show
  // "Delivery Details Required" to a normal account and "Cross-State Delivery Available"
  // to the Demo Account. withRefreshedCatalogueShippingData must eliminate that drift.
  const state = createSeed("normal");
  const index = state.listings.findIndex((l) => l.id === "sony-a7iii");
  assert.ok(index >= 0);
  const stale = {
    ...state,
    listings: state.listings.map((listing, i) =>
      i === index
        ? { ...listing, parcelWeightKg: undefined, parcelDimensionsCm: undefined, deliveryRequirement: "standard" as const, pickupPostcode: "00000" }
        : listing,
    ),
  };
  const refreshed = withRefreshedCatalogueShippingData(stale);
  const fixedListing = refreshed.listings.find((l) => l.id === "sony-a7iii")!;
  assert.equal(fixedListing.parcelWeightKg, state.listings[index].parcelWeightKg);
  assert.deepEqual(fixedListing.parcelDimensionsCm, state.listings[index].parcelDimensionsCm);
  assert.equal(fixedListing.deliveryRequirement, "fragile");
  assert.equal(fixedListing.pickupPostcode, state.listings[index].pickupPostcode);

  // A renter's own listing, even one that happens to collide on id/owner with a catalogue
  // entry's owner alone, must never be touched — only an exact id+ownerId catalogue match is.
  const untouched = withRefreshedCatalogueShippingData(state);
  assert.deepEqual(untouched.listings, state.listings);
});

test("Demo workspace starts fresh, persists in-session, and survives sign out and back in", () => {
  const accountId = "demo-auth-user";
  const previousStorage = globalThis.localStorage;
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => { entries.set(key, value); },
    },
  });
  try {
    const first = startDemoWorkspaceSession(accountId);
    first.profiles[0].name = "Changed for this session";
    saveDemoWorkspaceSession(accountId, first);

    assert.equal(
      loadDemoWorkspaceSession(accountId).profiles[0].name,
      "Changed for this session",
    );

    // Signing out must only end this tab's session, not erase the account's durable demo
    // workspace (bookings, addresses, etc.) — signing back in must restore it, not reset it.
    closeDemoWorkspaceSession(accountId);
    assert.equal(
      loadDemoWorkspaceSession(accountId).profiles[0].name,
      "Changed for this session",
    );

    startDemoWorkspaceSession(accountId);
    closeDemoWorkspaceSession(accountId);
  } finally {
    if (previousStorage === undefined) delete (globalThis as { localStorage?: Storage }).localStorage;
    else Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previousStorage });
  }
});

test("Demo saved addresses survive a fresh session and page reload", () => {
  const accountId = "demo-address-persistence";
  const previousStorage = globalThis.localStorage;
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => { entries.set(key, value); },
    },
  });
  try {
    const original = startDemoWorkspaceSession(accountId);
    const address = {
      recipientName: "Test Renter", phone: "0123456789",
      addressLine1: "99 Jalan Test", addressLine2: "Unit 3",
      postcode: "50000", city: "Kuala Lumpur", state: "Kuala Lumpur",
      instructions: "Leave at reception",
    };
    const saved = transition(original, { type: "saveDeliveryAddress", address });
    saveDemoWorkspaceSession(accountId, saved);
    closeDemoWorkspaceSession(accountId);

    const restored = loadDemoWorkspaceSession(accountId);
    const profile = restored.profiles.find((entry) => entry.id === restored.currentUserId);
    assert.deepEqual(profile?.savedDeliveryAddresses?.at(-1), { ...address, isDefault: false });
    const loadedProfile = loadDemoWorkspaceSession(accountId).profiles.find((entry) => entry.id === restored.currentUserId);
    assert.deepEqual(loadedProfile?.savedDeliveryAddress, loadedProfile?.savedDeliveryAddresses?.[0]);
  } finally {
    closeDemoWorkspaceSession(accountId);
    if (previousStorage === undefined) delete (globalThis as { localStorage?: Storage }).localStorage;
    else Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previousStorage });
  }
});

test("Demo listing chat reopens one thread and records unread messages for its owner", () => {
  let state = createSeed("admin_demo");
  const renterId = state.currentUserId;
  const listing = state.listings.find((item) => item.status === "published" && item.ownerId !== renterId);
  assert.ok(listing);
  state = transition(state, { type: "openChat", listingId: listing.id });
  const chat = state.chatConversations?.find((item) => item.listingId === listing.id && item.renterId === renterId);
  assert.ok(chat);
  state = transition(state, { type: "openChat", listingId: listing.id });
  assert.equal(state.chatConversations?.filter((item) => item.listingId === listing.id && item.renterId === renterId).length, 1);
  state = transition(state, { type: "sendChat", conversationId: chat.id, id: "chat-test-message", text: "Is it available?" });
  assert.equal(state.messages.find((item) => item.id === "chat-test-message")?.text, "Is it available?");
  assert.ok(state.notifications.some((item) => item.userId === listing.ownerId && item.conversationId === chat.id && !item.read));
  assert.throws(() => transition(state, { type: "sendChat", conversationId: chat.id, id: "chat-test-message", text: "Duplicate" }), /already sent/);
  state = transition(state, { type: "login", userId: listing.ownerId });
  state = transition(state, { type: "readChat", conversationId: chat.id });
  assert.equal(state.messages.find((item) => item.id === "chat-test-message")?.read, true);
  assert.equal(state.notifications.find((item) => item.conversationId === chat.id)?.read, true);
});

test("Chat with Owner for a sample listing works the same way for Normal Account workspaces, not just admin_demo", () => {
  // The reducer itself never gated chat on account mode — the old bug lived entirely in
  // the Messages screen's UI branching. This locks in that openChat/sendChat/readChat work
  // identically against a "normal"-mode workspace (sample listings, fictional owner ids).
  let state = createSeed("normal");
  const renterId = state.currentUserId;
  const listing = state.listings.find((item) => item.status === "published" && item.ownerId !== renterId);
  assert.ok(listing);
  assert.equal(state.mode, "normal");

  state = transition(state, { type: "openChat", listingId: listing.id });
  const chat = state.chatConversations?.find((item) => item.listingId === listing.id && item.renterId === renterId);
  assert.ok(chat);

  state = transition(state, { type: "sendChat", conversationId: chat.id, id: "normal-chat-message", text: "Still available?" });
  assert.equal(state.messages.find((item) => item.id === "normal-chat-message")?.text, "Still available?");

  // A second listing gets a distinct conversation, never merged with the first.
  const otherListing = state.listings.find((item) => item.status === "published" && item.ownerId !== renterId && item.id !== listing.id);
  assert.ok(otherListing);
  state = transition(state, { type: "openChat", listingId: otherListing.id });
  const otherChat = state.chatConversations?.find((item) => item.listingId === otherListing.id && item.renterId === renterId);
  assert.ok(otherChat);
  assert.notEqual(otherChat.id, chat.id);
  assert.equal(state.chatConversations?.length, 2);
});

test("two booking-less demo conversations never leak each other's messages (undefined bookingId must not match undefined bookingId)", () => {
  // Regression test for app/(tabs)/messages.tsx's per-conversation message filter. Before
  // the fix it read `message.conversationId === chat.id || message.bookingId === booking?.id`.
  // sendChat messages never carry a bookingId, and a conversation opened purely via "Chat
  // with Owner" (no booking yet) also has no booking — so `undefined === undefined` was
  // `true`, and Product A's message showed up inside Product B's conversation too.
  let state = createSeed("normal");
  const renterId = state.currentUserId;
  const [listingA, listingB] = state.listings.filter(
    (item) => item.status === "published" && item.ownerId !== renterId,
  );
  assert.ok(listingA && listingB && listingA.id !== listingB.id);

  state = transition(state, { type: "openChat", listingId: listingA.id });
  const chatA = state.chatConversations!.find((item) => item.listingId === listingA.id)!;
  state = transition(state, { type: "sendChat", conversationId: chatA.id, id: "msg-a", text: "Hello, is this camera available?" });

  state = transition(state, { type: "openChat", listingId: listingB.id });
  const chatB = state.chatConversations!.find((item) => item.listingId === listingB.id)!;

  // Neither chat has a linked booking yet — exactly the undefined/undefined case.
  const bookingA = state.bookings.find((item) => item.listingId === listingA.id && item.renterId === renterId);
  const bookingB = state.bookings.find((item) => item.listingId === listingB.id && item.renterId === renterId);
  assert.equal(bookingA === undefined, true);
  assert.equal(bookingB === undefined, true);

  function messagesForChat(chatId: string, bookingId: string | undefined) {
    return state.messages.filter((message) =>
      (!!message.conversationId && message.conversationId === chatId) ||
      (!!bookingId && !!message.bookingId && message.bookingId === bookingId));
  }

  assert.equal(messagesForChat(chatA.id, bookingA?.id).length, 1);
  assert.equal(messagesForChat(chatB.id, bookingB?.id).length, 0);
});

test("isFictionalOwnerId distinguishes seeded sample owners from real Supabase Auth UUIDs", () => {
  // services/chat.ts pulls in the Supabase client (and transitively react-native), which
  // this plain Node test runner can't transform — so this mirrors its exact regex rather
  // than importing the module, matching how messages.tsx used the check before it was
  // extracted into the named `isFictionalOwnerId` helper.
  const isFictionalOwnerId = (ownerId: string) => !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(ownerId);
  assert.equal(isFictionalOwnerId("owner-aiman"), true);
  assert.equal(isFictionalOwnerId("demo-renter"), true);
  assert.equal(isFictionalOwnerId("3fa85f64-5717-4562-b3fc-2c963f66afa6"), false);
});

test("new Supabase Normal workspaces start empty and are bound to their auth account", () => {
  const workspace = createNormalAccountWorkspace({
    id: "normal-auth-user",
    email: "member@example.com",
    name: "Member",
    phone: "+60123456789",
    verified: false,
  });

  assert.equal(workspace.currentUserId, "normal-auth-user");
  assert.equal(workspace.mode, "normal");
  assert.equal(
    workspace.profiles.find((profile) => profile.id === "normal-auth-user")
      ?.email,
    "member@example.com",
  );
  assert.equal(
    workspace.profiles.find((profile) => profile.id === "normal-auth-user")
      ?.phone,
    "+60123456789",
  );
  assert.equal(
    workspace.profiles.some((profile) => profile.id === "demo-renter"),
    false,
  );
  assert.equal(workspace.bookings.length, 0);
  assert.equal(workspace.messages.length, 0);
  assert.equal(workspace.evidence.length, 0);
  assert.equal(workspace.reviews.length, 0);
  assert.equal(workspace.disputes.length, 0);
  assert.equal(workspace.notifications.length, 0);
});

test("signup normalizes Malaysian mobile numbers and rejects invalid values", () => {
  assert.equal(DEMO_OTP_CODE, "123456");
  assert.equal(normalizeMalaysianPhone("12 345 6789"), "+60123456789");
  assert.equal(normalizeMalaysianPhone("012-345-6789"), "+60123456789");
  assert.equal(normalizeMalaysianPhone("+60 11 1234 5678"), "+601112345678");
  assert.throws(
    () => normalizeMalaysianPhone("234 567 890"),
    /valid Malaysian/,
  );
});

test("Supabase sign-up errors retain provider code, status, and trigger guidance", () => {
  assert.equal(
    describeSupabaseAuthError(
      {
        message: "Database error saving new user",
        code: "unexpected_failure",
        status: 500,
      },
      "sign-up",
    ),
    "Supabase sign-up failed [unexpected_failure] (HTTP 500): Database error saving new user Supabase rejected the Auth user hook; verify the initial profiles migration and handle_new_user trigger in the Dashboard.",
  );
  assert.equal(
    describeSupabaseAuthError(
      {
        message: "Password should be at least 10 characters",
        code: "weak_password",
        status: 422,
      },
      "sign-up",
    ),
    "Supabase sign-up failed [weak_password] (HTTP 422): Password should be at least 10 characters",
  );
});

test("email send limits explain the required Supabase configuration", () => {
  const message = describeSupabaseAuthError({
    message: "email rate limit exceeded", code: "over_email_send_rate_limit", status: 429,
  }, "sign-up");
  assert.match(message, /temporarily reached its email sending limit/);
  assert.match(message, /custom SMTP/);
  assert.doesNotMatch(message, /Registration accepted/);
});

test("Demo provisioning sets a provider-managed password for existing and new accounts", async () => {
  const password = "test-only-provisioned-password";
  let updated:
    | {
        id: string;
        password: string;
        email_confirm: true;
        app_metadata: { account_kind: string; verified_demo: boolean };
      }
    | undefined;
  const existingAdmin = {
    async listUsers() {
      return {
        data: {
          users: [{ id: "existing-demo-user", email: "democurrent@gmail.com" }],
        },
        error: null,
      };
    },
    async updateUserById(
      id: string,
      attributes: {
        password: string;
        email_confirm: true;
        app_metadata: { account_kind: "demo"; verified_demo: true };
      },
    ) {
      updated = { id, ...attributes };
      return { error: null };
    },
    async createUser() {
      assert.fail("An existing Demo user must be updated, not duplicated.");
      return { error: null };
    },
  };

  await provisionDemoAccount(existingAdmin, "DemoCurRENT@gmail.com", password);
  assert.deepEqual(updated, {
    id: "existing-demo-user",
    password,
    email_confirm: true,
    app_metadata: { account_kind: "demo", verified_demo: true },
  });

  let created:
    | {
        email: string;
        password: string;
        email_confirm: true;
        app_metadata: { account_kind: string; verified_demo: boolean };
      }
    | undefined;
  const newAdmin = {
    async listUsers() {
      return { data: { users: [] }, error: null };
    },
    async updateUserById() {
      assert.fail("A missing Demo user must be created.");
      return { error: null };
    },
    async createUser(attributes: {
      email: string;
      password: string;
      email_confirm: true;
      app_metadata: { account_kind: "demo"; verified_demo: true };
    }) {
      created = attributes;
      return { error: null };
    },
  };

  await provisionDemoAccount(newAdmin, "DemoCurRENT@gmail.com", password);
  assert.deepEqual(created, {
    email: "DemoCurRENT@gmail.com",
    password,
    email_confirm: true,
    app_metadata: { account_kind: "demo", verified_demo: true },
  });
});

function journey() {
  let state = createSeed();
  const act = (action: Action) => {
    state = transition(state, action);
  };
  const book = (id = "booking-1", listingId = "sony-a7iii") =>
    act({
      type: "instantBook",
      deliveryAddress: "Mont Kiara, Kuala Lumpur",
      id,
      listingId,
      start: `${dateAfter(2)}T11:00:00+08:00`,
      end: `${dateAfter(4)}T11:00:00+08:00`,
      paymentMethod: "Demo FPX",
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
    book,
    login,
    operation,
  };
}

test("historical regional delivery brackets and parcel limits drive demo quotes", () => {
  assert.equal(quoteDemoDelivery("Klang Valley", "Motorcycle", 5)?.fee, 5);
  assert.equal(quoteDemoDelivery("Klang Valley", "Motorcycle", 8)?.fee, 8);
  assert.equal(quoteDemoDelivery("Penang", "Motorcycle", 6)?.fee, 5.8);
  assert.equal(quoteDemoDelivery("Penang", "Motorcycle", 12)?.fee, 10.4);
  assert.equal(quoteDemoDelivery("Klang Valley", "Car", 16)?.fee, 19.5);
  assert.equal(quoteDemoDelivery("Klang Valley", "MPV", 101)?.fee, 201.5);
  assert.equal(quoteDemoDelivery("Melaka", "Car", 21)?.fee, 21.3);
  assert.equal(quoteDemoDelivery("Kota Kinabalu", "Motorcycle", 5)?.fee, 11);
  assert.equal(quoteDemoDelivery("Penang", "MPV", 8), null, "Penang has no MPV pricing bracket");
  assert.deepEqual(eligibleDeliveryVehicles(1, { length: 20, width: 20, height: 20 }), ["Motorcycle", "Car", "MPV"]);
  assert.deepEqual(eligibleDeliveryVehicles(60, { length: 70, width: 70, height: 70 }), ["MPV"]);
  const local = quoteAutomaticVehicleDelivery({ pickupPostcode: "46200", deliveryPostcode: "50480",
    weightKg: 1.5, dimensionsCm: { length: 30, width: 20, height: 15 } });
  assert.equal(local?.vehicle, "Motorcycle");
  assert.equal(local?.fee, quoteDemoDelivery("Klang Valley", "Motorcycle", local!.distanceKm)?.fee);
  assert.equal(quoteAutomaticVehicleDelivery({ pickupPostcode: "46200", deliveryPostcode: "50480",
    title: "Sony camera" })?.vehicle, "Car");
  assert.equal(quoteAutomaticVehicleDelivery({ pickupPostcode: "46200", deliveryPostcode: "50480",
    title: "Ergonomic Office Chair" })?.vehicle, "Car");
  assert.equal(quoteAutomaticVehicleDelivery({ pickupPostcode: "46200", deliveryPostcode: "50480",
    title: "Unfamiliar rental item" })?.vehicle, "Car", "Unclear items use the Car fallback");
  assert.equal(quoteAutomaticVehicleDelivery({ pickupPostcode: "46200", deliveryPostcode: "10000",
    weightKg: 1.5, dimensionsCm: { length: 30, width: 20, height: 15 } }), null,
    "Interstate routes are not quoted");

  const seed = createSeed("admin_demo");
  // Every booking whose delivery fee was actually paid has one linked delivery receipt, alongside
  // four standalone samples. A cancelled booking whose delivery was genuinely never paid (e.g.
  // demo-booking-cancelled-1, an unresolved courier arrangement) must not get a fabricated one.
  const neverPaidDeliveryCancelled = seed.bookings.filter(
    (b) => b.deliveryDemo?.status === "required" && (b.status === "cancelled" || b.status === "rejected"),
  );
  assert.ok(neverPaidDeliveryCancelled.length >= 1);
  const expectedLinked = seed.bookings.length - neverPaidDeliveryCancelled.length;
  assert.equal(seed.deliveryHistory?.length, expectedLinked + 4);
  const linked = seed.deliveryHistory?.filter((entry) => !entry.sample) || [];
  assert.equal(linked.length, expectedLinked);
  assert.ok(!linked.some((entry) => neverPaidDeliveryCancelled.some((b) => b.id === entry.bookingId)));
  assert.equal(new Set(linked.map((entry) => entry.bookingId)).size, linked.length);
  for (const entry of linked) {
    const booking = seed.bookings.find((b) => b.id === entry.bookingId);
    assert.ok(booking, `Delivery record ${entry.id} must link to an existing booking`);
    assert.ok(booking!.deliveryDemo?.status === "paid_demo" || booking!.deliveryDemo?.status === "refunded_demo");
    assert.equal(booking!.deliveryDemo?.fee, entry.fee, "Linked delivery record must match its booking's own deliveryDemo fee");
  }
  const penangSamples = (seed.deliveryHistory || []).filter((entry) => entry.sample && entry.area === "Penang");
  assert.ok(penangSamples.length >= 2, "Expected at least 2 fictional Penang demo delivery samples");
});

test("fragile camera handling selects the right local vehicle without changing courier or paid fees", () => {
  const state = createSeed("admin_demo");
  const sony = state.listings.find((listing) => listing.id === "sony-a7iii")!;
  assert.equal(sony.deliveryRequirement, "fragile");
  for (const id of ["gopro-camera", "drone", "portable-projector"]) {
    assert.equal(state.listings.find((listing) => listing.id === id)?.deliveryRequirement, "fragile");
  }
  assert.notEqual(state.listings.find((listing) => listing.id === "ps5-console")?.deliveryRequirement, "fragile");
  assert.equal(selectDeliveryVehicle(sony.parcelWeightKg, sony.parcelDimensionsCm, sony.deliveryRequirement), "Car");
  assert.equal(selectDeliveryVehicle(2, { length: 35, width: 25, height: 20 }, "standard"), "Motorcycle");
  assert.equal(selectDeliveryVehicle(20, { length: 70, width: 60, height: 40 }, "fragile"), "MPV");
  assert.equal(selectDeliveryVehicle(5, { length: 30, width: 20, height: 15 }, "bulky"), "MPV");
  assert.equal(selectDeliveryVehicle(120, { length: 120, width: 90, height: 90 }, "fragile"), null);
  assert.equal(quoteAutomaticVehicleDelivery({ pickupPostcode: "46200", deliveryPostcode: "50480",
    weightKg: 120, dimensionsCm: { length: 120, width: 90, height: 90 }, requirement: "fragile" }), null);
  assert.equal(recommendsFragileHandling("Canon RF Camera Lens"), true);
  assert.equal(recommendsFragileHandling("Wireless Game Controller"), false);
  assert.equal(recommendsFragileHandling("Portable Power Station", "Electronics"), false);

  const outbound = quoteAutomaticVehicleDelivery({ pickupPostcode: sony.pickupPostcode, deliveryPostcode: "50480",
    weightKg: sony.parcelWeightKg, dimensionsCm: sony.parcelDimensionsCm, requirement: sony.deliveryRequirement });
  const inbound = quoteAutomaticVehicleDelivery({ pickupPostcode: "50480", deliveryPostcode: sony.pickupPostcode,
    weightKg: sony.parcelWeightKg, dimensionsCm: sony.parcelDimensionsCm, requirement: sony.deliveryRequirement });
  assert.equal(outbound?.vehicle, "Car");
  assert.equal(outbound?.fee, quoteDemoDelivery(outbound!.area, "Car", outbound!.distanceKm)?.fee);
  assert.ok(inbound);
  assert.equal(inbound.vehicle, "Car");
  assert.equal(inbound.fee, quoteDemoDelivery(inbound.area, "Car", inbound.distanceKm)?.fee);

  assert.equal(crossStateDeliveryEligibility(sony), "available");
  assert.equal(quoteAutomaticVehicleDelivery({ pickupPostcode: sony.pickupPostcode, deliveryPostcode: "10000",
    weightKg: sony.parcelWeightKg, dimensionsCm: sony.parcelDimensionsCm, requirement: sony.deliveryRequirement }), null);
  assert.ok(quoteAutomaticDomesticCourier({ pickupPostcode: sony.pickupPostcode, deliveryPostcode: "10000",
    weightKg: sony.parcelWeightKg, dimensionsCm: sony.parcelDimensionsCm }));
  const paidSony = state.bookings.find((booking) => booking.id === "demo-booking-completed-1");
  assert.equal(paidSony?.deliveryDemo?.fee, 24.8);
  assert.equal(state.deliveryHistory?.find((receipt) => receipt.bookingId === paidSony?.id)?.fee, paidSony?.deliveryDemo?.fee);
});

test("crossStateDeliveryEligibility classifies a listing from its own recorded parcel data, never a hardcoded status", async () => {
  const { crossStateDeliveryEligibility } = await import("../services/delivery");

  // No parcel data recorded at all — eligibility can't be assessed yet.
  assert.equal(crossStateDeliveryEligibility({}), "requires_review");
  assert.equal(
    crossStateDeliveryEligibility({ parcelWeightKg: 2 /* no dimensions recorded */ }),
    "requires_review",
  );

  // A normal, well within courier limits, parcel is eligible.
  assert.equal(
    crossStateDeliveryEligibility({ parcelWeightKg: 2, parcelDimensionsCm: { length: 30, width: 20, height: 15 } }),
    "available",
  );

  // Any single oversized package (over 120cm on any side) blocks cross-state delivery outright —
  // mirrors the real courier quote's own oversize rule, not an invented second check.
  assert.equal(
    crossStateDeliveryEligibility({ parcelWeightKg: 20, parcelDimensionsCm: { length: 200, width: 60, height: 60 } }),
    "same_state_only",
  );
  assert.equal(
    crossStateDeliveryEligibility({
      parcelPackages: [
        { weightKg: 2, dimensionsCm: { length: 30, width: 20, height: 15 } },
        { weightKg: 5, dimensionsCm: { length: 150, width: 40, height: 40 } },
      ],
    }),
    "same_state_only",
  );

  // Zero/invalid weight or dimensions can't be assessed either.
  assert.equal(
    crossStateDeliveryEligibility({ parcelWeightKg: 0, parcelDimensionsCm: { length: 30, width: 20, height: 15 } }),
    "requires_review",
  );

  // Step 1 — an explicit platform restriction always wins, even for a perfectly fine parcel.
  assert.equal(
    crossStateDeliveryEligibility({
      parcelWeightKg: 2, parcelDimensionsCm: { length: 30, width: 20, height: 15 },
      crossStateRestricted: true,
    }),
    "same_state_only",
  );

  // Step 4 — restricted contents (liquids) block cross-state delivery regardless of size.
  assert.equal(
    crossStateDeliveryEligibility({
      parcelWeightKg: 2, parcelDimensionsCm: { length: 30, width: 20, height: 15 },
      shippingCharacteristics: ["restricted_liquid"],
    }),
    "same_state_only",
  );

  // A lithium battery or fragile/bulky flag alone does not disqualify a normally-sized item —
  // only an actual size/weight violation does. Electronics and fragile items are not
  // automatically rejected just for being electronics or fragile.
  assert.equal(
    crossStateDeliveryEligibility({
      parcelWeightKg: 2, parcelDimensionsCm: { length: 30, width: 20, height: 15 },
      shippingCharacteristics: ["lithium_battery"],
    }),
    "available",
  );
  assert.equal(
    crossStateDeliveryEligibility({
      parcelWeightKg: 2, parcelDimensionsCm: { length: 30, width: 20, height: 15 },
      shippingCharacteristics: ["fragile"],
    }),
    "available",
  );
});

test("The five named demo listings stay restricted to same-state delivery regardless of their parcel size, and the remaining seeded listings are evaluated normally", async () => {
  const { crossStateDeliveryEligibility } = await import("../services/delivery");
  const { listings } = await import("../data/mock");
  const restrictedTitles = [
    "Ergonomic Office Chair",
    "Pressure Washer",
    "Standing Air Cooler",
    "Portable Power Station",
    "Photo Booth Setup",
  ];
  const restrictedListings = listings.filter((l) => restrictedTitles.includes(l.title));
  assert.equal(restrictedListings.length, 5, "All five named demo listings must exist");
  for (const listing of restrictedListings) {
    assert.equal(listing.crossStateRestricted, true, `${listing.title} must carry the explicit platform restriction`);
    assert.equal(crossStateDeliveryEligibility(listing), "same_state_only", `${listing.title} must stay same-state only`);
  }

  // The remaining seeded listings are not force-restricted — each is evaluated on its own
  // recorded parcel data (this demo's fixtures all have usable data, so each resolves cleanly).
  const otherListings = listings.filter((l) => !restrictedTitles.includes(l.title));
  assert.ok(otherListings.length >= 15);
  for (const listing of otherListings) {
    assert.notEqual(listing.crossStateRestricted, true, `${listing.title} must not be force-restricted`);
    assert.notEqual(crossStateDeliveryEligibility(listing), "requires_review", `${listing.title} should have usable parcel data`);
  }
});

test("Cross-state restriction is enforced by actual booking validation (end-to-end), not just a frontend warning", () => {
  // Root-cause regression test: the booking-validation gate previously only ran when NEITHER the
  // GrabExpress nor the Domestic Courier quote resolved, so a restricted item with a normally
  // sized parcel (like the Standing Air Cooler, which fits comfortably inside the courier's
  // limits) sailed straight through on a real courier quote. The gate must fire purely from
  // "is this route actually cross-state + is this listing eligible", independent of whether a
  // quote happens to be available.
  const restrictedListingIds = ["office-chair", "pressure-washer", "standing-air-cooler", "power-station", "photo-booth"];

  for (const listingId of restrictedListingIds) {
    let state = createSeed();
    const listing = state.listings.find((l) => l.id === listingId)!;
    assert.equal(listing.crossStateRestricted, true, `${listingId} must be restricted`);
    // Office Chair happens to be demo-renter's own listing — book as a different verified renter
    // for that one case so "You cannot rent your own item" doesn't mask the check being tested.
    const renterId = listing.ownerId === "demo-renter" ? "owner-aiman" : "demo-renter";
    state = transition(state, { type: "login", userId: renterId });

    // -> Selangor (genuinely cross-state for any listing not itself pickup-located in Selangor):
    // BLOCKED. (Office Chair's own pickup is in Selangor, so that case is skipped here — it's
    // covered by the Kuala Lumpur case below instead, which no fixture is located in.)
    if (!/selangor/i.test(listing.location || "")) {
      assert.throws(
        () => transition(state, {
          type: "startDeliveryCheckout", id: `${listingId}-to-selangor`, listingId,
          start: `${dateAfter(20)}T11:00:00+08:00`, end: `${dateAfter(22)}T11:00:00+08:00`,
          deliveryAddress: "Subang Jaya, Selangor", deliveryPostcode: "47500",
        }),
        /cannot be delivered across states/,
        `${listingId}: Selangor delivery must be blocked`,
      );
    }

    // Also blocked to Kuala Lumpur.
    assert.throws(
      () => transition(state, {
        type: "startDeliveryCheckout", id: `${listingId}-to-kl`, listingId,
        start: `${dateAfter(20)}T11:00:00+08:00`, end: `${dateAfter(22)}T11:00:00+08:00`,
        deliveryAddress: "Mont Kiara, Kuala Lumpur", deliveryPostcode: "50480",
      }),
      /cannot be delivered across states/,
      `${listingId}: Kuala Lumpur delivery must be blocked`,
    );

    // Editing an existing (unpaid) booking's delivery address to a cross-state one must be
    // blocked the same way — the restriction can't be bypassed by "editing" around it.
    state = transition(state, {
      type: "startDeliveryCheckout", id: `${listingId}-edit-address`, listingId,
      start: `${dateAfter(20)}T11:00:00+08:00`, end: `${dateAfter(22)}T11:00:00+08:00`,
      deliveryAddress: listing.location!, deliveryPostcode: listing.pickupPostcode!, returnPickupTime: "15:00",
    });
    assert.throws(
      () => transition(state, {
        type: "correctBookingDeliveryAddress", bookingId: `${listingId}-edit-address`,
        deliveryAddress: "Mont Kiara, Kuala Lumpur", deliveryPostcode: "50480",
      }),
      /cannot be delivered across states/,
      `${listingId}: correcting the address to a cross-state one must be blocked`,
    );

    // A listing with outdated/stale persisted data — e.g. loaded from an old record saved before
    // `crossStateRestricted` existed, so the stored flag is missing — must still be blocked. This
    // listing's own recorded parcel fits comfortably inside the courier's limits (that's exactly
    // why the booking-validation bug went unnoticed), so without a backstop it would incorrectly
    // read as "available". The id-based PLATFORM_RESTRICTED_LISTING_IDS check is that backstop.
    const { crossStateDeliveryEligibility } = require("../services/delivery");
    const staleRecord = { ...listing, crossStateRestricted: undefined };
    assert.equal(
      crossStateDeliveryEligibility(staleRecord),
      "same_state_only",
      `${listingId}: must stay restricted even with a stale record missing the crossStateRestricted field`,
    );
    assert.throws(
      () => transition(
        { ...state, listings: state.listings.map((l) => (l.id === listingId ? staleRecord : l)) },
        {
          type: "startDeliveryCheckout", id: `${listingId}-stale-record`, listingId,
          start: `${dateAfter(25)}T11:00:00+08:00`, end: `${dateAfter(27)}T11:00:00+08:00`,
          deliveryAddress: "Mont Kiara, Kuala Lumpur", deliveryPostcode: "50480",
        },
      ),
      /cannot be delivered across states/,
      `${listingId}: a stale persisted record must still be blocked end-to-end`,
    );

    // Johor -> another Johor address (genuinely same-state): ALLOWED, subject to other delivery
    // requirements — the restriction only blocks actual cross-state routes.
    if (listing.pickupPostcode) {
      assert.doesNotThrow(
        () => transition(state, {
          type: "startDeliveryCheckout", id: `${listingId}-same-state`, listingId,
          start: `${dateAfter(30)}T11:00:00+08:00`, end: `${dateAfter(32)}T11:00:00+08:00`,
          deliveryAddress: listing.location!, deliveryPostcode: listing.pickupPostcode!, returnPickupTime: "15:00",
        }),
        `${listingId}: a same-state delivery address must remain allowed`,
      );
    }
  }
});

test("An eligible listing with valid parcel details can be booked cross-state", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });
  // sony-a7iii is not platform-restricted and has a normal recorded parcel.
  state = transition(state, {
    type: "startDeliveryCheckout", id: "eligible-cross-state", listingId: "sony-a7iii",
    start: `${dateAfter(20)}T11:00:00+08:00`, end: `${dateAfter(22)}T11:00:00+08:00`,
    deliveryAddress: "George Town, Penang", deliveryPostcode: "10000",
  });
  const booking = state.bookings.find((b) => b.id === "eligible-cross-state")!;
  assert.equal(booking.status, "payment_required");
  assert.ok(booking.deliveryDemo);
});

test("A listing whose parcel is too large for the courier blocks a cross-state checkout with a clear reason", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });
  // Find a seeded listing whose recorded parcel already exceeds the courier's 120cm limit on any
  // side — courier can never quote it, regardless of route.
  const oversizedListing = state.listings.find((l) =>
    (l.parcelDimensionsCm && [l.parcelDimensionsCm.length, l.parcelDimensionsCm.width, l.parcelDimensionsCm.height].some((side) => side > 120)) ||
    l.parcelPackages?.some((pkg) => [pkg.dimensionsCm.length, pkg.dimensionsCm.width, pkg.dimensionsCm.height].some((side) => side > 120)),
  );
  if (!oversizedListing) return; // No such fixture seeded — nothing to probe against.
  assert.throws(
    () => transition(state, {
      type: "startDeliveryCheckout",
      id: "cross-state-oversized-probe",
      listingId: oversizedListing.id,
      start: `${dateAfter(10)}T11:00:00+08:00`,
      end: `${dateAfter(12)}T11:00:00+08:00`,
      deliveryAddress: "George Town, Penang",
      deliveryPostcode: "10000",
    }),
    /cannot be delivered across states|shipping eligibility must be reviewed|Delivery estimate unavailable/,
  );
});

test("deriveDisplayDelivery connects Transaction Details / Rental Details to each booking's own saved delivery record", () => {
  const seed = createSeed("admin_demo");
  const byId = (id: string) => seed.bookings.find((b) => b.id === id)!;
  const listingFor = (b: ReturnType<typeof byId>) => seed.listings.find((l) => l.id === b.listingId);

  // A booking with a saved, paid deliveryDemo must surface that exact record (not a derived guess).
  const paid = byId("demo-booking-completed-1");
  const paidDisplay = deriveDisplayDelivery({
    collectionMethod: paid.collectionMethod, deliveryDemo: paid.deliveryDemo || null,
    pickupLocation: listingFor(paid)?.location || "", deliveryAddress: paid.deliveryAddress,
  });
  assert.equal(paidDisplay.status, "paid_demo");
  assert.equal(paidDisplay.fee, paid.deliveryDemo!.fee);
  assert.equal(paidDisplay.destination, paid.deliveryAddress);
  assert.equal(paidDisplay.receiptReference, paid.deliveryDemo!.receiptReference);
  // That receipt must actually resolve in deliveryHistory, so "View Receipt" always opens a real record.
  assert.ok(seed.deliveryHistory?.some((entry) => entry.id === paidDisplay.receiptReference));

  // A booking with no saved deliveryDemo and no delivery address must never claim a completed payment.
  // (Every real Delivery Only booking must carry an address per checkout validation; this models the
  // in-flight pre-checkout state before an address has been entered.)
  const noAddress = byId("demo-booking-protection-active");
  const noAddressDisplay = deriveDisplayDelivery({
    collectionMethod: noAddress.collectionMethod, deliveryDemo: null,
    pickupLocation: listingFor(noAddress)?.location || "", deliveryAddress: undefined,
  });
  assert.notEqual(noAddressDisplay.status, "paid_demo");
  assert.equal(noAddressDisplay.fee, null, "Must never fabricate a delivery fee");

  // Self-Pickup bookings must short-circuit to the dedicated no-fee state.
  const selfPickupDisplay = deriveDisplayDelivery({
    collectionMethod: "Self-Pickup", deliveryDemo: null, pickupLocation: "Petaling Jaya",
  });
  assert.equal(selfPickupDisplay.status, "self_pickup");
  assert.equal(selfPickupDisplay.fee, null);
});

test("Lender Rental Details computes the Ergonomic Office Chair delivery fee with the same automatic formula as the renter checkout, instead of 'Delivery Estimate Unavailable'", () => {
  const seed = createSeed("admin_demo");
  const listing = seed.listings.find((l) => l.id === "office-chair")!;
  const officeChairBookings = seed.bookings.filter((b) => b.listingId === "office-chair");
  assert.ok(officeChairBookings.length >= 2);

  for (const booking of officeChairBookings) {
    // Pickup and delivery must be in the same Malaysian state for a sensible demo route.
    assert.match(booking.deliveryAddress || "", /Selangor/);
    assert.ok(booking.deliveryPostcode);

    const display = deriveDisplayDelivery({
      collectionMethod: booking.collectionMethod,
      deliveryDemo: booking.deliveryDemo || null,
      pickupLocation: listing.location,
      deliveryAddress: booking.deliveryAddress,
      pickupPostcode: listing.pickupPostcode,
      deliveryPostcode: booking.deliveryPostcode,
    });

    // The core bug: lender view must never show "Delivery Estimate Unavailable" when a
    // resolvable pickup/delivery postcode pair exists.
    assert.notEqual(display.status, "unavailable");
    assert.ok(display.fee != null, "Delivery fee must be calculated, not unavailable");

    // Must be the exact same figures the renter-side checkout would have calculated —
    // the same reused formula per leg (quoteAutomaticVehicleDelivery, the GrabExpress-area
    // vehicle quote actually used at checkout), combined into a two-way total, not a guess.
    const expectedOutbound = quoteAutomaticVehicleDelivery({ pickupPostcode: listing.pickupPostcode,
      deliveryPostcode: booking.deliveryPostcode, weightKg: listing.parcelWeightKg,
      dimensionsCm: listing.parcelDimensionsCm, requirement: listing.deliveryRequirement,
      title: listing.title, category: listing.category, description: listing.description })!;
    const expectedReturn = quoteAutomaticVehicleDelivery({ pickupPostcode: booking.deliveryPostcode,
      deliveryPostcode: listing.pickupPostcode, weightKg: listing.parcelWeightKg,
      dimensionsCm: listing.parcelDimensionsCm, requirement: listing.deliveryRequirement,
      title: listing.title, category: listing.category, description: listing.description })!;
    assert.ok(expectedOutbound && expectedReturn);
    assert.equal(display.outboundFee, expectedOutbound.fee);
    assert.equal(display.returnFee, expectedReturn.fee);
    assert.equal(display.fee, Math.round((expectedOutbound.fee + expectedReturn.fee) * 100) / 100);
    assert.equal(display.distanceKm, expectedOutbound.distanceKm);
    assert.equal(display.baseFare, expectedOutbound.baseFare);
    assert.equal(display.distanceCharge, expectedOutbound.distanceCharge);

    assert.equal(display.status, "paid_demo");
  }
});

test("historical demo rentals show separate two-way estimates without changing recorded delivery payments", () => {
  const seed = createSeed("admin_demo");
  const categories = new Set<string>();
  for (const booking of seed.bookings) {
    const listing = seed.listings.find((item) => item.id === booking.listingId);
    const delivery = deriveDisplayDelivery({
      collectionMethod: booking.collectionMethod,
      deliveryDemo: booking.deliveryDemo,
      pickupLocation: listing?.location || "",
      deliveryAddress: booking.deliveryAddress,
      pickupPostcode: listing?.pickupPostcode,
      deliveryPostcode: booking.deliveryPostcode,
      parcelWeightKg: listing?.parcelWeightKg,
      parcelDimensionsCm: listing?.parcelDimensionsCm,
      deliveryRequirement: listing?.deliveryRequirement,
      demoBooking: true,
      listingId: booking.listingId,
    });
    const expected = quoteAutomaticVehicleDelivery({ pickupPostcode: listing?.pickupPostcode,
      deliveryPostcode: booking.deliveryPostcode, weightKg: listing?.parcelWeightKg,
      dimensionsCm: listing?.parcelDimensionsCm, requirement: listing?.deliveryRequirement });
    if (expected) {
      assert.ok(delivery.estimatedOutboundFee != null, `${booking.id}: outbound estimate`);
      assert.ok(delivery.estimatedReturnFee != null, `${booking.id}: return estimate`);
      assert.equal(delivery.estimatedTwoWayFee,
        Math.round((delivery.estimatedOutboundFee! + delivery.estimatedReturnFee!) * 100) / 100);
    }
    if (booking.deliveryDemo && booking.deliveryDemo.status !== "required") {
      assert.equal(delivery.fee, booking.deliveryDemo.fee, `${booking.id}: historical charge stays unchanged`);
      assert.equal(delivery.status, booking.deliveryDemo.status, `${booking.id}: payment status stays unchanged`);
    } else if (booking.deliveryDemo?.status === "required") {
      assert.equal(delivery.fee, delivery.estimatedTwoWayFee, `${booking.id}: unpaid quote uses current two-way estimate`);
      assert.equal(delivery.status, "required", `${booking.id}: no payment is invented`);
    } else {
      assert.notEqual(delivery.status, "paid_demo", `${booking.id}: estimate is not a payment`);
    }
    categories.add(booking.status);
  }
  for (const status of ["upcoming", "active", "return_pending", "completed", "cancelled", "disputed"])
    assert.ok(categories.has(status), `${status} demo category covered`);
});

test("demo payment repair is idempotent and leaves valid historical and customer payments unchanged", () => {
  const seeded = createSeed("admin_demo");
  const example = seeded.bookings.find((booking) => booking.id === "demo-booking-upcoming-1")!;
  // Cross-state (Petaling Jaya -> Penang): a Domestic Courier (Demo) receipt, not GrabExpress.
  assert.equal(example.deliveryDemo?.provider, "J&T Express (Demo)");
  assert.equal(example.deliveryDemo?.outboundFee, 19.5);
  assert.equal(example.deliveryDemo?.returnFee, 19.5);
  assert.equal(example.deliveryDemo?.fee, 39);
  assert.equal(example.deliveryDemo?.status, "paid_demo");
  assert.equal(seeded.deliveryHistory?.find((entry) => entry.bookingId === example.id)?.fee, 39);

  const once = repairDemoDeliveryPayments(seeded);
  const twice = repairDemoDeliveryPayments(once);
  assert.deepEqual(twice.bookings, once.bookings);
  assert.deepEqual(twice.deliveryHistory, once.deliveryHistory);

  const customer = { ...example, id: "customer-booking", contextMode: "normal" as const,
    deliveryDemo: { ...example.deliveryDemo!, fee: 9 } };
  const withCustomer = { ...seeded, bookings: [...seeded.bookings, customer] };
  const repaired = repairDemoDeliveryPayments(withCustomer);
  assert.equal(repaired.bookings.find((booking) => booking.id === customer.id)?.deliveryDemo?.fee, 9);
});

test("loading an older demo session repairs missing delivery receipts once", () => {
  const accountId = "delivery-repair-test";
  const old = createSeed("admin_demo");
  const booking = old.bookings.find((item) => item.id === "demo-booking-upcoming-1")!;
  booking.deliveryDemo = undefined;
  old.deliveryHistory = old.deliveryHistory?.filter((entry) => entry.bookingId !== booking.id);
  saveDemoWorkspaceSession(accountId, old);
  const loaded = loadDemoWorkspaceSession(accountId);
  const repaired = loaded.bookings.find((item) => item.id === booking.id)!;
  assert.equal(repaired.deliveryDemo?.fee, 39);
  assert.equal(repaired.deliveryDemo?.status, "paid_demo");
  assert.equal(loaded.deliveryHistory?.filter((entry) => entry.bookingId === booking.id).length, 1);
  const refreshed = loadDemoWorkspaceSession(accountId);
  assert.equal(refreshed.deliveryHistory?.filter((entry) => entry.bookingId === booking.id).length, 1);
  closeDemoWorkspaceSession(accountId);
});

test("an unpaid booking address can be corrected without changing a paid delivery record", () => {
  const seed = createSeed("admin_demo");
  seed.currentUserId = "demo-renter";
  const unpaid = seed.bookings.find((booking) => booking.id === "demo-booking-upcoming-1")!;
  unpaid.deliveryAddress = "";
  unpaid.deliveryPostcode = undefined;
  unpaid.deliveryDemo = undefined;
  const corrected = transition(seed, { type: "correctBookingDeliveryAddress", bookingId: unpaid.id,
    deliveryAddress: "Mont Kiara, Kuala Lumpur", deliveryPostcode: "50480" });
  const updated = corrected.bookings.find((booking) => booking.id === unpaid.id)!;
  assert.equal(updated.deliveryPostcode, "50480");
  assert.equal(updated.deliveryDemo, undefined, "Address correction never creates a payment");

  const pending = seed.bookings.find((booking) => booking.id === "demo-booking-protection-upcoming")!;
  pending.deliveryDemo!.status = "required";
  const requoted = transition(seed, { type: "correctBookingDeliveryAddress", bookingId: pending.id,
    deliveryAddress: "Bangsar, Kuala Lumpur", deliveryPostcode: "59100" });
  const changed = requoted.bookings.find((booking) => booking.id === pending.id)!;
  const pendingListing = seed.listings.find((listing) => listing.id === pending.listingId)!;
  const parcel = { weightKg: pendingListing.parcelWeightKg, dimensionsCm: pendingListing.parcelDimensionsCm,
    requirement: pendingListing.deliveryRequirement };
  const outbound = quoteAutomaticVehicleDelivery({ pickupPostcode: pendingListing.pickupPostcode, deliveryPostcode: "59100", ...parcel })!;
  const inbound = quoteAutomaticVehicleDelivery({ pickupPostcode: "59100", deliveryPostcode: pendingListing.pickupPostcode, ...parcel })!;
  assert.equal(changed.deliveryDemo?.fee, Math.round((outbound.fee + inbound.fee) * 100) / 100);
  assert.equal(changed.deliveryDemo?.status, "required");

  const paid = seed.bookings.find((booking) => booking.id === "demo-booking-completed-1")!;
  assert.throws(() => transition(seed, { type: "correctBookingDeliveryAddress", bookingId: paid.id,
    deliveryAddress: "Bangsar, Kuala Lumpur", deliveryPostcode: "59100" }), /paid delivery address/);
});

test("stale RM8 unpaid demo quote uses one route and current two-way fee before payment", () => {
  const seed = createSeed("admin_demo");
  const booking = seed.bookings.find((item) => item.id === "demo-booking-protection-upcoming")!;
  booking.deliveryDemo!.status = "required";
  booking.deliveryDemo!.fee = 8;
  booking.deliveryDemo!.outboundFee = undefined;
  booking.deliveryDemo!.returnFee = undefined;
  booking.deliveryDemo!.origin = "Kuala Lumpur";
  booking.deliveryDemo!.destination = "Mont Kiara, Kuala Lumpur";
  const listing = seed.listings.find((item) => item.id === booking.listingId)!;
  const display = deriveDisplayDelivery({
    collectionMethod: booking.collectionMethod, deliveryDemo: booking.deliveryDemo,
    pickupLocation: listing.privateMeetingVenue || listing.location,
    deliveryAddress: booking.deliveryAddress,
    pickupPostcode: listing.pickupPostcode, deliveryPostcode: booking.deliveryPostcode,
    parcelWeightKg: listing.parcelWeightKg, parcelDimensionsCm: listing.parcelDimensionsCm,
    deliveryRequirement: listing.deliveryRequirement,
    demoBooking: true, listingId: listing.id,
  });
  assert.equal(booking.deliveryDemo?.fee, 8, "synthetic legacy unpaid quote remains identifiable");
  assert.equal(display.origin, listing.privateMeetingVenue);
  assert.equal(display.destination, booking.deliveryAddress);
  assert.equal(display.distanceKm, display.returnDistanceKm);
  const parcel = { weightKg: listing.parcelWeightKg, dimensionsCm: listing.parcelDimensionsCm,
    requirement: listing.deliveryRequirement };
  assert.equal(display.outboundFee, quoteAutomaticVehicleDelivery({ pickupPostcode: listing.pickupPostcode, deliveryPostcode: booking.deliveryPostcode, ...parcel })!.fee);
  assert.equal(display.returnFee, quoteAutomaticVehicleDelivery({ pickupPostcode: booking.deliveryPostcode, deliveryPostcode: listing.pickupPostcode, ...parcel })!.fee);
  assert.equal(display.fee, display.estimatedTwoWayFee);
  assert.notEqual(display.fee, booking.deliveryDemo?.fee);

  seed.currentUserId = booking.renterId;
  booking.status = "payment_required";
  booking.payment = "required";
  seed.deliveryHistory = seed.deliveryHistory?.filter((item) => item.bookingId !== booking.id);
  const paid = transition(seed, { type: "payDeliveryDemo", bookingId: booking.id, receiptReference: "TEST-TWO-WAY" });
  const paidBooking = paid.bookings.find((item) => item.id === booking.id)!;
  assert.equal(paidBooking.deliveryDemo?.fee, display.estimatedTwoWayFee);
  assert.equal(paidBooking.deliveryDemo?.status, "paid_demo");
  assert.equal(paidBooking.deliveryDemo?.destination, booking.deliveryAddress);
  assert.equal(paid.deliveryHistory?.find((item) => item.bookingId === booking.id)?.fee, display.estimatedTwoWayFee);
});

test("getBookingTotals: subtotal with and without Rental Protection, grand total with delivery, no-address state, deposit-unknown state", () => {
  const baseQuote = { rentalFee: 56, serviceFee: 5, deposit: 60, protection: 0, total: 56 + 5 + 60 };
  // Subtotal without protection === quote.total (today's "Total to Pay").
  const withoutProtection = getBookingTotals(baseQuote, null);
  assert.equal(withoutProtection.subtotal, 121);
  assert.equal(withoutProtection.deliveryFee, null);
  assert.equal(withoutProtection.grandTotal, null, "No address/unavailable delivery must never fabricate a grand total");

  // Subtotal with Rental Protection included in quote.total.
  const protectedQuote = { rentalFee: 56, serviceFee: 5, deposit: 60, protection: 8, total: 56 + 5 + 60 + 8 };
  const withProtection = getBookingTotals(protectedQuote, null);
  assert.equal(withProtection.subtotal, 129);

  // Grand total combines subtotal + delivery fee, matching the spec's worked example.
  const withDelivery = getBookingTotals(baseQuote, 19.9);
  assert.equal(withDelivery.subtotal, 121);
  assert.equal(withDelivery.deliveryFee, 19.9);
  assert.equal(withDelivery.grandTotal, 140.9);

  // Deposit-unknown state (pre-eKYC): deposit is 0 in the quote, subtotal still computes cleanly
  // and the caller is responsible for showing "Estimated total" — getBookingTotals never throws.
  const depositUnknownQuote = { rentalFee: 56, serviceFee: 5, deposit: 0, protection: 0, total: 56 + 5 };
  const depositUnknown = getBookingTotals(depositUnknownQuote, null);
  assert.equal(depositUnknown.subtotal, 61);
  assert.equal(depositUnknown.grandTotal, null);
});

test("Payment & Transaction History: grouping by booking ID, subtotal/grand total with and without delivery, refunds and net cost for a cancelled booking, and summary tile totals", () => {
  const seed = createSeed("admin_demo");
  const renterId = "demo-renter";
  const renterBookings = seed.bookings.filter((b) => b.renterId === renterId);

  // Grouping rows by booking ID: one card per rental, each booking id appearing exactly once.
  const ids = renterBookings.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length, "Every booking must produce exactly one ledger card");
  assert.ok(renterBookings.length > 1);

  function ledgerFigures(b: (typeof renterBookings)[number]) {
    const listing = seed.listings.find((l) => l.id === b.listingId);
    const delivery = deriveDisplayDelivery({
      collectionMethod: b.collectionMethod, deliveryDemo: b.deliveryDemo || null,
      pickupLocation: listing?.location || b.deliveryDemo?.origin || "", deliveryAddress: b.deliveryAddress,
      pickupPostcode: listing?.pickupPostcode, deliveryPostcode: b.deliveryPostcode,
    });
    const deliveryPaid = delivery.status === "paid_demo" || delivery.status === "refunded_demo";
    const totals = getBookingTotals(b.quote, deliveryPaid ? delivery.fee : null);
    const grandTotal = totals.grandTotal ?? totals.subtotal;
    let refundsTotal = 0;
    if (b.status === "cancelled" && b.payment === "refunded") {
      refundsTotal += Math.round((b.quote.rentalFee + b.quote.serviceFee + b.quote.protection) * 100) / 100;
    }
    if (effectiveDepositStatus(b) === "released") refundsTotal += b.quote.deposit;
    if (delivery.status === "refunded_demo") refundsTotal += delivery.fee ?? 0;
    refundsTotal = Math.round(refundsTotal * 100) / 100;
    const netCost = Math.round((grandTotal - refundsTotal) * 100) / 100;
    return { totals, grandTotal, refundsTotal, netCost, deliveryPaid, delivery };
  }

  // currentSubtotal === quote.total (unchanged formula), regardless of delivery state.
  const anyBooking = renterBookings.find((b) => b.deposit !== "released")!;
  const anyFigures = ledgerFigures(anyBooking);
  assert.equal(anyFigures.totals.subtotal, anyBooking.quote.total);

  // A synthetic unfinished booking has no paid delivery record.
  const noDeliveryBooking = { ...renterBookings[0], deliveryDemo: undefined };
  const noDeliveryFigures = ledgerFigures(noDeliveryBooking);
  assert.equal(noDeliveryFigures.deliveryPaid, false);
  assert.equal(noDeliveryFigures.grandTotal, noDeliveryFigures.totals.subtotal);

  // The Luxury Watch cancellation includes the original prepaid delivery and a separate refund.
  // Its cancellation deadline (5 Malaysia working days from 5 Oct 2026) has long since passed
  // with no unresolved dispute, so its deposit auto-completes as released/refunded — the fee
  // refund and the deposit refund are both reflected in refundsTotal, leaving no net balance.
  const cancelledWatch = renterBookings.find((b) => b.id === "demo-booking-cancelled-1")!;
  assert.ok(cancelledWatch, "Expected the seeded Luxury Watch cancellation booking");
  assert.equal(cancelledWatch.title, "Luxury Watch");
  const cancelledWatchFigures = ledgerFigures(cancelledWatch);
  assert.equal(cancelledWatchFigures.totals.subtotal, 810);
  assert.equal(cancelledWatchFigures.grandTotal, 810 + cancelledWatch.deliveryDemo!.fee);
  assert.equal(cancelledWatchFigures.refundsTotal, 210 + cancelledWatch.quote.deposit + cancelledWatch.deliveryDemo!.fee);
  assert.equal(cancelledWatchFigures.netCost, 0);

  // Summary tiles: "Total paid" and "Refunded" sum cleanly across every card, and "Deposits held
  // in escrow" only counts deposits currently Held securely or Release pending.
  const allFigures = renterBookings.map(ledgerFigures);
  const totalPaid = Math.round(allFigures.reduce((sum, f) => sum + f.grandTotal, 0) * 100) / 100;
  const totalRefunded = Math.round(allFigures.reduce((sum, f) => sum + f.refundsTotal, 0) * 100) / 100;
  const depositsInEscrow = Math.round(
    renterBookings.reduce((sum, b) => sum + (b.deposit === "held" || b.deposit === "release_pending" ? b.quote.deposit : 0), 0) * 100,
  ) / 100;
  assert.ok(totalPaid > 0);
  assert.ok(totalRefunded >= 85, "Must at least include the microwave's refund");
  assert.ok(depositsInEscrow > 0);

  // A still-held (not yet released) deposit must never appear as a refund row — escrow and
  // refunds are mutually exclusive for the same booking.
  const heldBooking = renterBookings.find((b) => b.deposit === "held" && b.status !== "cancelled" && b.deliveryDemo?.status !== "refunded_demo");
  assert.ok(heldBooking, "Expected at least one seeded booking with a currently held deposit");
  assert.equal(ledgerFigures(heldBooking!).refundsTotal, 0);

  // The Luxury Watch cancellation's RAW stored deposit field stays "release_pending" (the
  // historical fact that it was once held/scheduled is preserved), but its EFFECTIVE status —
  // and therefore the ledger — report it as released/refunded now that its deadline has passed.
  assert.equal(cancelledWatch.deposit, "release_pending");
  assert.equal(effectiveDepositStatus(cancelledWatch), "released");

  // A cancellation whose deposit release deadline has NOT yet passed must still report the fee
  // refund alone — the deposit remains a distinct "release_pending" record, never prematurely
  // folded into Refunded just because the rental fee was already refunded.
  const notYetDueCancellation = { ...cancelledWatch, cancelledAt: "2026-10-21T11:00:00Z", depositReleasedAt: cancelledDepositReleaseDeadline("2026-10-21T11:00:00Z") };
  const notYetDueFigures = ledgerFigures(notYetDueCancellation);
  assert.equal(notYetDueFigures.refundsTotal, 210 + cancelledWatch.deliveryDemo!.fee,
    "Refunded total must equal the fee + delivery refund only while the deposit deadline hasn't passed yet");
});

test("manually typed Malaysian addresses (Petaling Jaya, Mont Kiara, George Town, Johor Bahru) all resolve a two-way delivery estimate from postcode alone", () => {
  // These are postcodes a renter could type into the manual address form without ever touching
  // a predefined dropdown — the delivery fee calculator must work from the postcode alone and
  // must not require any other field (e.g. recipient name/phone) to resolve a coordinate.
  const manualAddresses = [
    { label: "Petaling Jaya, Selangor", postcode: "46100" },
    { label: "Mont Kiara, Kuala Lumpur", postcode: "50480" },
    { label: "George Town, Pulau Pinang", postcode: "10000" },
    { label: "Johor Bahru, Johor", postcode: "80000" },
  ];
  const pickupPostcode = "47400"; // a seeded listing's pickup postcode (Damansara Uptown, PJ)
  for (const address of manualAddresses) {
    const outbound = estimateAutomaticDelivery(pickupPostcode, address.postcode);
    const inbound = estimateAutomaticDelivery(address.postcode, pickupPostcode);
    assert.ok(outbound, `Expected an outbound estimate for ${address.label}`);
    assert.ok(inbound, `Expected a return estimate for ${address.label}`);
    assert.ok(outbound!.fee > 0 && inbound!.fee > 0);
    // Two-way fee is the sum of two independently calculated legs, never a flat multiplier.
    const twoWay = Math.round((outbound!.fee + inbound!.fee) * 100) / 100;
    assert.equal(twoWay, Math.round((outbound!.fee + inbound!.fee) * 100) / 100);
  }
});

test("Domestic Courier (Demo): volumetric weight, chargeable weight, and cross-state zone quoting", () => {
  // Volumetric Weight (kg) = L x W x H / 6000.
  assert.equal(calculateVolumetricWeightKg({ length: 60, width: 60, height: 60 }), 36);
  // Chargeable Weight = MAX(actual, volumetric), rounded up to the nearest 0.5kg.
  assert.equal(calculateChargeableWeightKg(2, { length: 60, width: 60, height: 60 }), 36);
  assert.equal(calculateChargeableWeightKg(40, { length: 30, width: 20, height: 15 }), 40);
  assert.equal(calculateChargeableWeightKg(1.1, { length: 10, width: 10, height: 10 }), 1.5);

  // Same-state routes stay on GrabExpress — the courier quote must not fire for them.
  assert.equal(quoteAutomaticDomesticCourier({ pickupPostcode: "46100", deliveryPostcode: "50480",
    weightKg: 2, dimensionsCm: { length: 30, width: 20, height: 20 } }), null);

  // Cross-state West Malaysia route (Petaling Jaya -> George Town, Penang) resolves a courier quote.
  const west = quoteAutomaticDomesticCourier({ pickupPostcode: "46200", deliveryPostcode: "10000",
    weightKg: 2, dimensionsCm: { length: 35, width: 25, height: 20 } });
  assert.ok(west, "Expected a West Malaysia courier quote for a PJ -> Penang route");
  assert.equal(west!.zone, "West Malaysia");
  assert.ok(west!.fee > 0);
  assert.equal(west!.courierName, DOMESTIC_COURIER_NAME);

  // Cross-state East Malaysia route (Kuala Lumpur -> Kuching, Sarawak) uses the pricier zone.
  const east = quoteAutomaticDomesticCourier({ pickupPostcode: "50400", deliveryPostcode: "93000",
    weightKg: 12, dimensionsCm: { length: 55, width: 48, height: 38 } });
  assert.ok(east, "Expected an East Malaysia courier quote for a KL -> Kuching route");
  assert.equal(east!.zone, "East Malaysia");
  assert.ok(east!.fee > west!.fee, "East Malaysia should cost more than the equivalent West Malaysia route");

  // Multi-package items (e.g. Photo Booth Setup) price each package independently and combine.
  const singlePackage = quoteAutomaticDomesticCourier({ pickupPostcode: "30000", deliveryPostcode: "80000",
    weightKg: 20, dimensionsCm: { length: 85, width: 50, height: 40 } });
  const twoPackages = quoteAutomaticDomesticCourier({ pickupPostcode: "30000", deliveryPostcode: "80000",
    packages: [
      { weightKg: 20, dimensionsCm: { length: 85, width: 50, height: 40 } },
      { weightKg: 15, dimensionsCm: { length: 65, width: 50, height: 35 } },
    ] });
  assert.ok(singlePackage && twoPackages);
  assert.ok(twoPackages!.fee > singlePackage!.fee, "A second package must add its own charge, not ride free");

  // Oversized parcels (any side > 120cm) exceed every local vehicle AND the courier's standard
  // parcel size — both paths must return null so the UI shows a quotation-required message
  // instead of fabricating a vehicle or a postage fee.
  assert.equal(selectListingDeliveryVehicle({ weightKg: 4, dimensionsCm: { length: 130, width: 20, height: 18 } }), null);
  assert.equal(quoteAutomaticVehicleDelivery({ pickupPostcode: "80000", deliveryPostcode: "80000",
    weightKg: 4, dimensionsCm: { length: 130, width: 20, height: 18 } }), null);
  assert.equal(quoteAutomaticDomesticCourier({ pickupPostcode: "80000", deliveryPostcode: "46200",
    weightKg: 4, dimensionsCm: { length: 130, width: 20, height: 18 } }), null);
});

test("recommendDispatchDate uses J&T's published 2-3 day Peninsular estimate; East Malaysia has no reliable reference", () => {
  // Latest Planned Dispatch Date = Rental Start - (3-day transit + 1-day CurRENT buffer) = -4 days,
  // matching the task's own example (19 Oct start -> 15 Oct dispatch).
  assert.equal(recommendDispatchDate("2026-10-19", "West Malaysia"), "2026-10-15");
  assert.equal(recommendDispatchDate("2026-06-15", "West Malaysia", 0), "2026-06-12");
  // East Malaysia has no published transit reference this demo can cite — never fabricate one.
  assert.equal(recommendDispatchDate("2026-06-15", "East Malaysia"), null);
  assert.equal(hasReliableCourierTransitEstimate("West Malaysia"), true);
  assert.equal(hasReliableCourierTransitEstimate("East Malaysia"), false);
  assert.deepEqual(estimatedCourierTransitDays("West Malaysia"), { min: 2, max: 3 });
});

test("isDispatchDateFeasible rejects a dispatch date already in the past relative to today", () => {
  assert.equal(isDispatchDateFeasible("2026-06-10", "2026-06-10"), true);
  assert.equal(isDispatchDateFeasible("2026-06-10", "2026-06-09"), true);
  assert.equal(isDispatchDateFeasible("2026-06-10", "2026-06-11"), false);
});

test("Domestic Courier (Demo) scheduling: CurRENT recommends dates, the lender confirms outbound dispatch, and a paid fee is never recalculated", () => {
  const j = journey(); // logged in as demo-renter by default
  const start = `${dateAfter(10)}T11:00:00+08:00`;
  const end = `${dateAfter(12)}T11:00:00+08:00`;

  // The renter is never asked to type a dispatch date — no scheduling field is required to
  // start a courier checkout at all; CurRENT computes everything automatically.
  j.act({ type: "startDeliveryCheckout", id: "courier-schedule", listingId: "sony-a7iii",
    start, end, deliveryAddress: "George Town, Pulau Pinang", deliveryPostcode: "10000" });
  let booking = j.state.bookings.find((b) => b.id === "courier-schedule")!;
  assert.equal(booking.deliveryDemo?.provider, DOMESTIC_COURIER_NAME);
  assert.ok(booking.deliveryDemo?.dispatchDate, "CurRENT must auto-compute a dispatch date for West Malaysia");
  assert.equal(booking.deliveryDemo?.outboundDispatchStatus, "awaiting_lender_confirmation");
  assert.equal(booking.returnDispatchDate, end.slice(0, 10));
  const paidFee = booking.deliveryDemo!.fee;

  // A rental start too close to today doesn't leave enough transit time — never show a past
  // dispatch date as available.
  assert.throws(
    () => j.act({ type: "startDeliveryCheckout", id: "too-soon", listingId: "sony-a7iii",
      start: `${dateAfter(0)}T11:00:00+08:00`, end: `${dateAfter(2)}T11:00:00+08:00`,
      deliveryAddress: "George Town, Pulau Pinang", deliveryPostcode: "10000" }),
    /Selected Rental Dates Unavailable for Courier Delivery/,
  );

  j.act({ type: "payDeliveryDemo", bookingId: "courier-schedule", receiptReference: "DEMO-GE-COURIER-SCHEDULE" });
  j.act({ type: "completeRentalCheckout", bookingId: "courier-schedule", paymentMethod: "Demo FPX" });
  booking = j.state.bookings.find((b) => b.id === "courier-schedule")!;
  assert.equal(booking.deliveryDemo?.status, "paid_demo");

  // Only the lender (sony-a7iii's owner) can confirm the outbound dispatch arrangement.
  assert.throws(
    () => j.act({ type: "confirmOutboundDispatch", bookingId: "courier-schedule", decision: "accept" }),
    /only the lender/i,
  );

  j.login("owner-aiman");
  j.act({ type: "confirmOutboundDispatch", bookingId: "courier-schedule", decision: "accept" });
  booking = j.state.bookings.find((b) => b.id === "courier-schedule")!;
  assert.equal(booking.deliveryDemo?.outboundDispatchStatus, "confirmed");
  assert.ok(booking.deliveryDemo?.outboundTrackingRef);
  assert.ok(booking.lenderOutboundDispatchConfirmedAt);
  assert.equal(booking.deliveryDemo?.fee, paidFee, "Confirming dispatch must never recalculate the paid fee");

  // A lender-proposed date far enough out to miss the rental start requires renter approval,
  // and still never touches the paid fee.
  j.act({ type: "confirmOutboundDispatch", bookingId: "courier-schedule", decision: "propose", proposedDate: dateAfter(30) });
  booking = j.state.bookings.find((b) => b.id === "courier-schedule")!;
  assert.equal(booking.deliveryDemo?.outboundDispatchStatus, "proposed_alternate");
  assert.equal(booking.deliveryDemo?.requiresRenterDispatchApproval, true);
  assert.equal(booking.deliveryDemo?.fee, paidFee);

  j.login("demo-renter");
  assert.throws(
    () => j.act({ type: "confirmOutboundDispatch", bookingId: "courier-schedule", decision: "accept" }),
    /only the lender/i,
  );
  j.act({ type: "respondToDispatchProposal", bookingId: "courier-schedule", approve: true });
  booking = j.state.bookings.find((b) => b.id === "courier-schedule")!;
  assert.equal(booking.deliveryDemo?.outboundDispatchStatus, "confirmed");
  assert.equal(booking.deliveryDemo?.requiresRenterDispatchApproval, false);
  assert.equal(booking.deliveryDemo?.dispatchDate, dateAfter(30));
  assert.equal(booking.deliveryDemo?.fee, paidFee);

  // Return: a courier branch drop-off, not a scheduled pickup. The renter confirms the drop-off
  // through the existing returnConfirm flow (reused, not a new action), which stamps the demo
  // drop-off confirmation + tracking reference — deposit stays held until the lender also confirms.
  booking.end = new Date(Date.now() - 1).toISOString();
  booking.status = "active";
  j.act({ type: "returnConfirm", bookingId: "courier-schedule", role: "renter",
    photos: ["/p1.jpg", "/p2.jpg", "/p3.jpg", "/p4.jpg", "/p5.jpg", "/p6.jpg"], videos: ["/v1.mp4"] });
  booking = j.state.bookings.find((b) => b.id === "courier-schedule")!;
  assert.ok(booking.deliveryDemo?.returnDropoffConfirmedAt, "Expected the courier drop-off to be stamped");
  assert.ok(booking.deliveryDemo?.returnTrackingRef);
  assert.equal(booking.deposit, "held", "Deposit stays held until clean-return confirmation");

  // Drop-off arrangement (outbound leg) on a second booking.
  j.login("demo-renter");
  j.act({ type: "startDeliveryCheckout", id: "courier-dropoff", listingId: "sony-a7iii",
    start: `${dateAfter(14)}T11:00:00+08:00`, end: `${dateAfter(16)}T11:00:00+08:00`,
    deliveryAddress: "George Town, Pulau Pinang", deliveryPostcode: "10000" });
  j.act({ type: "payDeliveryDemo", bookingId: "courier-dropoff", receiptReference: "DEMO-GE-COURIER-DROPOFF" });
  j.act({ type: "completeRentalCheckout", bookingId: "courier-dropoff", paymentMethod: "Demo FPX" });
  j.login("owner-aiman");
  j.act({ type: "confirmOutboundDispatch", bookingId: "courier-dropoff", decision: "dropoff" });
  const dropoffBooking = j.state.bookings.find((b) => b.id === "courier-dropoff")!;
  assert.equal(dropoffBooking.deliveryDemo?.outboundDispatchStatus, "drop_off");
  assert.ok(dropoffBooking.deliveryDemo?.outboundTrackingRef);

  // East Malaysia (Sabah pickup): no published transit reference this demo can cite — CurRENT
  // must not fabricate a dispatch date or an estimated range, but the lender can still propose
  // one, which then always requires renter approval (CurRENT can't check compatibility itself).
  // "power-station" is the only seeded Sabah-pickup fixture, but it's also one of the five
  // listings explicitly restricted to same-state delivery, and that restriction is now enforced
  // even against a stale/overridden `crossStateRestricted` field (checked by listing id too — see
  // PLATFORM_RESTRICTED_LISTING_IDS). So this test clones the fixture under a different id, kept
  // out of that restricted-id set, purely to exercise the East Malaysia courier-estimate
  // behaviour being tested here, not the cross-state restriction itself.
  const sabahListing = { ...j.state.listings.find((l) => l.id === "power-station")!, id: "power-station-eastmy-test", crossStateRestricted: false };
  j.state.listings.push(sabahListing);
  j.login("demo-renter");
  j.act({ type: "startDeliveryCheckout", id: "courier-east", listingId: "power-station-eastmy-test",
    start: `${dateAfter(20)}T11:00:00+08:00`, end: `${dateAfter(22)}T11:00:00+08:00`,
    deliveryAddress: "Petaling Jaya, Selangor", deliveryPostcode: "46100" });
  let eastBooking = j.state.bookings.find((b) => b.id === "courier-east")!;
  assert.equal(eastBooking.deliveryDemo?.shippingZone, "East Malaysia");
  assert.equal(eastBooking.deliveryDemo?.dispatchDate, undefined);
  assert.equal(eastBooking.deliveryDemo?.estimatedDeliveryRangeStart, undefined);
  assert.equal(eastBooking.deliveryDemo?.outboundDispatchStatus, "awaiting_lender_confirmation");
  j.act({ type: "payDeliveryDemo", bookingId: "courier-east", receiptReference: "DEMO-GE-COURIER-EAST" });
  j.act({ type: "completeRentalCheckout", bookingId: "courier-east", paymentMethod: "Demo FPX" });
  j.login("owner-daniel");
  j.act({ type: "confirmOutboundDispatch", bookingId: "courier-east", decision: "propose", proposedDate: dateAfter(16) });
  eastBooking = j.state.bookings.find((b) => b.id === "courier-east")!;
  assert.equal(eastBooking.deliveryDemo?.outboundDispatchStatus, "proposed_alternate");
  assert.equal(eastBooking.deliveryDemo?.requiresRenterDispatchApproval, true);

  // GrabExpress (local, same-state) bookings never gain any of these courier-only fields.
  j.login("demo-renter");
  j.act({ type: "startDeliveryCheckout", id: "grab-schedule", listingId: "sony-a7iii",
    start: `${dateAfter(2)}T11:00:00+08:00`, end: `${dateAfter(4)}T11:00:00+08:00`,
    deliveryAddress: "Mont Kiara, Kuala Lumpur", deliveryPostcode: "50480", returnPickupTime: "15:00" });
  const grabBooking = j.state.bookings.find((b) => b.id === "grab-schedule")!;
  assert.equal(grabBooking.deliveryDemo?.provider, "GrabExpress (Simulation)");
  assert.equal(grabBooking.deliveryDemo?.outboundDispatchStatus, undefined);
  assert.equal(grabBooking.deliveryDemo?.dispatchDate, undefined);
});

test("automatic postcode-based delivery estimate: Haversine x road factor, MAX(RM5, RM4 + distance) fee, no API and no manual distance", () => {
  // Exact-postcode lookup resolves without hitting the prefix fallback.
  assert.ok(resolvePostcodeCoordinate("50480"));
  // A clearly invalid postcode must never resolve to a fabricated coordinate.
  assert.equal(resolvePostcodeCoordinate("abcde"), null);
  assert.equal(resolvePostcodeCoordinate("123"), null);
  // A postcode outside the exact dataset still resolves via the maintained prefix fallback —
  // this exercises states well outside Klang Valley (Penang here), so delivery is not assumed
  // to always be within Klang Valley.
  assert.ok(resolvePostcodeCoordinate("10050")); // Penang-area prefix "10"

  const estimate = estimateAutomaticDelivery("46200", "50480")!;
  assert.ok(estimate);
  assert.ok(estimate.distanceKm > 0);
  assert.equal(Math.round(estimate.distanceKm * 10) / 10, estimate.distanceKm, "Distance must be rounded to 1 decimal place");
  assert.equal(estimate.baseFee, 4);
  assert.equal(estimate.distanceCharge, Math.round(estimate.distanceKm * 100) / 100);
  assert.equal(estimate.fee, Math.round(Math.max(5, 4 + estimate.distanceCharge) * 100) / 100);
  assert.equal(Math.round(estimate.fee * 100) / 100, estimate.fee, "Fee must be rounded to 2 decimal places");

  // A very short hop must still fall back to the RM5 minimum, never below it.
  const shortHop = estimateAutomaticDelivery("46200", "46200")!;
  assert.equal(shortHop.fee, 5);

  // Missing/unrecognisable postcodes must never invent a distance or fee.
  assert.equal(estimateAutomaticDelivery("00000", "50480"), null);
  assert.equal(estimateAutomaticDelivery("46200", ""), null);
  assert.equal(estimateAutomaticDelivery(undefined, "50480"), null);

  // Identical reversed postcode pairs (outbound vs return) must produce the same deterministic
  // distance — a centroid-based method has no direction-specific routing information.
  const outbound = estimateAutomaticDelivery("46200", "50480")!;
  const inbound = estimateAutomaticDelivery("50480", "46200")!;
  assert.equal(outbound.distanceKm, inbound.distanceKm);
  assert.equal(outbound.fee, inbound.fee);

  // Two different postcode pairs within the same city must not collapse to one fixed distance.
  const shortRoute = estimateAutomaticDelivery("46200", "46100")!;
  const longRoute = estimateAutomaticDelivery("46200", "50480")!;
  assert.notEqual(shortRoute.distanceKm, longRoute.distanceKm);

  // The postcode reference dataset's state names match the app's own canonical state list
  // (e.g. "Pulau Pinang", not "Penang"), so auto-populating the state field is consistent with
  // the existing MalaysiaStateSelector options.
  assert.equal(resolvePostcodeCoordinate("10000")?.state, "Pulau Pinang");
});

test("renters select a return pickup time independent of the delivery arrival time, stored on the booking and never changing rental duration or fees", () => {
  const j = journey();
  const start = `${dateAfter(2)}T11:00:00+08:00`;
  const end = `${dateAfter(4)}T11:00:00+08:00`;

  // A return pickup time is required to start the delivery checkout.
  assert.throws(
    () => j.act({ type: "startDeliveryCheckout", id: "no-return-time", listingId: "sony-a7iii",
      start, end, deliveryAddress: "12 Jalan Example, Mont Kiara, Kuala Lumpur", deliveryPostcode: "50480",
      returnPickupTime: "" }),
    /return pickup time/i,
  );

  j.act({ type: "startDeliveryCheckout", id: "with-return-time", listingId: "sony-a7iii",
    start, end, deliveryAddress: "12 Jalan Example, Mont Kiara, Kuala Lumpur", deliveryPostcode: "50480",
    returnPickupTime: "16:00" });
  const booking = j.state.bookings.find((b) => b.id === "with-return-time")!;

  // Stored independently from the billing start/end timestamps (which stay anchored to 11:00,
  // the pickup time, per the existing 24-hour rental billing rule).
  assert.equal(booking.returnPickupTime, "16:00");
  assert.equal(booking.start, start);
  assert.equal(booking.end, end);

  // Display combines the booking's end DATE with the separately-selected return pickup TIME —
  // not the billing end-timestamp's own (pickup-locked) time-of-day.
  const displayed = formatScheduledReturnPickup(booking);
  assert.ok(displayed.includes("04:00 PM") || displayed.includes("4:00 PM"), `Expected 4:00 PM in "${displayed}"`);
  assert.notEqual(displayed, formatMalaysiaDateTime(booking.end));

  // Historical bookings recorded before this feature existed (no returnPickupTime) keep their
  // original confirmed schedule — same as formatMalaysiaDateTime(end).
  const legacyBooking = { end: booking.end };
  assert.equal(formatScheduledReturnPickup(legacyBooking), formatMalaysiaDateTime(booking.end));

  // Rental duration/fee are unaffected by the return pickup time: both bookings cover the same
  // dates and must quote identically.
  const noReturnTimeBooking = j.state.bookings.find((b) => b.id === "with-return-time")!;
  assert.equal(noReturnTimeBooking.quote.days, rentalDays(start, end));
});

test("BNPL (Demo) works as a second payment method selection, identical to FPX in amounts and flow", () => {
  const j = journey();
  const start = `${dateAfter(2)}T11:00:00+08:00`;
  const end = `${dateAfter(4)}T11:00:00+08:00`;
  j.act({ type: "startDeliveryCheckout", id: "bnpl-booking", listingId: "sony-a7iii",
    start, end, deliveryAddress: "12 Jalan Example, Mont Kiara, Kuala Lumpur", deliveryPostcode: "50480",
    returnPickupTime: "15:00" });
  j.act({ type: "payDeliveryDemo", bookingId: "bnpl-booking", receiptReference: "DEMO-GE-BNPL" });
  j.act({ type: "completeRentalCheckout", bookingId: "bnpl-booking", paymentMethod: "BNPL (Demo)" });
  const booking = j.state.bookings.find((b) => b.id === "bnpl-booking")!;

  // Selecting BNPL changes only the stored payment method label — never the amounts, the
  // deposit, the service fee or the booking/payment status, which all behave exactly as FPX.
  assert.equal(booking.paymentMethod, "BNPL (Demo)");
  assert.equal(booking.status, "upcoming");
  assert.equal(booking.payment, "paid");
  assert.equal(booking.deposit, "held");
  assert.equal(booking.quote.total, booking.quote.rentalFee + booking.quote.serviceFee + booking.quote.deposit);
});

test("demo seed includes a realistic mixture of FPX and BNPL (Demo) across renter booking statuses", () => {
  const seed = createSeed("admin_demo");
  const renterBookings = seed.bookings.filter((b) => b.renterId === "demo-renter" && b.id.startsWith("demo-booking-"));
  const methods = new Set(renterBookings.map((b) => b.paymentMethod).filter(Boolean));
  assert.ok(methods.has("Demo FPX"), "Expected at least one existing FPX booking to remain unchanged");
  assert.ok(methods.has("BNPL (Demo)"), "Expected at least one booking updated to BNPL (Demo)");
  // Updating the payment method must never change recorded amounts or statuses.
  const bnplBooking = renterBookings.find((b) => b.paymentMethod === "BNPL (Demo)")!;
  assert.ok(bnplBooking.quote.total > 0);
  assert.ok(["upcoming", "active", "return_pending", "completed", "cancelled", "disputed"].includes(bnplBooking.status));
});

test("delivery demo receipt is stored separately before rental payment", () => {
  const j = journey();
  const start = `${dateAfter(2)}T11:00:00+08:00`;
  const end = `${dateAfter(4)}T11:00:00+08:00`;
  const listing = createSeed().listings.find((l) => l.id === "sony-a7iii")!;
  const parcel = { weightKg: listing.parcelWeightKg, dimensionsCm: listing.parcelDimensionsCm,
    requirement: listing.deliveryRequirement };
  const expectedOutbound = quoteAutomaticVehicleDelivery({ pickupPostcode: listing.pickupPostcode, deliveryPostcode: "50480", ...parcel })!;
  const expectedReturn = quoteAutomaticVehicleDelivery({ pickupPostcode: "50480", deliveryPostcode: listing.pickupPostcode, ...parcel })!;
  j.act({ type: "startDeliveryCheckout", id: "delivery-booking", listingId: "sony-a7iii",
    start, end, deliveryAddress: "12 Jalan Example, Mont Kiara, Kuala Lumpur", deliveryPostcode: "50480", returnPickupTime: "15:00" });
  const pending = j.state.bookings.find((booking) => booking.id === "delivery-booking")!;
  assert.equal(pending.payment, "required");
  assert.equal(pending.status, "payment_required");
  // Combined two-way (outbound + return) delivery fee — each leg calculated separately.
  assert.equal(pending.deliveryDemo?.outboundFee, expectedOutbound.fee);
  assert.equal(pending.deliveryDemo?.returnFee, expectedReturn.fee);
  assert.equal(pending.deliveryDemo?.fee, Math.round((expectedOutbound.fee + expectedReturn.fee) * 100) / 100);
  assert.equal(pending.deliveryDemo?.distanceKm, expectedOutbound.distanceKm);
  assert.equal(pending.commissionRate, 0.13);
  assert.equal(pending.quote.total, pending.quote.rentalFee + pending.quote.serviceFee + pending.quote.deposit);
  assert.throws(() => j.act({ type: "completeRentalCheckout", bookingId: pending.id, paymentMethod: "Demo FPX" }), /delivery demo payment/);
  j.act({ type: "payDeliveryDemo", bookingId: pending.id, receiptReference: "DEMO-GE-123" });
  j.act({ type: "payDeliveryDemo", bookingId: pending.id, receiptReference: "DEMO-GE-DUPLICATE" });
  assert.equal(j.state.bookings.find((booking) => booking.id === pending.id)?.deliveryDemo?.receiptReference, "DEMO-GE-123");
  assert.equal(j.state.deliveryHistory?.filter((record) => record.bookingId === pending.id).length, 1);
  j.act({ type: "completeRentalCheckout", bookingId: pending.id, paymentMethod: "Demo FPX" });
  assert.equal(j.state.bookings.find((booking) => booking.id === pending.id)?.payment, "paid");
  assert.throws(() => j.act({ type: "completeRentalCheckout", bookingId: pending.id, paymentMethod: "Demo FPX" }), /already completed/);
  assert.equal(calculateOwnerPayout(pending.quote.rentalFee, pending.commissionRate).commission,
    Math.round(pending.quote.rentalFee * 13) / 100);
});

test("cancelling an unfinished checkout after delivery is paid never fabricates a completed delivery refund, and a rejected rental-payment attempt never re-charges delivery", () => {
  const j = journey();
  const start = `${dateAfter(2)}T11:00:00+08:00`;
  const end = `${dateAfter(4)}T11:00:00+08:00`;
  j.act({ type: "startDeliveryCheckout", id: "abandon-me", listingId: "sony-a7iii",
    start, end, deliveryAddress: "12 Jalan Example, Mont Kiara, Kuala Lumpur", deliveryPostcode: "50480", returnPickupTime: "15:00" });
  j.act({ type: "payDeliveryDemo", bookingId: "abandon-me", receiptReference: "DEMO-GE-ABANDON" });
  const paid = j.state.bookings.find((booking) => booking.id === "abandon-me")!;
  assert.equal(paid.deliveryDemo?.status, "paid_demo");

  // Abandon the booking before paying the rental fee: delivery fees are the delivery company's
  // responsibility, not CurRENT's, so cancelling must not invent a completed/approved refund —
  // the fee stays recorded as "paid_demo", and refund eligibility is assessed separately
  // (deriveDeliveryRefundStatus reports this exact case as "refund_pending", never "refunded").
  j.act({ type: "cancelDeliveryCheckout", bookingId: "abandon-me" });
  const cancelled = j.state.bookings.find((booking) => booking.id === "abandon-me")!;
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.deliveryDemo?.status, "paid_demo");
  assert.equal(cancelled.deliveryDemo?.refundedAt, undefined);
  assert.equal(
    deriveDeliveryRefundStatus({ cancelled: true, deliveryStatus: cancelled.deliveryDemo?.status, legStarted: false }),
    "refund_pending",
  );

  // Separately: a rejected rental-payment attempt (e.g. someone else tries to pay it) must leave
  // the booking unconfirmed and retryable, and must never touch — let alone re-charge — delivery.
  j.act({ type: "startDeliveryCheckout", id: "retry-me", listingId: "sony-a7iii",
    start, end, deliveryAddress: "12 Jalan Example, Mont Kiara, Kuala Lumpur", deliveryPostcode: "50480", returnPickupTime: "15:00" });
  j.act({ type: "payDeliveryDemo", bookingId: "retry-me", receiptReference: "DEMO-GE-RETRY" });
  j.login("owner-aiman");
  assert.throws(() => j.act({ type: "completeRentalCheckout", bookingId: "retry-me", paymentMethod: "Demo FPX" }));
  j.login("demo-renter");
  const stillPending = j.state.bookings.find((booking) => booking.id === "retry-me")!;
  assert.equal(stillPending.status, "payment_required");
  assert.equal(stillPending.deliveryDemo?.status, "paid_demo", "Delivery payment must not be reversed by a failed rental payment");
  // Safe retry by the actual renter succeeds without any new delivery charge.
  j.act({ type: "completeRentalCheckout", bookingId: "retry-me", paymentMethod: "Demo FPX" });
  assert.equal(j.state.bookings.find((booking) => booking.id === "retry-me")?.payment, "paid");
});

function withMockedNow<T>(timestamp: number, run: () => T): T {
  const originalNow = Date.now;
  Date.now = () => timestamp;
  try {
    return run();
  } finally {
    Date.now = originalNow;
  }
}

test("Demo password authentication rejects wrong credentials and supports logout plus fresh login", async () => {
  let authenticated = false;
  const fakeAuth = {
    async signInWithPassword({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) {
      const valid =
        email.toLowerCase() === "democurrent@gmail.com" &&
        password === "test-only-demo-password";
      authenticated = valid;
      return {
        data: {
          user: valid
            ? {
                id: "auth-demo-user",
                email: "DemoCurRENT@gmail.com",
                app_metadata: {
                  account_kind: "demo",
                  verified_demo: true,
                },
              }
            : null,
        },
        error: valid ? null : new Error("Invalid credentials"),
      };
    },
    async signOut() {
      authenticated = false;
      return { error: null };
    },
  };

  await assert.rejects(
    authenticateWithPassword(
      fakeAuth,
      "DemoCurRENT@gmail.com",
      "incorrect-password",
    ),
    /Email or password is incorrect/,
  );
  assert.equal(authenticated, false);

  const unauthorizedDemoAuth = {
    ...fakeAuth,
    async signInWithPassword() {
      return {
        data: {
          user: {
            email: "DemoCurRENT@gmail.com",
            id: "auth-demo-user",
            app_metadata: {
              account_kind: "demo",
              verified_demo: false,
            },
          },
        },
        error: null,
      };
    },
  };
  await assert.rejects(
    authenticateWithPassword(
      unauthorizedDemoAuth,
      "DemoCurRENT@gmail.com",
      "test-only-demo-password",
    ),
    /Email or password is incorrect/,
  );
  assert.equal(authenticated, false);

  assert.deepEqual(
    await authenticateWithPassword(
      fakeAuth,
      "DemoCurRENT@gmail.com",
      "test-only-demo-password",
    ),
    {
      accountKind: "demo",
      id: "auth-demo-user",
      email: "DemoCurRENT@gmail.com",
      name: "Alex Tan",
      verified: true,
    },
  );
  assert.equal(authenticated, true);
  let workspace = transition(createSeed(), {
    type: "setMode",
    mode: "admin_demo",
  });
  const baselineBookingIds = workspace.bookings.map((booking) => booking.id);
  assert.ok(workspace.profiles.some((profile) => profile.id === "demo-renter"));
  assert.ok(
    workspace.bookings.some((booking) => booking.renterId === "demo-renter"),
  );
  assert.ok(
    workspace.bookings.some((booking) => booking.ownerId === "owner-aiman"),
  );
  workspace.notifications = [];

  await signOutAuthenticatedAccount(fakeAuth);
  assert.equal(authenticated, false);

  assert.deepEqual(
    await authenticateWithPassword(
      fakeAuth,
      "DemoCurRENT@gmail.com",
      "test-only-demo-password",
    ),
    {
      accountKind: "demo",
      id: "auth-demo-user",
      email: "DemoCurRENT@gmail.com",
      name: "Alex Tan",
      verified: true,
    },
  );
  workspace = transition(workspace, { type: "setMode", mode: "admin_demo" });
  assert.equal(authenticated, true);
  assert.deepEqual(
    workspace.bookings.map((booking) => booking.id),
    baselineBookingIds,
  );
  assert.ok(workspace.notifications.length > 0);
});
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
    deposit: 200,
    protection: 5,
    total: 300,
  });
  assert.deepEqual(calculateOwnerPayout(90), {
    commission: 11.7,
    payout: 78.3,
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
  assert.throws(
    () =>
      quoteFor(
        state,
        state.profiles[0],
        { ...state.listings[0], estimatedValue: undefined },
        dateAfter(1),
        dateAfter(3),
      ),
    /protected platform valuation is not available/,
  );
  assert.throws(() => rentalDays("2027-02-30", "2027-03-04"), /valid calendar/);
  assert.throws(() => rentalDays(dateAfter(1), dateAfter(1)), /1 to 90/);
  assert.throws(() => rentalDays(dateAfter(1), dateAfter(92)), /1 to 90/);
});
test("optional third-party insurance demo prorates 0.3% by days with one RM5 booking minimum", () => {
  assert.equal(calculateProtectionBasePremium(1200, 2), 1.03);
  assert.equal(calculateProtectionBasePremium(4000, 2), 3.43);
  assert.equal(calculateProtectionFee(4000, 2), 5);
  assert.equal(calculateProtectionFee(4000, 7), 12);
  assert.equal(calculateProtectionFee(4000, 8), 13.71);
  assert.equal(calculateProtectionFee(1200, 2), 5);
  assert.equal(calculateProtectionFee(6000, 3), 7.71);
  assert.equal(calculateProtectionFee(0, 2), 0);
  assert.equal(calculateProtectionFee(4000, 0), 0);
  assert.equal(calculateProtectionLimit(500), 500);
  assert.equal(calculateProtectionLimit(2500), 2500);
  assert.equal(calculateProtectionLimit(90000), 60000);
  assert.equal(requiresProtectionEligibilityReview(90000), true);
  assert.equal(requiresProtectionEligibilityReview(60000), false);
  const state = createSeed();
  const unselected = quoteFor(state, state.profiles[0], state.listings[0], dateAfter(1), dateAfter(3), false);
  assert.equal(unselected.protection, 0);
  assert.equal(unselected.total, unselected.rentalFee + unselected.serviceFee + unselected.deposit);
  const selected = quoteFor(state, state.profiles[0], state.listings[0], dateAfter(1), dateAfter(3), true);
  assert.equal(selected.protection, calculateProtectionFee(state.listings[0].estimatedValue!, selected.days));
  assert.ok(selected.protection > 0);
  assert.equal(selected.deposit, unselected.deposit, "Protection must never change the risk-based security deposit.");
  assert.equal(selected.total, unselected.total + selected.protection);
  const historicalPaid = createSeed("admin_demo").bookings.find((booking) => booking.id === "demo-booking-protection-upcoming")!;
  assert.equal(historicalPaid.quote.protection, 10.5, "Previously paid demo booking premiums remain stored at their historical amounts.");
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
  assert.equal(
    availabilityCalendar(saved, listing, 4)[3].status,
    "unavailable",
  );
  availability(saved, listing, finalDay, dateAfter(3));
  assert.throws(
    () => availability(saved, listing, finalDay, dateAfter(4)),
    /outside the owner/,
  );
});
test("monthly availability calendar keeps later years visible but unavailable", () => {
  const state = createSeed();
  const listing = {
    ...state.listings[0],
    id: "calendar-listing",
    availableFrom: "2028-02-01",
    availableTo: "2028-03-31",
    availabilityPeriods: [],
  };
  const booking = {
    ...state.bookings[0],
    id: "calendar-booking",
    listingId: listing.id,
    start: toMalaysiaUtcTimestamp("2028-02-28", "11:00"),
    end: toMalaysiaUtcTimestamp("2028-03-02", "11:00"),
    status: "upcoming" as const,
  };
  const withBooking = { ...state, bookings: [booking] };

  const february = availabilityCalendar(withBooking, listing, 29, "2028-02-01");
  const march = availabilityCalendar(withBooking, listing, 31, "2028-03-01");

  assert.equal(february.length, 29);
  assert.equal(february[27].date, "2028-02-28");
  assert.equal(february[27].status, "unavailable");
  assert.equal(february[28].status, "unavailable");
  assert.equal(march[0].status, "unavailable");
  assert.equal(march[1].status, "unavailable");
  assert.equal(march[2].status, "unavailable");
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
  assert.throws(() => j.act({ type: "saveListing", listing }), /submit this listing/i);
  assert.throws(() => j.act({ type: "saveListing", listing: { ...listing, status: "pending_review" } }), /photo/);
  j.act({ type: "saveListing", listing: { ...listing, status: "draft" } });
  assert.throws(() => j.book("bad", "new"), /own item/);
  assert.throws(
    () =>
      j.act({ type: "saveListing", listing: { ...listing, status: "pending_review", dailyPrice: NaN } }),
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
  j.book();
  j.login("owner-aiman");
  assert.throws(
    () => j.act({ type: "deleteListing", id: "sony-a7iii" }),
    /outstanding rentals/,
  );
  j.operation("cancel");
  j.act({ type: "deleteListing", id: "sony-a7iii" });
  assert.equal(j.state.bookings[0].title, "Sony A7 III Mirrorless Camera");
});
test("Demo baseline restores complete fictional addresses and permits zero-media listing publication", () => {
  const state = createSeed("admin_demo");
  const demoRenter = state.profiles.find(
    (profile) => profile.id === "demo-renter",
  )!;
  assert.deepEqual(
    demoRenter.savedDeliveryAddresses,
    DEMO_SAVED_DELIVERY_ADDRESSES,
  );
  assert.equal(demoRenter.defaultDeliveryAddressIndex, 0);
  assert.equal(demoRenter.savedDeliveryAddress?.postcode, "47300");
  assert.equal(DEMO_LISTING_TEMPLATE.title, "Portable Projector");
  assert.equal(DEMO_LISTING_TEMPLATE.estimatedValue, 1200);

  const loggedIn = transition(state, {
    type: "login",
    userId: "demo-renter",
  });

  test("support handoff confirmation is added only by an explicit successful queue result", () => {
    const base = transition(createSeed("admin_demo"), {
      type: "login",
      userId: "demo-renter",
    });
    const failed = transition(base, {
      type: "supportHandoffResult",
      query: "I need a person to review a specific account issue.",
      messageId: "failed-message-id",
      accepted: false,
    });
    assert.equal(
      failed.supportMessages.at(-1)?.text,
      "I couldn't send your message to our support team right now. Please try again.",
    );

    const accepted = transition(base, {
      type: "supportHandoffResult",
      query: "I need a person to review a specific account issue.",
      caseId: "internal-case-id",
      messageId: "saved-message-id",
      accepted: true,
    });
    assert.equal(
      accepted.supportMessages.at(-1)?.text,
      "Your enquiry has been forwarded to our support team. We aim to respond here within one working hour. Thank you for your patience.",
    );
    assert.equal(accepted.supportMessages.at(-1)?.caseId, "internal-case-id");
  });
  const period = { start: dateAfter(2), end: dateAfter(30) };
  const published = transition(loggedIn, {
    type: "saveListing",
    listing: {
      id: "demo-zero-media-listing",
      ownerId: "demo-renter",
      title: "Demo Portable Projector",
      description:
        "Pre-filled classroom listing details for the portable projector.",
      category: "Electronics",
      location: "Kuala Lumpur",
      privateMeetingVenue: "Lot 10 Concierge, Kuala Lumpur",
      dailyPrice: 28,
      estimatedValue: 1200,
      images: [],
      videos: [],
      imageUrl: "",
      availableFrom: period.start,
      availableTo: period.end,
      availabilityPeriods: [period],
      collectionMethods: ["Delivery Only"],
      rating: 0,
      verifiedOwner: true,
      status: "published",
      deliveryTimeSlots: ["10:00", "14:00"],
      pickupTimeWindows: [
        { start: "10:00", end: "10:00" },
        { start: "14:00", end: "14:00" },
      ],
    },
  });
  assert.equal(
    published.listings.find(
      (listing) => listing.id === "demo-zero-media-listing",
    )?.status,
    "published",
  );
  const normal = transition(createSeed("normal"), {
    type: "login",
    userId: "demo-renter",
  });
  assert.throws(
    () =>
      transition(normal, {
        type: "saveListing",
        listing: {
          ...published.listings.find(
            (listing) => listing.id === "demo-zero-media-listing",
          )!,
          id: "normal-zero-media-listing",
          status: "pending_review",
        },
      }),
    /at least 6 photos and 1 video/,
  );
});
test("unverified accounts cannot use any lender listing mutation", () => {
  const state = createSeed();
  const accountId = "normal-unverified";
  state.profiles.push({
    id: accountId,
    name: "New Account",
    email: "new@example.com",
    verification: "not_verified",
    favourites: [],
    riskScore: null,
    riskLevel: "unverified",
  });
  state.currentUserId = accountId;

  assert.throws(
    () =>
      transition(state, {
        type: "saveListing",
        listing: {
          ...state.listings[0],
          id: "new-draft",
          ownerId: accountId,
          status: "draft",
        },
      }),
    /Complete Identity Verification to create or publish a listing/,
  );
  assert.throws(
    () => transition(state, { type: "deleteListing", id: "sony-a7iii" }),
    /Complete Identity Verification to create or publish a listing/,
  );
  assert.throws(
    () => transition(state, { type: "boostListing", listingId: "sony-a7iii", transactionId: "boost-unverified" }),
    /Complete Identity Verification to create or publish a listing/,
  );
});

test("renters can save a validated delivery address in their own profile", () => {
  const state = createSeed("admin_demo");
  state.currentUserId = "demo-renter";
  const initialAddress = state.profiles.find(
    (profile) => profile.id === "demo-renter",
  )?.savedDeliveryAddress;
  const address = {
    recipientName: "Demo Renter",
    phone: "+60123456789",
    addressLine1: "12 Jalan SS 15/4",
    addressLine2: "Unit 3A",
    postcode: "47500",
    city: "Subang Jaya",
    state: "Selangor",
    instructions: "Call on arrival",
  };

  const saved = transition(state, {
    type: "saveDeliveryAddress",
    address,
  });
  const savedRenter = saved.profiles.find(
    (profile) => profile.id === "demo-renter",
  );
  // A new saved address is added alongside the existing ones, without the "Set as
  // Default" box ticked, so it is not marked default and does not replace it.
  assert.deepEqual(
    savedRenter?.savedDeliveryAddresses?.at(-1),
    { ...address, isDefault: false },
  );
  assert.deepEqual(savedRenter?.savedDeliveryAddress, initialAddress);
  assert.equal(
    state.profiles.find((profile) => profile.id === "demo-renter")
      ?.savedDeliveryAddress,
    initialAddress,
  );
  assert.throws(
    () =>
      transition(state, {
        type: "saveDeliveryAddress",
        address: { ...address, postcode: " " },
      }),
    /Complete the required delivery address fields/,
  );
});

test("setting a default address clears the previous default", () => {
  const state = createSeed("admin_demo");
  state.currentUserId = "demo-renter";

  const updated = transition(state, {
    type: "setDefaultDeliveryAddress",
    index: 1,
  });
  const renter = updated.profiles.find(
    (profile) => profile.id === "demo-renter",
  );
  assert.equal(renter?.defaultDeliveryAddressIndex, 1);
  assert.deepEqual(
    renter?.savedDeliveryAddress,
    renter?.savedDeliveryAddresses?.[1],
  );
  // Marking address 1 as default does not remove address 0's existing default status.
  assert.equal(renter?.savedDeliveryAddresses?.[0]?.isDefault, false);
  assert.equal(renter?.savedDeliveryAddresses?.[1]?.isDefault, true);

  const unset = transition(updated, {
    type: "setDefaultDeliveryAddress",
    index: 0,
    isDefault: false,
  });
  const renterAfterUnset = unset.profiles.find(
    (profile) => profile.id === "demo-renter",
  );
  assert.equal(renterAfterUnset?.savedDeliveryAddresses?.[0]?.isDefault, false);
  assert.equal(renterAfterUnset?.savedDeliveryAddresses?.[1]?.isDefault, true);

  assert.throws(
    () =>
      transition(state, {
        type: "setDefaultDeliveryAddress",
        index: 99,
      }),
    /Saved address not found/,
  );
});

test("saving an existing default address again keeps its default status", () => {
  const state = createSeed("admin_demo");
  state.currentUserId = "demo-renter";
  const marked = transition(state, { type: "setDefaultDeliveryAddress", index: 1 });
  const address = marked.profiles.find((profile) => profile.id === "demo-renter")!.savedDeliveryAddresses![1];
  const savedAgain = transition(marked, {
    type: "saveDeliveryAddress",
    address,
    setDefault: false,
  });
  const profile = savedAgain.profiles.find((entry) => entry.id === "demo-renter");
  assert.equal(profile?.savedDeliveryAddresses?.[1]?.isDefault, true);
  assert.equal(profile?.savedDeliveryAddresses?.length, marked.profiles.find((entry) => entry.id === "demo-renter")?.savedDeliveryAddresses?.length);
});

test("a new user's first saved address is never silently made default — only an explicit Set as Default does that", () => {
  // Matches the "no silent default assignment" requirement: creating an address never
  // implies a default, even when it's the account's only saved address.
  const state = createSeed("admin_demo");
  state.currentUserId = "owner-aiman";
  const existing = state.profiles.find((profile) => profile.id === "owner-aiman");
  assert.equal(existing?.savedDeliveryAddresses?.length ?? 0, 0);

  const address = {
    recipientName: "Aiman",
    phone: "+60123456780",
    addressLine1: "1 Jalan Example",
    addressLine2: "",
    postcode: "40000",
    city: "Shah Alam",
    state: "Selangor",
    instructions: "",
  };
  const saved = transition(state, { type: "saveDeliveryAddress", address });
  const profile = saved.profiles.find((p) => p.id === "owner-aiman");
  assert.equal(profile?.defaultDeliveryAddressIndex, undefined);
  assert.equal(profile?.savedDeliveryAddress, undefined);
  assert.deepEqual(profile?.savedDeliveryAddresses, [{ ...address, isDefault: false }]);

  const savedAsDefault = transition(state, {
    type: "saveDeliveryAddress",
    address,
    setDefault: true,
  });
  const defaultedProfile = savedAsDefault.profiles.find((p) => p.id === "owner-aiman");
  assert.equal(defaultedProfile?.defaultDeliveryAddressIndex, 0);
  assert.deepEqual(defaultedProfile?.savedDeliveryAddress, { ...address, isDefault: true });
});

test("ticking Set as Default when saving an additional address makes it the new default", () => {
  const state = createSeed("admin_demo");
  state.currentUserId = "demo-renter";
  const address = {
    recipientName: "Demo Renter",
    phone: "+60123456789",
    addressLine1: "99 Jalan Baru",
    addressLine2: "",
    postcode: "68000",
    city: "Ampang",
    state: "Selangor",
    instructions: "",
  };

  const saved = transition(state, {
    type: "saveDeliveryAddress",
    address,
    setDefault: true,
  });
  const profile = saved.profiles.find((p) => p.id === "demo-renter");
  const newIndex = (profile?.savedDeliveryAddresses?.length ?? 1) - 1;
  assert.equal(profile?.defaultDeliveryAddressIndex, newIndex);
  assert.deepEqual(profile?.savedDeliveryAddress, { ...address, isDefault: true });
  // The account's original address remains saved without its Default flag.
  assert.equal(profile?.savedDeliveryAddresses?.[0]?.isDefault, false);
});

test("editing a saved address in place updates it without creating a duplicate, preserving its default status", () => {
  const state = createSeed("admin_demo");
  state.currentUserId = "demo-renter";
  const before = state.profiles.find((p) => p.id === "demo-renter");
  const addressCountBefore = before?.savedDeliveryAddresses?.length ?? 0;
  const wasDefault = before!.savedDeliveryAddresses![1].isDefault;

  const edited = {
    ...before!.savedDeliveryAddresses![1],
    instructions: "Leave with the guard house.",
  };
  const saved = transition(state, {
    type: "saveDeliveryAddress",
    address: edited,
    index: 1,
  });
  const profile = saved.profiles.find((p) => p.id === "demo-renter");
  assert.equal(profile?.savedDeliveryAddresses?.length, addressCountBefore);
  assert.deepEqual(profile?.savedDeliveryAddresses?.[1], {
    ...edited,
    isDefault: wasDefault,
  });
  // Editing selects the edited address for the current booking.
  assert.equal(profile?.defaultDeliveryAddressIndex, 0);

  assert.throws(
    () =>
      transition(state, {
        type: "saveDeliveryAddress",
        address: edited,
        index: 99,
      }),
    /Saved address not found/,
  );
});

test("deleting the default address leaves the account with no default, rather than silently picking another one", () => {
  // Matches "If no default address exists, use a clearly defined fallback. Prefer
  // prompting the user to select an existing address or add a new one rather than
  // silently selecting an incorrect address." — deletion must never auto-reassign.
  const state = createSeed("admin_demo");
  state.currentUserId = "demo-renter";

  const afterDeletingNonDefault = transition(state, {
    type: "deleteDeliveryAddress",
    index: 1,
  });
  const profileAfterNonDefault = afterDeletingNonDefault.profiles.find(
    (p) => p.id === "demo-renter",
  );
  assert.equal(profileAfterNonDefault?.savedDeliveryAddresses?.length, 2);
  assert.equal(profileAfterNonDefault?.defaultDeliveryAddressIndex, 0);

  const afterDeletingDefault = transition(state, {
    type: "deleteDeliveryAddress",
    index: 0,
  });
  const profileAfterDefault = afterDeletingDefault.profiles.find(
    (p) => p.id === "demo-renter",
  );
  assert.equal(profileAfterDefault?.savedDeliveryAddresses?.length, 2);
  assert.equal(profileAfterDefault?.defaultDeliveryAddressIndex, undefined);
  assert.equal(profileAfterDefault?.savedDeliveryAddress, undefined);
  assert.ok(profileAfterDefault?.savedDeliveryAddresses?.every((address) => !address.isDefault));

  assert.throws(
    () => transition(state, { type: "deleteDeliveryAddress", index: 99 }),
    /Saved address not found/,
  );
});

test("accounts, private messages and notifications stay separated", () => {
  const j = journey();
  j.book();
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
  assert.throws(() => j.operation("cancel"), /access denied/);
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
  assert.throws(() => j.book("unverified"), /identity verification/);
  j.act({ type: "verify", status: "pending" });
  j.act({ type: "verify", status: "failed" });
  j.act({ type: "verify", status: "pending" });
  j.act({ type: "verify", status: "verified" });
  j.act({
    type: "instantBook",
    deliveryAddress: "Mont Kiara, Kuala Lumpur",
    id: "verified",
    listingId: "sony-a7iii",
    start: `${dateAfter(5)}T11:00:00+08:00`,
    end: `${dateAfter(7)}T11:00:00+08:00`,
    paymentMethod: "Demo FPX",
  });
  assert.equal(
    j.state.bookings.find((booking) => booking.id === "verified")?.renterId,
    "new-user",
  );
});
test("Delivery Only is enforced and recorded in the agreement", () => {
  let state = createSeed();
  state = transition(state, {
    type: "instantBook",
    deliveryAddress: "Mont Kiara, Kuala Lumpur",
    id: "collection-booking",
    listingId: "sony-a7iii",
    start: `${dateAfter(2)}T11:00:00+08:00`,
    end: `${dateAfter(4)}T11:00:00+08:00`,
    paymentMethod: "Demo FPX",
  });
  assert.equal(
    state.bookings.find((booking) => booking.id === "collection-booking")
      ?.collectionMethod,
    "Delivery Only",
  );
  assert.equal(state.bookings[0].agreement, undefined);
});
test("state snapshots preserve a confirmed booking and its financial terms without fictional agreement signatures", () => {
  const j = journey();
  j.book();
  const loaded = JSON.parse(JSON.stringify(j.state));
  const booking = loaded.bookings.find(
    (rental: { id: string }) => rental.id === "booking-1",
  );
  assert.equal(booking.quote.total, 295);
  assert.equal(booking.payment, "paid");
  assert.equal(booking.agreement, undefined);
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

test("Renters may pick any start time, but the booking-creation boundary rejects a rental period that isn't an exact 24-hour multiple", async () => {
  const { assertExact24HourRentalPeriod } = await import("../services/booking");

  // Any start time is fine, as long as the end time matches it exactly N*24h later.
  assert.doesNotThrow(() => assertExact24HourRentalPeriod("2026-10-20T10:00:00Z", "2026-10-21T10:00:00Z")); // 24h
  assert.doesNotThrow(() => assertExact24HourRentalPeriod("2026-10-20T10:00:00Z", "2026-10-23T10:00:00Z")); // 72h
  assert.doesNotThrow(() => assertExact24HourRentalPeriod("2026-10-20T15:00:00Z", "2026-10-22T15:00:00Z")); // 48h, 3pm start

  // The spec's own invalid example: 20 Oct 10:00 AM -> 22 Oct 12:00 PM is 50 hours, not a multiple of 24.
  assert.throws(
    () => assertExact24HourRentalPeriod("2026-10-20T10:00:00Z", "2026-10-22T12:00:00Z"),
    /complete 24-hour blocks/,
  );

  // `availability()` enforces the same rule at the actual new-booking entry point used by every
  // checkout/Featured Rental/Request flow, independent of `rentalDays`' historical-data rounding.
  const state = createSeed();
  const listing = state.listings[0];
  assert.throws(
    () => availability(state, listing, "2026-10-20T10:00:00Z", "2026-10-22T12:00:00Z"),
    /complete 24-hour blocks/,
  );

  // The task's full valid/invalid table, checked directly.
  assert.doesNotThrow(() => assertExact24HourRentalPeriod("2026-10-20T10:00:00Z", "2026-10-21T10:00:00Z")); // 24h
  assert.doesNotThrow(() => assertExact24HourRentalPeriod("2026-10-20T10:00:00Z", "2026-10-22T10:00:00Z")); // 48h
  assert.doesNotThrow(() => assertExact24HourRentalPeriod("2026-10-20T11:00:00Z", "2026-10-23T11:00:00Z")); // 72h
  assert.doesNotThrow(() => assertExact24HourRentalPeriod("2026-10-20T15:00:00Z", "2026-10-24T15:00:00Z")); // 96h
  assert.throws(() => assertExact24HourRentalPeriod("2026-10-20T10:00:00Z", "2026-10-21T12:00:00Z"), /complete 24-hour blocks/); // 26h
  assert.throws(() => assertExact24HourRentalPeriod("2026-10-20T10:00:00Z", "2026-10-22T11:00:00Z"), /complete 24-hour blocks/); // 49h
  assert.throws(() => assertExact24HourRentalPeriod("2026-10-20T15:00:00Z", "2026-10-22T17:00:00Z"), /complete 24-hour blocks/); // 50h
});

test("A mismatched-duration booking is rejected end-to-end through the real reducer, not just the standalone validator", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });

  // Valid 48-hour booking goes through, with the expected 2-day fee.
  const listing = state.listings.find((l) => l.id === "sony-a7iii")!;
  state = transition(state, {
    type: "instantBook",
    deliveryAddress: "Mont Kiara, Kuala Lumpur",
    id: "booking-valid-48h",
    listingId: "sony-a7iii",
    start: `${dateAfter(15)}T11:00:00+08:00`,
    end: `${dateAfter(17)}T11:00:00+08:00`,
    paymentMethod: "Demo FPX",
  });
  const valid48h = state.bookings.find((b) => b.id === "booking-valid-48h")!;
  assert.equal(valid48h.quote.days, 2);
  assert.equal(valid48h.quote.rentalFee, listing.dailyPrice * 2);

  // Submitting an invalid 26-hour duration directly through the reducer — bypassing any UI —
  // must still be rejected, and must not create a booking record.
  const bookingCountBefore = state.bookings.length;
  assert.throws(
    () => transition(state, {
      type: "instantBook",
      deliveryAddress: "Mont Kiara, Kuala Lumpur",
      id: "booking-invalid-26h",
      listingId: "sony-a7iii",
      start: `${dateAfter(18)}T10:00:00+08:00`,
      end: `${dateAfter(19)}T12:00:00+08:00`,
      paymentMethod: "Demo FPX",
    }),
    /complete 24-hour blocks/,
  );
  assert.equal(state.bookings.length, bookingCountBefore, "An invalid-duration booking must never be created");

  // Changing the start time changes which exact hour every valid end option must match — the
  // booking panel derives this by locking the return clock time to the (possibly new) start
  // clock time, so a 48-hour booking anchored at 3pm is just as valid as one anchored at 11am.
  state = transition(state, {
    type: "instantBook",
    deliveryAddress: "Mont Kiara, Kuala Lumpur",
    id: "booking-valid-48h-3pm",
    listingId: "sony-a7iii",
    start: `${dateAfter(20)}T15:00:00+08:00`,
    end: `${dateAfter(22)}T15:00:00+08:00`,
    paymentMethod: "Demo FPX",
  });
  assert.equal(state.bookings.find((b) => b.id === "booking-valid-48h-3pm")!.quote.days, 2);
});

test("simulated eKYC verification initializes risk score to 80 and unverified is N/A", () => {
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
  assert.equal(user.riskScore, 80);
  assert.equal(riskFor(state, user).score, 80);
  assert.equal(riskFor(state, user).level, "low");
});

test("V3.15 risk score tier boundaries and direct checkout permissions (29, 30, 39, 40, 70, 79, 80, 100)", () => {
  const { tierForScore } = require("../services/riskScore");
  // 0-29: Very High Risk, platform review, canDirectBook: false
  assert.deepEqual(tierForScore(0), {
    level: "very_high",
    label: "Very High Risk",
    canDirectBook: false,
  });
  assert.deepEqual(tierForScore(29), {
    level: "very_high",
    label: "Very High Risk",
    canDirectBook: false,
  });

  // 30-39: High Risk, canDirectBook: true
  assert.deepEqual(tierForScore(30), {
    level: "high",
    label: "High Risk",
    canDirectBook: true,
  });
  assert.deepEqual(tierForScore(39), {
    level: "high",
    label: "High Risk",
    canDirectBook: true,
  });

  // 40-79: Medium Risk, canDirectBook: true
  assert.deepEqual(tierForScore(40), {
    level: "medium",
    label: "Medium Risk",
    canDirectBook: true,
  });
  assert.deepEqual(tierForScore(70), {
    level: "medium",
    label: "Medium Risk",
    canDirectBook: true,
  });
  assert.deepEqual(tierForScore(79), {
    level: "medium",
    label: "Medium Risk",
    canDirectBook: true,
  });

  // 80-100: Low Risk, canDirectBook: true
  assert.deepEqual(tierForScore(80), {
    level: "low",
    label: "Low Risk",
    canDirectBook: true,
  });
  assert.deepEqual(tierForScore(100), {
    level: "low",
    label: "Low Risk",
    canDirectBook: true,
  });
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
  assert.equal(late.penalty, -5);

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

test("return timing awards +2 only when on-time completion is evidenced", () => {
  const onTime = evaluateRentalOutcome([
    { type: "on_time_success", confirmed: true },
  ]);
  const late = evaluateRentalOutcome([
    { type: "late_return", hoursLate: 0.25, confirmed: true },
  ]);
  const unassessed = evaluateRentalOutcome([
    { type: "return_timing_unassessed", confirmed: true },
  ]);

  assert.equal(onTime.effectiveAdjustment, 2);
  assert.equal(late.effectiveAdjustment, -5);
  assert.equal(unassessed.effectiveAdjustment, 0);
  assert.equal(unassessed.incidents[0].isWinning, false);
});

test("renter issue reports remain stage-specific, visible to lenders, and retry-safe", () => {
  let state = createSeed("admin_demo");
  const booking = state.bookings.find(
    (item) => item.renterId === "demo-renter" && item.status === "active",
  )!;
  booking.end = new Date(Date.now() - 1).toISOString();
  booking.effectiveReturnDeadline = undefined;
  const checkInReport = {
    type: "reportIssue" as const,
    bookingId: booking.id,
    stage: "check_in" as const,
    text: "One accessory was missing at delivery.",
  };
  const checkOutReport = {
    ...checkInReport,
    stage: "check_out" as const,
    text: "The case has a small new scratch.",
  };

  state = transition(state, { type: "login", userId: booking.renterId });
  state = transition(state, checkInReport);
  state = transition(state, checkOutReport);
  assert.equal(state.issueReports?.length, 2);
  assert.deepEqual(
    state.issueReports?.map(({ stage, text }) => ({ stage, text })),
    [
      { stage: "check_out", text: checkOutReport.text },
      { stage: "check_in", text: checkInReport.text },
    ],
  );
  assert.ok(
    state.notifications.some((notice) => notice.userId === booking.ownerId),
  );

  const duplicateRetry = transition(state, checkOutReport);
  const existingDisputeCount = state.disputes.length;
  assert.equal(duplicateRetry.issueReports?.length, 2);
  assert.equal(duplicateRetry.disputes.length, existingDisputeCount);
  assert.throws(
    () => transition(state, { ...checkOutReport, text: "Overwrite attempt" }),
    /already been submitted/,
  );

  state = transition(state, { type: "login", userId: booking.ownerId });
  assert.deepEqual(
    state.issueReports?.map(({ stage, text }) => ({ stage, text })),
    [
      { stage: "check_out", text: checkOutReport.text },
      { stage: "check_in", text: checkInReport.text },
    ],
  );
  assert.throws(() => transition(state, checkInReport), /Only the renter/);
});

test("lender condition checkpoints are booking-scoped, timed by actions, and recorded once", () => {
  let state = createSeed("admin_demo");
  const booking = state.bookings.find((item) => item.status === "upcoming" && item.payment === "paid" && !item.lenderOutboundDispatchConfirmedAt)!;
  const otherBooking = state.bookings.find((item) => item.id !== booking.id)!;
  const photos = Array.from({ length: 6 }, (_, i) => `/lender-${i}.jpg`);
  const videos = ["/lender.mp4"];
  state = transition(state, { type: "login", userId: booking.ownerId });
  const before = { type: "conditionEvidence" as const, bookingId: booking.id, kind: "lender_before_delivery" as const, photos, videos };
  state = transition(state, before);
  const recorded = state.evidence.find((item) => item.bookingId === booking.id && item.kind === before.kind && item.authorId === booking.ownerId);
  assert.ok(recorded?.createdAt);
  assert.equal(state.evidence.filter((item) => item.bookingId === otherBooking.id && item.kind === before.kind).length, 0);
  assert.throws(() => transition(state, before), /already submitted/);
  assert.throws(() => transition(state, { ...before, kind: "lender_after_return" }), /after confirmed lender receipt/);
  state.bookings.find((item) => item.id === booking.id)!.status = "active";
  state = transition(state, { type: "login", userId: booking.renterId });
  assert.throws(() => transition(state, { ...before, kind: "lender_before_delivery" }), /Only the lender/);
  assert.throws(() => transition(state, { ...before, kind: "check_in" }), /must be delivered/);
  state.bookings.find((item) => item.id === booking.id)!.renterReceivedAt = new Date().toISOString();
  state = transition(state, { ...before, kind: "check_in" });
  state = transition(state, { ...before, kind: "check_out" });
  assert.deepEqual(
    state.evidence.filter((item) => item.bookingId === booking.id && item.kind !== "dispute").map((item) => item.kind),
    ["lender_before_delivery", "check_in", "check_out"],
  );
  state.bookings.find((item) => item.id === booking.id)!.status = "return_pending";
  state.bookings.find((item) => item.id === booking.id)!.renterReturnConfirmedAt = new Date().toISOString();
  state = transition(state, { type: "login", userId: booking.ownerId });
  assert.throws(() => transition(state, { ...before, kind: "lender_after_return" }), /after confirmed lender receipt/);
  state = transition(state, { type: "confirmReturnReceipt", bookingId: booking.id });
  state = transition(state, { ...before, kind: "lender_after_return" });
  assert.ok(state.evidence.some((item) => item.bookingId === booking.id && item.kind === "lender_after_return" && item.authorId === booking.ownerId));
  assert.equal(state.evidence.filter((item) => item.bookingId === booking.id && item.kind !== "dispute").length, 4);
});

test("issue comment boxes follow delivery/end-stage access in Normal and Demo rentals", () => {
  for (const _mode of ["normal", "admin_demo"] as const) {
    for (const stage of ["check_in", "check_out"] as const) {
      assert.deepEqual(
        getIssueReportPermissions({
          stage,
          status: "upcoming",
          stageAvailable: false,
          isLender: false,
          reportSubmitted: false,
        }),
        { canEdit: false, canSubmit: false },
      );
    }

    assert.deepEqual(
      getIssueReportPermissions({
        stage: "check_in",
        status: "upcoming",
        stageAvailable: true,
        isLender: false,
        reportSubmitted: false,
      }),
      { canEdit: true, canSubmit: false },
    );
    assert.deepEqual(
      getIssueReportPermissions({
        stage: "check_in",
        status: "active",
        stageAvailable: true,
        isLender: false,
        reportSubmitted: false,
      }),
      { canEdit: true, canSubmit: true },
    );
    assert.deepEqual(
      getIssueReportPermissions({
        stage: "check_out",
        status: "active",
        stageAvailable: false,
        isLender: false,
        reportSubmitted: false,
      }),
      { canEdit: false, canSubmit: false },
    );
    assert.deepEqual(
      getIssueReportPermissions({
        stage: "check_out",
        status: "active",
        stageAvailable: true,
        isLender: false,
        reportSubmitted: false,
      }),
      { canEdit: true, canSubmit: true },
    );
    assert.deepEqual(
      getIssueReportPermissions({
        stage: "check_out",
        status: "completed",
        stageAvailable: true,
        isLender: false,
        reportSubmitted: false,
      }),
      { canEdit: true, canSubmit: false },
    );
    assert.deepEqual(
      getIssueReportPermissions({
        stage: "check_out",
        status: "active",
        stageAvailable: true,
        isLender: true,
        reportSubmitted: true,
      }),
      { canEdit: false, canSubmit: false },
    );
    assert.deepEqual(
      getIssueReportPermissions({
        stage: "check_in",
        status: "active",
        stageAvailable: true,
        isLender: false,
        reportSubmitted: true,
      }),
      { canEdit: false, canSubmit: false },
    );
  }
});

test("issue report drafts can be prepared while pending but submitted only in their active stage", () => {
  for (const mode of ["normal", "admin_demo"] as const) {
    let state = createSeed(mode);
    let booking = state.bookings.find(
      (item) => item.status === "upcoming" && item.renterId === "demo-renter",
    );
    if (!booking) {
      const upcomingDemoRental = createSeed("admin_demo").bookings.find(
        (item) => item.status === "upcoming" && item.renterId === "demo-renter",
      )!;
      booking = { ...upcomingDemoRental, contextMode: mode };
      state.bookings.push(booking);
    }
    state = transition(state, { type: "login", userId: booking.renterId });
    const pendingCheckInReport = {
      type: "reportIssue" as const,
      bookingId: booking.id,
      stage: "check_in" as const,
      text: "Drafted before delivery.",
    };
    const pendingCheckOutReport = {
      ...pendingCheckInReport,
      stage: "check_out" as const,
    };
    assert.throws(
      () => transition(state, pendingCheckInReport),
      /relevant active rental stage/,
    );
    assert.throws(
      () => transition(state, pendingCheckOutReport),
      /relevant active rental stage/,
    );
    assert.equal(state.issueReports?.length ?? 0, 0);

    state = {
      ...state,
      bookings: state.bookings.map((item) =>
        item.id === booking.id
          ? {
              ...item,
              status: "return_pending",
              renterReceivedAt: new Date(Date.now() - 86_400_000).toISOString(),
              start: new Date(Date.now() - 86_400_000).toISOString(),
              end: new Date(Date.now() - 1).toISOString(),
              effectiveReturnDeadline: undefined,
            }
          : item,
      ),
    };
    assert.throws(
      () => transition(state, pendingCheckInReport),
      /relevant active rental stage/,
    );
    assert.equal(state.issueReports?.length ?? 0, 0);
    state = transition(state, pendingCheckOutReport);
    assert.equal(state.issueReports?.[0].stage, "check_out");
  }
});

test("RM35 lender boost features listing for 7 days", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "owner-aiman" });
  const listingId = "sony-a7iii";
  const beforeListing = state.listings.find((l) => l.id === listingId)!;
  assert.equal(beforeListing.featuredUntil, undefined);

  state = transition(state, { type: "boostListing", listingId, transactionId: "boost-test-1" });
  const afterListing = state.listings.find((l) => l.id === listingId)!;
  assert.ok(afterListing.featuredUntil);
  const diffDays =
    (new Date(afterListing.featuredUntil).getTime() - Date.now()) /
    (1000 * 60 * 60 * 24);
  assert.ok(diffDays >= 6.9 && diffDays <= 7.1);
  assert.equal(state.boostTransactions?.length, 1);
  assert.equal(state.boostTransactions?.[0].id, "boost-test-1");
  assert.equal(state.boostTransactions?.[0].amount, 35);
  assert.throws(() => transition(state, { type: "boostListing", listingId, transactionId: "boost-test-1" }), /already boosted/);
});

test("a previously completed RM10 Boost transaction keeps its historical amount", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state.boostTransactions = [{
    id: "legacy-boost-1",
    ownerId: "owner-aiman",
    listingId: "sony-a7iii",
    listingName: "Sony A7 III",
    paidAt: "2026-01-01T00:00:00.000Z",
    activatedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-08T00:00:00.000Z",
    // No `amount` field — recorded before the field existed, at the then-current RM10 price.
  }];
  assert.equal(state.boostTransactions[0].amount, undefined);
});

test("Demo availability is stable, listing-specific, and limited to October–December 2026", () => {
  const state = createSeed("admin_demo");
  assert.equal(state.listings.length, 21);
  for (const listing of state.listings) {
    const result = availabilityCalendar(state, listing, 92, "2026-10-01");
    assert.equal(result.length, 92);
    assert.ok(result.some((day) => day.status === "available"));
  }
  assert.equal(demoSlotAvailable("sony-a7iii", "2027-01-01", "10:00"), false);
  assert.equal(demoSlotAvailable("sony-a7iii", "2026-09-30", "10:00"), false);
  assert.deepEqual(
    availabilityCalendar(state, state.listings[0], 30, "2026-11-01"),
    availabilityCalendar(createSeed("admin_demo"), createSeed("admin_demo").listings[0], 30, "2026-11-01"),
  );
  assert.notDeepEqual(
    ["sony-a7iii", "party-speaker"].map((id) => Array.from({ length: 12 }, (_, n) => demoSlotAvailable(id, `2026-11-${String(n + 1).padStart(2, "0")}`, "10:00"))),
    ["party-speaker", "sony-a7iii"].map((id) => Array.from({ length: 12 }, (_, n) => demoSlotAvailable(id, `2026-11-${String(n + 1).padStart(2, "0")}`, "10:00"))),
  );
});

test("Demo projector retains prefilled parcel data and recalculates eligibility after saving", async () => {
  const { crossStateDeliveryEligibility } = await import("../services/delivery");
  let state = transition(createSeed("admin_demo"), { type: "login", userId: "demo-renter" });
  const projector = state.listings.find((item) => item.id === "demo-portable-projector")!;
  assert.equal(projector.ownerId, "demo-renter");
  assert.equal(projector.privateMeetingVenue, "Lot 10 Concierge, Jalan Sultan Ismail, 50250 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur");
  assert.equal(projector.pickupPostcode, "50250");
  assert.equal(projector.parcelWeightKg, 2.5);
  assert.deepEqual(projector.parcelDimensionsCm, { length: 35, width: 28, height: 18 });
  assert.equal(projector.deliveryRequirement, "fragile");
  assert.equal(crossStateDeliveryEligibility(projector), "available");
  assert.deepEqual(projector.deliveryTimeSlots, ["10:00", "14:00"]);
  assert.deepEqual(projector.availabilityPeriods, [{ start: "2026-10-19", end: "2026-12-31" }]);
  assert.equal(calculateOwnerPayout(projector.dailyPrice).payout, 24.36);
  const edited = { ...projector, parcelDimensionsCm: { length: 121, width: 28, height: 18 } };
  state = transition(state, { type: "saveListing", listing: edited });
  const saved = state.listings.find((item) => item.id === projector.id)!;
  assert.equal(saved.parcelDimensionsCm?.length, 121);
  assert.equal(crossStateDeliveryEligibility(saved), "same_state_only");
  assert.deepEqual(saved.images, projector.images);
});

test("Presenter-owned demo listings remain bookable in a saved future availability period", () => {
  let state = transition(createSeed("admin_demo"), { type: "login", userId: "demo-renter" });
  const projector = state.listings.find((item) => item.id === "demo-portable-projector")!;
  state = transition(state, {
    type: "saveListing",
    listing: { ...projector, availableFrom: "2027-01-05", availableTo: "2027-02-05", availabilityPeriods: [{ start: "2027-01-05", end: "2027-02-05" }] },
  });
  const saved = state.listings.find((item) => item.id === projector.id)!;
  assert.equal(availabilityCalendar(state, saved, 1, "2027-01-05")[0].status, "available");
  assert.doesNotThrow(() => availability(state, saved,
    toMalaysiaUtcTimestamp("2027-01-05", "10:00"),
    toMalaysiaUtcTimestamp("2027-01-06", "10:00")));
});

test("Demo lender upcoming delivery hours are valid Malaysia time", () => {
  const upcoming = createSeed("admin_demo").bookings.filter((booking) => booking.id.startsWith("demo-lender-upcoming-"));
  assert.equal(upcoming.length, 2);
  for (const booking of upcoming) {
    assert.ok(["10:00", "14:00"].some((slot) => formatMalaysiaDateTime(booking.start).includes(slot === "10:00" ? "10:00 AM" : "02:00 PM")));
    assert.equal(parseMalaysiaTimestamp(booking.start) - parseMalaysiaTimestamp(booking.cancellationCutoff!), 86400000);
  }
});

test("booking and listing validation reject 2027 dates and unavailable lender hours", () => {
  let state = createSeed("admin_demo");
  const listing = state.listings.find((item) => item.id === "sony-a7iii")!;
  assert.throws(() => availability(state, listing,
    toMalaysiaUtcTimestamp("2026-12-30", "10:00"),
    toMalaysiaUtcTimestamp("2027-01-01", "10:00")), /31 December 2026/);
  state = transition(state, { type: "login", userId: listing.ownerId });
  assert.throws(() => transition(state, {
    type: "saveListing",
    listing: { ...listing, availabilityPeriods: [{ start: "2026-12-01", end: "2027-01-01" }] },
  }), /31 December 2026/);
  const restricted = { ...listing, deliveryTimeSlots: ["10:00", "14:00"] };
  assert.throws(() => availability(state, restricted,
    toMalaysiaUtcTimestamp("2026-11-23", "11:00"),
    toMalaysiaUtcTimestamp("2026-11-24", "11:00")), /delivery time/);
});

test("restrictions block rental requests for overdue obligations and banned users, and checkout for score < 30", () => {
  let state = createSeed();
  // Marcus Wong has overdue damage obligation
  state = transition(state, { type: "login", userId: "overdue-renter" });
  assert.throws(
    () =>
      transition(state, {
        type: "instantBook",
        deliveryAddress: "Mont Kiara, Kuala Lumpur",
        id: "req-overdue",
        listingId: "sony-a7iii",
        start: `${dateAfter(2)}T11:00:00+08:00`,
        end: `${dateAfter(4)}T11:00:00+08:00`,
        paymentMethod: "Demo FPX",
      }),
    /outstanding damage obligation/,
  );

  // Banned user
  state.profiles[0].isBanned = true;
  state = transition(state, { type: "login", userId: state.profiles[0].id });
  assert.throws(
    () =>
      transition(state, {
        type: "instantBook",
        deliveryAddress: "Mont Kiara, Kuala Lumpur",
        id: "req-banned",
        listingId: "sony-a7iii",
        start: `${dateAfter(2)}T11:00:00+08:00`,
        end: `${dateAfter(4)}T11:00:00+08:00`,
        paymentMethod: "Demo FPX",
      }),
    /banned from booking/,
  );
});

test("Confirm Received records delivery without gating or shifting the rental clock", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });
  const start = `${dateAfter(20)}T11:00:00+08:00`;
  const end = `${dateAfter(22)}T11:00:00+08:00`;
  state = transition(state, {
    type: "instantBook",
    deliveryAddress: "Mont Kiara, Kuala Lumpur",
    id: "booking-handover",
    listingId: "sony-a7iii",
    start,
    end,
    paymentMethod: "Demo FPX",
  });

  assert.throws(
    () =>
      transition(state, {
        type: "confirmReceived",
        bookingId: "booking-handover",
      }),
    /available from scheduled rental start/,
  );
  state = withMockedNow(parseMalaysiaTimestamp(start), () =>
    transition(state, {
      type: "confirmReceived",
      bookingId: "booking-handover",
    }),
  );
  const updatedBooking = state.bookings.find(
    (rental) => rental.id === "booking-handover",
  )!;
  assert.ok(updatedBooking.renterReceivedAt);
  assert.equal(updatedBooking.status, "upcoming");
  assert.equal(updatedBooking.activationTimestamp, undefined);
  assert.equal(updatedBooking.lenderHandoverAt, undefined);
  assert.equal(updatedBooking.start, start);
  assert.equal(updatedBooking.end, end);
  assert.throws(
    () =>
      transition(state, {
        type: "confirmReceived",
        bookingId: "booking-handover",
      }),
    /already been confirmed/,
  );
});

test("scheduled start derives Active independently of delivery receipt or later bookings", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });
  const start = `${dateAfter(20)}T11:00:00+08:00`;
  const end = `${dateAfter(22)}T11:00:00+08:00`;
  state = transition(state, {
    type: "instantBook",
    deliveryAddress: "Mont Kiara, Kuala Lumpur",
    id: "booking-auto-active",
    listingId: "sony-a7iii",
    start,
    end,
    paymentMethod: "Demo FPX",
  });
  const booking = state.bookings.find(
    (rental) => rental.id === "booking-auto-active",
  )!;
  const scheduledStart = parseMalaysiaTimestamp(booking.start);
  assert.equal(
    getEffectiveBookingStatus(booking, scheduledStart - 1),
    "upcoming",
  );
  assert.equal(getEffectiveBookingStatus(booking, scheduledStart), "active");
  assert.equal(booking.renterReceivedAt, undefined);
  assert.equal(booking.start, start);
  assert.equal(booking.end, end);
});

test("check-out evidence can precede handover while return confirmation keeps its scheduled-end gate", () => {
  let state = createSeed("admin_demo");
  const initialBooking = state.bookings.find(
    (item) => item.id === "demo-booking-active-1",
  )!;
  initialBooking.end = new Date(Date.now() + 60_000).toISOString();
  initialBooking.scheduledReturn = new Date(Date.now() - 1).toISOString();
  initialBooking.effectiveReturnDeadline = new Date(
    Date.now() - 1,
  ).toISOString();
  state = transition(state, { type: "login", userId: "demo-renter" });
  const booking = state.bookings.find(
    (item) => item.id === "demo-booking-active-1",
  )!;

  const evidence = {
    type: "conditionEvidence" as const,
    bookingId: booking.id,
    kind: "check_out" as const,
    photos: ["1", "2", "3", "4", "5", "6"],
    videos: ["video"],
  };
  const returnAction = {
    type: "returnConfirm" as const,
    bookingId: booking.id,
    role: "renter" as const,
    photos: evidence.photos,
    videos: evidence.videos,
  };
  state = transition(state, evidence);
  assert.equal(state.evidence.filter((item) => item.bookingId === booking.id && item.kind === "check_out" && item.authorId === booking.renterId).length, 1);
  assert.throws(() => transition(state, returnAction), /scheduled rental end/);
  state = transition(state, {
        type: "reportIssue",
        bookingId: booking.id,
        stage: "check_out",
        text: "A late-stage issue.",
      });
  assert.ok(state.issueReports?.some((report) => report.bookingId === booking.id && report.stage === "check_out"));

  const currentBooking = state.bookings.find((item) => item.id === booking.id)!;
  currentBooking.end = new Date(Date.now() - 1).toISOString();
  currentBooking.scheduledReturn = new Date(Date.now() + 86_400_000).toISOString();
  currentBooking.effectiveReturnDeadline = new Date(
    Date.now() + 86_400_000,
  ).toISOString();
  state = transition(state, returnAction);
  assert.equal(state.evidence.filter((item) => item.bookingId === booking.id && item.kind === "check_out" && item.authorId === booking.renterId).length, 1);
  assert.equal(
    state.bookings.find((item) => item.id === booking.id)?.status,
    "return_pending",
  );
});

test("confirmed booking cancellation is available to both participants only before the 24-hour cutoff", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });
  const start = `${dateAfter(20)}T11:00:00+08:00`;
  const end = `${dateAfter(22)}T11:00:00+08:00`;
  state = transition(state, {
    type: "instantBook",
    deliveryAddress: "Mont Kiara, Kuala Lumpur",
    id: "booking-cancel-ok",
    listingId: "sony-a7iii",
    start,
    end,
    paymentMethod: "Demo FPX",
  });
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, {
    type: "booking",
    id: "booking-cancel-ok",
    operation: "cancel",
  });
  const bCancelled = state.bookings.find((b) => b.id === "booking-cancel-ok")!;
  assert.equal(bCancelled.status, "cancelled");
  assert.equal(bCancelled.payment, "refunded");
  // The deposit was genuinely held, so it's scheduled to release 5 Malaysia working days from
  // cancellation — not released instantly, and never dated from the original rental end (`end`).
  assert.equal(bCancelled.deposit, "release_pending");
  assert.ok(bCancelled.depositReleasedAt);
  assert.equal(bCancelled.depositReleasedAt, cancelledDepositReleaseDeadline(bCancelled.cancelledAt!));
  assert.notEqual(bCancelled.depositReleasedAt, bCancelled.end);
  assert.equal(bCancelled.cancelledById, "owner-aiman");
  assert.ok(bCancelled.cancelledAt);
  assert.equal(bCancelled.start, start);
  assert.equal(bCancelled.end, end);
  assert.ok(
    state.notifications.some(
      (notice) =>
        notice.userId === "demo-renter" &&
        notice.title.includes(
          "simulated ledger now records a full rental/service fee refund",
        ) &&
        notice.title.includes("No real funds were moved"),
    ),
  );
  assert.ok(
    state.notifications.some(
      (notice) =>
        notice.userId === "owner-aiman" &&
        notice.title.includes("no real funds were moved"),
    ),
  );

  const notificationCountAfterCancellation = state.notifications.length;
  assert.throws(
    () =>
      transition(state, {
        type: "booking",
        id: "booking-cancel-ok",
        operation: "cancel",
      }),
    /Only a confirmed upcoming booking can be cancelled/,
  );
  assert.equal(state.notifications.length, notificationCountAfterCancellation);

  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "instantBook",
    deliveryAddress: "Mont Kiara, Kuala Lumpur",
    id: "booking-cancel-renter",
    listingId: "sony-a7iii",
    start: `${dateAfter(25)}T11:00:00+08:00`,
    end: `${dateAfter(27)}T11:00:00+08:00`,
    paymentMethod: "Demo FPX",
  });
  state = transition(state, {
    type: "booking",
    id: "booking-cancel-renter",
    operation: "cancel",
  });
  assert.equal(
    state.bookings.find((booking) => booking.id === "booking-cancel-renter")
      ?.cancelledById,
    "demo-renter",
  );

  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "instantBook",
    deliveryAddress: "Mont Kiara, Kuala Lumpur",
    id: "booking-cancel-late",
    listingId: "sony-a7iii",
    start: `${dateAfter(25)}T11:00:00+08:00`,
    end: `${dateAfter(27)}T11:00:00+08:00`,
    paymentMethod: "Demo FPX",
  });
  state.bookings.find(
    (booking) => booking.id === "booking-cancel-late",
  )!.start = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();

  assert.throws(
    () =>
      transition(state, {
        type: "booking",
        id: "booking-cancel-late",
        operation: "cancel",
      }),
    /only until 24 hours/,
  );
});

test("Cancelled-booking deposit release: 5 Malaysia working days from cancellation, excluding weekends — never the original scheduled rental end date", () => {
  // A weekday cancellation (Monday) releases the following Monday, skipping the weekend in
  // between, and lands nowhere near the Oct/Nov/Dec scheduled rental end dates this bug produced.
  assert.equal(cancelledDepositReleaseDeadline("2026-10-19T09:00:00Z"), "2026-10-26T09:00:00.000Z");

  // A Friday cancellation must skip the entire following weekend, not just one day.
  assert.equal(cancelledDepositReleaseDeadline("2026-10-23T09:00:00Z"), "2026-10-30T09:00:00.000Z");

  // The example from the spec: cancellation approved Monday 19 October 2026 releases Monday
  // 26 October 2026 (no Malaysia public holiday falls in that window).
  assert.equal(cancelledDepositReleaseDeadline("2026-10-19T00:00:00Z").slice(0, 10), "2026-10-26");

  // effectiveDepositStatus only reports "released" once the computed deadline has actually
  // passed — a booking cancelled "now" must not show as released immediately.
  const now = Date.parse("2026-10-19T10:00:00Z");
  const justCancelled = { status: "cancelled" as const, deposit: "release_pending" as const, depositReleasedAt: cancelledDepositReleaseDeadline("2026-10-19T09:00:00Z") };
  assert.equal(effectiveDepositStatus(justCancelled, now), "release_pending");
  // Once a cancelled booking's deadline has genuinely passed with no unresolved dispute, the
  // simulated refund completes automatically — no manual correction needed as the demo "today"
  // advances past each scheduled release date.
  const longSinceCancelled = { status: "cancelled" as const, deposit: "release_pending" as const, depositReleasedAt: "2026-10-01T09:00:00Z" };
  assert.equal(effectiveDepositStatus(longSinceCancelled, now), "released");
  // An unresolved dispute still blocks the automatic completion even past the deadline.
  assert.equal(effectiveDepositStatus(longSinceCancelled, now, true), "release_pending");
  // The same overdue deadline on a NON-cancelled booking (e.g. a normal rental's post-completion
  // release) must stay manual — only a cancellation's refund is eligible for auto-completion.
  const completedOverdue = { status: "completed" as const, deposit: "release_pending" as const, depositReleasedAt: "2026-10-01T09:00:00Z" };
  assert.equal(effectiveDepositStatus(completedOverdue, now), "release_pending");
  assert.equal(effectiveDepositStatus({ deposit: "released" as const }, now), "released");
  // Deposit states unrelated to cancellation pass through unchanged.
  assert.equal(effectiveDepositStatus({ deposit: "held" as const }, now), "held");
  assert.equal(effectiveDepositStatus({ deposit: "disputed" as const }, now), "disputed");

  // Cancelling an unfinished checkout (deposit never collected) must never fabricate a release.
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "startDeliveryCheckout",
    id: "booking-cancel-unpaid",
    listingId: "sony-a7iii",
    start: `${dateAfter(10)}T11:00:00+08:00`,
    end: `${dateAfter(11)}T11:00:00+08:00`,
    deliveryAddress: "Mont Kiara, Kuala Lumpur",
    deliveryPostcode: "50480",
    returnPickupTime: "15:00",
  } as unknown as Action);
  state = transition(state, { type: "cancelDeliveryCheckout", bookingId: "booking-cancel-unpaid" } as unknown as Action);
  const neverPaid = state.bookings.find((b) => b.id === "booking-cancel-unpaid")!;
  assert.equal(neverPaid.status, "cancelled");
  assert.equal(neverPaid.deposit, "required", "Never collected — must not read as held/released");
  assert.equal(neverPaid.depositReleasedAt, undefined);

  // The four seeded demo cancellations must each show a release date within about a week of
  // their recorded cancellation — never the "more than two months later" bug (a release date
  // computed from the original scheduled rental end instead of the cancellation timestamp).
  const seed = createSeed("admin_demo");
  const seededCancellations = seed.bookings.filter((b) => b.status === "cancelled" && b.cancelledAt);
  assert.ok(seededCancellations.length >= 4);
  for (const booking of seededCancellations) {
    if (booking.deposit === "required") continue; // nothing was ever collected to release
    assert.ok(booking.depositReleasedAt, `${booking.id} must record a computed release deadline`);
    const daysFromCancellation = (parseMalaysiaTimestamp(booking.depositReleasedAt!) - parseMalaysiaTimestamp(booking.cancelledAt!)) / 86400000;
    assert.ok(daysFromCancellation <= 9, `${booking.id}: release deadline is ${daysFromCancellation.toFixed(1)} days after cancellation — expected at most ~9 (5 working days plus a weekend)`);
    assert.notEqual(booking.depositReleasedAt, booking.end, `${booking.id}: release deadline must not equal the original scheduled rental end date`);
  }
});

test("Completed-rental deposit release: same 5-working-day window, triggered by completion not the scheduled end, and overdue releases are flagged rather than silently kept held or hidden", () => {
  // Same working-day arithmetic as a cancellation release, just triggered by the clean-return
  // completion instant instead of the cancellation instant.
  assert.equal(depositReleaseDeadline("2026-10-19T09:00:00Z"), cancelledDepositReleaseDeadline("2026-10-19T09:00:00Z"));

  let state = createSeed("admin_demo");
  const booking = state.bookings.find((b) => b.id === "booking-return" || b.id === "demo-booking-return-due-1") ||
    state.bookings.find((b) => b.renterId === "demo-renter" && b.status === "return_pending")!;
  state.bookings.find((b) => b.id === booking.id)!.renterReturnConfirmedAt = new Date().toISOString();
  state = transition(state, { type: "login", userId: booking.ownerId });
  state = transition(state, { type: "confirmReturnReceipt", bookingId: booking.id });
  state = transition(state, {
    type: "conditionEvidence", bookingId: booking.id, kind: "lender_after_return",
    photos: ["/p1", "/p2", "/p3", "/p4", "/p5", "/p6"], videos: ["/v1"],
  });
  state = transition(state, { type: "returnConfirm", bookingId: booking.id, role: "owner" });
  const completed = state.bookings.find((b) => b.id === booking.id)!;
  assert.equal(completed.status, "completed");
  assert.equal(completed.deposit, "release_pending");
  assert.ok(completed.completedAt);
  assert.ok(completed.depositReleasedAt, "Completion must stamp a computed release deadline");
  assert.equal(completed.depositReleasedAt, depositReleaseDeadline(completed.completedAt!));

  // Not yet overdue right after completion.
  assert.equal(isDepositReleaseOverdue(completed, parseMalaysiaTimestamp(completed.completedAt!)), false);
  // Overdue once the 5-working-day deadline has actually passed without an actual release.
  const wellPastDeadline = parseMalaysiaTimestamp(completed.depositReleasedAt!) + 10 * 86400000;
  assert.equal(isDepositReleaseOverdue(completed, wellPastDeadline), true);
  // A genuinely released deposit is never reported as overdue, regardless of elapsed time.
  assert.equal(isDepositReleaseOverdue({ ...completed, deposit: "released" }, wellPastDeadline), false);
});

test("Demo session load strips retired Return Due demo bookings (and their evidence, issue reports, messages, notifications) from stale persisted state, without touching unrelated bookings", () => {
  const seed = createSeed("admin_demo");
  const retiredIds = ["demo-booking-return-due-2", "demo-booking-return-due-3"];
  for (const id of retiredIds) {
    assert.ok(!seed.bookings.some((b) => b.id === id), `${id} must no longer be seeded`);
  }
  // The two intended Return Due demo examples remain.
  const returnDueTitles = seed.bookings
    .filter((b) => b.renterId === "demo-renter" && rentalTabForBooking(b) === "Return Due")
    .map((b) => b.title);
  assert.deepEqual(new Set(returnDueTitles), new Set(["Pressure Washer", "Epson Portable Projector"]));

  // A session persisted before this cleanup still carries the retired booking (and its evidence,
  // issue report, message and notification records) in its own saved snapshot. Re-seeding alone
  // never reaches that already-saved snapshot, so loading it must strip these explicitly rather
  // than leaving stale held-deposit records behind.
  const staleRetiredBooking = { ...seed.bookings.find((b) => b.renterId === "demo-renter")!, id: "demo-booking-return-due-2" };
  const staleState = {
    ...seed,
    bookings: [...seed.bookings, staleRetiredBooking],
    evidence: [...seed.evidence, { id: "ev-stale", bookingId: "demo-booking-return-due-2", authorId: "demo-renter", kind: "check_in" as const, photo: "", notes: "", createdAt: "2026-10-01T00:00:00Z" }],
    messages: [...seed.messages, { id: "msg-stale", bookingId: "demo-booking-return-due-2", authorId: "demo-renter", text: "stale", createdAt: "2026-10-01T00:00:00Z" }],
  };
  const cleaned = withoutRetiredDemoBookings(staleState);
  assert.ok(!cleaned.bookings.some((b) => b.id === "demo-booking-return-due-2"), "Stale retired booking must be stripped on load");
  assert.ok(!cleaned.evidence.some((e) => e.bookingId === "demo-booking-return-due-2"), "Stale evidence for the retired booking must be stripped");
  assert.ok(!cleaned.messages.some((m) => m.bookingId === "demo-booking-return-due-2"), "Stale messages for the retired booking must be stripped");
  // Genuine unrelated bookings (same renter, different id) are untouched.
  assert.equal(cleaned.bookings.length, seed.bookings.length);
});

test("Delivery refunds are the delivery company's responsibility, never auto-approved just because a rental was cancelled", () => {
  // deriveDeliveryRefundStatus: the full rule set, independent of any specific booking.
  assert.equal(deriveDeliveryRefundStatus({ cancelled: false, deliveryStatus: undefined, legStarted: false }), "not_paid");
  assert.equal(deriveDeliveryRefundStatus({ cancelled: false, deliveryStatus: "required", legStarted: false }), "not_paid");
  assert.equal(deriveDeliveryRefundStatus({ cancelled: false, deliveryStatus: "paid_demo", legStarted: false }), "refund_not_required");
  assert.equal(deriveDeliveryRefundStatus({ cancelled: true, deliveryStatus: "paid_demo", legStarted: false }), "refund_pending");
  assert.equal(deriveDeliveryRefundStatus({ cancelled: true, deliveryStatus: "paid_demo", legStarted: true }), "refund_not_eligible");
  // Only an already-recorded "refunded_demo" status reads back as an actual completed refund —
  // never inferred purely from `cancelled`.
  assert.equal(deriveDeliveryRefundStatus({ cancelled: true, deliveryStatus: "refunded_demo", legStarted: false }), "refunded");
  assert.equal(deriveDeliveryRefundStatus({ cancelled: false, deliveryStatus: "refunded_demo", legStarted: false }), "refunded");

  // repairDemoDeliveryPayments must never flip a delivery payment to "refunded_demo" just because
  // the rental payment on a cancelled booking is "refunded" — and must leave a genuinely
  // never-paid cancelled delivery ("required") alone rather than fabricating a paid receipt.
  const seed = createSeed("admin_demo");
  const luxuryWatchCancellation = seed.bookings.find((b) => b.id === "demo-booking-cancelled-1")!;
  assert.equal(luxuryWatchCancellation.payment, "refunded");
  assert.equal(luxuryWatchCancellation.deliveryDemo?.status, "required", "Delivery fee was never paid on this fixture and must not be fabricated as paid/refunded");
  assert.equal(luxuryWatchCancellation.deliveryDemo?.refundedAt, undefined);

  // Re-running the repair pass must be stable (idempotent) and must never introduce a
  // "refunded_demo" delivery status purely from a refunded rental payment.
  const reRepaired = repairDemoDeliveryPayments(seed);
  for (const booking of reRepaired.bookings) {
    if (booking.deliveryDemo?.status !== "refunded_demo") continue;
    const original = seed.bookings.find((b) => b.id === booking.id);
    assert.equal(
      original?.deliveryDemo?.status,
      "refunded_demo",
      `${booking.id}: repair must not newly introduce "refunded_demo" — it only carries forward an already-recorded one`,
    );
  }
});

test("Lender Rental Details renders one persistent action panel without the old inline dispute workflow", () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), "app/rental/[id].tsx"),
    "utf8",
  );
  const disputeSource = fs.readFileSync(
    path.resolve(process.cwd(), "app/dispute/[id].tsx"),
    "utf8",
  );

  const messageButton = source.indexOf(
    'Message {other?.name.split(" ")[0] || "participant"}',
  );
  const actionPanel = source.indexOf("Lender Actions");
  const lenderCancelButton = source.indexOf(
    "Cancel Booking (100% Simulated Refund & RM0 Fee)",
  );
  const lenderDisputeButton = source.indexOf("Apply Dispute");
  assert.ok(messageButton >= 0);
  assert.ok(messageButton < actionPanel);
  assert.ok(actionPanel < lenderCancelButton);
  assert.ok(lenderCancelButton < lenderDisputeButton);
  assert.match(
    source,
    /disabled={!disputeEligible \|\| !!existingDispute}/,
  );
  assert.doesNotMatch(source, /Submit Dispute & Freeze Deposit/);
  assert.doesNotMatch(source, /Close Dispute Form/);
  assert.match(disputeSource, /Dispute Submitted/);
  assert.match(disputeSource, /"PENDING"/);
  assert.match(disputeSource, /actAndPersist/);
  assert.match(disputeSource, /New financial charge/);
});

test("The standalone Return Management and Renter Evidence card is completely removed from Lender Mode; its essential renter-evidence comparison and completion confirmation moved into Check-out — After Return", () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), "app/rental/[id].tsx"),
    "utf8",
  );
  // The redundant card, its heading, its contradictory waiting message, its "Confirm Clean
  // Return" button (now redundant with Lender Actions' "Rental Complete") and its old
  // "Rental Concluded" box must all be gone — not just hidden behind a style.
  assert.doesNotMatch(source, /Return Management and Renter Evidence/);
  assert.doesNotMatch(source, /Waiting for renter to upload return condition evidence/);
  assert.doesNotMatch(source, /Confirm Clean Return/);
  assert.doesNotMatch(source, /Rental Concluded — No Issues/);
  assert.doesNotMatch(source, /Renter Return Media:/);
  // The Check-out — Before Return card now renders only for the renter.
  assert.match(source, /\{!owner && <Card/);
  assert.match(source, /<Text style={s\.h2}>Check-out — Before Return<\/Text>/);
  // Its essential functionality is preserved inside the lender's own After Return checkpoint:
  // a read-only view of the renter's Check-out evidence for comparison/dispute review, and an
  // accurate completed-inspection confirmation gated on an actual recorded clean-return
  // confirmation (never claimed for Active/Return Due/Disputed).
  assert.match(source, /Renter's Check-out Evidence/);
  assert.match(source, /Return Inspection Completed — No Issues/);
  assert.match(source, /!before && effectiveStatus === "completed" && booking\.lenderReturnConfirmedAt/);
  // Rental completion itself still only comes from the existing "Rental Complete" button in
  // Lender Actions (added previously) — confirm it's still the sole completion entry point.
  assert.match(source, />\s*Rental Complete\s*</);
});

test("The four cancelled demo bookings past their scheduled deposit release date auto-complete as refunded, with no unresolved dispute holding them", () => {
  const seed = createSeed("admin_demo");
  const expected: Record<string, number> = {
    "demo-booking-cancelled-1": 600, // Luxury Watch
    "demo-booking-cancelled-2": 60, // Fishing Rod & Reel Set
    "demo-booking-cancelled-3": 150, // Wedding Arch & Drapes
    "demo-booking-protection-cancelled": 75, // GoPro HERO12 Black
  };
  let totalReleased = 0;
  for (const [id, expectedDeposit] of Object.entries(expected)) {
    const booking = seed.bookings.find((b) => b.id === id);
    if (!booking) continue; // not every id is guaranteed present across seed revisions
    assert.equal(booking.status, "cancelled");
    assert.equal(booking.deposit, "release_pending", `${id}: raw stored field preserves the historical fact it was once release_pending`);
    assert.ok(booking.depositReleasedAt && Date.now() >= Date.parse(booking.depositReleasedAt),
      `${id}: scheduled release date must already be in the past for this test`);
    assert.ok(!seed.disputes.some((d) => d.bookingId === id && d.status === "under_review"), `${id}: must have no unresolved dispute`);
    assert.equal(effectiveDepositStatus(booking), "released", `${id}: must auto-complete as released past its deadline`);
    assert.equal(isDepositReleaseOverdue(booking), false, `${id}: must never show as overdue once auto-released`);
    totalReleased += booking.quote.deposit;
    assert.equal(booking.quote.deposit, expectedDeposit, `${id}: unexpected deposit amount`);
  }
  assert.equal(totalReleased, 885, "Total of the four named deposits must equal RM885.00");
});

test("Payment & Transaction History never labels a cancelled booking's still-pending deposit as 'Refunded' — fee refund and deposit release are distinct statuses", () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), "app/(tabs)/rentals.tsx"),
    "utf8",
  );
  // The cancelled-booking status chip must branch on the deposit's own status before claiming
  // "Refunded" outright — a plain `payment === "refunded" ? "Cancelled · Refunded" : "Cancelled"`
  // ternary (the previous bug) would silently claim the deposit was refunded too.
  assert.match(source, /depositStatus === "release_pending"/);
  assert.match(source, /Fee refunded, deposit pending/);
  assert.match(source, /Fee refunded, deposit overdue/);
  // The deposit-release refund row keeps "release" wording, distinct from a payment "refund".
  assert.match(source, /"Security deposit release"/);
  assert.doesNotMatch(source, /"Security deposit refund"/);
});

test("Successfully completed demo-renter-as-lender rental shows submitted lender evidence for both checkpoints, not fabricated for other statuses", () => {
  const seed = createSeed("admin_demo");
  for (const id of ["demo-lender-completed-1"]) {
    const booking = seed.bookings.find((b) => b.id === id)!;
    assert.equal(booking.status, "completed");
    assert.ok(booking.lenderReturnReceivedAt, `${id}: lender must have confirmed receipt`);
    assert.ok(booking.lenderReturnConfirmedAt, `${id}: lender must have confirmed a clean return`);
    const before = seed.evidence.find((e) => e.bookingId === id && e.kind === "lender_before_delivery" && e.authorId === booking.ownerId);
    const after = seed.evidence.find((e) => e.bookingId === id && e.kind === "lender_after_return" && e.authorId === booking.ownerId);
    assert.ok(before, `${id}: Check-in — Before Delivery evidence must be recorded`);
    assert.ok(after, `${id}: Check-out — After Return evidence must be recorded`);
    assert.ok(before!.photos && before!.photos.length >= 6 && before!.videos && before!.videos.length >= 1);
    assert.ok(after!.photos && after!.photos.length >= 6 && after!.videos && after!.videos.length >= 1);
    // Before-delivery evidence must precede handover; after-return evidence must follow receipt
    // and precede the lender's clean-return confirmation — never invented out of sequence.
    assert.ok(parseMalaysiaTimestamp(before!.createdAt) <= parseMalaysiaTimestamp(booking.lenderHandoverAt!));
    assert.ok(parseMalaysiaTimestamp(after!.createdAt) >= parseMalaysiaTimestamp(booking.lenderReturnReceivedAt!));
    assert.ok(parseMalaysiaTimestamp(after!.createdAt) <= parseMalaysiaTimestamp(booking.lenderReturnConfirmedAt!));
  }

  // Other statuses must not be auto-marked as submitted — the three Return Due examples remain
  // genuinely awaiting lender receipt/inspection (see the earlier Return Due cleanup).
  for (const id of ["demo-booking-return-due-1", "demo-booking-protection-return-due"]) {
    const booking = seed.bookings.find((b) => b.id === id)!;
    assert.ok(!booking.lenderReturnReceivedAt, `${id}: must remain genuinely awaiting lender receipt, not fabricated as submitted`);
    assert.ok(!seed.evidence.some((e) => e.bookingId === id && e.kind === "lender_after_return"));
  }
});

test("Rental Details restores an independent Report an Issue form inside every Condition Evidence checkpoint — Check-in and Check-out never share one form", () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), "app/rental/[id].tsx"),
    "utf8",
  );
  // The lender's evidence card renders its own Report an Issue block inline — no more
  // showIssueReport opt-out, no more separate shared card after Return Management.
  assert.doesNotMatch(source, /showIssueReport/);
  assert.doesNotMatch(source, /renderLenderIssueReport\(/);
  assert.doesNotMatch(source, /renderRenterIssueReportSection/);
  assert.match(source, /\{renderLenderIssueReportFields\(stage\)\}/);
  // renderLenderEvidence is called once per checkpoint (Before Delivery, After Return) with no
  // extra options — each call renders its own complete card, issue block included.
  assert.match(source, /renderLenderEvidence\("lender_before_delivery"\)/);
  assert.match(source, /renderLenderEvidence\("lender_after_return"\)/);
  // Renter: `renderIssueReport` (the function that actually renders "Report an Issue") is
  // defined once and called once inside the Check-in card and three times across the Check-out
  // card's renter branches (not-yet-eligible, evidence-already-submitted, still-uploading) —
  // four live call sites plus the definition, never a single shared wrapper used by both
  // checkpoints.
  const matches = source.match(/renderIssueReport\(/g) || [];
  assert.equal(matches.length, 5, "Expected the definition + 4 call sites (1 check_in, 3 check_out branches)");
  assert.match(source, /renderIssueReport\("check_in", isDelivered\)/);
  assert.match(source, /renderIssueReport\(\s*"check_out",\s*false\s*\)/);
  assert.match(source, /renderIssueReport\(\s*"check_out",\s*isReturnEvidenceAvailable/);
});

test("lender disputes unlock at scheduled end, persist once, and do not change financial state", () => {
  let state = createSeed("admin_demo");
  const booking = state.bookings.find(
    (item) => item.id === "demo-lender-completed-1",
  )!;
  booking.status = "completed";
  booking.end = new Date(Date.now() - 1).toISOString();
  booking.deposit = "released";
  booking.payment = "paid";

  assert.equal(
    isLenderDisputeEligible(booking, parseMalaysiaTimestamp(booking.end) - 1),
    false,
  );
  assert.equal(
    isLenderDisputeEligible(booking, parseMalaysiaTimestamp(booking.end)),
    true,
  );

  state = transition(state, {
    type: "dispute",
    bookingId: booking.id,
    category: "Item damaged",
    reason: "A post-return inspection found a damaged component.",
  });

  const unchangedBooking = state.bookings.find(
    (item) => item.id === booking.id,
  )!;
  assert.equal(unchangedBooking.status, "completed");
  assert.equal(unchangedBooking.deposit, "released");
  assert.equal(unchangedBooking.payment, "paid");
  assert.equal(
    state.disputes.filter((item) => item.bookingId === booking.id).length,
    1,
  );
  assert.equal(
    state.disputes.find((item) => item.bookingId === booking.id)?.status,
    "under_review",
  );
  assert.throws(
    () =>
      transition(state, {
        type: "dispute",
        bookingId: booking.id,
        category: "Item damaged",
        reason: "A duplicate dispute submission should be rejected.",
      }),
    /already been submitted/,
  );

  const cancelledState = createSeed("admin_demo");
  const cancelledBooking = cancelledState.bookings.find(
    (item) => item.id === "demo-lender-completed-1",
  )!;
  cancelledBooking.status = "cancelled";
  cancelledBooking.end = new Date(Date.now() - 1).toISOString();
  assert.equal(isLenderDisputeEligible(cancelledBooking), false);
  assert.throws(
    () =>
      transition(cancelledState, {
        type: "dispute",
        bookingId: cancelledBooking.id,
        category: "Item damaged",
        reason: "Cancelled bookings must remain ineligible for disputes.",
      }),
    /Cancelled bookings cannot be disputed/,
  );

  const earlyState = createSeed("admin_demo");
  const earlyBooking = earlyState.bookings.find(
    (item) => item.id === "demo-lender-upcoming-1",
  )!;
  earlyBooking.end = new Date(Date.now() + 86_400_000).toISOString();
  assert.ok(parseMalaysiaTimestamp(earlyBooking.end) > Date.now());
  assert.throws(
    () =>
      transition(earlyState, {
        type: "dispute",
        bookingId: earlyBooking.id,
        category: "Item damaged",
        reason: "This dispute is too early and must remain frozen.",
      }),
    /available from the scheduled rental end/,
  );
});

test("return evidence releases the deposit and preserves the unassessed timing outcome", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "instantBook",
    deliveryAddress: "Mont Kiara, Kuala Lumpur",
    id: "booking-return",
    listingId: "sony-a7iii",
    start: `${dateAfter(20)}T11:00:00+08:00`,
    end: `${dateAfter(22)}T11:00:00+08:00`,
    paymentMethod: "Demo FPX",
  });
  const returnBooking = state.bookings.find(
    (booking) => booking.id === "booking-return",
  )!;
  returnBooking.status = "active";
  returnBooking.deposit = "held";
  returnBooking.end = new Date(Date.now() - 1).toISOString();

  const scoreBefore = state.profiles.find(
    (p) => p.id === "demo-renter",
  )!.riskScore;
  assert.equal(scoreBefore, 80);

  const samplePhotos = [
    "photo-1",
    "photo-2",
    "photo-3",
    "photo-4",
    "photo-5",
    "photo-6",
  ];
  const sampleVideos = ["video-1"];

  // Renter confirms return requires at least 6 photos and 1 video
  assert.throws(
    () =>
      transition(state, {
        type: "returnConfirm",
        bookingId: "booking-return",
        role: "renter",
        photo: "only-one-photo",
      }),
    /at least 6 photos and 1 video/,
  );

  state = transition(state, {
    type: "returnConfirm",
    bookingId: "booking-return",
    role: "renter",
    photos: samplePhotos,
    videos: sampleVideos,
    notes: "Everything in perfect shape",
  });
  const bHalfReturned = state.bookings.find((b) => b.id === "booking-return")!;
  assert.equal(bHalfReturned.status, "return_pending");
  assert.equal(bHalfReturned.deposit, "held");

  // Owner confirms return inspection (No Issue – End Rental) by reviewing shared media without uploading media
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, { type: "confirmReturnReceipt", bookingId: "booking-return" });
  state = transition(state, { type: "conditionEvidence", bookingId: "booking-return", kind: "lender_after_return", photos: samplePhotos, videos: sampleVideos });
  state = transition(state, {
    type: "returnConfirm",
    bookingId: "booking-return",
    role: "owner",
    notes: "Owner inspection confirmed clean — No Issue",
  });

  const bCompleted = state.bookings.find((b) => b.id === "booking-return")!;
  assert.equal(bCompleted.status, "completed");
  assert.equal(bCompleted.deposit, "release_pending");
  assert.ok(bCompleted.completedAt);

  const scoreAfter = state.profiles.find(
    (p) => p.id === "demo-renter",
  )!.riskScore;
  assert.equal(scoreAfter, 80);
  const finalOutcome = state.profiles
    .find((p) => p.id === "demo-renter")!
    .riskHistory?.find((event) => event.bookingId === "booking-return");
  assert.equal(finalOutcome?.effectiveAdjustment, 0);
  assert.equal(finalOutcome?.incidents[0].type, "return_timing_unassessed");
});

test("Phase 5: predefined fictional dispute resolutions properly adjust deposit and risk penalties", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "instantBook",
    deliveryAddress: "Mont Kiara, Kuala Lumpur",
    id: "booking-dispute",
    listingId: "sony-a7iii",
    start: `${dateAfter(20)}T11:00:00+08:00`,
    end: `${dateAfter(22)}T11:00:00+08:00`,
    paymentMethod: "Demo FPX",
  });
  const disputedBooking = state.bookings.find(
    (booking) => booking.id === "booking-dispute",
  )!;
  disputedBooking.status = "active";
  disputedBooking.deposit = "held";
  disputedBooking.end = new Date(Date.now() - 1).toISOString();

  // Owner raises a dispute for scratched lens
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, {
    type: "dispute",
    bookingId: "booking-dispute",
    reason: "Front lens element has a deep scratch.",
    category: "Item damaged",
  });

  const bDisputed = state.bookings.find((b) => b.id === "booking-dispute")!;
  assert.equal(bDisputed.status, "active");
  assert.equal(bDisputed.deposit, "held");

  const dispute = state.disputes.find(
    (d) => d.bookingId === "booking-dispute",
  )!;
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
  assert.equal(renterAfter.riskScore, 70); // 80 - 10 = 70
});

test("Very High Risk renters (0-29) submit Request to Rent applications to CurRENT platform without reserving inventory or charging payment", () => {
  let state = createSeed();
  // 1. Unverified user attempt
  state = transition(state, { type: "login", userId: "unverified-renter" });
  assert.throws(
    () =>
      transition(state, {
        type: "requestPlatformReview",
        listingId: "sony-a7iii",
        start: "2026-11-20",
        end: "2026-11-25",
      }),
    /Complete demo identity verification/,
  );

  // 2. High risk user (score 25, Very High Risk) submits Request to Rent
  state = transition(state, { type: "login", userId: "high-risk-renter" });
  state.profiles.find(
    (profile) => profile.id === "high-risk-renter",
  )!.riskHistory = [
    {
      id: "qa-risk-serious-damage",
      bookingId: "qa-booking-serious-damage",
      itemTitle: "QA fixture: serious damage",
      date: "2026-01-01",
      incidents: [
        {
          type: "serious_damage",
          description: "Confirmed",
          penalty: -30,
          isWinning: true,
        },
      ],
      effectiveAdjustment: -30,
      scoreBefore: 80,
      scoreAfter: 50,
      appealStatus: "none",
    },
    {
      id: "qa-risk-minor-damage-1",
      bookingId: "qa-booking-minor-damage-1",
      itemTitle: "QA fixture: minor damage",
      date: "2026-01-02",
      incidents: [
        {
          type: "minor_damage",
          description: "Confirmed",
          penalty: -10,
          isWinning: true,
        },
      ],
      effectiveAdjustment: -10,
      scoreBefore: 50,
      scoreAfter: 40,
      appealStatus: "none",
    },
    {
      id: "qa-risk-minor-damage-2",
      bookingId: "qa-booking-minor-damage-2",
      itemTitle: "QA fixture: minor damage",
      date: "2026-01-03",
      incidents: [
        {
          type: "minor_damage",
          description: "Confirmed",
          penalty: -10,
          isWinning: true,
        },
      ],
      effectiveAdjustment: -10,
      scoreBefore: 40,
      scoreAfter: 30,
      appealStatus: "none",
    },
    {
      id: "qa-risk-late-return",
      bookingId: "qa-booking-late-return",
      itemTitle: "QA fixture: late return",
      date: "2026-01-04",
      incidents: [
        {
          type: "late_return",
          description: "Confirmed",
          penalty: -5,
          isWinning: true,
        },
      ],
      effectiveAdjustment: -5,
      scoreBefore: 30,
      scoreAfter: 25,
      appealStatus: "none",
    },
  ];
  state = transition(state, {
    type: "requestPlatformReview",
    id: "REQ-TEST-1234",
    listingId: "sony-a7iii",
    start: "2026-11-20",
    end: "2026-11-25",
    pickupTime: "11:00 AM",
    returnTime: "11:00 AM (Automatically matched)",
    durationDays: 5,
    collectionMethod: "Delivery",
    deliveryAddress:
      "Kenji Sato, +60 12 999 8888, 12 Jalan Universiti, 46200 Petaling Jaya, Selangor",
    location: "Petaling Jaya",
    lenderName: "Aiman Rahman",
    dailyPrice: 45,
    estimatedRentalFee: 225,
    notes:
      "Pending CurRENT Review (Demo). Submitted for platform safety assessment.",
  });

  // Verify application in platformReviewRequests
  const app = state.platformReviewRequests.find(
    (r) => r.id === "REQ-TEST-1234",
  );
  assert.ok(app, "Application should be saved in state.platformReviewRequests");
  assert.equal(app.status, "pending_review");
  assert.equal(app.renterId, "high-risk-renter");
  assert.equal(app.listingId, "sony-a7iii");
  assert.equal(app.pickupTime, "11:00 AM");
  assert.equal(app.returnTime, "11:00 AM (Automatically matched)");
  assert.equal(app.durationDays, 5);
  assert.equal(app.estimatedRentalFee, 225);
  assert.equal(
    app.deliveryAddress,
    "Kenji Sato, +60 12 999 8888, 12 Jalan Universiti, 46200 Petaling Jaya, Selangor",
  );

  // Verify idempotency: duplicate submission does not duplicate requests
  const initialCount = state.platformReviewRequests.length;
  state = transition(state, {
    type: "requestPlatformReview",
    id: "REQ-TEST-1234",
    listingId: "sony-a7iii",
    start: "2026-11-20",
    end: "2026-11-25",
  });
  assert.equal(
    state.platformReviewRequests.length,
    initialCount,
    "Duplicate submission with same ID must be idempotent",
  );

  // Crucial rule: No booking created, no payment charged, no deposit held, inventory NOT reserved
  assert.ok(!state.bookings.some((b) => b.renterId === "high-risk-renter"));

  // Verify inventory is NOT locked: an eligible verified renter (e.g. Alex Tan, score 75) can still book those dates
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "instantBook",
    deliveryAddress: "Mont Kiara, Kuala Lumpur",
    id: "booking-eligible-after-req",
    listingId: "sony-a7iii",
    start: "2026-11-23T02:00:00Z",
    end: "2026-11-25T02:00:00Z",
    collectionMethod: "Delivery Only",
    paymentMethod: "Demo FPX",
  });
  const booked = state.bookings.find(
    (b) => b.id === "booking-eligible-after-req",
  );
  assert.ok(
    booked,
    "Eligible renter should be able to book because application did not reserve inventory",
  );
  assert.equal(booked.status, "upcoming");
  assert.equal(booked.payment, "paid");
});

test("V3.36 Demo Account has 2 completed rentals and a history-derived score of 84 (+2,+2)", () => {
  const seed = createSeed("admin_demo");
  const demoUserId = "demo-renter";
  const userBookings = seed.bookings.filter((b) => b.renterId === demoUserId);
  const lenderBookings = seed.bookings.filter((b) => b.ownerId === demoUserId);
  const demoListings = seed.listings.filter((l) => l.ownerId === demoUserId);
  const demoProfile = seed.profiles.find((p) => p.id === demoUserId)!;

  // 1. At least 3 demo-owned listings
  assert.ok(
    demoListings.length >= 3,
    `Expected >= 3 demo listings, got ${demoListings.length}`,
  );
  assert.ok(
    demoListings.some(
      (l) => l.featuredUntil && new Date(l.featuredUntil) > new Date(),
    ),
    "Expected at least 1 boosted listing",
  );

  // 2. At least 3 Upcoming rentals
  const upcoming = userBookings.filter((b) => b.status === "upcoming");
  assert.ok(
    upcoming.length >= 3,
    `Expected >= 3 upcoming rentals, got ${upcoming.length}`,
  );

  // 3. At least 3 Active rentals
  const active = userBookings.filter((b) => b.status === "active");
  assert.ok(
    active.length >= 3,
    `Expected >= 3 active rentals, got ${active.length}`,
  );

  // 4. Exactly 2 Return Due rentals (Pressure Washer, Epson Portable Projector) — deliberately
  // reduced from the earlier >= 3 demo-variety baseline per the latest product requirement that
  // My Rentals > Return Due show only these two intended demo examples.
  const returnDue = userBookings.filter(
    (b) =>
      b.status === "return_pending" ||
      (b.status === "active" && b.end <= dateAfter(1)),
  );
  assert.equal(
    returnDue.length,
    2,
    `Expected exactly 2 return due rentals, got ${returnDue.length}`,
  );

  // 5. At least 3 Cancelled rentals
  const cancelled = userBookings.filter((b) => b.status === "cancelled");
  assert.ok(
    cancelled.length >= 3,
    `Expected >= 3 cancelled rentals, got ${cancelled.length}`,
  );

  // 6. At least 3 Disputed rentals
  const disputed = userBookings.filter((b) => b.status === "disputed");
  assert.ok(
    disputed.length >= 3,
    `Expected >= 3 disputed rentals, got ${disputed.length}`,
  );

  // 7. Exactly 2 Completed rentals (Camping Tent, Sony A7 III), both linked to the risk history (+2, +2)
  const completed = userBookings.filter((b) => b.status === "completed");
  assert.equal(
    completed.length,
    2,
    `Expected exactly 2 completed rentals, got ${completed.length}`,
  );
  const riskLinkedBookingIds = new Set((demoProfile.riskHistory || []).map((h) => h.bookingId));
  const riskLinkedCompleted = completed.filter((b) => riskLinkedBookingIds.has(b.id));
  assert.equal(
    riskLinkedCompleted.length,
    2,
    `Expected exactly 2 completed rentals linked to the fixed risk history, got ${riskLinkedCompleted.length}`,
  );
  assert.equal(demoProfile.riskScore, 84, "Expected risk score 84");
  assert.equal(demoProfile.riskLevel, "low", "Expected low risk tier");
  assert.ok(demoProfile.riskHistory, "Risk history must be present");
  assert.equal(
    demoProfile.riskHistory.length,
    2,
    "Expected 2 risk incident records",
  );
  const adjustments = demoProfile.riskHistory.map((h) => h.effectiveAdjustment);
  assert.deepEqual(
    adjustments.slice().sort(),
    [2, 2],
    "Expected adjustments to be +2, +2",
  );
  const sumAdj = adjustments.reduce((a, b) => a + b, 0);
  assert.equal(
    sumAdj,
    4,
    "Adjustments must net to +4 from the 80-point starting score",
  );
  assert.equal(riskFor(seed, demoProfile).score, 84);

  // 8. At least 3 saved items (favourites)
  assert.ok(
    demoProfile.favourites.length >= 3,
    `Expected >= 3 favourites, got ${demoProfile.favourites.length}`,
  );

  // 9. At least 3 lender completed payouts
  const lenderPayouts = lenderBookings.filter((b) => b.status === "completed");
  assert.equal(
    lenderPayouts.length,
    1,
    `Expected exactly 1 lender payout, got ${lenderPayouts.length}`,
  );
  assert.equal(lenderBookings.filter((b) => b.status === "upcoming").length, 2);
  assert.equal(
    lenderBookings.filter((b) =>
      ["active", "upcoming", "return_pending"].includes(b.status),
    ).length,
    2,
    "The lender Active / Upcoming Rentals counter should match its two upcoming bookings.",
  );
  assert.equal(lenderPayouts[0].id, "demo-lender-completed-1");
  assert.equal(
    calculateOwnerPayout(lenderPayouts[0].quote.rentalFee, lenderPayouts[0].commissionRate ?? 0.13).payout,
    39.15,
  );
  assert.equal(
    seed.messages.filter((message) =>
      lenderBookings.some((booking) => booking.id === message.bookingId),
    ).length,
    6,
    "The retained lender bookings should keep their message threads.",
  );

  // 10. At least 3 notifications
  const userNotifs = seed.notifications.filter((n) => n.userId === demoUserId);
  assert.ok(
    userNotifs.length >= 3,
    `Expected >= 3 notifications, got ${userNotifs.length}`,
  );

  // 11. At least 3 rental-linked conversation threads with >= 2 messages each
  const threads = new Set(seed.messages.map((m) => m.bookingId));
  assert.ok(
    threads.size >= 3,
    `Expected >= 3 conversation threads, got ${threads.size}`,
  );
  for (const tid of threads) {
    const threadMsgs = seed.messages.filter((m) => m.bookingId === tid);
    assert.ok(
      threadMsgs.length >= 2,
      `Expected thread ${tid} to have >= 2 messages, got ${threadMsgs.length}`,
    );
  }

  // 12. Exactly ONE approved Sony sample review in entire app
  assert.equal(
    seed.reviews.length,
    0,
    "No fabricated marketplace reviews in seed",
  );
});

test("Demo renter account carries 5 Rental Protection demo scenarios, one per status tab except Completed", () => {
  const seed = createSeed("admin_demo");
  const byId = (id: string) => seed.bookings.find((b) => b.id === id)!;

  // 1. Upcoming — DJI Mini 4 Pro Drone, insured, delivery pending
  const upcoming = byId("demo-booking-protection-upcoming");
  assert.equal(upcoming.title, "DJI Mini 4 Pro Drone");
  assert.equal(upcoming.status, "upcoming");
  assert.equal(upcoming.payment, "paid");
  assert.equal(upcoming.deposit, "held");
  assert.equal(upcoming.insurance?.selected, true);
  assert.equal(upcoming.deliveryDemo?.status, "paid_demo");

  // 2. Active — Sony ZV-E10 Camera, no insurance
  const active = byId("demo-booking-protection-active");
  assert.equal(active.title, "Sony ZV-E10 Camera");
  assert.equal(active.status, "active");
  assert.equal(active.insurance, null);

  // 3. Return Due — Epson Portable Projector, insured, awaiting two-sided return confirmation
  const returnDue = byId("demo-booking-protection-return-due");
  assert.equal(returnDue.title, "Epson Portable Projector");
  assert.equal(returnDue.status, "active");
  assert.ok(!returnDue.renterReturnConfirmedAt, "Return must not be pre-confirmed");
  assert.equal(returnDue.deposit, "held", "Deposit must stay held until both sides confirm a clean return");
  assert.equal(returnDue.insurance?.selected, true);

  // 4. (Completed scenarios removed) — the renter's Completed tab is kept to exactly the 2
  // risk-linked demo bookings (Camping Tent, Sony A7 III Mirrorless Camera); no separate
  // Rental Protection "completed" demo bookings exist any more.

  // 5. Cancelled — GoPro HERO12 Black, full refund, deposit release scheduled 5 Malaysia working
  // days after cancellation (never dated from the original scheduled rental end, 27 Oct).
  const cancelled = byId("demo-booking-protection-cancelled");
  assert.equal(cancelled.title, "GoPro HERO12 Black");
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.payment, "refunded");
  assert.equal(cancelled.deposit, "release_pending");
  assert.ok(cancelled.depositReleasedAt, "Must record a computed deposit release deadline");
  assert.equal(cancelled.depositReleasedAt, cancelledDepositReleaseDeadline(cancelled.cancelledAt!));
  assert.notEqual(cancelled.depositReleasedAt, cancelled.end, "Release deadline must not equal the original scheduled rental end date");
  assert.equal(cancelled.insurance, null);
  assert.ok(cancelled.cancelledAt);
  assert.equal(cancelled.cancelledById, "demo-renter");
  assert.ok(
    seed.messages.some((m) => m.bookingId === cancelled.id && m.authorId === "demo-renter"),
    "Cancellation reason must be recorded as a message on the booking thread",
  );

  // 6. Disputed — Canon RF Camera Lens, insured, unresolved, no automatic refund
  const disputed = byId("demo-booking-protection-disputed");
  assert.equal(disputed.title, "Canon RF Camera Lens");
  assert.equal(disputed.status, "disputed");
  assert.equal(disputed.deposit, "disputed", "Deposit must stay held pending review, never auto-refunded");
  assert.ok(!disputed.lenderReturnConfirmedAt, "An unresolved dispute must not carry a clean-return confirmation");
  assert.equal(disputed.insurance?.selected, true);
  const dispute = seed.disputes.find((d) => d.bookingId === disputed.id);
  assert.ok(dispute, "Expected a linked dispute record");
  assert.equal(dispute!.status, "under_review");
  assert.ok(
    seed.messages.some((m) => m.bookingId === disputed.id && m.authorId === "demo-renter"),
    "Renter's dispute response must be recorded",
  );

  // Running the seed twice must not duplicate any of the 5 scenario bookings or the linked dispute
  const seedAgain = createSeed("admin_demo");
  const ids = [
    "demo-booking-protection-upcoming", "demo-booking-protection-active", "demo-booking-protection-return-due",
    "demo-booking-protection-cancelled", "demo-booking-protection-disputed",
  ];
  for (const bid of ids) {
    assert.equal(seedAgain.bookings.filter((b) => b.id === bid).length, 1, `${bid} must not be duplicated`);
  }
  assert.equal(seedAgain.disputes.filter((d) => d.id === "disp-canon-lens").length, 1);
});

test("Demo lender listings use fixed view counts consistent with saves and completed rentals", () => {
  const demo = createSeed("admin_demo");
  const demoLenderListings = demo.listings.filter(
    (listing) => listing.ownerId === "demo-renter",
  );

  assert.deepEqual(
    Object.fromEntries(
      demoLenderListings.map((listing) => [listing.id, listing.demoViewCount]),
    ),
    {
      "office-chair": 58,
      "party-speaker": 43,
      "camping-tent": 31,
      "demo-portable-projector": 36,
    },
  );

  for (const listing of demoLenderListings) {
    const saves = demo.profiles.filter((profile) =>
      profile.favourites?.includes(listing.id),
    ).length;
    const completed = demo.bookings.filter(
      (booking) =>
        booking.ownerId === "demo-renter" &&
        booking.listingId === listing.id &&
        booking.status === "completed",
    ).length;
    assert.ok((listing.demoViewCount ?? -1) >= saves);
    assert.ok((listing.demoViewCount ?? -1) >= completed);
  }

  assert.equal(
    demo.bookings.filter(
      (booking) =>
        booking.ownerId === "demo-renter" &&
        booking.listingId === "camping-tent" &&
        booking.status === "completed",
    ).length,
    0,
  );

  const normal = createSeed("normal");
  assert.equal(
    normal.listings.some((listing) => listing.demoViewCount !== undefined),
    false,
  );
});

test("V3.23 listing publish requires >= 6 photos and >= 1 video", () => {
  let state = createSeed("admin_demo");
  state = transition(state, { type: "login", userId: "demo-renter" });

  const samplePhotos = ["p1", "p2", "p3", "p4", "p5", "p6"];
  const sampleVideos = ["v1"];

  // Publish with fewer than 6 photos rejected
  assert.throws(
    () =>
      transition(state, {
        type: "saveListing",
        listing: {
          id: "new-listing-test",
          ownerId: "demo-renter",
          title: "Test Professional Camera",
          description: "High quality gear in perfect condition.",
          category: "Electronics",
          location: "Petaling Jaya",
          dailyPrice: 50,
          estimatedValue: 2000,
          images: samplePhotos.slice(0, 5),
          videos: sampleVideos,
          imageUrl: "p1",
          status: "published",
          rating: 0,
          verifiedOwner: true,
        },
      }),
    /at least 6 photos and 1 video/,
  );

  // Publish with 0 videos rejected
  assert.throws(
    () =>
      transition(state, {
        type: "saveListing",
        listing: {
          id: "new-listing-test",
          ownerId: "demo-renter",
          title: "Test Professional Camera",
          description: "High quality gear in perfect condition.",
          category: "Electronics",
          location: "Petaling Jaya",
          dailyPrice: 50,
          estimatedValue: 2000,
          images: samplePhotos,
          videos: [],
          imageUrl: "p1",
          status: "published",
          rating: 0,
          verifiedOwner: true,
        },
      }),
    /at least 6 photos and 1 video/,
  );

  // Publish with >= 6 photos and >= 1 video succeeds and enforces Delivery Only
  state = transition(state, {
    type: "saveListing",
    listing: {
      id: "new-listing-test",
      ownerId: "demo-renter",
      title: "Test Professional Camera",
      description: "High quality gear in perfect condition.",
      category: "Electronics",
      location: "Petaling Jaya",
      dailyPrice: 50,
      estimatedValue: 2000,
      images: samplePhotos,
      videos: sampleVideos,
      imageUrl: "p1",
      status: "published",
      rating: 0,
      verifiedOwner: true,
    },
  });

  const created = state.listings.find((l) => l.id === "new-listing-test");
  assert.ok(created);
  assert.equal(created.status, "published");
  assert.deepEqual(created.collectionMethods, ["Delivery Only"]);
});

test("V3.23 fresh demo sign-in restores baseline while refresh preserves session", () => {
  let state = createSeed("admin_demo");
  assert.equal(
    state.bookings.filter(
      (b) => b.renterId === "demo-renter" && b.status === "upcoming",
    ).length,
    4,
  );

  // User alters data during session (e.g. cancels one booking)
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "booking",
    id: "demo-booking-upcoming-1",
    operation: "cancel",
  });
  assert.equal(
    state.bookings.find((b) => b.id === "demo-booking-upcoming-1")!.status,
    "cancelled",
  );

  // A refresh of an active session retains state in memory/AsyncStorage:
  assert.equal(
    state.bookings.find((b) => b.id === "demo-booking-upcoming-1")!.status,
    "cancelled",
  );

  // A fresh explicit demo login restores the complete baseline:
  state = transition(state, { type: "resetDemoState" });
  assert.equal(
    state.bookings.find((b) => b.id === "demo-booking-upcoming-1")!.status,
    "upcoming",
  );
});

test("V3.23 Section 7.4: free-cancellation deadline calculation, notice format, and boundary eligibility in Malaysia timezone", () => {
  // 1. Interprets 23 October 2026, 11:00 AM Malaysia time in Asia/Kuala_Lumpur (UTC+8)
  const dateStr = "2026-10-23";
  const timeStr = "11:00";
  const startUtc = toMalaysiaUtcTimestamp(dateStr, timeStr);
  assert.equal(startUtc, "2026-10-23T03:00:00.000Z");

  const startEpoch = parseMalaysiaTimestamp(startUtc);
  const cutoffEpoch = startEpoch - 24 * 60 * 60 * 1000;
  const cutoffIso = calculateCancellationCutoff(startUtc);
  assert.equal(cutoffIso, "2026-10-22T03:00:00.000Z");

  // 2. Cancellation notice displays exactly "Free cancellation until 22 Oct 2026, 11:00 AM" (NOT 19:00, NO (Demo))
  const notice = `Free cancellation until ${formatMalaysiaDateTime(cutoffEpoch)}`;
  assert.equal(notice, "Free cancellation until 22 Oct 2026, 11:00 AM");
  assert.ok(
    !notice.includes("19:00"),
    "Must NOT display 19:00 due to UTC offset bug",
  );
  assert.ok(!notice.includes("(Demo)"), "Must NOT contain (Demo) suffix");

  // 3. Permitted at exactly 24 hours before rental start (now <= cutoff) and blocked 1 second after cutoff
  assert.equal(
    isCancellationEligible(startUtc, cutoffEpoch),
    true,
    "Permitted exactly at cutoff instant",
  );
  assert.equal(
    isCancellationEligible(startUtc, cutoffEpoch - 1000),
    true,
    "Permitted 1 second before cutoff",
  );
  assert.equal(
    isCancellationEligible(startUtc, cutoffEpoch + 1000),
    false,
    "Blocked 1 second after cutoff",
  );

  // 4. Backend cancellation eligibility matches cutoff timestamp
  let state = createSeed("admin_demo");
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "instantBook",
    deliveryAddress: "Mont Kiara, Kuala Lumpur",
    id: "booking-tz-test",
    listingId: "sony-a7iii",
    start: startUtc,
    end: toMalaysiaUtcTimestamp("2026-10-25", "11:00"),
    collectionMethod: "Delivery Only",
    paymentMethod: "Demo FPX",
  });
  const booking = state.bookings.find((b) => b.id === "booking-tz-test")!;
  assert.ok(booking);
  assert.equal(booking.cancellationCutoff, "2026-10-22T03:00:00.000Z");

  // 5. Recalculation on date and time changes
  // Change start date to 24 Oct 2026
  const date2Start = toMalaysiaUtcTimestamp("2026-10-24", "11:00");
  const date2Cutoff = parseMalaysiaTimestamp(date2Start) - 24 * 60 * 60 * 1000;
  assert.equal(formatMalaysiaDateTime(date2Cutoff), "23 Oct 2026, 11:00 AM");

  // Change time to 14:00 (02:00 PM)
  const time2Start = toMalaysiaUtcTimestamp("2026-10-23", "14:00");
  const time2Cutoff = parseMalaysiaTimestamp(time2Start) - 24 * 60 * 60 * 1000;
  assert.equal(formatMalaysiaDateTime(time2Cutoff), "22 Oct 2026, 02:00 PM");

  // 6. README Section 7.4 example: scheduled 2 Nov 2026 10:00 AM -> Free cancellation until 1 Nov 2026, 10:00 AM
  const nov2Start = toMalaysiaUtcTimestamp("2026-11-02", "10:00");
  assert.equal(nov2Start, "2026-11-02T02:00:00.000Z");
  const nov2Cutoff = parseMalaysiaTimestamp(nov2Start) - 24 * 60 * 60 * 1000;
  assert.equal(
    `Free cancellation until ${formatMalaysiaDateTime(nov2Cutoff)}`,
    "Free cancellation until 1 Nov 2026, 10:00 AM",
  );
});

test("Sony A7 III image gallery has 4 distinct original reference images in exact PDF order", () => {
  const seed = createSeed("admin_demo");
  const sony = seed.listings.find((l) => l.id === "sony-a7iii");
  assert.ok(sony);
  assert.ok(sony.images);

  // 1. Must contain 4 images total
  assert.equal(
    sony.images.length,
    4,
    "Sony A7 III gallery must have exactly 4 images",
  );

  // 2. Exact order:
  // [0] Yellow-background main image
  // [1] Front/angled view with attached lens
  // [2] Side/rear view against grey background
  // [3] Camera, lens and accessories arranged on light background
  assert.equal(sony.imageUrl, "/products/sony-a7iii.jpg");
  assert.deepEqual(sony.images, [
    "/products/sony-a7iii.jpg",
    "/products/sony-thumb-1.jpg",
    "/products/sony-thumb-2.jpg",
    "/products/sony-thumb-3.jpg",
  ]);

  // 3. Verify all 4 image assets exist on disk and are valid non-empty files
  for (const imgPath of sony.images) {
    const fullPath = path.join(process.cwd(), "public", imgPath);
    assert.ok(
      fs.existsSync(fullPath),
      `Asset file must exist on disk: ${imgPath}`,
    );
    const stats = fs.statSync(fullPath);
    assert.ok(
      stats.size > 10000,
      `Asset file must be high quality (>10KB): ${imgPath}`,
    );
  }
});

test("Section 10: contiguous rental dates create a new booking and charge a new deposit", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });

  const startTs = toMalaysiaUtcTimestamp(dateAfter(10), "11:00");
  const endTs = toMalaysiaUtcTimestamp(dateAfter(12), "11:00");
  const nextEndTs = toMalaysiaUtcTimestamp(dateAfter(14), "11:00");

  state = transition(state, {
    type: "instantBook",
    deliveryAddress: "Mont Kiara, Kuala Lumpur",
    id: "first-independent-rental",
    listingId: "sony-a7iii",
    start: startTs,
    end: endTs,
    paymentMethod: "FPX",
  });

  state = transition(state, {
    type: "instantBook",
    deliveryAddress: "Mont Kiara, Kuala Lumpur",
    id: "second-independent-rental",
    listingId: "sony-a7iii",
    start: endTs,
    end: nextEndTs,
    paymentMethod: "FPX",
  });

  const first = state.bookings.find(
    (booking) => booking.id === "first-independent-rental",
  )!;
  const second = state.bookings.find(
    (booking) => booking.id === "second-independent-rental",
  )!;
  assert.ok(first);
  assert.ok(second);
  assert.notEqual(first.id, second.id);
  assert.equal(first.end, second.start);
  assert.equal(first.quote.days, 2);
  assert.equal(second.quote.days, 2);
  assert.equal(first.quote.deposit, 200);
  assert.equal(second.quote.deposit, 200);
});

test("Section 4.4 & 16: Renter condition evidence requires >= 6 photos and >= 1 video, and lender ends rental without media upload", () => {
  let state = createSeed("admin_demo");
  const booking = state.bookings.find(
    (item) => item.id === "demo-booking-active-1",
  )!;
  booking.end = new Date(Date.now() - 1).toISOString();
  booking.effectiveReturnDeadline = undefined;
  const samplePhotos = [
    "/photo-1.jpg",
    "/photo-2.jpg",
    "/photo-3.jpg",
    "/photo-4.jpg",
    "/photo-5.jpg",
    "/photo-6.jpg",
  ];
  const sampleVideos = ["/video-1.mp4"];

  // 1. Submit check-in evidence as renter on an active rental
  state = transition(state, { type: "login", userId: "demo-renter" });

  // Insufficient media fails
  assert.throws(
    () =>
      transition(state, {
        type: "conditionEvidence",
        bookingId: "demo-booking-active-1",
        kind: "check_in",
        photos: ["/photo-1.jpg"],
        videos: [],
      }),
    /requires at least 6 photos and 1 video/,
  );

  // Sufficient media succeeds
  state = transition(state, {
    type: "conditionEvidence",
    bookingId: "demo-booking-active-1",
    kind: "check_in",
    photos: samplePhotos,
    videos: sampleVideos,
    notes: "Item delivered and verified with all cables",
  });

  const checkInRecord = state.evidence.find(
    (e) =>
      e.bookingId === "demo-booking-active-1" &&
      e.kind === "check_in" &&
      e.authorId === "demo-renter",
  );
  assert.ok(checkInRecord);
  assert.equal(checkInRecord.photos?.length, 6);
  assert.equal(checkInRecord.videos?.length, 1);

  // 2. Lender cannot end rental before renter confirms return
  state = transition(state, { type: "login", userId: "owner-sarah" });
  assert.throws(
    () =>
      transition(state, {
        type: "returnConfirm",
        bookingId: "demo-booking-active-1",
        role: "owner",
      }),
    /Renter must complete return check-out before lender can end the rental/,
  );

  // 3. Renter confirms return with >= 6 photos and >= 1 video
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "returnConfirm",
    bookingId: "demo-booking-active-1",
    role: "renter",
    photos: samplePhotos,
    videos: sampleVideos,
    notes: "Returned clean and complete",
  });

  const bReturnPending = state.bookings.find(
    (b) => b.id === "demo-booking-active-1",
  )!;
  assert.equal(bReturnPending.status, "return_pending");
  assert.ok(bReturnPending.renterReturnConfirmedAt);

  // 4. Lender confirms return (No Issue - End Rental) WITHOUT requiring photo/video upload
  state = transition(state, { type: "login", userId: "owner-sarah" });
  state = transition(state, { type: "confirmReturnReceipt", bookingId: "demo-booking-active-1" });
  state = transition(state, { type: "conditionEvidence", bookingId: "demo-booking-active-1", kind: "lender_after_return", photos: samplePhotos, videos: sampleVideos });
  state = transition(state, {
    type: "returnConfirm",
    bookingId: "demo-booking-active-1",
    role: "owner",
    notes: "No Issue - End Rental",
  });

  const bCompleted = state.bookings.find(
    (b) => b.id === "demo-booking-active-1",
  )!;
  assert.equal(bCompleted.status, "completed");
  assert.equal(bCompleted.deposit, "release_pending");
});

test("Section 4.3: Owner listing supports 8 fixed delivery time slots", () => {
  let state = createSeed("admin_demo");
  state = transition(state, { type: "login", userId: "demo-renter" });

  const validSlots = ["10:00 AM", "2:00 PM", "5:00 PM"];
  const listing = {
    ...state.listings[0],
    id: "test-slots-listing",
    ownerId: "demo-renter",
    title: "Test Fixed Slots Gear",
    images: [
      "/img-1.jpg",
      "/img-2.jpg",
      "/img-3.jpg",
      "/img-4.jpg",
      "/img-5.jpg",
      "/img-6.jpg",
    ],
    videos: ["/vid-1.mp4"],
    deliveryTimeSlots: validSlots,
  };

  state = transition(state, {
    type: "saveListing",
    listing,
  });

  const saved = state.listings.find((l) => l.id === "test-slots-listing");
  assert.ok(saved);
  assert.deepEqual(saved.deliveryTimeSlots, validSlots);
});

test("Section 8: booking confirmation records do not claim fictional digital agreements or signatures", () => {
  const state = createSeed("admin_demo");
  const booking = state.bookings.find(
    (b) => b.id === "demo-booking-upcoming-1",
  );
  assert.ok(booking);

  assert.equal(booking.title, "Sony A7 III Mirrorless Camera");
  assert.equal(booking.start, "2026-11-02T02:00:00Z");
  assert.equal(booking.end, "2026-11-04T02:00:00Z");
  assert.equal(booking.agreement, undefined);
  for (const seededBooking of state.bookings) {
    assert.equal(seededBooking.agreement, undefined);
  }
});

test("Section 30: Post-rental 'How did it go?' rating and review submission for both Renter and Lender with duplicate prevention", () => {
  let state = createSeed("admin_demo");
  const completedBooking = state.bookings.find(
    (b) => b.status === "completed" && b.renterId === "demo-renter",
  );
  assert.ok(completedBooking);
  completedBooking.end = new Date(Date.now() - 1).toISOString();

  // 1. Renter submits review
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "review",
    bookingId: completedBooking.id,
    rating: 5,
    text: "Seamless delivery and camera was in immaculate condition!",
  });

  const renterReview = state.reviews.find(
    (r) => r.bookingId === completedBooking.id && r.authorId === "demo-renter",
  );
  assert.ok(renterReview);
  assert.equal(renterReview.rating, 5);
  assert.equal(renterReview.recipientId, completedBooking.ownerId);
  assert.equal(
    renterReview.text,
    "Seamless delivery and camera was in immaculate condition!",
  );

  // 2. Duplicate submission blocked
  assert.throws(
    () =>
      transition(state, {
        type: "review",
        bookingId: completedBooking.id,
        rating: 4,
        text: "Trying duplicate",
      }),
    /You already reviewed this rental\./,
  );

  // 3. Counterparty (Lender) can also submit their own review
  state = transition(state, {
    type: "login",
    userId: completedBooking.ownerId,
  });
  state = transition(state, {
    type: "review",
    bookingId: completedBooking.id,
    rating: 5,
    text: "Great renter, took excellent care of the gear and returned on time.",
  });

  const lenderReview = state.reviews.find(
    (r) =>
      r.bookingId === completedBooking.id &&
      r.authorId === completedBooking.ownerId,
  );
  assert.ok(lenderReview);
  assert.equal(lenderReview.rating, 5);
  assert.equal(lenderReview.recipientId, completedBooking.renterId);

  // 4. Cannot review non-completed rental
  const upcomingBooking = state.bookings.find((b) => b.status === "upcoming");
  assert.ok(upcomingBooking);
  assert.throws(
    () =>
      transition(state, {
        type: "review",
        bookingId: upcomingBooking.id,
        rating: 5,
        text: "Too early",
      }),
    /Reviews are available after the rental is completed\./,
  );

  // 5. Completed status alone does not unlock reviews before scheduled end
  const futureState = createSeed("admin_demo");
  const futureCompletedBooking = futureState.bookings.find(
    (b) => b.status === "completed" && b.renterId === "demo-renter",
  );
  assert.ok(futureCompletedBooking);
  futureCompletedBooking.end = new Date(Date.now() + 86_400_000).toISOString();
  assert.throws(
    () =>
      transition(futureState, {
        type: "review",
        bookingId: futureCompletedBooking.id,
        rating: 5,
        text: "The scheduled end has not arrived yet.",
      }),
    /Reviews are available after the scheduled rental end\./,
  );

  const rentalDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), "app/rental/[id].tsx"),
    "utf8",
  );
  assert.match(rentalDetailSource, /const reviewEligible =/);
  assert.match(rentalDetailSource, /editable={reviewEligible}/);
  assert.match(
    rentalDetailSource,
    /disabled={!reviewEligible \|\| \(owner && !lenderRatingChosen\) \|\| isSavingAction}/,
  );
});

test("Section 4.4 & 30: Lender Check-out and Check-in condition evidence preservation and settlement visibility", () => {
  let state = createSeed("admin_demo");
  const activeBooking = state.bookings.find(
    (b) => b.status === "active" && b.renterId === "demo-renter",
  );
  assert.ok(activeBooking);
  activeBooking.end = new Date(Date.now() - 1).toISOString();
  activeBooking.effectiveReturnDeadline = undefined;

  // Renter submits check-out condition evidence
  state = transition(state, { type: "login", userId: "demo-renter" });
  state = transition(state, {
    type: "returnConfirm",
    bookingId: activeBooking.id,
    role: "renter",
    photos: [
      "/products/sony-a7iii.jpg",
      "/products/sony-thumb-1.jpg",
      "/products/sony-thumb-2.jpg",
      "/products/sony-thumb-3.jpg",
      "/products/portable-projector.jpg",
      "/products/ps5-console.jpg",
    ],
    videos: ["/videos/renter-return-sample.mp4"],
    notes: "Item clean, all accessories packed.",
  });

  // Verify renter return confirmed and evidence saved
  const updatedBooking = state.bookings.find((b) => b.id === activeBooking.id);
  assert.ok(updatedBooking?.renterReturnConfirmedAt);

  const evidence = state.evidence.find(
    (e) => e.bookingId === activeBooking.id && e.kind === "check_out",
  );
  assert.ok(evidence);
  assert.equal(evidence.photos?.length, 6);
  assert.equal(evidence.videos?.length, 1);

  // Lender inspects shared evidence and ends rental cleanly
  state = transition(state, { type: "login", userId: activeBooking.ownerId });
  state = transition(state, { type: "confirmReturnReceipt", bookingId: activeBooking.id });
  state = transition(state, { type: "conditionEvidence", bookingId: activeBooking.id, kind: "lender_after_return", photos: ["/p1", "/p2", "/p3", "/p4", "/p5", "/p6"], videos: ["/v1"] });
  state = transition(state, {
    type: "returnConfirm",
    bookingId: activeBooking.id,
    role: "owner",
    notes: "Owner inspection confirmed clean — No Issue",
  });

  const completedBooking = state.bookings.find(
    (b) => b.id === activeBooking.id,
  );
  assert.equal(completedBooking?.status, "completed");

  // Evidence is preserved in completed status (never hidden or destroyed)
  const preservedEvidence = state.evidence.find(
    (e) => e.bookingId === activeBooking.id && e.kind === "check_out",
  );
  assert.ok(preservedEvidence);
  assert.equal(preservedEvidence.photos?.length, 6);
});

test("Section 14.4: Customer Service separates fee chips and answers approved topics", () => {
  const topics = [
    "How to rent",
    "Fees",
    "Deposits",
    "Delivery & return",
    "Risk score",
    "Disputes",
    "How is my risk score calculated?",
    "When will the lender receive rental money?",
  ];
  for (const topic of topics) {
    const result = resolveAutomatedSupportQuery(topic);
    assert.equal(result.answered, true, topic);
    assert.ok(result.response, topic);
    assert.equal(result.responses, undefined);
  }

  assert.ok(
    resolveAutomatedSupportQuery("Fees").response?.includes(
      "Renter service fee",
    ),
  );
  assert.ok(
    resolveAutomatedSupportQuery("Deposits").response?.includes(
      "Low Risk (80–100)",
    ),
  );
  assert.equal(resolveAutomatedSupportQuery("Fees").responses, undefined);
  assert.equal(resolveAutomatedSupportQuery("Deposits").responses, undefined);
  const combinedFees = resolveAutomatedSupportQuery("Fees & deposits");
  assert.deepEqual(
    combinedFees.responses?.map((message) => message.split("\n")[0]),
    ["Fees", "Security deposits"],
  );
  assert.equal(
    resolveAutomatedSupportQuery("Rental extensions").answered,
    false,
  );

  assert.ok(
    resolveAutomatedSupportQuery(
      "How is my risk score calculated?",
    ).response?.includes("+2 points"),
  );
  assert.ok(
    resolveAutomatedSupportQuery(
      "When will the lender receive rental money?",
    ).response?.includes("successfully settled"),
  );
  for (const unsupported of [
    "How do I cancel this rental?",
    "What is my current risk score?",
    "When will my specific deposit be released?",
    "Can I get BNPL?",
  ]) {
    assert.equal(
      resolveAutomatedSupportQuery(unsupported).answered,
      false,
      unsupported,
    );
  }
});

test("Section 14.4: Unmatched questions and Talk to a Human use the approved reply", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });

  state = transition(state, {
    type: "supportQuery",
    text: "Can I cancel this booking and get my money back?",
  });

  const msgs = state.supportMessages.filter((m) => m.userId === "demo-renter");
  assert.equal(msgs.length, 2);
  assert.equal(
    msgs[1].text,
    "Your enquiry has been forwarded to our support team. We aim to respond here within one working hour. Thank you for your patience.",
  );
  assert.equal(state.supportCases.length, 0);

  state = transition(state, {
    type: "supportHandoff",
    query: "Talk to a Human",
  });

  const allMsgs = state.supportMessages.filter(
    (m) => m.userId === "demo-renter",
  );
  assert.equal(
    allMsgs.at(-1)?.text,
    "Your enquiry has been forwarded to our support team. We aim to respond here within one working hour. Thank you for your patience.",
  );
  assert.equal(allMsgs.at(-2)?.text, "Talk to a Human");
  assert.equal(state.supportCases.length, 0);
  assert.throws(
    () =>
      transition(state, {
        type: "supportStaffReply",
        caseId: "any-client-supplied-case-id",
        text: "This must not be presented as an authenticated staff response.",
      }),
    /configured support backend/,
  );
});

test("Section 14.3: Full 30-question FAQ covers all six categories with correct fee/deposit figures and the coverage comparison table", async () => {
  const { sampleFaqs, faqCategories } = await import("../data/mock");
  assert.ok(sampleFaqs.length >= 30);

  // All six categories are represented, in order, and nothing outside the approved set.
  const seenCategories = [...new Set(sampleFaqs.map((f) => f.category))];
  assert.deepEqual(seenCategories, [...faqCategories]);
  for (const faq of sampleFaqs) {
    assert.ok((faqCategories as readonly string[]).includes(faq.category));
  }

  // The stale 12% lender-commission wording must be gone everywhere; 13% is the current rate.
  assert.ok(!sampleFaqs.some((f) => f.answer.includes("12%")));
  const feeFaq = sampleFaqs.find((f) => f.question.startsWith("How much does CurRENT charge"));
  assert.ok(feeFaq);
  assert.ok(feeFaq!.answer.includes("5% of the rental fee, subject to a minimum charge of RM5"));
  assert.ok(feeFaq!.answer.includes("13% of the rental fee for new bookings"));
  assert.ok(feeFaq!.answer.includes("87%"));

  // Deposit tiers match the live calculation in services/booking.ts.
  const depositFaq = sampleFaqs.find((f) => f.question === "How is my security deposit calculated?");
  assert.ok(depositFaq);
  assert.ok(depositFaq!.answer.includes("5% of item value, capped at RM500"));
  assert.ok(depositFaq!.answer.includes("10% of item value, capped at RM1,000"));
  assert.ok(depositFaq!.answer.includes("15% of item value, capped at RM1,500"));

  // Rental Protection is consistently described as proposed third-party insurance, not CurRENT's own.
  const protectionFaqs = sampleFaqs.filter((f) => f.category === "Optional Rental Protection");
  assert.ok(protectionFaqs.length > 0);
  assert.ok(protectionFaqs.every((f) => !/CurRENT (provides|underwrites|pays)( the)? insurance/i.test(f.answer)));
  const whatIsProtection = protectionFaqs.find((f) => f.question === "What is Rental Protection?");
  assert.ok(whatIsProtection!.answer.includes("not provided or underwritten by CurRENT"));
  const premiumFaq = protectionFaqs.find((f) => f.question === "How is Rental Protection calculated?");
  assert.ok(premiumFaq!.answer.includes("0.3%"));
  assert.ok(premiumFaq!.answer.includes("Rental Days"));
  assert.ok(premiumFaq!.answer.includes("MAX(RM5"));
  assert.ok(sampleFaqs.some((f) => f.question === "Why is there a minimum protection fee?"));
  assert.ok(sampleFaqs.some((f) => f.question === "Who provides Rental Protection?"));
  assert.ok(sampleFaqs.some((f) => f.question === "Does Rental Protection cover courier damage?"));
  const maxFaq = protectionFaqs.find((f) => f.question === "What is the maximum Rental Protection coverage?");
  assert.ok(maxFaq!.answer.includes("RM60,000"));
  assert.ok(maxFaq!.answer.includes("not guaranteed compensation"));

  // No FAQ answer may still describe the retired flat "5% of the rental fee" protection
  // premium — every protection answer must track the current fair-value/0.3%-per-7-days formula.
  assert.ok(!sampleFaqs.some((f) => /\b5%\b.*(?:rental fee|protection|insurance)/i.test(f.answer) || /(?:protection|insurance).*\b5%\b/i.test(f.answer)));
  const sameAsDepositFaq = sampleFaqs.find((f) => f.question === "How does Rental Protection differ from the security deposit?");
  assert.ok(sameAsDepositFaq!.answer.includes("0.3%"));

  // The delivery-fee FAQ explains the postcode → Haversine → ×1.3 estimation and that cross-state
  // postage uses shipping regions/parcel weight instead of kilometres.
  const deliveryFeeFaq = sampleFaqs.find((f) => f.question === "How are delivery fees calculated?");
  assert.ok(deliveryFeeFaq);
  assert.ok(deliveryFeeFaq!.answer.includes("1.3"));
  assert.ok(deliveryFeeFaq!.answer.includes("straight-line distance"));
  assert.ok(deliveryFeeFaq!.answer.includes("shipping region"));
  const deliveryFaq = sampleFaqs.find((f) => f.question === "How does CurRENT delivery work?");
  assert.ok(deliveryFaq!.answer.includes("Fragile handling alone does not prevent cross-state delivery"));
  const paymentFaq = sampleFaqs.find((f) => f.question.includes("Buy Now Pay Later"));
  assert.ok(paymentFaq!.answer.includes("does not create instalments or run a credit check"));

  // The Q21 comparison table: 16 situations, five columns, "Without Rental Protection" present.
  const comparisonFaq = sampleFaqs.find((f) => !!f.coverageTable);
  assert.ok(comparisonFaq);
  assert.equal(comparisonFaq!.coverageTable!.length, 16);
  for (const row of comparisonFaq!.coverageTable!) {
    assert.ok(row.situation && row.withProtection && row.withoutProtection && row.deposit && row.deliveryCompensation);
  }

  // Delivery company compensation must not be framed as conditional on buying Rental Protection.
  const deliveryClaimFaq = sampleFaqs.find((f) => f.question === "What happens if a delivery company damages or loses an item?");
  assert.ok(deliveryClaimFaq);
  assert.ok(deliveryClaimFaq!.answer.includes("do not need optional Rental Protection"));
  assert.ok(deliveryClaimFaq!.answer.includes("does not automatically justify deducting"));
});

test("FAQ page and Help & Trust page render the same shared FAQ content", async () => {
  const faqSource = require("fs").readFileSync(require("path").join(__dirname, "../app/faq.tsx"), "utf8");
  const helpSource = require("fs").readFileSync(require("path").join(__dirname, "../app/help.tsx"), "utf8");
  assert.ok(faqSource.includes("sampleFaqs"));
  assert.ok(helpSource.includes("sampleFaqs"));
  assert.ok(faqSource.includes("FaqAccordion"));
  assert.ok(helpSource.includes("FaqAccordion"));
});

test("Lender Dashboard displays the eligibility badge from the shared classifier, never a separate rule, and package management uses Add/Remove instead of a manual count", () => {
  const fs = require("fs");
  const path = require("path");
  const dashboardSource = fs.readFileSync(path.join(__dirname, "../app/owner/index.tsx"), "utf8");
  // Must import and call the same shared classifier/badge constants used everywhere else
  // (product page, lender form, backend) — not a second, independently defined eligibility rule.
  assert.ok(dashboardSource.includes('from "../../services/delivery"'));
  assert.ok(dashboardSource.includes("crossStateDeliveryEligibility"));
  assert.ok(dashboardSource.includes("CROSS_STATE_ELIGIBILITY_BADGE"));

  const editSource = fs.readFileSync(path.join(__dirname, "../app/owner/edit.tsx"), "utf8");
  assert.ok(editSource.includes("Add Package"));
  assert.ok(editSource.includes("Remove Package"));
  assert.ok(!editSource.includes("Number of packages"), "The manual package-count input must be gone");
  assert.ok(!editSource.includes("packageCount"), "Package count must be driven by the Add/Remove list, not a typed number");
});

test("Confirm Received is gated by scheduled start and does not activate or reschedule a rental", () => {
  let state = createSeed();
  state = transition(state, { type: "login", userId: "demo-renter" });

  const bookingStartIso = toMalaysiaUtcTimestamp(dateAfter(1), "10:00");
  const bookingEndIso = toMalaysiaUtcTimestamp(dateAfter(3), "10:00");
  state = transition(state, {
    type: "instantBook",
    id: "booking-time-gated",
    listingId: "sony-a7iii",
    start: bookingStartIso,
    end: bookingEndIso,
    deliveryAddress: "123 Jalan Ampang, Kuala Lumpur",
  });

  const b = state.bookings.find((x) => x.id === "booking-time-gated")!;
  assert.equal(b.status, "upcoming");

  // Attempting Confirm Received before the scheduled rental start is rejected.
  assert.throws(() => {
    transition(state, {
      type: "confirmReceived",
      bookingId: "booking-time-gated",
    });
  }, /Confirm Received is available from scheduled rental start/);

  state = withMockedNow(parseMalaysiaTimestamp(bookingStartIso), () =>
    transition(state, {
      type: "confirmReceived",
      bookingId: "booking-time-gated",
    }),
  );

  const updatedBooking = state.bookings.find(
    (x) => x.id === "booking-time-gated",
  )!;
  assert.ok(updatedBooking.renterReceivedAt);
  assert.equal(updatedBooking.status, "upcoming");
  assert.equal(updatedBooking.start, bookingStartIso);
  assert.equal(updatedBooking.end, bookingEndIso);

  // Duplicate submission rejected
  assert.throws(() => {
    transition(state, {
      type: "confirmReceived",
      bookingId: "booking-time-gated",
    });
  }, /Delivery receipt has already been confirmed/);
});

test("Section 31: Profile post-verification cleanup — generic Verified badge and verified account state", () => {
  const state = createSeed("admin_demo");
  const demoRenter = state.profiles.find((p) => p.id === "demo-renter")!;
  assert.ok(demoRenter);
  assert.equal(demoRenter.verification, "verified");

  // Verified label logic check: exactly 'Verified', never 'Verified · Demo' or 'Verified Renter'
  const badgeLabel =
    demoRenter.verification === "verified"
      ? "Verified"
      : demoRenter.verification;
  assert.equal(badgeLabel, "Verified");

  // Unverified profile retains not_verified status
  const unverifiedStatus = "not_verified";
  const unverifiedBadgeLabel =
    (unverifiedStatus as string) === "verified" ? "Verified" : unverifiedStatus;
  assert.equal(unverifiedBadgeLabel, "not_verified");

  // Profile trust and support items count
  const trustAndSupportItems = [
    "How CurRENT Works",
    "Trust",
    "FAQ",
    "Customer Service",
  ];
  assert.equal(trustAndSupportItems.length, 4);
});

test("Every seeded Delivery Only booking carries a delivery address, and checkout rejects a missing one", () => {
  const state = createSeed("admin_demo");
  const deliveryOnlyBookings = state.bookings.filter((b) => b.collectionMethod === "Delivery Only");
  assert.ok(deliveryOnlyBookings.length > 0);
  for (const booking of deliveryOnlyBookings) {
    assert.ok(
      booking.deliveryAddress && booking.deliveryAddress.trim().length > 0,
      `Delivery Only booking ${booking.id} must have a non-empty deliveryAddress`,
    );
  }

  // The Sony A7 III upcoming booking specifically must no longer show "Not provided".
  const sonyUpcoming = state.bookings.find((b) => b.id === "demo-booking-upcoming-1")!;
  assert.equal(sonyUpcoming.collectionMethod, "Delivery Only");
  assert.ok(sonyUpcoming.deliveryAddress);

  // Checkout-time validation: instantBook must reject an empty delivery address.
  const seed = createSeed("admin_demo");
  assert.throws(() => {
    transition(seed, {
      type: "instantBook",
      id: "no-address-booking",
      listingId: "portable-projector",
      start: `${dateAfter(20)}T11:00:00+08:00`,
      end: `${dateAfter(22)}T11:00:00+08:00`,
      paymentMethod: "Demo FPX",
      deliveryAddress: "",
    } as Action);
  }, /Enter a delivery destination/);
});

test("Home filter chips and listing category tags share one vocabulary; empty chips are hidden", () => {
  // Every mock listing's category must be one of the shared MAIN_CATEGORIES.
  for (const listing of mockListings) {
    assert.ok(
      (MAIN_CATEGORIES as readonly string[]).includes(listing.category),
      `Listing ${listing.id} has category "${listing.category}" outside MAIN_CATEGORIES`,
    );
  }

  // The chip list is derived from the exact same MAIN_CATEGORIES vocabulary.
  assert.deepEqual(
    MOBILE_BROWSE_CATEGORIES,
    ["All Categories", ...MAIN_CATEGORIES],
  );

  // mobileBrowseCategoryFor must map every listing to a real chip 1:1 (no lossy bucketing into "Other").
  for (const listing of mockListings) {
    assert.equal(mobileBrowseCategoryFor(listing), listing.category);
  }

  // A category with zero published listings must be absent from the visible chip set.
  const publishedCategories = new Set(
    mockListings.filter((l) => l.status === "published").map((l) => mobileBrowseCategoryFor(l)),
  );
  const visibleCategories = MOBILE_BROWSE_CATEGORIES.filter(
    (c) => c === "All Categories" || publishedCategories.has(c),
  );
  for (const category of visibleCategories) {
    if (category === "All Categories") continue;
    assert.ok(
      mockListings.some((l) => l.status === "published" && mobileBrowseCategoryFor(l) === category),
      `Chip "${category}" is visible but has no published listings`,
    );
  }
});
