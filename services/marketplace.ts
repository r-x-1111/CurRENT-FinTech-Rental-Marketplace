import type { CollectionMethod, Listing, VerificationStatus } from "../types";
import type { Marketplace, Profile, Booking } from "../types/marketplace";
import {
  availability,
  calculateCancellationCutoff,
  calculateDurationMinutes,
  checkHandoverConflict,
  isCancellationEligible,
  parseDate,
  parseTimestamp,
  quoteFor,
  riskFor,
} from "./booking";
import {
  calculateBorrowerServiceFee,
  calculateConsecutiveQuote,
} from "./deposit";
import { evaluateRentalOutcome, tierForScore } from "./riskScore";
import { createSeed } from "../data/seed";

export type Action =
  | { type: "login"; userId: string | null }
  | { type: "signup"; profile: Profile }
  | { type: "profile"; name: string; avatar?: string }
  | { type: "verify"; status: VerificationStatus }
  | { type: "favourite"; listingId: string }
  | { type: "saveListing"; listing: Listing }
  | { type: "deleteListing"; id: string }
  | { type: "boostListing"; listingId: string }
  | {
      type: "recordRentalOutcome";
      renterId: string;
      itemTitle: string;
      bookingId?: string;
      rawIncidents: {
        type: "on_time_success" | "late_return" | "minor_damage" | "serious_damage" | "theft_fraud";
        hoursLate?: number;
        confirmed?: boolean;
        description?: string;
      }[];
    }
  | {
      type: "request";
      id: string;
      listingId: string;
      start: string;
      end: string;
      protection: boolean;
      collectionMethod?: CollectionMethod;
    }
  | {
      type: "booking";
      id: string;
      operation:
        | "approve"
        | "reject"
        | "cancel"
        | "pay"
        | "payment_result"
        | "check_in"
        | "check_out"
        | "release";
      photo?: string;
      photos?: string[];
      videos?: string[];
      notes?: string;
      method?: string;
      failed?: boolean;
    }
  | {
      type: "handoverConfirm";
      bookingId: string;
      role: "owner" | "renter";
    }
  | {
      type: "acceptRevisedRental";
      bookingId: string;
    }
  | {
      type: "returnConfirm";
      bookingId: string;
      role: "owner" | "renter";
      actualReturnTimestamp?: string;
      photo?: string;
      photos?: string[];
      videos?: string[];
      notes?: string;
    }
  | {
      type: "consecutiveExtend";
      bookingId: string;
      additionalDays: number;
    }
  | {
      type: "resolveDispute";
      disputeId: string;
      scenario: "minor_damage" | "serious_damage" | "rejected" | "overdue_restriction";
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
      photo: string;
      category?: string;
    }
  | { type: "readNotices" }
  | { type: "readConversation"; bookingId: string };

export const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function requireThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
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

    case "verify":
      requireThat(
        (action.status === "pending" &&
          ["not_verified", "failed"].includes(user.verification)) ||
          (user.verification === "pending" &&
            ["verified", "failed"].includes(action.status)),
        "Verification cannot make that transition.",
      );
      user.verification = action.status;
      if (action.status === "verified" && (user.riskScore === undefined || user.riskScore === null)) {
        user.riskScore = 75;
        user.riskLevel = "medium";
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

    case "saveListing": {
      const l = action.listing;
      const existing = state.listings.find((i) => i.id === l.id);
      requireThat(
        l.ownerId === user.id && (!existing || existing.ownerId === user.id),
        "Only the owner can edit this item.",
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
          Number.isFinite(l.estimatedValue) &&
          l.estimatedValue > 0,
        "Price and item value must be positive amounts.",
      );
      requireThat(
        l.status !== "published" ||
          (l.id === "sony-a7iii"
            ? l.images && l.images.length >= 4 && l.videos && l.videos.length >= 1
            : l.images && l.images.length >= 6 && l.videos && l.videos.length >= 1),
        "Add at least 6 photos and 1 video before publishing.",
      );
      requireThat(
        l.status !== "published" || user.verification === "verified",
        "Complete demo identity verification before publishing.",
      );
      l.collectionMethods = ["Delivery Only"];
      if (l.availableFrom) parseDate(l.availableFrom);
      if (l.availableTo) parseDate(l.availableTo);
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
      listing.featuredUntil = new Date(Date.now() + 7 * 86400000).toISOString();
      notify(
        user.id,
        `Listing boosted! "${listing.title}" is now featured for 7 days (RM10 demo fee).`,
      );
      break;
    }

    case "recordRentalOutcome": {
      const renter = state.profiles.find((p) => p.id === action.renterId);
      requireThat(renter, "Renter not found.");
      const evaluation = evaluateRentalOutcome(action.rawIncidents);
      const scoreBefore = renter.riskScore ?? 70;
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

    case "request": {
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
        "Complete demo identity verification in Profile before requesting a rental.",
      );
      availability(state, listing, action.start, action.end);
      const collectionMethod = "Delivery Only";
      requireThat(
        !state.bookings.some(
          (b) =>
            b.renterId === user.id &&
            b.listingId === listing.id &&
            b.start === action.start &&
            b.end === action.end &&
            !["cancelled", "rejected", "completed"].includes(b.status),
        ),
        "You already requested these dates.",
      );

      const durMinutes = calculateDurationMinutes(action.start, action.end);
      const cutoff = calculateCancellationCutoff(action.start);

      state.bookings.unshift({
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
        status: "pending",
        quote: quoteFor(
          state,
          user,
          listing,
          action.start,
          action.end,
          action.protection,
        ),
        riskScore: riskFor(state, user).score ?? 70,
        payment: "required",
        deposit: "required",
        createdAt: now,
      });
      notify(
        listing.ownerId,
        `${user.name} requested ${listing.title}.`,
        action.id,
      );
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

      const durMinutes = calculateDurationMinutes(action.start, action.end);
      const cutoff = calculateCancellationCutoff(action.start);
      const quote = quoteFor(state, user, listing, action.start, action.end);

      state.bookings.unshift({
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
        status: "upcoming",
        quote,
        riskScore: risk.score ?? 75,
        payment: "paid",
        deposit: "held",
        paymentMethod: action.paymentMethod || "Demo FPX",
        agreement: `DEMO RENTAL AGREEMENT V3.15 • ${action.id}\nLender: ${state.profiles.find((p) => p.id === listing.ownerId)?.name}\nRenter: ${user.name}\nItem: ${listing.title}\nPickup: ${action.start} • Return: ${action.end}\nCollection method: ${collectionMethod}\nRental fee: RM${quote.rentalFee.toFixed(2)} • Service fee: RM${quote.serviceFee.toFixed(2)}\nRefundable security deposit: RM${quote.deposit.toFixed(2)}\nTotal payable today: RM${quote.total.toFixed(2)}\nConfirmed automatically without lender approval.\nGenerated ${now}`,
        createdAt: now,
        contextMode: state.mode || "normal",
      });

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
      switch (action.operation) {
        case "approve": {
          requireThat(
            owner && b.status === "pending",
            "Only the owner can approve a pending request.",
          );
          const listing = state.listings.find((l) => l.id === b.listingId);
          requireThat(listing, "Listing not found.");
          availability(state, listing, b.start, b.end, b.id);
          b.status = "approved";
          notify(
            b.renterId,
            `${b.title} is approved. Complete your demo payment.`,
            b.id,
          );
          break;
        }
        case "reject":
          requireThat(
            owner && b.status === "pending",
            "Only the owner can reject a pending request.",
          );
          b.status = "rejected";
          notify(b.renterId, `Your request for ${b.title} was declined.`, b.id);
          break;
        case "cancel": {
          requireThat(
            b.payment !== "processing",
            "Only unpaid requests can be cancelled.",
          );
          if (["pending", "approved"].includes(b.status)) {
            b.status = "cancelled";
            notify(
              owner ? b.renterId : b.ownerId,
              `${b.title} request was cancelled.`,
              b.id,
            );
          } else if (b.status === "upcoming") {
            const pickup = b.scheduledPickup || b.start;
            requireThat(
              isCancellationEligible(pickup),
              "Cancellation is only permitted at least 24 hours before scheduled pickup.",
            );
            b.status = "cancelled";
            b.payment = "refunded";
            b.deposit = "released";
            notify(
              b.renterId,
              `Booking cancelled for ${b.title}. 100% simulated refund (RM${(b.quote.rentalFee + b.quote.serviceFee).toFixed(2)}) and deposit release processed. RM0 cancellation fee.`,
              b.id,
            );
            notify(
              b.ownerId,
              `Booking for ${b.title} was cancelled by renter at least 24h before pickup. Availability has been restored.`,
              b.id,
            );
          } else {
            throw new Error("Only unpaid requests or eligible upcoming bookings can be cancelled.");
          }
          break;
        }
        case "pay":
          requireThat(
            !owner &&
              b.status === "approved" &&
              ["required", "failed"].includes(b.payment),
            "Payment requires owner approval.",
          );
          requireThat(
            b.riskScore >= 30,
            "Renters with Rental Risk Score below 30 require platform approval. Payment is not available for this booking.",
          );
          requireThat(
            ["Demo card", "Demo FPX", "Demo BNPL"].includes(
              action.method || "",
            ),
            "Select a payment method.",
          );
          requireThat(
            action.method !== "Demo BNPL" ||
              (b.quote.rentalFee >= 200 && user.verification === "verified"),
            "Demo BNPL requires a verified account and rental fees of at least RM200.",
          );
          b.payment = "processing";
          b.paymentMethod = action.method;
          break;
        case "payment_result":
          requireThat(
            !owner && b.status === "approved" && b.payment === "processing",
            "No payment is processing.",
          );
          b.payment = action.failed ? "failed" : "paid";
          if (action.failed)
            notify(
              b.renterId,
              `Demo payment failed for ${b.title}. You can retry.`,
              b.id,
            );
          if (!action.failed) {
            b.status = "upcoming";
            b.deposit = "secured";
            if (!b.scheduledPickup) b.scheduledPickup = b.start;
            if (!b.scheduledReturn) b.scheduledReturn = b.end;
            if (!b.durationMinutes) b.durationMinutes = b.quote.days * 1440;
            if (!b.cancellationCutoff) {
              b.cancellationCutoff = calculateCancellationCutoff(b.scheduledPickup);
            }
            b.agreement = `DEMO RENTAL AGREEMENT • ${b.id}\nOwner: ${state.profiles.find((p) => p.id === b.ownerId)?.name}\nRenter: ${user.name}\nItem: ${b.title}\nFulfilment: Delivery Only\nRental: RM${b.quote.rentalFee.toFixed(2)} • Service: RM${b.quote.serviceFee.toFixed(2)} • Protection: RM${b.quote.protection.toFixed(2)}\nRefundable deposit: RM${b.quote.deposit.toFixed(2)}\nTotal: RM${b.quote.total.toFixed(2)}\nBoth parties record condition evidence (≥6 photos, ≥1 video) at check-in and check-out. Deposit release follows mutual return confirmation; disputed deposits remain on hold for review. No actual money, insurance or deposit custody is provided in this academic demo.\nGenerated ${now}`;
            notify(
              b.ownerId,
              `Demo payment received for ${b.title}. Ready for handover.`,
              b.id,
            );
          }
          break;
        case "check_in":
        case "check_out": {
          const checkIn = action.operation === "check_in";
          requireThat(
            checkIn
              ? owner && b.status === "upcoming"
              : !owner && b.status === "active",
            checkIn
              ? "The owner confirms handover after payment."
              : "The renter submits a return for an active rental.",
          );
          requireThat(action.photo, "Add a condition photo to continue.");
          state.evidence.push({
            id: newId(),
            bookingId: b.id,
            authorId: user.id,
            kind: action.operation,
            photo: action.photo,
            notes: action.notes?.trim() || "",
            createdAt: now,
          });
          b.status = checkIn ? "active" : "return_pending";
          b.deposit = checkIn ? "held" : "release_pending";
          if (checkIn) {
            b.lenderHandoverAt = now;
            b.renterReceivedAt = now;
            b.activationTimestamp = now;
            if (!b.effectiveReturnDeadline) {
              const durMs = (b.durationMinutes || (b.quote.days * 1440)) * 60000;
              b.effectiveReturnDeadline = new Date(Date.now() + durMs).toISOString();
            }
          } else {
            b.renterReturnConfirmedAt = now;
            b.actualReturnTimestamp = now;
          }
          notify(
            checkIn ? b.renterId : b.ownerId,
            checkIn
              ? `${b.title} handover is complete.`
              : `${b.title} is ready for return inspection.`,
            b.id,
          );
          break;
        }
        case "release": {
          requireThat(
            owner &&
              b.status === "return_pending" &&
              b.deposit === "release_pending",
            "The owner must inspect a returned item before releasing the deposit.",
          );
          b.lenderReturnConfirmedAt = now;
          b.status = "completed";
          b.deposit = "released";

          const renterProfile = state.profiles.find((p) => p.id === b.renterId);
          if (renterProfile) {
            const evaluation = evaluateRentalOutcome([
              { type: "on_time_success", confirmed: true, description: "On-time return with no issues" },
            ]);
            const scoreBefore = renterProfile.riskScore ?? 70;
            const scoreAfter = Math.min(100, scoreBefore + evaluation.effectiveAdjustment);
            renterProfile.riskScore = scoreAfter;
            renterProfile.riskLevel = tierForScore(scoreAfter).level;
            if (!renterProfile.riskHistory) renterProfile.riskHistory = [];
            renterProfile.riskHistory.unshift({
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
          }
          notify(
            b.renterId,
            `Rental complete. Demo deposit released for ${b.title}.`,
            b.id,
          );
          break;
        }
      }
      break;
    }

    case "handoverConfirm": {
      const b = bookingFor(action.bookingId);
      const owner = user.id === b.ownerId;
      requireThat(
        b.status === "upcoming",
        "Handover can only be confirmed for upcoming paid rentals.",
      );

      if (action.role === "owner") {
        requireThat(owner, "Only the owner can confirm item handed over.");
        b.lenderHandoverAt = now;
        notify(
          b.renterId,
          `Owner confirmed handover for ${b.title}. Please confirm receipt when you receive the item.`,
          b.id,
        );
      } else {
        requireThat(!owner, "Only the renter can confirm item received.");
        b.renterReceivedAt = now;
        notify(
          b.ownerId,
          `Renter confirmed receipt for ${b.title}. Waiting for owner handover confirmation.`,
          b.id,
        );
      }

      if (b.lenderHandoverAt && b.renterReceivedAt) {
        const activationTs = Math.max(
          new Date(b.lenderHandoverAt).getTime(),
          new Date(b.renterReceivedAt).getTime(),
        );
        const listing = state.listings.find((l) => l.id === b.listingId);
        requireThat(listing, "Listing not found.");

        const conflictRes = checkHandoverConflict(state, b, listing, activationTs);

        if (conflictRes.hasConflict && conflictRes.conflictOffer) {
          b.conflictOffer = conflictRes.conflictOffer;
          notify(
            b.renterId,
            `Pickup schedule conflict detected with a future booking. Review and accept your revised rental offer.`,
            b.id,
          );
          notify(
            b.ownerId,
            `Late handover created a schedule overlap. Renter has been offered a conflict-free shortened rental.`,
            b.id,
          );
        } else {
          b.activationTimestamp = new Date(activationTs).toISOString();
          const durMinutes = b.durationMinutes || (b.quote.days * 1440);
          b.effectiveReturnDeadline = new Date(activationTs + durMinutes * 60000).toISOString();
          b.status = "active";
          b.deposit = "held";
          notify(
            b.renterId,
            `Handover complete! ${b.title} is now ACTIVE. Return deadline: ${new Date(b.effectiveReturnDeadline).toLocaleDateString()}.`,
            b.id,
          );
          notify(
            b.ownerId,
            `Handover complete! ${b.title} is now active. Return deadline: ${new Date(b.effectiveReturnDeadline).toLocaleDateString()}.`,
            b.id,
          );
        }
      }
      break;
    }

    case "acceptRevisedRental": {
      const b = bookingFor(action.bookingId);
      const owner = user.id === b.ownerId;
      requireThat(!owner, "Only the renter can accept the revised rental offer.");
      requireThat(b.conflictOffer, "No revised rental offer is pending.");

      const offer = b.conflictOffer;
      b.effectiveReturnDeadline = offer.revisedEnd;
      b.durationMinutes = offer.revisedDurationMinutes;
      b.quote.days = offer.revisedRentalDays;
      b.quote.rentalFee = offer.revisedRentalFee;
      b.quote.serviceFee = offer.revisedServiceFee;
      b.quote.total = Math.round((offer.revisedRentalFee + offer.revisedServiceFee + b.quote.deposit) * 100) / 100;

      const actTs = Math.max(
        b.lenderHandoverAt ? new Date(b.lenderHandoverAt).getTime() : Date.now(),
        b.renterReceivedAt ? new Date(b.renterReceivedAt).getTime() : Date.now(),
      );
      b.activationTimestamp = new Date(actTs).toISOString();
      b.status = "active";
      b.deposit = "held";
      b.conflictOffer = null;

      if (offer.refundAmount > 0) {
        notify(
          b.renterId,
          `Revised offer accepted! Simulated refund of RM${offer.refundAmount.toFixed(2)} processed. Rental is now ACTIVE.`,
          b.id,
        );
      } else {
        notify(
          b.renterId,
          `Revised offer accepted (RM0 fee adjustment, 3 billable days maintained). Rental is now ACTIVE.`,
          b.id,
        );
      }
      notify(
        b.ownerId,
        `Renter accepted revised rental offer. ${b.title} is now active.`,
        b.id,
      );
      break;
    }

    case "returnConfirm": {
      const b = bookingFor(action.bookingId);
      const owner = user.id === b.ownerId;
      requireThat(
        ["active", "return_pending"].includes(b.status),
        "Return confirmation is only available for active or returning rentals.",
      );
      requireThat(
        !state.disputes.some(
          (d) => d.bookingId === b.id && d.status === "under_review",
        ),
        "A dispute is active on this rental. Clean return cannot proceed.",
      );

      const photos = action.photos || (action.photo ? [action.photo] : []);
      const videos = action.videos || [];
      if (photos.length > 0 || videos.length > 0) {
        state.evidence.push({
          id: newId(),
          bookingId: b.id,
          authorId: user.id,
          kind: "check_out",
          photo: photos[0] || (videos[0] ? "/videos/condition-evidence-sample-1.mp4" : ""),
          photos,
          videos,
          notes: action.notes?.trim() || `${owner ? "Lender" : "Renter"} return condition evidence`,
          createdAt: now,
        });
      }

      if (action.role === "renter") {
        requireThat(!owner, "Only the renter can confirm physical return handback.");
        const renterEvidence = state.evidence.filter(
          (e) => e.bookingId === b.id && e.authorId === user.id && e.kind === "check_out",
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
        b.actualReturnTimestamp = action.actualReturnTimestamp || b.actualReturnTimestamp || now;
        b.status = "return_pending";
        b.deposit = "release_pending";
        notify(
          b.ownerId,
          `Renter confirmed return and uploaded condition evidence for ${b.title}. Please inspect the item and confirm return.`,
          b.id,
        );
      } else {
        requireThat(owner, "Only the owner can confirm return inspection.");
        const lenderEvidence = state.evidence.filter(
          (e) => e.bookingId === b.id && e.authorId === user.id && e.kind === "check_out",
        );
        const totalPhotos = lenderEvidence.reduce(
          (sum, e) => sum + (e.photos?.length || (e.photo ? 1 : 0)),
          0,
        );
        const totalVideos = lenderEvidence.reduce(
          (sum, e) => sum + (e.videos?.length || 0),
          0,
        );
        requireThat(
          totalPhotos >= 6 && totalVideos >= 1,
          `Lender must submit required check-out condition evidence (at least 6 photos and 1 video) before confirming check-out. Currently have ${totalPhotos} photos and ${totalVideos} videos.`,
        );

        b.lenderReturnConfirmedAt = now;
        if (action.actualReturnTimestamp && !b.actualReturnTimestamp) {
          b.actualReturnTimestamp = action.actualReturnTimestamp;
        }
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
        b.deposit = "released";

        const returnInstant = b.actualReturnTimestamp
          ? new Date(b.actualReturnTimestamp).getTime()
          : Date.now();
        const deadlineInstant = b.effectiveReturnDeadline
          ? new Date(b.effectiveReturnDeadline).getTime()
          : parseTimestamp(b.end);

        const diffHours = (returnInstant - deadlineInstant) / 3600000;
        const renter = state.profiles.find((p) => p.id === b.renterId);
        if (renter) {
          if (diffHours <= 2) {
            const evaluation = evaluateRentalOutcome([
              { type: "on_time_success", confirmed: true, description: "On-time return with no disputes" },
            ]);
            const scoreBefore = renter.riskScore ?? 70;
            const scoreAfter = Math.min(100, scoreBefore + evaluation.effectiveAdjustment);
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
              `Rental complete! Full simulated deposit (RM${b.quote.deposit.toFixed(2)}) released. +2 Reliability Score awarded! New score: ${scoreAfter}.`,
              b.id,
            );
          } else {
            const hoursLate = Math.ceil(diffHours);
            const evaluation = evaluateRentalOutcome([
              { type: "late_return", hoursLate, confirmed: true, description: `Returned ${hoursLate} hours late` },
            ]);
            const scoreBefore = renter.riskScore ?? 70;
            const scoreAfter = Math.max(0, scoreBefore + evaluation.effectiveAdjustment);
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
              `Rental complete! Full simulated deposit (RM${b.quote.deposit.toFixed(2)}) released. Return was ${hoursLate} hours late (${evaluation.effectiveAdjustment} points). New score: ${scoreAfter}.`,
              b.id,
            );
          }
        }
        notify(
          b.ownerId,
          `Rental complete for ${b.title}. Demo deposit released to renter.`,
          b.id,
        );
      }
      break;
    }

    case "consecutiveExtend": {
      const b = bookingFor(action.bookingId);
      const owner = user.id === b.ownerId;
      requireThat(!owner, "Only the renter can extend the rental.");
      requireThat(b.status === "active", "Extensions are only available for active rentals.");
      requireThat(
        action.additionalDays >= 1 && action.additionalDays <= 30,
        "Choose 1 to 30 additional days.",
      );

      const listing = state.listings.find((l) => l.id === b.listingId);
      requireThat(listing, "Listing not found.");

      const currentDeadline = b.effectiveReturnDeadline
        ? new Date(b.effectiveReturnDeadline).getTime()
        : parseTimestamp(b.end);

      const newDeadline = currentDeadline + action.additionalDays * 86400000;
      const newDeadlineIso = new Date(newDeadline).toISOString();

      const hasConflict = state.bookings.some(
        (other) =>
          other.id !== b.id &&
          other.listingId === b.listingId &&
          ["confirmed", "upcoming", "active", "approved"].includes(other.status) &&
          parseTimestamp(other.start) < newDeadline &&
          parseTimestamp(other.end) > currentDeadline,
      );
      requireThat(!hasConflict, "Item is already reserved by another renter for the requested extension period.");

      const additionalRentalFee = listing.dailyPrice * action.additionalDays;
      const quoteExtension = calculateConsecutiveQuote(additionalRentalFee);

      b.effectiveReturnDeadline = newDeadlineIso;
      b.quote.days += action.additionalDays;
      b.quote.rentalFee += quoteExtension.additionalRentalFee;
      b.quote.serviceFee += quoteExtension.serviceFee;
      b.quote.total = Math.round((b.quote.total + quoteExtension.total) * 100) / 100;

      if (!b.chainBookings) b.chainBookings = [];
      b.chainBookings.push(
        `Extension +${action.additionalDays}d: RM${quoteExtension.total.toFixed(2)} (RM0 extra deposit)`,
      );

      notify(
        b.renterId,
        `Rental extended by ${action.additionalDays} days! New return deadline: ${new Date(newDeadlineIso).toLocaleDateString()}. Additional charge: RM${quoteExtension.total.toFixed(2)} (RM0 extra deposit).`,
        b.id,
      );
      notify(
        b.ownerId,
        `${user.name} extended rental of ${b.title} by ${action.additionalDays} days. New deadline: ${new Date(newDeadlineIso).toLocaleDateString()}.`,
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
        b.deposit = (remainder > 0 ? "released" : "held");

        const evaluation = evaluateRentalOutcome([
          {
            type: "minor_damage",
            confirmed: true,
            description: "Fictional damage claim approved (Demo): RM150 assessed repair cost.",
          },
        ]);
        const scoreBefore = renter.riskScore ?? 70;
        const scoreAfter = Math.max(0, Math.min(100, scoreBefore + evaluation.effectiveAdjustment));
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
            description: "Fictional major damage claim approved (Demo): Full deposit applied to replacement liability.",
          },
        ]);
        const scoreBefore = renter.riskScore ?? 70;
        const scoreAfter = Math.max(0, Math.min(100, scoreBefore + evaluation.effectiveAdjustment));
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
        ["active", "return_pending"].includes(b.status),
        "Disputes can be opened during an active rental or return inspection.",
      );
      requireThat(
        action.reason.trim().length >= 10 && action.photo,
        "Describe the issue (at least 10 characters) and add a photo.",
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
      state.evidence.push({
        id: newId(),
        bookingId: b.id,
        authorId: user.id,
        kind: "dispute",
        photo: action.photo,
        notes: action.reason.trim(),
        createdAt: now,
      });
      b.status = "disputed";
      b.deposit = "disputed";
      notify(
        user.id === b.ownerId ? b.renterId : b.ownerId,
        `A dispute was opened for ${b.title}. Deposit release is paused.`,
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
  }

  return state;
}
