import type { Listing } from "../types";
import type { Booking, Marketplace, Profile } from "../types/marketplace";
import { listings as seededListings } from "../data/mock";
import {
  calculateBorrowerServiceFee,
  calculateSecurityDeposit,
} from "./deposit";
import { calculateRiskScore, tierForScore } from "./riskScore";

export const money = (value: number) => `RM${value.toFixed(2)}`;

/** Formats a "YYYY-MM-DD" (or any ISO) date string as "8 Oct 2026" for ledger/history display. */
export function formatShortDate(dateKey: string): string {
  const [year, month, day] = dateKey.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${months[month - 1]} ${year}`;
}
export const LAST_BOOKABLE_DATE = "2026-12-31";
const DEMO_FIRST_DATE = "2026-10-01";
const DEMO_SLOTS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const DEMO_SEEDED_IDS = new Set(seededListings.map((listing) => listing.id));
export const isDemoSeededListing = (listingId: string) => DEMO_SEEDED_IDS.has(listingId);

/** Stable illustrative gaps, scoped to the Demo renter calendar. */
export function demoSlotAvailable(listingId: string, date: string, slot: string): boolean {
  if (date < DEMO_FIRST_DATE || date > LAST_BOOKABLE_DATE) return false;
  // Preserve the two paid seeded lender reservations as genuine inventory conflicts.
  if (listingId === "office-chair" && slot === "10:00" && date >= "2026-11-05" && date < "2026-11-08") return true;
  if (listingId === "party-speaker" && slot === "14:00" && date >= "2026-11-12" && date < "2026-11-14") return true;
  const slotIndex = DEMO_SLOTS.indexOf(slot);
  if (slotIndex < 0) return false;
  let hash = 2166136261;
  for (const char of `${listingId}:${date}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  if ((hash >>> 0) % 11 === 0 || (day === 0 && (hash >>> 0) % 4 === 0)) return false;
  return ((hash >>> 0) + slotIndex * 13) % 9 !== 0;
}

export function malaysiaDateKey(timestamp: string | number): string {
  const epoch = typeof timestamp === "number" ? timestamp : parseMalaysiaTimestamp(timestamp);
  return new Date(epoch + 8 * 3600000).toISOString().slice(0, 10);
}
export function malaysiaTimeKey(timestamp: string | number): string {
  const epoch = typeof timestamp === "number" ? timestamp : parseMalaysiaTimestamp(timestamp);
  return new Date(epoch + 8 * 3600000).toISOString().slice(11, 16);
}
export function dateAfter(days = 0) {
  return new Date(Date.now() + 8 * 3600000 + days * 86400000).toISOString().slice(0, 10);
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

export function rentalTabForBooking(booking: Booking, now = Date.now()) {
  const status = getEffectiveBookingStatus(booking, now);
  if (status === "disputed") return "Disputed";
  if (status === "completed") return "Completed";
  if (status === "cancelled" || status === "rejected") return "Cancelled";
  if (status === "active" && !booking.renterReturnConfirmedAt && parseMalaysiaTimestamp(booking.end) <= now) return "Return Due";
  if (status === "active" || status === "return_pending") return "Active";
  if (status === "upcoming") return "Upcoming";
  return "Payment & Transaction History";
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

/**
 * Displays the renter's scheduled courier collection date and time: the booking's end date,
 * combined with the separately-selected `returnPickupTime` (never the billing end-timestamp's
 * own time-of-day, which stays locked to the pickup time for 24-hour rental billing). Falls
 * back to the booking's existing scheduled end time for historical bookings recorded before
 * return pickup time selection existed, so their original confirmed schedule is preserved.
 */
export function formatScheduledReturnPickup(booking: { end: string; returnPickupTime?: string }): string {
  if (!booking.returnPickupTime) return formatMalaysiaDateTime(booking.end);
  return formatMalaysiaDateTime(toMalaysiaUtcTimestamp(malaysiaDateKey(booking.end), booking.returnPickupTime));
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

/**
 * Renters pick any available start date and time, but the rental end must land on an exact
 * 24-hour multiple of that start (24h, 48h, 72h, ...), not merely round up to one. The booking
 * UI already enforces this by locking the return clock time to the selected start clock time
 * (see `effectivePickupTime`/`returnTime` in app/listing/[id].tsx), so this is a defence-in-depth
 * guard at the actual booking-creation boundary — not a replacement for `rentalDays`, which keeps
 * its existing ceil-to-next-day rounding for display and for already-recorded historical data.
 */
export function assertExact24HourRentalPeriod(start: string, end: string) {
  const startTime = parseTimestamp(start);
  const endTime = parseTimestamp(end);
  const diffMinutes = (endTime - startTime) / 60000;
  if (diffMinutes <= 0 || diffMinutes % 1440 !== 0) {
    throw new Error(
      "Rental periods must be booked in complete 24-hour blocks from your selected start time (24, 48, 72 hours, and so on).",
    );
  }
}

/**
 * Best-effort Malaysia public holiday calendar for the demo period (2026), used only to skip
 * non-working days when computing the cancelled-deposit release deadline below. Fixed-date
 * national holidays are exact; the moon-based ones (Chinese New Year, Hari Raya, Wesak, Deepavali,
 * Awal Muharram, Maulidur Rasul) are reasonable estimates for 2026, not an authoritative/legal
 * source — fine for this classroom demo, not for real compliance use.
 */
export const MALAYSIA_PUBLIC_HOLIDAYS_2026 = new Set([
  "2026-01-01", // New Year's Day
  "2026-02-17", // Chinese New Year (day 1)
  "2026-02-18", // Chinese New Year (day 2)
  "2026-03-20", // Hari Raya Aidilfitri (day 1, estimated)
  "2026-03-21", // Hari Raya Aidilfitri (day 2, estimated)
  "2026-05-01", // Labour Day
  "2026-05-27", // Hari Raya Haji (estimated)
  "2026-05-31", // Wesak Day (estimated)
  "2026-06-16", // Awal Muharram (estimated)
  "2026-08-26", // Maulidur Rasul (estimated)
  "2026-08-31", // Merdeka Day
  "2026-09-16", // Malaysia Day
  "2026-11-08", // Deepavali (estimated)
  "2026-12-25", // Christmas Day
]);

function isMalaysiaWorkingDay(dateKey: string): boolean {
  const weekday = new Date(`${dateKey}T00:00:00Z`).getUTCDay(); // 0 = Sun, 6 = Sat
  return weekday !== 0 && weekday !== 6 && !MALAYSIA_PUBLIC_HOLIDAYS_2026.has(dateKey);
}

/**
 * Adds `workingDays` Malaysia working days (skipping Saturdays, Sundays and the holidays above)
 * to a timestamp, keeping the same time-of-day. Used to compute the deposit release deadline for
 * a cancelled booking — never the originally scheduled rental end date.
 */
export function addMalaysiaWorkingDays(timestamp: string, workingDays: number): string {
  let cursor = parseTimestamp(timestamp);
  let remaining = workingDays;
  while (remaining > 0) {
    cursor += 86400000;
    if (isMalaysiaWorkingDay(malaysiaDateKey(cursor))) remaining -= 1;
  }
  return new Date(cursor).toISOString();
}

/** A cancelled booking's refundable deposit releases within 5 Malaysia working days of
 * cancellation approval — never calculated from the original scheduled rental end date. */
export function cancelledDepositReleaseDeadline(cancelledAt: string): string {
  return addMalaysiaWorkingDays(cancelledAt, 5);
}

/**
 * The deposit status actually in effect right now for a cancelled booking: once the computed
 * release deadline has passed, a "release_pending" deposit is treated as released even though the
 * stored enum value was set at cancellation time (this demo has no background job to flip it).
 * Non-cancellation deposit states (held, disputed, required, already released) pass through.
 */
export function effectiveDepositStatus(
  booking: { deposit: Booking["deposit"]; depositReleasedAt?: string | null },
  now: number = Date.now(),
): Booking["deposit"] {
  if (booking.deposit === "release_pending" && booking.depositReleasedAt &&
    now >= parseTimestamp(booking.depositReleasedAt)) {
    return "released";
  }
  return booking.deposit;
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

/** Rental-fee-based pricing assumption for the optional Rental Protection demo (informed by
 * Leechy's published 5% protection service fee), not an insurer quotation. */
export const RENTAL_PROTECTION_RATE = 0.05;

/** Proposed maximum protection exposure (informed by Antbuildz Malaysia's published equipment
 * rental protection model) — a demo cap, not a guaranteed insurer payout. */
export const RENTAL_PROTECTION_LIMIT_CAP = 60000;

/**
 * Optional Rental Protection fee (demo pricing assumption, not an insurer quotation).
 * Protection Fee = Total Rental Fee x 5%. No minimum, no seven-day billing periods — rental
 * duration is already reflected in the rental fee.
 */
export function calculateProtectionFee(rentalFee: number): number {
  if (!Number.isFinite(rentalFee) || rentalFee <= 0) return 0;
  return Math.round(rentalFee * RENTAL_PROTECTION_RATE * 100) / 100;
}

/**
 * Proposed Protection Limit = MIN(Item Replacement Value, RM60,000). A proposed maximum
 * exposure, not an automatically guaranteed payout. Items whose replacement value exceeds the
 * cap should be flagged for manual protection eligibility review by the caller.
 */
export function calculateProtectionLimit(replacementValue: number): number {
  if (!Number.isFinite(replacementValue) || replacementValue <= 0) return 0;
  return Math.min(replacementValue, RENTAL_PROTECTION_LIMIT_CAP);
}

/** Whether an item's replacement value exceeds the proposed protection cap and should be
 * flagged for manual protection eligibility review rather than auto-covered. */
export function requiresProtectionEligibilityReview(replacementValue: number): boolean {
  return Number.isFinite(replacementValue) && replacementValue > RENTAL_PROTECTION_LIMIT_CAP;
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
  // Optional Rental Protection (demo only, 5% of the rental fee). Never factored into the security deposit.
  const protection = protectedItem ? calculateProtectionFee(rentalFee) : 0;
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

/** Whether rental payment and delivery payment are collected together as one charge.
 * Defaults to false (current two-step flow: rental paid to CurRENT, delivery paid separately). */
export const SINGLE_CHECKOUT = false;

export type BookingTotals = {
  /** rentalFee + serviceFee + protection (if any) + deposit — identical to quote.total. */
  subtotal: number;
  /** GrabExpress demo delivery fee, or null when not yet known (no address / unavailable). */
  deliveryFee: number | null;
  /** subtotal + deliveryFee, or null when deliveryFee is unknown. */
  grandTotal: number | null;
};

/**
 * Single shared source of truth for the Booking Summary / confirmation / Rental Details totals,
 * so the rental subtotal, delivery fee and combined total always agree everywhere they're shown.
 * Never invents a delivery fee: grandTotal is null whenever deliveryFee is null.
 */
export function getBookingTotals(
  quote: { rentalFee: number; serviceFee: number; deposit: number; protection: number; total: number },
  deliveryFee: number | null,
): BookingTotals {
  const subtotal = quote.total;
  if (deliveryFee == null) return { subtotal, deliveryFee: null, grandTotal: null };
  return {
    subtotal,
    deliveryFee,
    grandTotal: Math.round((subtotal + deliveryFee) * 100) / 100,
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
  assertExact24HourRentalPeriod(start, end);
  if (malaysiaDateKey(start) > LAST_BOOKABLE_DATE || malaysiaDateKey(end) > LAST_BOOKABLE_DATE)
    throw new Error("Bookings must end by 31 December 2026.");
  if (start < dateAfter())
    throw new Error("Select today or a future collection date.");
  if (listing.status !== "published")
    throw new Error("This listing is not currently available.");
  const startDate = malaysiaDateKey(start);
  const endDate = malaysiaDateKey(end);
  if (listing.availabilityPeriods?.length && !listing.availabilityPeriods.some(
    (period) => startDate >= period.start && endDate <= period.end,
  )) throw new Error("These dates are outside the owner’s availability.");
  const slot = malaysiaTimeKey(start);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) && (slot !== malaysiaTimeKey(end) || !DEMO_SLOTS.includes(slot) ||
      (listing.deliveryTimeSlots?.length && !listing.deliveryTimeSlots.includes(slot)) ||
      (!listing.deliveryTimeSlots?.length && listing.pickupTimeWindows?.length && !listing.pickupTimeWindows.some((window) => window.start <= slot && slot <= window.end)))
    ) throw new Error("Choose an available 10 AM–5 PM delivery time.");
  if (state.mode === "admin_demo" && DEMO_SEEDED_IDS.has(listing.id) && !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    for (let date = startDate; date < endDate; date = nextDate(date)) {
      if (!demoSlotAvailable(listing.id, date, slot))
        throw new Error("That Demo delivery time is unavailable for part of the rental.");
    }
  }
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
      date > LAST_BOOKABLE_DATE ||
      (state.mode === "admin_demo" && DEMO_SEEDED_IDS.has(listing.id) && !DEMO_SLOTS.some((slot) =>
        (listing.deliveryTimeSlots?.length ? listing.deliveryTimeSlots.includes(slot) :
          !listing.pickupTimeWindows?.length || listing.pickupTimeWindows.some((window) => window.start <= slot && slot <= window.end)) &&
        demoSlotAvailable(listing.id, date, slot))) ||
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
