import type { Listing } from "../types";
import type { Marketplace, Profile } from "../types/marketplace";
import {
  calculateBorrowerServiceFee,
  calculateSecurityDeposit,
} from "./deposit";
import { calculateRiskScore } from "./riskScore";

export const money = (value: number) => `RM${value.toFixed(2)}`;
export function dateAfter(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Use dates in YYYY-MM-DD format.");
  const time = Date.parse(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== value
  )
    throw new Error("Enter a valid calendar date.");
  return time;
}
export function rentalDays(start: string, end: string) {
  const days = (parseDate(end) - parseDate(start)) / 86400000;
  if (days < 1 || days > 90)
    throw new Error(
      "Choose a rental of 1 to 90 days. Return day is not charged.",
    );
  return days;
}
export function riskFor(state: Marketplace, profile: Profile) {
  const completed = state.bookings.filter(
    (b) => b.renterId === profile.id && b.status === "completed",
  );
  const reviews = state.reviews.filter((r) => r.recipientId === profile.id);
  const disputes = state.disputes.filter((d) =>
    state.bookings.some(
      (b) => b.id === d.bookingId && b.renterId === profile.id,
    ),
  );
  return calculateRiskScore({
    verified: profile.verification === "verified",
    completedRentals: completed.length,
    averageRating: reviews.length
      ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
      : 0,
    lateReturns: 0,
    resolvedDisputes: disputes.filter((d) => d.status === "resolved").length,
    unresolvedSeriousDisputes: disputes.filter(
      (d) => d.status === "under_review",
    ).length,
  });
}
export function quoteFor(
  state: Marketplace,
  profile: Profile,
  listing: Listing,
  start: string,
  end: string,
  protectedItem: boolean,
) {
  const days = rentalDays(start, end);
  const rentalFee = Math.round(listing.dailyPrice * days * 100) / 100;
  const serviceFee = calculateBorrowerServiceFee(rentalFee);
  const deposit = calculateSecurityDeposit(
    listing.estimatedValue,
    riskFor(state, profile).level,
  );
  const protection =
    protectedItem && listing.estimatedValue <= 60000 ? 5 * days : 0;
  return {
    days,
    rentalFee,
    serviceFee,
    deposit,
    protection,
    total:
      Math.round((rentalFee + serviceFee + deposit + protection) * 100) / 100,
  };
}
export function availability(
  state: Marketplace,
  listing: Listing,
  start: string,
  end: string,
  exceptId?: string,
) {
  rentalDays(start, end);
  if (start < dateAfter())
    throw new Error("Select today or a future collection date.");
  if (listing.status !== "published")
    throw new Error("This listing is not currently available.");
  if (
    (listing.availableFrom && start < listing.availableFrom) ||
    (listing.availableTo && end > listing.availableTo)
  )
    throw new Error("These dates are outside the owner’s availability.");
  if (
    state.bookings.some(
      (b) =>
        b.listingId === listing.id &&
        b.id !== exceptId &&
        [
          "approved",
          "payment_required",
          "confirmed",
          "upcoming",
          "active",
          "return_pending",
          "disputed",
        ].includes(b.status) &&
        start < b.end &&
        end > b.start,
    )
  ) {
    throw new Error("This item is already reserved for those dates.");
  }
}
