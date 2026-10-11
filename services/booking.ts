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

export function getEffectiveBookingStatus(
  booking: Booking,
  now = Date.now(),
): Booking["status"] {
  if (
    booking.status === "upcoming" &&
    booking.payment === "paid" &&
    parseMalaysiaTimestamp(booking.start) <= now
  ) {
    return "active";
  }
  return booking.status;
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
  const estimatedValue = listing.estimatedValue;
  if (
    typeof estimatedValue !== "number" ||
    !Number.isFinite(estimatedValue) ||
    estimatedValue <= 0
  ) {
    throw new Error(
      "A protected platform valuation is not available for this listing, so a security deposit and booking total cannot be calculated yet.",
    );
  }
  const days = rentalDays(start, end);
  const rentalFee = Math.round(listing.dailyPrice * days * 100) / 100;
  const serviceFee = calculateBorrowerServiceFee(rentalFee);
  const risk = riskFor(state, profile);
  const deposit = calculateSecurityDeposit(
    estimatedValue,
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

function malaysiaDate(epoch: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(epoch);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** A short, visible availability preview. The return date is exclusive. */
export function availabilityCalendar(
  state: Marketplace,
  listing: Listing,
  count = 21,
  fromDate = dateAfter(),
): CalendarDay[] {
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(parseDate(fromDate) + offset * 86400000)
      .toISOString()
      .slice(0, 10);
    const inAvailabilityPeriod =
      !listing.availabilityPeriods?.length ||
      listing.availabilityPeriods.some(
        (period) => date >= period.start && date <= period.end,
      );
    const outsideWindow =
      listing.status !== "published" ||
      date < dateAfter() ||
      !inAvailabilityPeriod ||
      !!(listing.availableFrom && date < listing.availableFrom) ||
      !!(listing.availableTo && date > listing.availableTo);
    const reserved = state.bookings.some(
      (booking) =>
        booking.listingId === listing.id &&
        ["approved", "payment_required", "confirmed", "upcoming", "active", "return_pending", "disputed"].includes(booking.status) &&
        date >= malaysiaDate(parseMalaysiaTimestamp(booking.start)) &&
        date <= malaysiaDate(parseMalaysiaTimestamp(booking.end) - 1),
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
