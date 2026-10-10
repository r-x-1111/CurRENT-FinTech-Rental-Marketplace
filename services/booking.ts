import type { Listing } from "../types";
import type { Marketplace, Profile } from "../types/marketplace";
import {
  calculateBorrowerServiceFee,
  calculateSecurityDeposit,
} from "./deposit";
import { calculateRiskScore, tierForScore } from "./riskScore";

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
export function nextDate(value: string) {
  return new Date(parseDate(value) + 86400000).toISOString().slice(0, 10);
}
export function parseTimestamp(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseDate(value);
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new Error("Enter a valid calendar date or timestamp.");
  }
  return time;
}

export function rentalDays(start: string, end: string) {
  const startTime = parseTimestamp(start);
  const endTime = parseTimestamp(end);
  const diffMinutes = (endTime - startTime) / 60000;
  const days = Math.ceil(diffMinutes / 1440);
  if (diffMinutes <= 0 || days < 1 || days > 90) {
    throw new Error(
      "Choose a rental of 1 to 90 days. Return day is not charged.",
    );
  }
  return days;
}

export function riskFor(state: Marketplace, profile: Profile) {
  if (profile.verification !== "verified") {
    return {
      score: null,
      level: "unverified" as const,
      label: "Unverified",
      canDirectBook: false,
    };
  }

  if (
    profile.riskHistory &&
    profile.riskHistory.length > 0 &&
    profile.riskScore !== undefined &&
    profile.riskScore !== null
  ) {
    const tier = tierForScore(profile.riskScore);
    return {
      score: profile.riskScore,
      level: tier.level,
      label: tier.label,
      canDirectBook: tier.canDirectBook,
    };
  }

  const completed = state.bookings.filter(
    (b) => b.renterId === profile.id && b.status === "completed",
  );
  const disputes = state.disputes.filter((d) =>
    state.bookings.some(
      (b) => b.id === d.bookingId && b.renterId === profile.id,
    ),
  );

  if (completed.length > 0 || disputes.length > 0) {
    return calculateRiskScore({
      verified: profile.verification === "verified",
      completedRentals: completed.length,
      lateReturns: 0,
      resolvedDisputes: disputes.filter((d) => d.status === "resolved").length,
      unresolvedSeriousDisputes: disputes.filter(
        (d) => d.status === "under_review",
      ).length,
    });
  }

  if (profile.riskScore !== undefined && profile.riskScore !== null) {
    const tier = tierForScore(profile.riskScore);
    return {
      score: profile.riskScore,
      level: tier.level,
      label: tier.label,
      canDirectBook: tier.canDirectBook,
    };
  }

  return calculateRiskScore({
    verified: profile.verification === "verified",
    completedRentals: 0,
  });
}

export function quoteFor(
  state: Marketplace,
  profile: Profile,
  listing: Listing,
  start: string,
  end: string,
  protectedItem = false,
) {
  const days = rentalDays(start, end);
  const rentalFee = Math.round(listing.dailyPrice * days * 100) / 100;
  const serviceFee = calculateBorrowerServiceFee(rentalFee);
  const risk = riskFor(state, profile);
  const deposit = calculateSecurityDeposit(
    listing.estimatedValue,
    risk.level,
  );
  const protection = 0; // V1.8: No optional protection fee in renter cart
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
    (listing.availableTo && end > nextDate(listing.availableTo))
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

export type CalendarDay = {
  date: string;
  status: "available" | "reserved" | "unavailable";
};

/** A short, visible availability preview. The return date is exclusive. */
export function availabilityCalendar(
  state: Marketplace,
  listing: Listing,
  count = 21,
): CalendarDay[] {
  return Array.from({ length: count }, (_, offset) => {
    const date = dateAfter(offset);
    const outsideWindow =
      listing.status !== "published" ||
      !!(listing.availableFrom && date < listing.availableFrom) ||
      !!(listing.availableTo && date > listing.availableTo);
    const reserved = state.bookings.some(
      (booking) =>
        booking.listingId === listing.id &&
        ["approved", "payment_required", "confirmed", "upcoming", "active", "return_pending", "disputed"].includes(booking.status) &&
        booking.start <= date &&
        date < booking.end,
    );
    return {
      date,
      status: outsideWindow ? "unavailable" : reserved ? "reserved" : "available",
    };
  });
}

export function calculateDurationMinutes(start: string, end: string) {
  const startTime = parseTimestamp(start);
  const endTime = parseTimestamp(end);
  return (endTime - startTime) / 60000;
}

export function calculateCancellationCutoff(scheduledPickup: string) {
  const pickupTime = parseTimestamp(scheduledPickup);
  return new Date(pickupTime - 24 * 60 * 60 * 1000).toISOString();
}

export function isCancellationEligible(scheduledPickup: string, now = Date.now()) {
  const pickupTime = parseTimestamp(scheduledPickup);
  return now <= pickupTime - 24 * 60 * 60 * 1000;
}

export function checkHandoverConflict(
  state: Marketplace,
  booking: {
    id: string;
    listingId: string;
    durationMinutes?: number;
    quote: { days: number; rentalFee: number; serviceFee: number; deposit: number };
  },
  listing: Listing,
  activationTimestamp: number,
) {
  const durationMinutes = booking.durationMinutes || (booking.quote.days * 1440);
  const tentativeEnd = activationTimestamp + durationMinutes * 60000;

  const conflictingBookings = state.bookings.filter(
    (b) =>
      b.id !== booking.id &&
      b.listingId === listing.id &&
      ["confirmed", "upcoming", "active"].includes(b.status) &&
      parseTimestamp(b.start) < tentativeEnd &&
      parseTimestamp(b.end) > activationTimestamp,
  );

  if (conflictingBookings.length === 0) {
    return { hasConflict: false };
  }

  const earliestConflictingStart = Math.min(
    ...conflictingBookings.map((b) => parseTimestamp(b.start)),
  );

  const availableDurationMinutes = Math.max(0, (earliestConflictingStart - activationTimestamp) / 60000);
  if (availableDurationMinutes < 60) {
    return {
      hasConflict: true,
      infeasible: true,
    };
  }

  const revisedRentalDays = Math.max(1, Math.ceil(availableDurationMinutes / 1440));
  const originalRentalFee = booking.quote.rentalFee;
  const originalServiceFee = booking.quote.serviceFee;

  const revisedRentalFee = Math.round(listing.dailyPrice * revisedRentalDays * 100) / 100;
  const revisedServiceFee = calculateBorrowerServiceFee(revisedRentalFee);

  const refundAmount = Math.max(
    0,
    Math.round(((originalRentalFee + originalServiceFee) - (revisedRentalFee + revisedServiceFee)) * 100) / 100,
  );

  return {
    hasConflict: true,
    infeasible: false,
    conflictOffer: {
      revisedEnd: new Date(earliestConflictingStart).toISOString(),
      revisedDurationMinutes: Math.round(availableDurationMinutes),
      revisedRentalDays,
      originalRentalFee,
      revisedRentalFee,
      originalServiceFee,
      revisedServiceFee,
      refundAmount,
      depositRetained: booking.quote.deposit,
    },
  };
}

