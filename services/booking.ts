import type { Listing } from "../types";
import type { Booking, Marketplace, Profile } from "../types/marketplace";
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
/**
 * Interpret any date or timestamp in Asia/Kuala_Lumpur (UTC+8) unless an explicit timezone offset is provided.
 * Returns UTC epoch milliseconds.
 */
export function parseMalaysiaTimestamp(value: string | number): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") {
    throw new Error("Enter a valid calendar date or timestamp.");
  }
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return parseDate(trimmed);
  }
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const time = Date.parse(trimmed);
    if (!Number.isFinite(time)) {
      throw new Error("Enter a valid calendar date or timestamp.");
    }
    return time;
  }
  const normalized = trimmed.replace(" ", "T");
  const withSecs = /T\d{2}:\d{2}$/.test(normalized) ? `${normalized}:00` : normalized;
  const time = Date.parse(`${withSecs}+08:00`);
  if (!Number.isFinite(time)) {
    throw new Error("Enter a valid calendar date or timestamp.");
  }
  return time;
}

export function parseTimestamp(value: string | number) {
  return parseMalaysiaTimestamp(value);
}

/**
 * Converts a Malaysian local calendar date (YYYY-MM-DD) and optional time (HH:mm)
 * to a canonical UTC ISO timestamp string (e.g. 2026-10-23T03:00:00.000Z).
 */
export function toMalaysiaUtcTimestamp(date: string, time: string = "11:00"): string {
  if (!date) return "";
  const epoch = parseMalaysiaTimestamp(`${date}T${time}`);
  return new Date(epoch).toISOString();
}

/**
 * Formats a UTC timestamp, Malaysian local string or epoch into Malaysia local time (Asia/Kuala_Lumpur, UTC+8)
 * as "D MMM YYYY, hh:mm A" (e.g. "22 Oct 2026, 11:00 AM"), regardless of client browser timezone.
 */
export function formatMalaysiaDateTime(timestamp: string | number): string {
  const epoch = typeof timestamp === "string" ? parseMalaysiaTimestamp(timestamp) : timestamp;
  if (!Number.isFinite(epoch)) return "";
  const myDate = new Date(epoch + 8 * 3600 * 1000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = myDate.getUTCDate();
  const month = months[myDate.getUTCMonth()];
  const year = myDate.getUTCFullYear();
  let hour = myDate.getUTCHours();
  const min = String(myDate.getUTCMinutes()).padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  const hourStr = String(hour).padStart(2, "0");
  return `${day} ${month} ${year}, ${hourStr}:${min} ${ampm}`;
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

  if (profile.riskHistory && profile.riskHistory.length > 0) {
    const seenBookings = new Set<string>();
    const history = [...profile.riskHistory]
      .filter((entry) => {
        if (!entry.bookingId) return true;
        if (seenBookings.has(entry.bookingId)) return false;
        seenBookings.add(entry.bookingId);
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    const score = history.reduce(
      (current, entry) =>
        Math.max(0, Math.min(100, current + entry.effectiveAdjustment)),
      80,
    );
    const tier = tierForScore(score);
    return {
      score,
      level: tier.level,
      label: tier.label,
      canDirectBook: tier.canDirectBook,
    };
  }

  const tier = tierForScore(80);
  return {
    score: 80,
    level: tier.level,
    label: tier.label,
    canDirectBook: tier.canDirectBook,
  };
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

/**
 * Canonical Digital Rental Agreement renderer for CurRENT V3.23.
 * Produces identical, complete multiline contract terms for both Renter and Lender views.
 */
export function formatDigitalRentalAgreement(
  b: Booking,
  state: Marketplace,
  viewRole: "renter" | "owner" = "renter",
): string {
  const renter = state.profiles.find((p) => p.id === b.renterId);
  const lender = state.profiles.find((p) => p.id === b.ownerId);
  const listing = state.listings.find((l) => l.id === b.listingId);

  const renterName = renter?.name || "Renter";
  const lenderName = lender?.name || "Lender";
  const renterVerif = renter?.verification ? renter.verification.replace("_", " ") : "verified";
  const lenderVerif = lender?.verification ? lender.verification.replace("_", " ") : "verified";

  const startFormatted = formatMalaysiaDateTime(b.scheduledPickup || b.start);
  const endFormatted = formatMalaysiaDateTime(b.effectiveReturnDeadline || b.scheduledReturn || b.end);

  const rentalFee = b.quote?.rentalFee ?? 0;
  const serviceFee = b.quote?.serviceFee ?? 0;
  const deposit = b.quote?.deposit ?? 0;
  const total = b.quote?.total ?? (rentalFee + serviceFee + deposit);
  const commission = Math.round(rentalFee * 0.12 * 100) / 100;
  const netPayout = Math.round(rentalFee * 0.88 * 100) / 100;

  const address = b.deliveryAddress || "Authorised Private Delivery Address (Kuala Lumpur)";
  const signedDate = formatMalaysiaDateTime(b.createdAt);

  return [
    `DIGITAL RENTAL AGREEMENT V3.23`,
    `Reference: ${b.id}`,
    ``,
    `1. PARTIES`,
    `• Renter: ${renterName} (${renterVerif})`,
    `• Lender: ${lenderName} (${lenderVerif})`,
    ``,
    `2. RENTAL ITEM & FULFILMENT`,
    `• Item: ${listing?.title || b.title}`,
    `• Fulfilment: Delivery Only`,
    `• Authorised Delivery Address: ${address}`,
    ``,
    `3. SCHEDULE & DURATION`,
    `• Scheduled Rental Start: ${startFormatted} (Asia/Kuala_Lumpur)`,
    `• Scheduled Return: ${endFormatted} (Asia/Kuala_Lumpur)`,
    `• Booked Duration: ${b.quote?.days ?? 1} billable day(s)`,
    ``,
    `4. FINANCIAL TERMS & CHARGES`,
    `• Rental Fee: RM${rentalFee.toFixed(2)}`,
    `• CurRENT Service Fee (5%, min RM5): RM${serviceFee.toFixed(2)}`,
    `• Refundable Security Deposit: RM${deposit.toFixed(2)} (${(b.deposit || "held").replace("_", " ")})`,
    `• Total Paid: RM${total.toFixed(2)} via ${b.paymentMethod || "Demo FPX"}`,
    `• Platform Commission (12%): RM${commission.toFixed(2)}`,
    `• Net Lender Payout (88%): RM${netPayout.toFixed(2)}`,
    ``,
    `5. CONDITIONS & POLICIES`,
    `• Cancellation: Free cancellation up to 24 hours prior to scheduled rental start (Asia/Kuala_Lumpur).`,
    `• Condition Evidence: Renter records ≥6 photos and ≥1 video at delivery check-in and return check-out. Lender reviews shared evidence.`,
    `• Return & Deposit: Mutual clean return confirmation releases the refundable deposit in full. Disputed items hold deposit pending platform review.`,
    `• Academic Simulation: Simulated transaction executed under CurRENT Educational Platform V3.23.`,
    ``,
    `6. DIGITAL SIGNATURES & ACKNOWLEDGEMENT`,
    `• Signed by Renter: ${renterName} (${signedDate} MYT)`,
    `• Acknowledged by Lender: ${lenderName} (${signedDate} MYT)`,
    `• Status: Confirmed & Digitally Executed`,
  ].join("\n");
}
