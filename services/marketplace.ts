import type { CollectionMethod, Listing, VerificationStatus } from "../types";
import type {
  Marketplace,
  Profile,
  Booking,
  SavedDeliveryAddress,
} from "../types/marketplace";
import {
  availability,
  calculateCancellationCutoff,
  calculateDurationMinutes,
  cancelledDepositReleaseDeadline,
  depositReleaseDeadline,
  formatMalaysiaDateTime,
  getEffectiveBookingStatus,
  isCancellationEligible,
  parseDate,
  parseMalaysiaTimestamp,
  parseTimestamp,
  quoteFor,
  riskFor,
} from "./booking";
import {
  calculateBorrowerServiceFee,
  CURRENT_LENDER_COMMISSION_RATE,
  LENDER_BOOST_DAYS,
  LENDER_BOOST_FEE,
} from "./deposit";
import { evaluateRentalOutcome, tierForScore } from "./riskScore";
import { createSeed } from "../data/seed";
import { addDaysToDateString, CROSS_STATE_BOOKING_WARNING, crossStateDeliveryEligibility, deriveDisplayDelivery, DOMESTIC_COURIER_NAME, estimatedCourierTransitDays, hasReliableCourierTransitEstimate, isDispatchDateFeasible, quoteAutomaticDomesticCourier, quoteAutomaticVehicleDelivery, recommendDispatchDate } from "./delivery";
import { estimatePostcodeDistance } from "./geo";

export type Action =
  | { type: "login"; userId: string | null }
  | { type: "signup"; profile: Profile }
  | { type: "profile"; name: string; avatar?: string }
  | { type: "saveDeliveryAddress"; address: SavedDeliveryAddress; index?: number; setDefault?: boolean }
  | { type: "setDefaultDeliveryAddress"; index: number; isDefault?: boolean }
  | { type: "deleteDeliveryAddress"; index: number }
  | { type: "verify"; status: VerificationStatus }
  | { type: "favourite"; listingId: string }
  | { type: "openChat"; listingId: string }
  | { type: "sendChat"; conversationId: string; id: string; text: string; imageUri?: string }
  | { type: "readChat"; conversationId: string }
  | { type: "saveListing"; listing: Listing }
  | { type: "startDeliveryCheckout"; id: string; listingId: string; start: string; end: string; deliveryAddress: string;
      deliveryPostcode: string; deliveryAddressDetails?: SavedDeliveryAddress; returnPickupTime?: string }
  | { type: "correctBookingDeliveryAddress"; bookingId: string; deliveryAddress: string; deliveryPostcode: string }
  | { type: "payDeliveryDemo"; bookingId: string; receiptReference: string }
  | { type: "confirmOutboundDispatch"; bookingId: string; decision: "accept" | "propose" | "dropoff";
      proposedDate?: string }
  | { type: "respondToDispatchProposal"; bookingId: string; approve: boolean }
  | { type: "completeRentalCheckout"; bookingId: string; paymentMethod: string; insuranceSelected?: boolean }
  | { type: "cancelDeliveryCheckout"; bookingId: string }
  | { type: "deleteListing"; id: string }
  | { type: "boostListing"; listingId: string; transactionId: string }
  | {
      type: "recordRentalOutcome";
      renterId: string;
      itemTitle: string;
      bookingId?: string;
      rawIncidents: {
        type:
          | "on_time_success"
          | "late_return"
          | "minor_damage"
          | "serious_damage"
          | "theft_fraud";
        hoursLate?: number;
        confirmed?: boolean;
        description?: string;
      }[];
    }
  | {
      type: "booking";
      id: string;
      operation: "cancel";
    }
  | {
      type: "confirmReceived";
      bookingId: string;
    }
  | {
      type: "returnConfirm";
      bookingId: string;
      role: "owner" | "renter";
      photo?: string;
      photos?: string[];
      videos?: string[];
      notes?: string;
    }
  | {
      type: "confirmReturnReceipt";
      bookingId: string;
    }
  | {
      type: "conditionEvidence";
      bookingId: string;
      kind: "check_in" | "check_out" | "lender_before_delivery" | "lender_after_return";
      photos: string[];
      videos: string[];
      notes?: string;
      receivedReturnedItem?: boolean;
    }
  | {
      type: "reportIssue";
      bookingId: string;
      stage: "check_in" | "check_out" | "lender_before_delivery" | "lender_after_return";
      text: string;
      receivedReturnedItem?: boolean;
    }
  | {
      type: "resolveDispute";
      disputeId: string;
      scenario:
        "minor_damage" | "serious_damage" | "rejected" | "overdue_restriction";
    }
  | {
      type: "settleOverdueObligation";
      userId: string;
    }
  | {
      type: "resetDemoState";
    }
  | { type: "setMode"; mode: "normal" | "admin_demo" }
  | {
      type: "instantBook";
      id: string;
      listingId: string;
      start: string;
      end: string;
      collectionMethod?: CollectionMethod;
      paymentMethod?: string;
      deliveryAddress?: string;
    }
  | {
      type: "requestPlatformReview";
      id?: string;
      listingId: string;
      start: string;
      end: string;
      pickupTime?: string;
      returnTime?: string;
      durationDays?: number;
      collectionMethod?: CollectionMethod;
      deliveryAddress?: string;
      location?: string;
      lenderName?: string;
      dailyPrice?: number;
      estimatedRentalFee?: number;
      notes?: string;
    }
  | { type: "message"; bookingId: string; text: string }
  | { type: "review"; bookingId: string; rating: number; text: string }
  | {
      type: "dispute";
      bookingId: string;
      reason: string;
      photo?: string;
      category?: string;
    }
  | { type: "readNotices" }
  | { type: "readConversation"; bookingId: string }
  | { type: "supportQuery"; text: string }
  | { type: "supportHandoff"; query?: string }
  | {
      type: "supportHandoffResult";
      query: string;
      caseId?: string;
      messageId: string;
      accepted: boolean;
    }
  | { type: "supportStaffReply"; caseId: string; text: string };

export function getIssueReportPermissions({
  stage,
  status,
  stageAvailable,
  isLender,
  reportSubmitted,
}: {
  stage: "check_in" | "check_out";
  status: string;
  stageAvailable: boolean;
  isLender: boolean;
  reportSubmitted: boolean;
}) {
  const canEdit = !isLender && stageAvailable && !reportSubmitted;
  const activeStage =
    stage === "check_in"
      ? status === "active"
      : ["active", "return_pending", "disputed"].includes(status);
  return { canEdit, canSubmit: canEdit && activeStage };
}

export function isLenderDisputeEligible(
  booking: Booking,
  now = Date.now(),
): boolean {
  return (
    booking.status !== "cancelled" && now >= parseMalaysiaTimestamp(booking.end)
  );
}

export const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const LOCAL_SUPPORT_HANDOFF_MESSAGE =
  "Your enquiry has been forwarded to our support team. We aim to respond here within one working hour. Thank you for your patience.";

function requireThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function requireVerifiedListingAccount(user: Profile) {
  requireThat(
    user.verification === "verified" &&
      typeof user.riskScore === "number" &&
      Number.isFinite(user.riskScore),
    "Complete Identity Verification to create or publish a listing.",
  );
}

export function resolveAutomatedSupportQuery(query: string): {
  answered: boolean;
  response?: string;
  responses?: string[];
} {
  const q = query
    .trim()
    .toLowerCase()
    .replace(/[?!.,]+$/g, "");

  // 1. How to rent / booking flow
  if (
    [
      "how to rent",
      "how do i rent",
      "how do i rent an item",
      "how to book a rental",
      "booking process",
    ].includes(q)
  ) {
    return {
      answered: true,
      response:
        "To rent an item on CurRENT:\n\n1. Browse the listings on Home and select the item you want to rent.\n2. Choose your rental dates on the calendar.\n3. Select an available Scheduled Delivery Time slot (10:00 AM–5:00 PM).\n4. Enter your delivery address.\n5. Complete your FPX payment if your Risk Score is 30–100, or submit a request to CurRENT for review if your score is 0–29.\n6. Your item will arrive at your selected Scheduled Delivery Time.",
    };
  }

  // 7. How is my risk score calculated? (Must match before general score / fees)
  if (
    [
      "how is my risk score calculated",
      "how is the risk score calculated",
      "how is my score calculated",
    ].includes(q)
  ) {
    return {
      answered: true,
      response:
        "Your Rental Risk Score starts at 80 after verification and changes based on your completed rentals:\n\n- +2 points: Complete a rental on time with no issues.\n- Late return: If the item is returned later than the scheduled return delivery time, 5 points will be deducted from your Rental Risk Score once the late return is confirmed.\n- −10 points: Confirmed minor damage.\n- −30 points: Confirmed serious damage or accidental loss.\n- Confirmed intentional fraud or theft: Permanent ban.\n\nOnly the single most serious confirmed outcome applies to each rental.",
    };
  }

  // 8. When will the lender receive rental money?
  if (
    [
      "when will the lender receive rental money",
      "when will the lender receive payment",
      "when does the lender get paid",
      "when will the lender get paid",
    ].includes(q)
  ) {
    return {
      answered: true,
      response:
        "The lender receives their rental payout once the rental has been successfully settled. The platform releases the payout at the same settlement stage when the security deposit is settled.\n\nNew rentals use a 13% commission, so the lender receives 87% of the rental fee. Historical bookings retain their original rate.",
    };
  }

  // 2. Fees & deposits
  if (
    [
      "fees & deposits",
      "fees and deposits",
      "how much does current charge in fees & deposits",
      "how much does current charge in fees and deposits",
    ].includes(q)
  ) {
    return {
      answered: true,
      responses: [
        "Fees\n\nHere are CurRENT's rental fees:\n\n- Renter service fee: 5% of the rental fee, with a minimum of RM5.\n- Lender commission: 13% of the rental fee for new bookings, deducted when a rental is completed.\n- Lender payout: The lender receives the remaining 87% of the rental fee. Historical bookings keep their original rate.",
        "Security deposits\n\nYour refundable security deposit is based on your Rental Risk Score and the item's estimated replacement value:\n\n- Low Risk (80–100): 5% of the item value, capped at RM500.\n- Medium Risk (40–79): 10% of the item value, capped at RM1,000.\n- High Risk (30–39): 15% of the item value, capped at RM1,500.\n- Very High Risk (0–29): You must submit a request to CurRENT for review instead of booking directly.\n\nAll rental payments and applicable security deposits are made through FPX (Demo) via an authorised payment provider.",
      ],
    };
  }

  if (q === "fees" || q === "rental fees") {
    return {
      answered: true,
      response:
        "Here are CurRENT's rental fees:\n\n- Renter service fee: 5% of the rental fee, with a minimum of RM5.\n- Lender commission: 13% of the rental fee for new bookings, deducted when a rental is completed.\n- Lender payout: The lender receives the remaining 87% of the rental fee. Historical bookings keep their original rate.",
    };
  }

  if (
    ["deposits", "deposit", "security deposits", "security deposit"].includes(q)
  ) {
    return {
      answered: true,
      response:
        "Your refundable security deposit is based on your Rental Risk Score and the item's estimated replacement value:\n\n- Low Risk (80–100): 5% of the item value, capped at RM500.\n- Medium Risk (40–79): 10% of the item value, capped at RM1,000.\n- High Risk (30–39): 15% of the item value, capped at RM1,500.\n- Very High Risk (0–29): You must submit a request to CurRENT for review instead of booking directly.\n\nAll rental payments and applicable security deposits are made through FPX (Demo) via an authorised payment provider.",
    };
  }

  // 3. Delivery & return
  if (
    [
      "delivery & return",
      "delivery and return",
      "how does delivery and return work",
      "how does delivery & return work",
    ].includes(q)
  ) {
    return {
      answered: true,
      response:
        "CurRENT is Delivery Only, so there is no physical pickup or in-person meeting.\n\n- Delivery: When your item arrives, open Rental Details and tap Confirm Received.\n- Return: When it is time to return the item, upload at least 6 photos and 1 video of its condition under Check-out, then tap Confirm Return.\n- Lender review: Once the lender receives the returned item and confirms that there is no damage, they select No Issue – End Rental. CurRENT then releases your security deposit.\n- If there is an issue: The lender can select Apply Dispute, and the deposit will remain on hold while CurRENT reviews the case.",
    };
  }

  // 5. Risk score
  if (
    [
      "risk score",
      "what are the risk score levels",
      "what are the risk bands",
    ].includes(q)
  ) {
    return {
      answered: true,
      response:
        "CurRENT's Rental Risk Score ranges from 0 to 100, with four risk levels:\n\n- Low Risk: 80–100\n- Medium Risk: 40–79\n- High Risk: 30–39\n- Very High Risk: 0–29\n\nUnverified users do not have a Rental Risk Score (N/A). Once verification is successfully completed, the user receives an initial score of 80 (Low Risk).",
    };
  }

  // 6. Disputes
  if (
    [
      "disputes",
      "how do disputes work",
      "how does the dispute process work",
    ].includes(q)
  ) {
    return {
      answered: true,
      response:
        "If an item arrives damaged, is not returned, or its condition is disputed, either party can report an issue through the relevant Condition Evidence section. The lender can also select Apply Dispute.\n\n- Filing a dispute places the rental under review and keeps the security deposit on hold.\n- CurRENT reviews the submitted condition photos, videos and other relevant information to determine liability.",
    };
  }

  return { answered: false };
}

export function transition(previous: Marketplace, action: Action): Marketplace {
  if (action.type === "resetDemoState") {
    const freshSeed = createSeed("admin_demo");
    freshSeed.currentUserId = "demo-renter";
    return freshSeed;
  }
  if (action.type === "setMode") {
    return createSeed(action.mode);
  }

  const state: Marketplace = JSON.parse(JSON.stringify(previous));
  const now = new Date().toISOString();
  const notify = (userId: string, title: string, bookingId?: string) =>
    state.notifications.unshift({
      id: newId(),
      userId,
      title,
      bookingId,
      read: false,
      createdAt: now,
    });

  if (action.type === "login") {
    requireThat(
      action.userId === null ||
        state.profiles.some((p) => p.id === action.userId),
      "Account not found.",
    );
    state.currentUserId = action.userId;
    return state;
  }

  if (action.type === "signup") {
    requireThat(
      action.profile.name.trim().length >= 2 &&
        /^\S+@\S+\.\S+$/.test(action.profile.email),
      "Enter your name and a valid email.",
    );
    requireThat(
      !state.profiles.some(
        (p) => p.email.toLowerCase() === action.profile.email.toLowerCase(),
      ),
      "An account already exists for this email.",
    );
    state.profiles.push(action.profile);
    state.currentUserId = action.profile.id;
    return state;
  }

  const user = state.profiles.find((p) => p.id === state.currentUserId);
  requireThat(user, "Sign in to continue.");

  const bookingFor = (id: string): Booking => {
    const b = state.bookings.find((b) => b.id === id);
    requireThat(
      b && [b.ownerId, b.renterId].includes(user.id),
      "Rental not found or access denied.",
    );
    return b;
  };

  switch (action.type) {
    case "settleOverdueObligation": {
      const targetUser = state.profiles.find((p) => p.id === action.userId);
      requireThat(targetUser, "User not found.");
      targetUser.hasOverdueObligation = false;
      notify(
        targetUser.id,
        "Simulated settlement complete. Outstanding damage obligation has been cleared. Booking privileges restored.",
      );
      break;
    }

    case "profile":
      requireThat(
        action.name.trim().length >= 2,
        "Enter a name with at least 2 characters.",
      );
      user.name = action.name.trim();
      user.avatar = action.avatar;
      break;

    case "saveDeliveryAddress": {
      const address = action.address;
      requireThat(
        [
          address.recipientName,
          address.phone,
          address.addressLine1,
          address.postcode,
          address.city,
          address.state,
        ].every((value) => value.trim().length > 0),
        "Complete the required delivery address fields before saving.",
      );
      const normalized: SavedDeliveryAddress = {
        recipientName: address.recipientName.trim(),
        phone: address.phone.trim(),
        addressLine1: address.addressLine1.trim(),
        addressLine2: address.addressLine2.trim(),
        postcode: address.postcode.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        instructions: address.instructions.trim(),
      };
      // Save alongside the account's other addresses rather than replacing them, so a
      // renter can keep several saved addresses with one account default.
      const addresses = user.savedDeliveryAddresses
        ? [...user.savedDeliveryAddresses]
        : [];
      let targetIndex: number;
      if (action.index !== undefined) {
        // Editing a specific saved address in place — never duplicates or reorders it.
        // Its default status is preserved unless the renter explicitly ticked the checkbox.
        requireThat(
          action.index >= 0 && action.index < addresses.length,
          "Saved address not found.",
        );
        addresses[action.index] = {
          ...normalized,
          isDefault: action.setDefault ?? addresses[action.index].isDefault,
        };
        targetIndex = action.index;
      } else {
        const existingIndex = addresses.findIndex(
          (saved) =>
            saved.addressLine1 === normalized.addressLine1 &&
            saved.addressLine2 === normalized.addressLine2 &&
            saved.postcode === normalized.postcode &&
            saved.city === normalized.city &&
            saved.state === normalized.state,
        );
        // Creating an address does not change the account default unless requested.
        const isDefault = !!action.setDefault;
        if (existingIndex >= 0) {
          addresses[existingIndex] = {
            ...normalized,
            isDefault: isDefault || !!addresses[existingIndex].isDefault,
          };
          targetIndex = existingIndex;
        } else {
          addresses.push({ ...normalized, isDefault });
          targetIndex = addresses.length - 1;
        }
      }
      if (addresses[targetIndex].isDefault) {
        addresses.forEach((saved, index) => {
          if (index !== targetIndex) addresses[index] = { ...saved, isDefault: false };
        });
      }
      user.savedDeliveryAddresses = addresses;
      const defaultIndex = addresses.findIndex((saved) => saved.isDefault);
      user.defaultDeliveryAddressIndex = defaultIndex >= 0 ? defaultIndex : undefined;
      user.savedDeliveryAddress = defaultIndex >= 0 ? addresses[defaultIndex] : undefined;
      break;
    }

    case "setDefaultDeliveryAddress": {
      const addresses = user.savedDeliveryAddresses
        ? [...user.savedDeliveryAddresses]
        : [];
      requireThat(
        action.index >= 0 && action.index < addresses.length,
        "Saved address not found.",
      );
      // A profile has one default address. Selecting another address for a booking
      // is handled separately by the listing screen.
      const makeDefault = action.isDefault ?? true;
      addresses.forEach((saved, index) => {
        if (index === action.index || (makeDefault && saved.isDefault)) {
          addresses[index] = { ...saved, isDefault: index === action.index ? makeDefault : false };
        }
      });
      user.savedDeliveryAddresses = addresses;
      const defaultIndex = addresses.findIndex((saved) => saved.isDefault);
      user.defaultDeliveryAddressIndex = defaultIndex >= 0 ? defaultIndex : undefined;
      user.savedDeliveryAddress = defaultIndex >= 0 ? addresses[defaultIndex] : undefined;
      break;
    }

    case "deleteDeliveryAddress": {
      const addresses = user.savedDeliveryAddresses || [];
      requireThat(
        action.index >= 0 && action.index < addresses.length,
        "Saved address not found.",
      );
      const remaining = addresses.filter((_, i) => i !== action.index);
      user.savedDeliveryAddresses = remaining;
      if (remaining.length === 0) {
        user.defaultDeliveryAddressIndex = undefined;
        user.savedDeliveryAddress = undefined;
      } else {
        const defaultIndex = remaining.findIndex((saved) => saved.isDefault);
        user.defaultDeliveryAddressIndex = defaultIndex >= 0 ? defaultIndex : undefined;
        user.savedDeliveryAddress = defaultIndex >= 0 ? remaining[defaultIndex] : undefined;
      }
      break;
    }

    case "verify":
      requireThat(
        (action.status === "pending" &&
          ["not_verified", "failed"].includes(user.verification)) ||
          (user.verification === "pending" &&
            ["verified", "failed"].includes(action.status)),
        "Verification cannot make that transition.",
      );
      user.verification = action.status;
      if (
        action.status === "verified" &&
        (user.riskScore === undefined || user.riskScore === null)
      ) {
        user.riskScore = 80;
        user.riskLevel = "low";
      }
      state.listings
        .filter((l) => l.ownerId === user.id)
        .forEach((l) => {
          l.verifiedOwner = action.status === "verified";
        });
      notify(
        user.id,
        `Demo identity verification: ${action.status.replace("_", " ")}.`,
      );
      break;

    case "favourite":
      requireThat(
        state.listings.some((l) => l.id === action.listingId),
        "Item not found.",
      );
      user.favourites = user.favourites.includes(action.listingId)
        ? user.favourites.filter((id) => id !== action.listingId)
        : [...user.favourites, action.listingId];
      break;

    case "openChat": {
      const listing = state.listings.find((item) => item.id === action.listingId && item.status === "published");
      requireThat(listing, "Listing is unavailable.");
      requireThat(listing.ownerId !== user.id, "You cannot message yourself.");
      state.chatConversations ||= [];
      if (!state.chatConversations.some((chat) => chat.listingId === listing.id && chat.renterId === user.id && chat.ownerId === listing.ownerId)) {
        state.chatConversations.push({ id: `chat-${newId()}`, listingId: listing.id, renterId: user.id, ownerId: listing.ownerId, createdAt: now });
      }
      break;
    }

    case "sendChat": {
      const chat = state.chatConversations?.find((item) => item.id === action.conversationId);
      requireThat(chat && [chat.renterId, chat.ownerId].includes(user.id), "Conversation unavailable.");
      requireThat(!state.messages.some((message) => message.id === action.id), "Message already sent.");
      requireThat((action.text.trim().length > 0 || !!action.imageUri) && action.text.length <= 2000, "Enter a message of up to 2,000 characters or attach an image.");
      state.messages.push({ id: action.id, conversationId: chat.id, authorId: user.id,
        text: action.text.trim(), imageUri: action.imageUri, createdAt: now });
      state.notifications.unshift({ id: newId(), userId: user.id === chat.ownerId ? chat.renterId : chat.ownerId,
        title: `${user.name} sent you a message.`, conversationId: chat.id, read: false, createdAt: now });
      break;
    }

    case "readChat": {
      const chat = state.chatConversations?.find((item) => item.id === action.conversationId);
      requireThat(chat && [chat.renterId, chat.ownerId].includes(user.id), "Conversation unavailable.");
      state.messages.filter((message) => message.conversationId === chat.id && message.authorId !== user.id)
        .forEach((message) => { message.read = true; });
      state.notifications.filter((notice) => notice.conversationId === chat.id && notice.userId === user.id)
        .forEach((notice) => { notice.read = true; });
      break;
    }

    case "saveListing": {
      requireVerifiedListingAccount(user);
      const l = action.listing;
      const existing = state.listings.find((i) => i.id === l.id);
      requireThat(
        l.ownerId === user.id && (!existing || existing.ownerId === user.id),
        "Only the owner can edit this item.",
      );
      requireThat(
        !["published", "paused"].includes(l.status) ||
          state.mode === "admin_demo" ||
          (existing && ["published", "paused"].includes(existing.status)),
        "Submit this listing for CurRENT review before it can go live.",
      );
      requireThat(
        l.title.trim().length >= 3 &&
          l.description.trim().length >= 10 &&
          l.location.trim() &&
          l.category,
        "Add a title, description (10+ characters), category and location.",
      );
      requireThat(
        Number.isFinite(l.dailyPrice) &&
          l.dailyPrice > 0 &&
          (l.estimatedValue === undefined ||
            (Number.isFinite(l.estimatedValue) && l.estimatedValue > 0)),
        "Daily rental price must be positive and any configured platform valuation must be valid.",
      );
      requireThat(
        !["published", "pending_review"].includes(l.status) ||
          (state.mode === "admin_demo"
            ? (l.id === "sony-a7iii" &&
                l.images &&
                l.images.length >= 4 &&
                l.videos &&
                l.videos.length >= 1) ||
              (Array.isArray(l.images) &&
                Array.isArray(l.videos) &&
                l.images.length === 0 &&
                l.videos.length === 0) ||
              (l.images &&
                l.images.length >= 6 &&
                l.videos &&
                l.videos.length >= 1)
            : l.id === "sony-a7iii"
            ? l.images &&
              l.images.length >= 4 &&
              l.videos &&
              l.videos.length >= 1
            : l.images &&
              l.images.length >= 6 &&
              l.videos &&
              l.videos.length >= 1),
        "Add at least 6 photos and 1 video before publishing.",
      );
      requireThat(
        !["published", "pending_review"].includes(l.status) || user.verification === "verified",
        "Complete demo identity verification before publishing.",
      );
      l.collectionMethods = ["Delivery Only"];
      if (l.availableFrom) parseDate(l.availableFrom);
      if (l.availableTo) parseDate(l.availableTo);
      requireThat(
        [l.availableFrom, l.availableTo, ...(l.availabilityPeriods || []).flatMap((p) => [p.start, p.end])]
          .every((date) => !date || (parseDate(date), (state.mode === "admin_demo" && l.ownerId === "demo-renter") || date <= "2026-12-31")),
        "Availability must end by 31 December 2026.",
      );
      requireThat(
        !l.availableFrom || !l.availableTo || l.availableTo >= l.availableFrom,
        "Availability end must be on or after the start.",
      );
      l.verifiedOwner = user.verification === "verified";
      state.listings = existing
        ? state.listings.map((i) => (i.id === l.id ? l : i))
        : [l, ...state.listings];
      break;
    }

    case "deleteListing":
      requireVerifiedListingAccount(user);
      requireThat(
        state.listings.some((l) => l.id === action.id && l.ownerId === user.id),
        "Only the owner can delete this item.",
      );
      requireThat(
        !state.bookings.some(
          (b) =>
            b.listingId === action.id &&
            !["completed", "cancelled", "rejected"].includes(b.status),
        ),
        "Finish or cancel outstanding rentals before deleting this item.",
      );
      state.listings = state.listings.filter((l) => l.id !== action.id);
      break;

    case "boostListing": {
      requireVerifiedListingAccount(user);
      const listing = state.listings.find((l) => l.id === action.listingId);
      requireThat(listing, "Listing not found.");
      requireThat(
        listing.ownerId === user.id,
        "Only the owner can boost this listing.",
      );
      requireThat(
        listing.status === "published",
        "Only published listings can be boosted.",
      );
      requireThat(!listing.featuredUntil || Date.parse(listing.featuredUntil) <= Date.now(), "This listing is already boosted.");
      requireThat(!state.boostTransactions?.some((record) => record.id === action.transactionId), "Payment already recorded.");
      const expiresAt = new Date(Date.now() + LENDER_BOOST_DAYS * 86400000).toISOString();
      listing.featuredUntil = expiresAt;
      state.boostTransactions ||= [];
      state.boostTransactions.unshift({
        id: action.transactionId,
        ownerId: user.id,
        listingId: listing.id,
        listingName: listing.title,
        paidAt: now,
        activatedAt: now,
        expiresAt,
        amount: LENDER_BOOST_FEE,
      });
      notify(
        user.id,
        `Listing boosted! "${listing.title}" is now featured for ${LENDER_BOOST_DAYS} days (RM${LENDER_BOOST_FEE.toFixed(2)} demo fee).`,
      );
      break;
    }

    case "recordRentalOutcome": {
      const renter = state.profiles.find((p) => p.id === action.renterId);
      requireThat(renter, "Renter not found.");
      const evaluation = evaluateRentalOutcome(action.rawIncidents);
      const scoreBefore = renter.riskScore ?? 80;
      const scoreAfter = Math.max(
        0,
        Math.min(100, scoreBefore + evaluation.effectiveAdjustment),
      );
      renter.riskScore = scoreAfter;
      renter.riskLevel = tierForScore(scoreAfter).level;
      if (evaluation.isBanned) {
        renter.isBanned = true;
      }
      if (!renter.riskHistory) {
        renter.riskHistory = [];
      }
      renter.riskHistory.unshift({
        id: newId(),
        bookingId: action.bookingId,
        itemTitle: action.itemTitle,
        date: new Date().toISOString().slice(0, 10),
        incidents: evaluation.incidents,
        effectiveAdjustment: evaluation.effectiveAdjustment,
        scoreBefore,
        scoreAfter,
        appealStatus: "none",
      });
      notify(
        renter.id,
        `Rental outcome recorded for ${action.itemTitle}: ${evaluation.effectiveAdjustment >= 0 ? "+" : ""}${evaluation.effectiveAdjustment} points. New score: ${scoreAfter}.`,
      );
      break;
    }

    case "startDeliveryCheckout": {
      const listing = state.listings.find((item) => item.id === action.listingId);
      requireThat(listing && listing.status === "published", "This listing is not available.");
      requireThat(listing.ownerId !== user.id, "You cannot rent your own item.");
      requireThat(user.verification === "verified" && !user.isBanned && !user.hasOverdueObligation,
        "Complete identity verification and resolve account restrictions before booking.");
      requireThat((riskFor(state, user).score ?? 0) >= 30, "This rental requires CurRENT platform review.");
      requireThat(action.deliveryAddress.trim().length > 0, "Enter a delivery destination.");
      // Explicit, user-facing cross-state eligibility check — the actual booking-validation gate,
      // not just a frontend warning. Must run BEFORE any delivery quote is computed: a restricted
      // or incompletely-described listing can still have a parcel small enough for the Domestic
      // Courier to happily quote it (that was the bug — this check previously only ran when NO
      // quote resolved at all, so a normally-sized restricted item like the Standing Air Cooler
      // sailed straight through on the courier quote). Only applies once the postcodes actually
      // resolve to two different Malaysian states — a same-state route that simply falls outside
      // GrabExpress's pricing brackets still falls through to the normal courier quote below.
      {
        const route = estimatePostcodeDistance(listing.pickupPostcode, action.deliveryPostcode);
        if (route && route.pickup.state.trim().toLowerCase() !== route.delivery.state.trim().toLowerCase()) {
          const eligibility = crossStateDeliveryEligibility(listing);
          if (eligibility === "same_state_only" || eligibility === "requires_review") {
            requireThat(false, CROSS_STATE_BOOKING_WARNING[eligibility].body);
          }
        }
      }
      const parcel = { weightKg: listing.parcelWeightKg, dimensionsCm: listing.parcelDimensionsCm, requirement: listing.deliveryRequirement,
        title: listing.title, category: listing.category, description: listing.description };
      const outboundEstimate = quoteAutomaticVehicleDelivery({ pickupPostcode: listing.pickupPostcode, deliveryPostcode: action.deliveryPostcode, ...parcel });
      const returnEstimate = quoteAutomaticVehicleDelivery({ pickupPostcode: action.deliveryPostcode, deliveryPostcode: listing.pickupPostcode, ...parcel });
      // GrabExpress covers same-state routes; otherwise fall back to the Domestic Courier
      // (cross-state) quote before giving up with "Delivery estimate unavailable".
      const courierParcel = { pickupPostcode: listing.pickupPostcode, deliveryPostcode: action.deliveryPostcode,
        weightKg: listing.parcelWeightKg, dimensionsCm: listing.parcelDimensionsCm, packages: listing.parcelPackages };
      const courierOutbound = !outboundEstimate ? quoteAutomaticDomesticCourier(courierParcel) : null;
      const courierReturn = !returnEstimate ? quoteAutomaticDomesticCourier({ ...courierParcel,
        pickupPostcode: action.deliveryPostcode, deliveryPostcode: listing.pickupPostcode }) : null;
      const isCourier = !outboundEstimate && !!courierOutbound;
      requireThat((outboundEstimate && returnEstimate) || (courierOutbound && courierReturn),
        "Delivery estimate unavailable. Check the pickup and delivery postcodes and route.");
      requireThat(!state.bookings.some((booking) => booking.id === action.id), "This checkout already exists.");
      requireThat(!state.bookings.some((booking) => booking.listingId === action.listingId &&
        booking.renterId === user.id && booking.start === action.start && booking.end === action.end &&
        booking.status === "payment_required"), "Resume your existing checkout for these dates.");
      availability(state, listing, action.start, action.end);
      const quote = quoteFor(state, user, listing, action.start, action.end);
      const courierReturnDispatchDate = action.end.slice(0, 10);
      const deliveryDemo = isCourier
        ? (() => {
            const twoWayFee = Math.round((courierOutbound!.fee + courierReturn!.fee) * 100) / 100;
            // CurRENT recommends both dates automatically — the renter never schedules the
            // lender's courier pickup directly. Outbound dispatch is computed early enough that
            // the slowest-case transit estimate still arrives on/before the rental start date;
            // return is a courier branch drop-off, defaulting to the rental's own end date. The
            // lender confirms the outbound arrangement via the separate confirmOutboundDispatch
            // action. When the zone has no reliable published transit reference (East Malaysia),
            // dispatchDate/estimated ranges stay unset rather than inventing a figure — the UI
            // shows "Delivery Timing Confirmation Required" and the lender proposes a date instead.
            const dispatchDate = recommendDispatchDate(action.start, courierOutbound!.zone);
            if (dispatchDate) {
              requireThat(isDispatchDateFeasible(dispatchDate, now.slice(0, 10)),
                "Selected Rental Dates Unavailable for Courier Delivery — your selected rental start date does not allow sufficient estimated shipping time. Please choose a later rental date.");
            }
            const returnDispatchDate = courierReturnDispatchDate;
            const hasEstimate = hasReliableCourierTransitEstimate(courierOutbound!.zone);
            const transit = hasEstimate ? estimatedCourierTransitDays(courierOutbound!.zone) : null;
            return {
              provider: DOMESTIC_COURIER_NAME as "J&T Express (Demo)", origin: listing.location,
              destination: action.deliveryAddress, fee: twoWayFee, status: "required" as const,
              outboundFee: courierOutbound!.fee, returnFee: courierReturn!.fee,
              shippingZone: courierOutbound!.zone, chargeableWeightKg: courierOutbound!.chargeableWeightKg,
              volumetricWeightKg: courierOutbound!.volumetricWeightKg,
              dispatchDate: dispatchDate ?? undefined,
              estimatedDeliveryRangeStart: dispatchDate && transit ? addDaysToDateString(dispatchDate, transit.min) : undefined,
              estimatedDeliveryRangeEnd: dispatchDate && transit ? addDaysToDateString(dispatchDate, transit.max) : undefined,
              returnDispatchDeadline: returnDispatchDate,
              estimatedReturnRangeStart: transit ? addDaysToDateString(returnDispatchDate, transit.min) : undefined,
              estimatedReturnRangeEnd: transit ? addDaysToDateString(returnDispatchDate, transit.max) : undefined,
              pricingReference: courierOutbound!.reference,
              outboundDispatchStatus: "awaiting_lender_confirmation" as const,
            };
          })()
        : (() => {
            requireThat(action.returnPickupTime && action.returnPickupTime.trim().length > 0,
              "Select a scheduled return pickup time.");
            // Combined two-way (outbound + return) delivery fee: each leg calculated separately
            // with the same automatic postcode-distance formula, never assumed equal without calculating it.
            const twoWayFee = Math.round((outboundEstimate!.fee + returnEstimate!.fee) * 100) / 100;
            return {
              provider: "GrabExpress (Simulation)" as const, origin: listing.location,
              destination: action.deliveryAddress, fee: twoWayFee, status: "required" as const,
              outboundFee: outboundEstimate!.fee, returnFee: returnEstimate!.fee,
              area: outboundEstimate!.area, vehicle: outboundEstimate!.vehicle,
              weightKg: listing.parcelWeightKg, dimensionsCm: listing.parcelDimensionsCm,
              distanceKm: outboundEstimate!.distanceKm, baseFare: outboundEstimate!.baseFare,
              distanceCharge: outboundEstimate!.distanceCharge, minimumFare: outboundEstimate!.minimumFare,
              pricingReference: outboundEstimate!.reference,
            };
          })();
      state.bookings.unshift({
        id: action.id, listingId: listing.id, title: listing.title, image: listing.imageUrl,
        ownerId: listing.ownerId, renterId: user.id, start: action.start, end: action.end,
        scheduledPickup: action.start, scheduledReturn: action.end,
        returnPickupTime: isCourier ? undefined : action.returnPickupTime,
        returnDispatchDate: isCourier ? courierReturnDispatchDate : undefined,
        durationMinutes: calculateDurationMinutes(action.start, action.end),
        cancellationCutoff: calculateCancellationCutoff(action.start),
        collectionMethod: "Delivery Only", deliveryAddress: action.deliveryAddress,
        deliveryAddressDetails: action.deliveryAddressDetails,
        deliveryPostcode: action.deliveryPostcode,
        status: "payment_required", quote,
        commissionRate: CURRENT_LENDER_COMMISSION_RATE,
        riskScore: riskFor(state, user).score ?? 80,
        payment: "required", deposit: "required", createdAt: now,
        contextMode: state.mode || "normal",
        deliveryDemo,
      });
      break;
    }

    case "correctBookingDeliveryAddress": {
      const booking = bookingFor(action.bookingId);
      requireThat(booking.renterId === user.id, "Only the renter can correct the delivery destination.");
      requireThat(!booking.deliveryDemo || booking.deliveryDemo.status === "required",
        "A paid delivery address and charge cannot be changed.");
      const listing = state.listings.find((item) => item.id === booking.listingId);
      requireThat(listing?.pickupPostcode, "The lender must add a valid pickup postcode first.");
      requireThat(action.deliveryAddress.trim().length > 0, "Enter a delivery address.");
      // Same cross-state eligibility gate as startDeliveryCheckout — editing the delivery address
      // on an existing (unpaid) booking must not be a way to bypass the restriction.
      {
        const route = estimatePostcodeDistance(listing.pickupPostcode, action.deliveryPostcode);
        if (route && route.pickup.state.trim().toLowerCase() !== route.delivery.state.trim().toLowerCase()) {
          const eligibility = crossStateDeliveryEligibility(listing);
          if (eligibility === "same_state_only" || eligibility === "requires_review") {
            requireThat(false, CROSS_STATE_BOOKING_WARNING[eligibility].body);
          }
        }
      }
      const parcel = { weightKg: listing.parcelWeightKg, dimensionsCm: listing.parcelDimensionsCm, requirement: listing.deliveryRequirement,
        title: listing.title, category: listing.category, description: listing.description };
      const outbound = quoteAutomaticVehicleDelivery({ pickupPostcode: listing.pickupPostcode, deliveryPostcode: action.deliveryPostcode, ...parcel });
      const inbound = quoteAutomaticVehicleDelivery({ pickupPostcode: action.deliveryPostcode, deliveryPostcode: listing.pickupPostcode, ...parcel });
      const courierParcel = { pickupPostcode: listing.pickupPostcode, deliveryPostcode: action.deliveryPostcode,
        weightKg: listing.parcelWeightKg, dimensionsCm: listing.parcelDimensionsCm, packages: listing.parcelPackages };
      const courierOutbound = !outbound ? quoteAutomaticDomesticCourier(courierParcel) : null;
      const courierInbound = !inbound ? quoteAutomaticDomesticCourier({ ...courierParcel,
        pickupPostcode: action.deliveryPostcode, deliveryPostcode: listing.pickupPostcode }) : null;
      requireThat((outbound && inbound) || (courierOutbound && courierInbound),
        "A valid local pickup/delivery route or domestic courier route is required.");
      booking.deliveryAddress = action.deliveryAddress.trim();
      booking.deliveryPostcode = action.deliveryPostcode.trim();
      if (booking.deliveryDemo?.status === "required") {
        booking.deliveryDemo.origin = listing.location;
        booking.deliveryDemo.destination = booking.deliveryAddress;
        if (outbound && inbound) {
          booking.deliveryDemo.provider = "GrabExpress (Simulation)";
          booking.deliveryDemo.outboundFee = outbound.fee;
          booking.deliveryDemo.returnFee = inbound.fee;
          booking.deliveryDemo.fee = Math.round((outbound.fee + inbound.fee) * 100) / 100;
          booking.deliveryDemo.distanceKm = outbound.distanceKm;
          booking.deliveryDemo.baseFare = outbound.baseFare;
          booking.deliveryDemo.distanceCharge = outbound.distanceCharge;
          booking.deliveryDemo.minimumFare = outbound.minimumFare;
          booking.deliveryDemo.area = outbound.area;
          booking.deliveryDemo.vehicle = outbound.vehicle;
          booking.deliveryDemo.pricingReference = outbound.reference;
          // Switching from a courier route to a local one: the hourly return slot takes over
          // from the courier's return dispatch date, which no longer applies.
          booking.returnDispatchDate = undefined;
        } else if (courierOutbound && courierInbound) {
          booking.deliveryDemo.provider = "J&T Express (Demo)";
          booking.deliveryDemo.outboundFee = courierOutbound.fee;
          booking.deliveryDemo.returnFee = courierInbound.fee;
          booking.deliveryDemo.fee = Math.round((courierOutbound.fee + courierInbound.fee) * 100) / 100;
          booking.deliveryDemo.shippingZone = courierOutbound.zone;
          booking.deliveryDemo.chargeableWeightKg = courierOutbound.chargeableWeightKg;
          booking.deliveryDemo.volumetricWeightKg = courierOutbound.volumetricWeightKg;
          booking.deliveryDemo.pricingReference = courierOutbound.reference;
          // Switching from a local route to a courier one: the hourly return slot no longer
          // applies. The renter re-selects a return dispatch date before paying.
          booking.returnPickupTime = undefined;
        }
      }
      break;
    }

    case "payDeliveryDemo": {
      const booking = bookingFor(action.bookingId);
      requireThat(booking.renterId === user.id && booking.status === "payment_required",
        "Only the renter can complete this delivery demo checkout.");
      requireThat(booking.deliveryDemo, "This booking has no delivery checkout.");
      if (booking.deliveryDemo.status === "paid_demo") break;
      requireThat(booking.deliveryDemo.status === "required", "This delivery checkout is no longer payable.");
      const listing = state.listings.find((item) => item.id === booking.listingId);
      const currentQuote = deriveDisplayDelivery({
        collectionMethod: booking.collectionMethod,
        deliveryDemo: booking.deliveryDemo,
        pickupLocation: listing?.privateMeetingVenue || listing?.location || booking.deliveryDemo.origin,
        deliveryAddress: booking.deliveryAddress,
        pickupPostcode: listing?.pickupPostcode,
        deliveryPostcode: booking.deliveryPostcode,
        parcelWeightKg: listing?.parcelWeightKg,
        parcelDimensionsCm: listing?.parcelDimensionsCm,
        parcelPackages: listing?.parcelPackages,
        deliveryRequirement: listing?.deliveryRequirement,
        title: listing?.title,
        category: listing?.category,
        description: listing?.description,
        demoBooking: booking.contextMode === "admin_demo" && booking.id.startsWith("demo-"),
        listingId: booking.listingId,
      });
      requireThat(currentQuote.estimatedTwoWayFee != null && currentQuote.estimatedOutboundFee != null && currentQuote.estimatedReturnFee != null,
        "A valid pickup and delivery postcode are required before delivery payment.");
      booking.deliveryDemo.origin = currentQuote.origin;
      booking.deliveryDemo.destination = currentQuote.destination;
      if (currentQuote.method === "Domestic Courier (Demo)") {
        booking.deliveryDemo.provider = DOMESTIC_COURIER_NAME;
        booking.deliveryDemo.shippingZone = currentQuote.shippingZone ?? undefined;
        booking.deliveryDemo.chargeableWeightKg = currentQuote.chargeableWeightKg ?? undefined;
        booking.deliveryDemo.volumetricWeightKg = currentQuote.volumetricWeightKg ?? undefined;
        booking.deliveryDemo.pricingReference = quoteAutomaticDomesticCourier({
          pickupPostcode: listing?.pickupPostcode, deliveryPostcode: booking.deliveryPostcode,
          weightKg: listing?.parcelWeightKg, dimensionsCm: listing?.parcelDimensionsCm,
          packages: listing?.parcelPackages,
        })?.reference;
      } else {
        booking.deliveryDemo.distanceKm = currentQuote.distanceKm ?? undefined;
        booking.deliveryDemo.area = currentQuote.area ?? undefined;
        booking.deliveryDemo.vehicle = currentQuote.vehicle ?? undefined;
        booking.deliveryDemo.weightKg = listing?.parcelWeightKg;
        booking.deliveryDemo.dimensionsCm = listing?.parcelDimensionsCm;
        booking.deliveryDemo.baseFare = currentQuote.baseFare ?? undefined;
        booking.deliveryDemo.distanceCharge = currentQuote.distanceCharge ?? undefined;
        booking.deliveryDemo.minimumFare = currentQuote.minimumFare ?? undefined;
        booking.deliveryDemo.pricingReference = quoteAutomaticVehicleDelivery({
          pickupPostcode: listing?.pickupPostcode, deliveryPostcode: booking.deliveryPostcode,
          weightKg: listing?.parcelWeightKg, dimensionsCm: listing?.parcelDimensionsCm,
          requirement: listing?.deliveryRequirement,
          title: listing?.title, category: listing?.category, description: listing?.description,
        })?.reference;
      }
      booking.deliveryDemo.outboundFee = currentQuote.estimatedOutboundFee;
      booking.deliveryDemo.returnFee = currentQuote.estimatedReturnFee;
      booking.deliveryDemo.fee = currentQuote.estimatedTwoWayFee;
      booking.deliveryDemo.status = "paid_demo";
      booking.deliveryDemo.receiptReference = action.receiptReference;
      booking.deliveryDemo.paidAt = now;
      const delivery = booking.deliveryDemo;
      if (!state.deliveryHistory?.some((record) => record.bookingId === booking.id)) {
        state.deliveryHistory = [{
          id: action.receiptReference, renterId: user.id, bookingId: booking.id,
          itemTitle: booking.title, origin: delivery.origin, destination: delivery.destination,
          area: delivery.area || "Historical demo", distanceKm: delivery.distanceKm || 0,
          vehicle: delivery.vehicle || "Motorcycle", weightKg: delivery.weightKg || 0,
          dimensionsCm: delivery.dimensionsCm || { length: 0, width: 0, height: 0 },
          baseFare: delivery.baseFare ?? delivery.fee, distanceCharge: delivery.distanceCharge ?? 0,
          minimumFare: delivery.minimumFare ?? delivery.fee, fee: delivery.fee,
          pricingReference: delivery.pricingReference || "Earlier CurRENT demo quote",
          paidAt: now, sample: false, status: "paid_demo",
        }, ...(state.deliveryHistory || [])];
      }
      break;
    }

    case "confirmOutboundDispatch": {
      const booking = bookingFor(action.bookingId);
      requireThat(booking.ownerId === user.id, "Only the lender can confirm the outbound dispatch arrangement.");
      requireThat(getEffectiveBookingStatus(booking) === "upcoming",
        "The outbound dispatch arrangement can only be confirmed before the rental starts.");
      requireThat(booking.deliveryDemo?.provider === DOMESTIC_COURIER_NAME && booking.deliveryDemo.status === "paid_demo",
        "This booking has no paid Domestic Courier delivery to confirm.");
      const delivery = booking.deliveryDemo;
      const hasEstimate = hasReliableCourierTransitEstimate(delivery.shippingZone!);
      if (action.decision === "accept") {
        delivery.outboundDispatchStatus = "confirmed";
        delivery.outboundTrackingRef = delivery.outboundTrackingRef || `DEMO-JT-OUT-${booking.id.toUpperCase()}`;
        booking.lenderOutboundDispatchConfirmedAt = now;
        notify(booking.renterId, `Lender confirmed the outbound dispatch arrangement for ${booking.title}.`, booking.id);
      } else if (action.decision === "dropoff") {
        delivery.outboundDispatchStatus = "drop_off";
        delivery.outboundTrackingRef = delivery.outboundTrackingRef || `DEMO-JT-OUT-${booking.id.toUpperCase()}`;
        booking.lenderOutboundDispatchConfirmedAt = now;
        notify(booking.renterId, `Lender will prepare the item for courier branch drop-off for ${booking.title}.`, booking.id);
      } else {
        requireThat(action.proposedDate && action.proposedDate.trim().length > 0, "Enter a proposed dispatch date.");
        const proposedDate = action.proposedDate!;
        delivery.lenderProposedDispatchDate = proposedDate;
        // Without a reliable published transit reference for this zone (East Malaysia), CurRENT
        // can't check compatibility against the rental start — the lender's proposal always
        // requires renter approval rather than silently guessing it's fine.
        const stillCompatible = hasEstimate &&
          addDaysToDateString(proposedDate, estimatedCourierTransitDays(delivery.shippingZone!).max) <= booking.start.slice(0, 10);
        if (stillCompatible) {
          // The proposed date still lands on/before the rental's own start date — auto-confirm,
          // no renter approval needed, since nothing about the agreed rental is affected.
          const transit = estimatedCourierTransitDays(delivery.shippingZone!);
          delivery.outboundDispatchStatus = "confirmed";
          delivery.dispatchDate = proposedDate;
          delivery.estimatedDeliveryRangeStart = addDaysToDateString(proposedDate, transit.min);
          delivery.estimatedDeliveryRangeEnd = addDaysToDateString(proposedDate, transit.max);
          delivery.requiresRenterDispatchApproval = false;
          delivery.outboundTrackingRef = delivery.outboundTrackingRef || `DEMO-JT-OUT-${booking.id.toUpperCase()}`;
          booking.lenderOutboundDispatchConfirmedAt = now;
          notify(booking.renterId, `Lender rescheduled the outbound dispatch for ${booking.title}; still arrives before your rental starts.`, booking.id);
        } else {
          delivery.outboundDispatchStatus = "proposed_alternate";
          delivery.requiresRenterDispatchApproval = true;
          notify(booking.renterId, `Lender proposed a dispatch date for ${booking.title} that needs your approval — please review.`, booking.id);
        }
      }
      break;
    }

    case "respondToDispatchProposal": {
      const booking = bookingFor(action.bookingId);
      requireThat(booking.renterId === user.id, "Only the renter can respond to a proposed dispatch date.");
      requireThat(booking.deliveryDemo?.requiresRenterDispatchApproval,
        "There is no proposed dispatch date awaiting your approval.");
      const delivery = booking.deliveryDemo;
      if (action.approve) {
        const proposedDate = delivery.lenderProposedDispatchDate!;
        delivery.outboundDispatchStatus = "confirmed";
        delivery.dispatchDate = proposedDate;
        if (hasReliableCourierTransitEstimate(delivery.shippingZone!)) {
          const transit = estimatedCourierTransitDays(delivery.shippingZone!);
          delivery.estimatedDeliveryRangeStart = addDaysToDateString(proposedDate, transit.min);
          delivery.estimatedDeliveryRangeEnd = addDaysToDateString(proposedDate, transit.max);
        }
        delivery.requiresRenterDispatchApproval = false;
        delivery.outboundTrackingRef = delivery.outboundTrackingRef || `DEMO-JT-OUT-${booking.id.toUpperCase()}`;
        booking.lenderOutboundDispatchConfirmedAt = booking.lenderOutboundDispatchConfirmedAt || now;
        notify(booking.ownerId, `Renter approved the proposed dispatch date for ${booking.title}.`, booking.id);
      } else {
        delivery.requiresRenterDispatchApproval = false;
        notify(booking.ownerId, `Renter declined the proposed dispatch date for ${booking.title}. Message them to agree a new arrangement, or they may cancel the booking.`, booking.id);
      }
      break;
    }

    case "completeRentalCheckout": {
      const booking = bookingFor(action.bookingId);
      requireThat(booking.renterId === user.id && booking.status === "payment_required" && booking.payment === "required",
        "This rental checkout is unavailable or already completed.");
      requireThat(booking.collectionMethod === "Self-Pickup" || booking.deliveryDemo?.status === "paid_demo",
        "Complete the separate delivery demo payment before the rental payment.");
      const listing = state.listings.find((item) => item.id === booking.listingId);
      requireThat(listing, "This listing is no longer available.");
      availability(state, listing, booking.start, booking.end, booking.id);
      const insuranceSelected = !!action.insuranceSelected;
      // Recompute the quote at payment time so the chosen Rental Protection premium (if any) is
      // reflected in quote.protection/quote.total. The deposit and service fee calculations are untouched.
      booking.quote = quoteFor(state, user, listing, booking.start, booking.end, insuranceSelected);
      booking.insurance = insuranceSelected
        ? { selected: true, premium: booking.quote.protection, referralIncome: 0 }
        : null;
      booking.status = "upcoming";
      booking.payment = "paid";
      booking.deposit = "held";
      booking.paymentMethod = action.paymentMethod;
      notify(booking.ownerId, `New booking confirmed: ${user.name} rented ${booking.title}.`, booking.id);
      notify(user.id, `Booking confirmed (Demo) for ${booking.title}. Total: RM${booking.quote.total.toFixed(2)}.`, booking.id);
      break;
    }

    case "cancelDeliveryCheckout": {
      const booking = bookingFor(action.bookingId);
      requireThat(booking.renterId === user.id && booking.status === "payment_required",
        "Only the renter can cancel an unfinished checkout.");
      booking.status = "cancelled";
      booking.cancelledAt = now;
      booking.cancelledById = user.id;
      // Delivery refunds are the delivery company's responsibility, not CurRENT's — a cancelled
      // rental never by itself means GrabExpress/J&T Express has approved or completed a refund.
      // A prepaid delivery fee here stays recorded as "paid_demo"; services/delivery.ts
      // deriveDeliveryRefundStatus() reports it as refund-eligibility-pending for display (the
      // outbound courier/vehicle was never dispatched, since the rental itself was never
      // confirmed), not as an already-completed refund.
      break;
    }

    case "instantBook": {
      const listing = state.listings.find((l) => l.id === action.listingId);
      requireThat(listing, "Listing not found.");
      requireThat(
        !user.isBanned,
        "This account is banned from booking due to confirmed fraudulent activity.",
      );
      requireThat(
        !user.hasOverdueObligation,
        "You have an outstanding damage obligation. Direct rental requests are restricted.",
      );
      requireThat(
        user.id !== listing.ownerId,
        "You cannot rent your own item.",
      );
      requireThat(
        user.verification === "verified",
        "Complete demo identity verification in Profile before booking a rental.",
      );
      const risk = riskFor(state, user);
      requireThat(
        (risk.score ?? 0) >= 30,
        "Rental Risk Score below 30 requires CurRENT Platform Review. Direct checkout is not permitted.",
      );
      availability(state, listing, action.start, action.end);
      const collectionMethod = "Delivery Only";
      requireThat(
        action.deliveryAddress && action.deliveryAddress.trim().length > 0,
        "Enter a delivery destination before confirming this booking.",
      );

      const durMinutes = calculateDurationMinutes(action.start, action.end);
      const cutoff = calculateCancellationCutoff(action.start);
      const quote = quoteFor(state, user, listing, action.start, action.end);

      const newBooking: Booking = {
        id: action.id,
        listingId: listing.id,
        title: listing.title,
        image: listing.imageUrl,
        ownerId: listing.ownerId,
        renterId: user.id,
        start: action.start,
        end: action.end,
        scheduledPickup: action.start,
        scheduledReturn: action.end,
        durationMinutes: durMinutes,
        cancellationCutoff: cutoff,
        collectionMethod,
        deliveryAddress: action.deliveryAddress,
        status: "upcoming",
        quote,
        commissionRate: CURRENT_LENDER_COMMISSION_RATE,
        riskScore: risk.score ?? 80,
        payment: "paid",
        deposit: "held",
        paymentMethod: action.paymentMethod || "Demo FPX",
        createdAt: now,
        contextMode: state.mode || "normal",
      };
      state.bookings.unshift(newBooking);

      notify(
        listing.ownerId,
        `New booking confirmed: ${user.name} rented ${listing.title}.`,
        action.id,
      );
      notify(
        user.id,
        `Booking confirmed (Demo) for ${listing.title}. Total: RM${quote.total.toFixed(2)}.`,
        action.id,
      );
      break;
    }

    case "requestPlatformReview": {
      const listing = state.listings.find((l) => l.id === action.listingId);
      requireThat(listing, "Listing not found.");
      requireThat(
        user.verification === "verified",
        "Complete demo identity verification before requesting review.",
      );
      const risk = riskFor(state, user);
      requireThat(
        (risk.score ?? 0) < 30,
        "Platform review request is exclusively for Very High Risk scores (0–29).",
      );
      requireThat(
        action.start <= "2026-12-31" && action.end <= "2026-12-31",
        "Rental requests must end by 31 December 2026.",
      );
      if (!state.platformReviewRequests) state.platformReviewRequests = [];
      const reqId = action.id || `REQ-${newId().slice(0, 8).toUpperCase()}`;
      if (state.platformReviewRequests.some((r) => r.id === reqId)) {
        break;
      }
      state.platformReviewRequests.unshift({
        id: reqId,
        renterId: user.id,
        listingId: listing.id,
        title: listing.title,
        image: listing.imageUrl,
        lenderName:
          action.lenderName ||
          state.profiles.find((p) => p.id === listing.ownerId)?.name ||
          "Lender",
        start: action.start,
        end: action.end,
        pickupTime: action.pickupTime,
        returnTime: action.returnTime,
        durationDays: action.durationDays,
        collectionMethod: action.collectionMethod || "Delivery",
        deliveryAddress: action.deliveryAddress,
        location: action.location || listing.location,
        dailyPrice: action.dailyPrice || listing.dailyPrice,
        estimatedRentalFee: action.estimatedRentalFee,
        status: "pending_review",
        statusLabel: "Pending CurRENT Review (Demo)",
        createdAt: now,
        notes:
          action.notes ||
          "Pending CurRENT Review (Demo). Application submitted to CurRENT platform.",
        contextMode: state.mode || "normal",
      });
      notify(
        user.id,
        `Rental request submitted to CurRENT for ${listing.title}. Status: Pending Review (Demo).`,
      );
      break;
    }

    case "booking": {
      const b = bookingFor(action.id);
      const owner = user.id === b.ownerId;
      requireThat(
        b.status === "upcoming" && b.payment === "paid",
        "Only a confirmed upcoming booking can be cancelled.",
      );
      requireThat(
        isCancellationEligible(b.start),
        "Cancellation is available only until 24 hours before the original scheduled start.",
      );
      b.status = "cancelled";
      b.payment = "refunded";
      // The deposit was genuinely held (this path requires payment === "paid"), so it releases
      // within 5 Malaysia working days of this cancellation — never on the original scheduled
      // rental end date. It stays "release_pending" (not "released") until an actual release is
      // recorded; isDepositReleaseOverdue() flags it once that deadline has passed unactioned.
      b.deposit = "release_pending";
      b.cancelledAt = now;
      b.cancelledById = user.id;
      b.depositReleasedAt = cancelledDepositReleaseDeadline(now);
      const actor = owner ? "lender" : "renter";
      notify(
        b.renterId,
        `Booking for ${b.title} was cancelled by the ${actor}. The simulated ledger now records a full rental/service fee refund and RM0 cancellation fee; the deposit release is scheduled for ${formatMalaysiaDateTime(b.depositReleasedAt)} (5 working days from cancellation). No real funds were moved.`,
        b.id,
      );
      notify(
        b.ownerId,
        `Booking for ${b.title} was cancelled by the ${actor}. The simulated ledger was updated and availability has been restored; no real funds were moved.`,
        b.id,
      );
      break;
    }

    case "confirmReceived": {
      const b = bookingFor(action.bookingId);
      const owner = user.id === b.ownerId;
      requireThat(
        !owner,
        "Only the renter can confirm delivery receipt.",
      );
      requireThat(
        ["upcoming", "active"].includes(getEffectiveBookingStatus(b)),
        "Delivery receipt is available only for a confirmed rental.",
      );
      requireThat(b.payment === "paid", "A paid booking is required.");
      requireThat(
        !b.renterReceivedAt,
        "Delivery receipt has already been confirmed.",
      );
      const startMs = parseMalaysiaTimestamp(b.start);
      const currentMs = Date.now();
      requireThat(
        currentMs >= startMs,
        `Confirm Received is available from scheduled rental start: ${formatMalaysiaDateTime(startMs)}`,
      );
      b.renterReceivedAt = now;
      notify(
        b.ownerId,
        `Renter confirmed delivery receipt for ${b.title}.`,
        b.id,
      );
      break;
    }

    case "confirmReturnReceipt": {
      const b = bookingFor(action.bookingId);
      requireThat(user.id === b.ownerId, "Only the lender can confirm receipt of the returned item.");
      requireThat(b.status === "return_pending" && !!b.renterReturnConfirmedAt,
        "Renter return confirmation is required before lender receipt.");
      requireThat(!b.lenderReturnReceivedAt, "Return receipt has already been confirmed.");
      b.lenderReturnReceivedAt = now;
      notify(b.renterId, `Lender confirmed receipt of the returned item for ${b.title}.`, b.id);
      break;
    }

    case "returnConfirm": {
      const b = bookingFor(action.bookingId);
      const owner = user.id === b.ownerId;
      requireThat(
        ["active", "return_pending"].includes(getEffectiveBookingStatus(b)),
        "Return confirmation is only available for active or returning rentals.",
      );
      if (action.role === "renter") {
        requireThat(
          Date.now() >=
            parseMalaysiaTimestamp(b.end),
          "Confirm Return is available from the scheduled rental end.",
        );
      }
      requireThat(
        !state.disputes.some(
          (d) => d.bookingId === b.id && d.status === "under_review",
        ),
        "A dispute is active on this rental. Clean return cannot proceed.",
      );

      const photos = action.photos || (action.photo ? [action.photo] : []);
      const videos = action.videos || [];
      if ((photos.length > 0 || videos.length > 0) && !state.evidence.some((e) => e.bookingId === b.id && e.authorId === user.id && e.kind === "check_out")) {
        state.evidence.push({
          id: newId(),
          bookingId: b.id,
          authorId: user.id,
          kind: "check_out",
          photo:
            photos[0] ||
            (videos[0] ? "/videos/condition-evidence-sample-1.mp4" : ""),
          photos,
          videos,
          notes:
            action.notes?.trim() ||
            `${owner ? "Lender" : "Renter"} return condition evidence`,
          createdAt: now,
        });
      }

      if (action.role === "renter") {
        requireThat(
          !owner,
          "Only the renter can confirm physical return handback.",
        );
        const renterEvidence = state.evidence.filter(
          (e) =>
            e.bookingId === b.id &&
            e.authorId === user.id &&
            e.kind === "check_out",
        );
        const totalPhotos = renterEvidence.reduce(
          (sum, e) => sum + (e.photos?.length || (e.photo ? 1 : 0)),
          0,
        );
        const totalVideos = renterEvidence.reduce(
          (sum, e) => sum + (e.videos?.length || 0),
          0,
        );
        requireThat(
          totalPhotos >= 6 && totalVideos >= 1,
          `Renter must submit required check-out condition evidence (at least 6 photos and 1 video) before confirming check-out. Currently have ${totalPhotos} photos and ${totalVideos} videos.`,
        );

        b.renterReturnConfirmedAt = now;
        b.status = "return_pending";
        // Courier Branch Drop-off: this is the moment the renter confirms they've dropped the
        // returned parcel off, so stamp the demo drop-off confirmation + tracking reference
        // here rather than a separate action. The deposit stays held until the lender also
        // confirms (owner branch below) — unaffected by return transit time.
        if (b.deliveryDemo?.provider === DOMESTIC_COURIER_NAME) {
          b.deliveryDemo.returnDropoffConfirmedAt = now;
          b.deliveryDemo.returnTrackingRef = b.deliveryDemo.returnTrackingRef || `DEMO-JT-RET-${b.id.toUpperCase()}`;
        }
        notify(
          b.ownerId,
          `Renter confirmed return and uploaded condition evidence for ${b.title}. Please inspect the item and confirm return.`,
          b.id,
        );
      } else {
        requireThat(owner, "Only the owner can confirm return inspection.");
        requireThat(
          !!b.renterReturnConfirmedAt,
          "Renter must complete return check-out before lender can end the rental.",
        );
        requireThat(!!b.lenderReturnReceivedAt, "Confirm receipt of the returned item before ending the rental.");
        requireThat(state.evidence.some((e) => e.bookingId === b.id && e.authorId === user.id && e.kind === "lender_after_return"),
          "Submit lender After Return evidence before confirming a clean return.");

        b.lenderReturnConfirmedAt = now;
        notify(
          b.renterId,
          `Owner inspected and confirmed return for ${b.title}.`,
          b.id,
        );
      }

      if (
        b.renterReturnConfirmedAt &&
        b.lenderReturnConfirmedAt &&
        !state.disputes.some(
          (d) => d.bookingId === b.id && d.status === "under_review",
        )
      ) {
        b.status = "completed";
        b.completedAt = now;
        b.deposit = "release_pending";
        // Same 5-Malaysia-working-day settlement window as a cancellation release, triggered by
        // the clean-return completion instant instead of the cancellation instant.
        b.depositReleasedAt = depositReleaseDeadline(now);

        const returnInstant = b.actualReturnTimestamp
          ? parseMalaysiaTimestamp(b.actualReturnTimestamp)
          : null;
        const deadlineInstant = parseTimestamp(b.end);

        const renter = state.profiles.find((p) => p.id === b.renterId);
        if (
          renter &&
          !renter.riskHistory?.some((event) => event.bookingId === b.id)
        ) {
          const outcome =
            returnInstant === null
              ? [{ type: "return_timing_unassessed" as const, confirmed: true }]
              : returnInstant > deadlineInstant
                ? [
                    {
                      type: "late_return" as const,
                      hoursLate: (returnInstant - deadlineInstant) / 3600000,
                      confirmed: true,
                    },
                  ]
                : [{ type: "on_time_success" as const, confirmed: true }];
          const evaluation = evaluateRentalOutcome(outcome);
          const scoreBefore = riskFor(state, renter).score ?? 80;
          const scoreAfter = Math.max(
            0,
            Math.min(100, scoreBefore + evaluation.effectiveAdjustment),
          );
          renter.riskScore = scoreAfter;
          renter.riskLevel = tierForScore(scoreAfter).level;
          if (!renter.riskHistory) renter.riskHistory = [];
          renter.riskHistory.unshift({
            id: newId(),
            bookingId: b.id,
            itemTitle: b.title,
            date: new Date().toISOString().slice(0, 10),
            incidents: evaluation.incidents,
            effectiveAdjustment: evaluation.effectiveAdjustment,
            scoreBefore,
            scoreAfter,
            appealStatus: "none",
          });
          const resultText =
            returnInstant === null
              ? "Return timing could not be assessed."
              : returnInstant > deadlineInstant
                ? "Return was confirmed late (−5 points)."
                : "Return was confirmed on time (+2 points).";
          notify(
            b.renterId,
            `Rental complete. The simulated deposit was released. ${resultText} New score: ${scoreAfter}.`,
            b.id,
          );
        }
        notify(
          b.ownerId,
          `Rental complete for ${b.title}. Demo deposit released to renter.`,
          b.id,
        );
      }
      break;
    }

    case "conditionEvidence": {
      const b = bookingFor(action.bookingId);
      const owner = user.id === b.ownerId;
      const effectiveStatus = getEffectiveBookingStatus(b);
      const lenderStage = action.kind === "lender_before_delivery" || action.kind === "lender_after_return";
      requireThat(owner === lenderStage, lenderStage ? "Only the lender submits lender condition evidence." : "Only the renter submits condition evidence.");
      requireThat(
        lenderStage || ["upcoming", "active", "return_pending"].includes(effectiveStatus),
        "Condition evidence can only be submitted for active, upcoming or returning rentals.",
      );
      if (action.kind === "lender_before_delivery") {
        requireThat(effectiveStatus === "upcoming" && b.payment === "paid" && !b.renterReceivedAt && !b.lenderHandoverAt && !b.lenderOutboundDispatchConfirmedAt,
          "Before-delivery evidence must be submitted before dispatch or handover.");
      } else if (action.kind === "lender_after_return") {
        requireThat(effectiveStatus === "return_pending" && !!b.lenderReturnReceivedAt && !b.lenderReturnConfirmedAt,
          "After-return evidence is available after confirmed lender receipt.");
      } else if (action.kind === "check_in") {
        requireThat(
          !!b.renterReceivedAt,
          "Item must be delivered before submitting check-in condition evidence.",
        );
      } else {
        requireThat(
          effectiveStatus === "active" && !!b.renterReceivedAt,
          "Check-out evidence is available during the active rental after delivery.",
        );
      }
      requireThat(
        action.photos.length >= 6 && action.videos.length >= 1,
        `Condition evidence requires at least 6 photos and 1 video. Currently have ${action.photos.length} photos and ${action.videos.length} videos.`,
      );
      if (lenderStage || action.kind === "check_out") requireThat(!state.evidence.some((e) => e.bookingId === b.id && e.authorId === user.id && e.kind === action.kind), "Condition evidence already submitted for this checkpoint.");

      state.evidence.push({
        id: newId(),
        bookingId: b.id,
        authorId: user.id,
        kind: action.kind,
        photo: action.photos[0] || "",
        photos: action.photos,
        videos: action.videos,
        notes:
          action.notes?.trim() ||
          `${action.kind === "check_in" ? "Check-in" : "Check-out"} condition evidence recorded.`,
        createdAt: now,
      });

      notify(
        owner ? b.renterId : b.ownerId,
        `${owner ? "Lender" : "Renter"} submitted condition evidence for ${b.title}.`,
        b.id,
      );
      break;
    }

    case "reportIssue": {
      const b = bookingFor(action.bookingId);
      const effectiveStatus = getEffectiveBookingStatus(b);
      const lenderStage = action.stage === "lender_before_delivery" || action.stage === "lender_after_return";
      requireThat(user.id === (lenderStage ? b.ownerId : b.renterId), lenderStage ? "Only the lender can submit this condition issue report." : "Only the renter can submit a condition issue report.");
      const text = action.text.trim();
      requireThat(
        text.length > 0,
        "Describe the issue before submitting the report.",
      );

      if (!state.issueReports) state.issueReports = [];
      const existing = state.issueReports.find(
        (report) => report.bookingId === b.id && report.stage === action.stage,
      );
      if (existing) {
        requireThat(
          existing.authorId === user.id && existing.text === text,
          "An issue report has already been submitted for this stage.",
        );
        break;
      }

      requireThat(
        action.stage === "lender_before_delivery"
          ? effectiveStatus === "upcoming" && b.payment === "paid" && !b.renterReceivedAt && !b.lenderOutboundDispatchConfirmedAt
          : action.stage === "lender_after_return"
          ? effectiveStatus === "return_pending" && !!b.lenderReturnReceivedAt && !b.lenderReturnConfirmedAt
          : action.stage === "check_in"
          ? effectiveStatus === "active"
          : ["active", "return_pending"].includes(effectiveStatus) && !!b.renterReceivedAt,
        "Issue reports can only be submitted during the relevant active rental stage.",
      );
      state.issueReports.unshift({
        id: newId(),
        bookingId: b.id,
        authorId: user.id,
        stage: action.stage,
        text,
        createdAt: now,
      });
      notify(
        lenderStage ? b.renterId : b.ownerId,
        `${lenderStage ? "Lender" : "Renter"} reported a condition issue for ${b.title}.`,
        b.id,
      );
      break;
    }

    case "resolveDispute": {
      const dispute = state.disputes.find((d) => d.id === action.disputeId);
      requireThat(dispute, "Dispute not found.");
      const b = state.bookings.find((item) => item.id === dispute.bookingId);
      requireThat(b, "Booking not found.");
      const renter = state.profiles.find((p) => p.id === b.renterId);
      requireThat(renter, "Renter not found.");

      dispute.status = "resolved";

      if (action.scenario === "minor_damage") {
        const deduction = Math.min(b.quote.deposit, 150);
        const remainder = Math.max(0, b.quote.deposit - deduction);
        b.status = "completed";
        b.deposit = remainder > 0 ? "released" : "held";

        const evaluation = evaluateRentalOutcome([
          {
            type: "minor_damage",
            confirmed: true,
            description:
              "Fictional damage claim approved (Demo): RM150 assessed repair cost.",
          },
        ]);
        const scoreBefore = renter.riskScore ?? 80;
        const scoreAfter = Math.max(
          0,
          Math.min(100, scoreBefore + evaluation.effectiveAdjustment),
        );
        renter.riskScore = scoreAfter;
        renter.riskLevel = tierForScore(scoreAfter).level;
        if (!renter.riskHistory) renter.riskHistory = [];
        renter.riskHistory.unshift({
          id: newId(),
          bookingId: b.id,
          itemTitle: b.title,
          date: new Date().toISOString().slice(0, 10),
          incidents: evaluation.incidents,
          effectiveAdjustment: evaluation.effectiveAdjustment,
          scoreBefore,
          scoreAfter,
          appealStatus: "none",
        });

        notify(
          b.renterId,
          `Dispute resolved (Illustrative Demo): Confirmed minor damage. RM${deduction.toFixed(2)} deducted from deposit; RM${remainder.toFixed(2)} released. Risk score adjusted by -10 to ${scoreAfter}.`,
          b.id,
        );
        notify(
          b.ownerId,
          `Dispute resolved (Illustrative Demo): RM${deduction.toFixed(2)} simulated compensation applied from deposit.`,
          b.id,
        );
      } else if (action.scenario === "serious_damage") {
        b.status = "completed";
        b.deposit = "held";

        const evaluation = evaluateRentalOutcome([
          {
            type: "serious_damage",
            confirmed: true,
            description:
              "Fictional major damage claim approved (Demo): Full deposit applied to replacement liability.",
          },
        ]);
        const scoreBefore = renter.riskScore ?? 80;
        const scoreAfter = Math.max(
          0,
          Math.min(100, scoreBefore + evaluation.effectiveAdjustment),
        );
        renter.riskScore = scoreAfter;
        renter.riskLevel = tierForScore(scoreAfter).level;
        if (!renter.riskHistory) renter.riskHistory = [];
        renter.riskHistory.unshift({
          id: newId(),
          bookingId: b.id,
          itemTitle: b.title,
          date: new Date().toISOString().slice(0, 10),
          incidents: evaluation.incidents,
          effectiveAdjustment: evaluation.effectiveAdjustment,
          scoreBefore,
          scoreAfter,
          appealStatus: "none",
        });

        notify(
          b.renterId,
          `Dispute resolved (Illustrative Demo): Confirmed major damage. Full deposit RM${b.quote.deposit.toFixed(2)} applied to liability. Risk score adjusted by -30 to ${scoreAfter}.`,
          b.id,
        );
        notify(
          b.ownerId,
          `Dispute resolved (Illustrative Demo): RM${b.quote.deposit.toFixed(2)} full deposit compensation applied to owner.`,
          b.id,
        );
      } else if (action.scenario === "rejected") {
        b.status = "completed";
        b.deposit = "released";

        notify(
          b.renterId,
          `Dispute review completed (Illustrative Demo): No damage confirmed. 100% simulated deposit (RM${b.quote.deposit.toFixed(2)}) released in full.`,
          b.id,
        );
        notify(
          b.ownerId,
          `Dispute review completed (Illustrative Demo): Claim rejected after condition assessment. Deposit released to renter.`,
          b.id,
        );
      } else if (action.scenario === "overdue_restriction") {
        renter.hasOverdueObligation = true;
        notify(
          renter.id,
          "Confirmed damage obligation unpaid after 7 days. All new bookings restricted until settled (Demo).",
          b.id,
        );
      }
      break;
    }

    case "message": {
      const b = bookingFor(action.bookingId);
      requireThat(
        action.text.trim().length > 0 && action.text.trim().length <= 2000,
        "Messages must contain 1–2,000 characters.",
      );
      state.messages.push({
        id: newId(),
        bookingId: b.id,
        authorId: user.id,
        text: action.text.trim(),
        createdAt: now,
      });
      notify(
        user.id === b.ownerId ? b.renterId : b.ownerId,
        `${user.name} sent you a message.`,
        b.id,
      );
      break;
    }

    case "review": {
      const b = bookingFor(action.bookingId);
      requireThat(
        b.status === "completed",
        "Reviews are available after the rental is completed.",
      );
      requireThat(
        Date.parse(now) >= parseMalaysiaTimestamp(b.end),
        "Reviews are available after the scheduled rental end.",
      );
      requireThat(
        !state.reviews.some(
          (r) => r.bookingId === b.id && r.authorId === user.id,
        ),
        "You already reviewed this rental.",
      );
      requireThat(
        Number.isInteger(action.rating) &&
          action.rating >= 1 &&
          action.rating <= 5,
        "Choose a rating from 1 to 5.",
      );
      state.reviews.push({
        id: newId(),
        bookingId: b.id,
        authorId: user.id,
        recipientId: user.id === b.ownerId ? b.renterId : b.ownerId,
        rating: action.rating,
        text: action.text.trim(),
      });
      if (user.id === b.renterId) {
        const listing = state.listings.find((item) => item.id === b.listingId);
        const itemReviews = state.reviews.filter((review) =>
          state.bookings.some(
            (booking) =>
              booking.id === review.bookingId &&
              booking.listingId === b.listingId &&
              booking.renterId === review.authorId,
          ),
        );
        if (listing) {
          listing.rating =
            itemReviews.reduce((sum, review) => sum + review.rating, 0) /
            itemReviews.length;
        }
      }
      break;
    }

    case "dispute": {
      const b = bookingFor(action.bookingId);
      requireThat(
        user.id === b.ownerId,
        "Only the booking lender can submit Apply Dispute.",
      );
      requireThat(
        isLenderDisputeEligible(b, Date.parse(now)),
        b.status === "cancelled"
          ? "Cancelled bookings cannot be disputed."
          : "Apply Dispute is available from the scheduled rental end.",
      );
      requireThat(
        !state.disputes.some((d) => d.bookingId === b.id),
        "A dispute has already been submitted for this booking.",
      );
      requireThat(
        action.reason.trim().length >= 10,
        "Describe the issue in at least 10 characters.",
      );
      requireThat(
        !action.category ||
          [
            "Item damaged",
            "Item not returned",
            "Condition disagreement",
            "Payment issue",
            "Security deposit issue",
          ].includes(action.category),
        "Choose a valid dispute reason.",
      );
      state.disputes.push({
        id: newId(),
        bookingId: b.id,
        authorId: user.id,
        reason: action.reason.trim(),
        category: action.category,
        status: "under_review",
        createdAt: now,
      });
      if (action.photo) {
        state.evidence.push({
          id: newId(),
          bookingId: b.id,
          authorId: user.id,
          kind: "dispute",
          photo: action.photo,
          notes: action.reason.trim(),
          createdAt: now,
        });
      }
      notify(
        b.renterId,
        `A dispute was submitted for ${b.title}. Status: PENDING. No automatic financial adjustment was made.`,
        b.id,
      );
      break;
    }

    case "readNotices":
      state.notifications
        .filter((n) => n.userId === user.id)
        .forEach((n) => {
          n.read = true;
        });
      break;

    case "readConversation":
      bookingFor(action.bookingId);
      state.notifications
        .filter(
          (notice) =>
            notice.userId === user.id &&
            notice.bookingId === action.bookingId &&
            notice.title.includes("sent you a message"),
        )
        .forEach((notice) => {
          notice.read = true;
        });
      break;

    case "supportQuery": {
      if (!state.supportMessages) state.supportMessages = [];

      state.supportMessages.push({
        id: newId(),
        userId: user.id,
        sender: "user",
        text: action.text,
        createdAt: now,
      });

      const result = resolveAutomatedSupportQuery(action.text);
      if (result.answered) {
        const msgs =
          result.responses || (result.response ? [result.response] : []);
        for (const msgText of msgs) {
          state.supportMessages.push({
            id: newId(),
            userId: user.id,
            sender: "bot",
            text: msgText,
            createdAt: now,
          });
        }
      } else {
        state.supportMessages.push({
          id: newId(),
          userId: user.id,
          sender: "bot",
          text: LOCAL_SUPPORT_HANDOFF_MESSAGE,
          createdAt: now,
        });
      }
      break;
    }

    case "supportHandoff": {
      if (!state.supportMessages) state.supportMessages = [];
      state.supportMessages.push({
        id: newId(),
        userId: user.id,
        sender: "user",
        text: action.query || "Talk to a Human",
        createdAt: now,
      });
      state.supportMessages.push({
        id: newId(),
        userId: user.id,
        sender: "bot",
        text: LOCAL_SUPPORT_HANDOFF_MESSAGE,
        createdAt: now,
      });
      break;
    }

    case "supportHandoffResult": {
      if (!state.supportMessages) state.supportMessages = [];
      const priorRequest = state.supportMessages.find(
        (message) => message.id === action.messageId,
      );
      const responseId = `handoff-${action.messageId}`;
      const priorResponse = state.supportMessages.find(
        (message) => message.id === responseId,
      );
      if (priorRequest) {
        priorRequest.caseId = action.caseId;
        if (priorResponse) {
          priorResponse.text = action.accepted
            ? "Your enquiry has been forwarded to our support team. We aim to respond here within one working hour. Thank you for your patience."
            : "I couldn't send your message to our support team right now. Please try again.";
          priorResponse.caseId = action.caseId;
        }
      } else {
        state.supportMessages.push({
          id: action.messageId,
          userId: user.id,
          sender: "user",
          text: action.query,
          createdAt: now,
          caseId: action.caseId,
        });
      }
      if (!priorResponse) {
        state.supportMessages.push({
          id: responseId,
          userId: user.id,
          sender: "bot",
          text: action.accepted
            ? "Your enquiry has been forwarded to our support team. We aim to respond here within one working hour. Thank you for your patience."
            : "I couldn't send your message to our support team right now. Please try again.",
          createdAt: now,
          caseId: action.caseId,
        });
      }
      break;
    }

    case "supportStaffReply": {
      throw new Error(
        "Authenticated support staff replies require a configured support backend.",
      );
    }
  }

  return state;
}
