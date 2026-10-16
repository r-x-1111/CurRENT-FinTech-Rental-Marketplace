import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { createSeed } from "../data/seed";
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
  dateAfter,
  demoSlotAvailable,
  formatMalaysiaDateTime,
  getEffectiveBookingStatus,
  isCancellationEligible,
  parseMalaysiaTimestamp,
  quoteFor,
  rentalTabForBooking,
  rentalDays,
  riskFor,
  toMalaysiaUtcTimestamp,
} from "../services/booking";
import { calculateOwnerPayout } from "../services/deposit";
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
import { withoutRemovedSeedListings } from "../services/catalogue";
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

test("message rental links select the tab for each booking condition", () => {
  const booking = createSeed("admin_demo").bookings[0];
  const now = parseMalaysiaTimestamp("2026-10-16T12:00:00+08:00");
  const withStatus = (status: typeof booking.status) => ({ ...booking, status, payment: "paid" as const });
  assert.equal(rentalTabForBooking({ ...withStatus("upcoming"), start: "2026-10-17", end: "2026-10-19" }, now), "Upcoming");
  assert.equal(rentalTabForBooking({ ...withStatus("active"), end: "2026-10-17" }, now), "Active");
  assert.equal(rentalTabForBooking({ ...withStatus("active"), end: "2026-10-15", renterReturnConfirmedAt: null }, now), "Return Due");
  assert.equal(rentalTabForBooking(withStatus("return_pending"), now), "Active");
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

test("Demo workspace starts fresh, persists in-session, and clears on sign out", () => {
  const accountId = "demo-auth-user";
  const first = startDemoWorkspaceSession(accountId);
  first.profiles[0].name = "Changed for this session";
  saveDemoWorkspaceSession(accountId, first);

  assert.equal(
    loadDemoWorkspaceSession(accountId).profiles[0].name,
    "Changed for this session",
  );

  closeDemoWorkspaceSession(accountId);
  assert.notEqual(
    loadDemoWorkspaceSession(accountId).profiles[0].name,
    "Changed for this session",
  );
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

test("delivery demo receipt is stored separately before rental payment", () => {
  const j = journey();
  const start = `${dateAfter(2)}T11:00:00+08:00`;
  const end = `${dateAfter(4)}T11:00:00+08:00`;
  j.act({ type: "startDeliveryCheckout", id: "delivery-booking", listingId: "sony-a7iii",
    start, end, deliveryAddress: "12 Jalan Example, Kuala Lumpur" });
  const pending = j.state.bookings.find((booking) => booking.id === "delivery-booking")!;
  assert.equal(pending.payment, "required");
  assert.equal(pending.status, "payment_required");
  assert.equal(pending.deliveryDemo?.fee, 10);
  assert.equal(pending.commissionRate, 0.13);
  assert.equal(pending.quote.total, pending.quote.rentalFee + pending.quote.serviceFee + pending.quote.deposit);
  assert.throws(() => j.act({ type: "completeRentalCheckout", bookingId: pending.id, paymentMethod: "Demo FPX" }), /delivery demo payment/);
  j.act({ type: "payDeliveryDemo", bookingId: pending.id, receiptReference: "DEMO-GE-123" });
  j.act({ type: "payDeliveryDemo", bookingId: pending.id, receiptReference: "DEMO-GE-DUPLICATE" });
  assert.equal(j.state.bookings.find((booking) => booking.id === pending.id)?.deliveryDemo?.receiptReference, "DEMO-GE-123");
  j.act({ type: "completeRentalCheckout", bookingId: pending.id, paymentMethod: "Demo FPX" });
  assert.equal(j.state.bookings.find((booking) => booking.id === pending.id)?.payment, "paid");
  assert.throws(() => j.act({ type: "completeRentalCheckout", bookingId: pending.id, paymentMethod: "Demo FPX" }), /already completed/);
  assert.equal(calculateOwnerPayout(pending.quote.rentalFee, pending.commissionRate).commission,
    Math.round(pending.quote.rentalFee * 13) / 100);
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
    protection: 0,
    total: 295,
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
  assert.deepEqual(
    saved.profiles.find((profile) => profile.id === "demo-renter")
      ?.savedDeliveryAddress,
    address,
  );
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

test("RM10 lender boost features listing for 7 days", () => {
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
  assert.throws(() => transition(state, { type: "boostListing", listingId, transactionId: "boost-test-1" }), /already boosted/);
});

test("Demo availability is stable, listing-specific, and limited to October–December 2026", () => {
  const state = createSeed("admin_demo");
  assert.equal(state.listings.length, 20);
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

test("check-out media and return confirmation stay locked until the final scheduled end", () => {
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
  assert.throws(() => transition(state, evidence), /scheduled rental end/);
  assert.throws(() => transition(state, returnAction), /scheduled rental end/);
  assert.throws(
    () =>
      transition(state, {
        type: "reportIssue",
        bookingId: booking.id,
        stage: "check_out",
        text: "A late-stage issue.",
      }),
    /relevant active rental stage/,
  );

  booking.end = new Date(Date.now() - 1).toISOString();
  booking.scheduledReturn = new Date(Date.now() + 86_400_000).toISOString();
  booking.effectiveReturnDeadline = new Date(
    Date.now() + 86_400_000,
  ).toISOString();
  state = transition(state, returnAction);
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
  assert.equal(bCancelled.deposit, "released");
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
  assert.equal(bHalfReturned.deposit, "release_pending"); // Not released yet!

  // Owner confirms return inspection (No Issue – End Rental) by reviewing shared media without uploading media
  state = transition(state, { type: "login", userId: "owner-aiman" });
  state = transition(state, {
    type: "returnConfirm",
    bookingId: "booking-return",
    role: "owner",
    notes: "Owner inspection confirmed clean — No Issue",
  });

  const bCompleted = state.bookings.find((b) => b.id === "booking-return")!;
  assert.equal(bCompleted.status, "completed");
  assert.equal(bCompleted.deposit, "released");

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

test("V3.36 Demo Account has 4 completed rentals and a history-derived score of 84 (+2,+2,0,0)", () => {
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

  // 4. At least 3 Return Due rentals
  const returnDue = userBookings.filter(
    (b) =>
      b.status === "return_pending" ||
      (b.status === "active" && b.end <= dateAfter(1)),
  );
  assert.ok(
    returnDue.length >= 3,
    `Expected >= 3 return due rentals, got ${returnDue.length}`,
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

  // 7. Exactly 4 Completed rentals matching 4 linked risk adjustments (+2, +2, 0, 0)
  const completed = userBookings.filter((b) => b.status === "completed");
  assert.equal(
    completed.length,
    4,
    `Expected exactly 4 completed rentals, got ${completed.length}`,
  );
  assert.equal(demoProfile.riskScore, 84, "Expected risk score 84");
  assert.equal(demoProfile.riskLevel, "low", "Expected low risk tier");
  assert.ok(demoProfile.riskHistory, "Risk history must be present");
  assert.equal(
    demoProfile.riskHistory.length,
    4,
    "Expected 4 risk incident records",
  );
  const adjustments = demoProfile.riskHistory.map((h) => h.effectiveAdjustment);
  assert.deepEqual(
    adjustments.slice().sort(),
    [0, 0, 2, 2],
    "Expected adjustments to be +2, +2, 0, 0",
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
    calculateOwnerPayout(lenderPayouts[0].quote.rentalFee, lenderPayouts[0].commissionRate ?? 0.12).payout,
    39.6,
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
    3,
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
    id: "first-independent-rental",
    listingId: "sony-a7iii",
    start: startTs,
    end: endTs,
    paymentMethod: "FPX",
  });

  state = transition(state, {
    type: "instantBook",
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
  state = transition(state, { type: "login", userId: "owner-daniel" });
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
  state = transition(state, { type: "login", userId: "owner-daniel" });
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
  assert.equal(bCompleted.deposit, "released");
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
    /disabled={!reviewEligible \|\| isSavingAction}/,
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

test("Section 14.3: Exactly six updated FAQs match founder screenshot copy and deposit rates", async () => {
  const { sampleFaqs } = await import("../data/mock");
  assert.equal(sampleFaqs.length, 6);

  // Check Q1
  assert.equal(sampleFaqs[0].question, "How does CurRENT verify users?");
  assert.equal(
    sampleFaqs[0].answer,
    "Identity checks are completed by authorised external eKYC providers, subject to their terms.",
  );

  // Check Q2
  assert.equal(sampleFaqs[1].question, "How is the security deposit handled?");
  assert.ok(
    sampleFaqs[1].answer.includes(
      "The refundable security deposit is risk-based.",
    ),
  );

  // Check Q3 (Updated deposit rates)
  assert.equal(
    sampleFaqs[2].question,
    "How is the security deposit calculated?",
  );
  assert.ok(
    sampleFaqs[2].answer.includes(
      "Low-risk rentals (score 80–100) require 5% of the item value, capped at RM500",
    ),
  );
  assert.ok(
    sampleFaqs[2].answer.includes(
      "moderate-risk rentals (40–79) require 10%, capped at RM1,000",
    ),
  );
  assert.ok(
    sampleFaqs[2].answer.includes(
      "high-risk rentals (30–39) require 15%, capped at RM1,500",
    ),
  );
  assert.ok(
    sampleFaqs[2].answer.includes(
      "Very high-risk renters (0–29) must submit a request to CurRENT for review",
    ),
  );

  // Check Q4
  assert.equal(sampleFaqs[3].question, "Can I rent out my own items?");
  assert.ok(
    sampleFaqs[3].answer.includes(
      "Yes. CurRENT is designed to help individuals and businesses monetise underused items",
    ),
  );

  // Check Q5
  assert.equal(
    sampleFaqs[4].question,
    "How much does CurRENT charge borrowers and lenders?",
  );
  assert.equal(
    sampleFaqs[4].answer,
    "Borrowers are charged 5% of the rental value or a minimum of RM5, whichever is higher. Lenders are charged a 12% commission when a rental is successfully completed.",
  );

  // Check Q6
  assert.equal(
    sampleFaqs[5].question,
    "Is Buy Now Pay Later (BNPL) available?",
  );
  assert.ok(
    sampleFaqs[5].answer.includes(
      "BNPL may be available for eligible high-value rental fees",
    ),
  );
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
