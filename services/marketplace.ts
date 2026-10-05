import type { CollectionMethod, Listing, VerificationStatus } from "../types";
import type { Marketplace, Profile, Booking } from "../types/marketplace";
import { availability, parseDate, quoteFor, riskFor } from "./booking";

export type Action =
  | { type: "login"; userId: string | null }
  | { type: "signup"; profile: Profile }
  | { type: "profile"; name: string; avatar?: string }
  | { type: "verify"; status: VerificationStatus }
  | { type: "favourite"; listingId: string }
  | { type: "saveListing"; listing: Listing }
  | { type: "deleteListing"; id: string }
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
      notes?: string;
      method?: string;
      failed?: boolean;
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
          (l.images && l.images.length > 0 && l.imageUrl),
        "Add at least one photo before publishing.",
      );
      requireThat(
        l.status !== "published" || user.verification === "verified",
        "Complete demo identity verification before publishing.",
      );
      const methods = l.collectionMethods || ["Meet Owner"];
      requireThat(
        methods.length > 0 &&
          methods.every((method) =>
            ["Meet Owner", "Self-Pickup", "Delivery Available"].includes(
              method,
            ),
          ),
        "Select a valid collection method.",
      );
      if (l.availableFrom) parseDate(l.availableFrom);
      if (l.availableTo) parseDate(l.availableTo);
      requireThat(
        !l.availableFrom || !l.availableTo || l.availableTo > l.availableFrom,
        "Availability end must be after the start.",
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
    case "request": {
      const listing = state.listings.find((l) => l.id === action.listingId);
      requireThat(listing, "Listing not found.");
      requireThat(
        user.id !== listing.ownerId,
        "You cannot rent your own item.",
      );
      requireThat(
        user.verification === "verified",
        "Complete demo identity verification in Profile before requesting a rental.",
      );
      availability(state, listing, action.start, action.end);
      const collectionMethod = action.collectionMethod || "Meet Owner";
      requireThat(
        (listing.collectionMethods || ["Meet Owner"]).includes(
          collectionMethod,
        ),
        "This collection method is not available for this item.",
      );
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
      state.bookings.unshift({
        id: action.id,
        listingId: listing.id,
        title: listing.title,
        image: listing.imageUrl,
        ownerId: listing.ownerId,
        renterId: user.id,
        start: action.start,
        end: action.end,
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
        riskScore: riskFor(state, user).score,
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
        case "cancel":
          requireThat(
            ["pending", "approved"].includes(b.status) &&
              b.payment !== "processing",
            "Only unpaid requests can be cancelled.",
          );
          b.status = "cancelled";
          notify(
            owner ? b.renterId : b.ownerId,
            `${b.title} request was cancelled.`,
            b.id,
          );
          break;
        case "pay":
          requireThat(
            !owner &&
              b.status === "approved" &&
              ["required", "failed"].includes(b.payment),
            "Payment requires owner approval.",
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
            b.agreement = `DEMO RENTAL AGREEMENT • ${b.id}\nOwner: ${state.profiles.find((p) => p.id === b.ownerId)?.name}\nRenter: ${user.name}\nItem: ${b.title}\nCollection: ${b.start} • Return: ${b.end}\nCollection method: ${b.collectionMethod || "Meet Owner"}${b.collectionMethod === "Delivery Available" ? " (external logistics arrangement; no delivery fee is charged in this demo)" : ""}\nRental: RM${b.quote.rentalFee.toFixed(2)} • Service: RM${b.quote.serviceFee.toFixed(2)} • Protection: RM${b.quote.protection.toFixed(2)}\nRefundable deposit: RM${b.quote.deposit.toFixed(2)}\nTotal: RM${b.quote.total.toFixed(2)}\nBoth parties record condition photos at handover and return. Deposit release follows owner return confirmation; disputed deposits remain on hold for review. No actual money, insurance or deposit custody is provided in this academic demo.\nGenerated ${now}`;
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
          notify(
            checkIn ? b.renterId : b.ownerId,
            checkIn
              ? `${b.title} handover is complete.`
              : `${b.title} is ready for return inspection.`,
            b.id,
          );
          break;
        }
        case "release":
          requireThat(
            owner &&
              b.status === "return_pending" &&
              b.deposit === "release_pending",
            "The owner must inspect a returned item before releasing the deposit.",
          );
          b.status = "completed";
          b.deposit = "released";
          notify(
            b.renterId,
            `Rental complete. Demo deposit released for ${b.title}.`,
            b.id,
          );
          break;
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
