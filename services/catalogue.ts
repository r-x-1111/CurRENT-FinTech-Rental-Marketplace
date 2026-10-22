import type { Marketplace } from "../types/marketplace";
import { listings as canonicalCatalogueListings } from "../data/mock";

const removedSeedListings = new Map([
  ["city-explorer-bicycle", "owner-sarah"],
  ["wedding-arch", "owner-daniel"],
]);

export function withoutRemovedSeedListings(state: Marketplace): Marketplace {
  const listings = state.listings.filter(
    (listing) => removedSeedListings.get(listing.id) !== listing.ownerId,
  );
  return listings.length === state.listings.length ? state : { ...state, listings };
}

// Retired demo Return Due fixtures (Luxury Handbag, Portable Power Station) — the intended demo
// scenario now keeps only Pressure Washer and Epson Portable Projector. A Demo Account session
// persisted before this cleanup still carries these booking ids (and their stale "held" deposit,
// evidence, issue-report, message and notification records) in browser storage; re-seeding alone
// never reaches an already-saved session, so this strips them explicitly on every load — never a
// genuine normal-account booking, since these ids only ever exist in the admin_demo seed.
const retiredDemoBookingIds = new Map([
  ["demo-booking-return-due-2", "demo-renter"],
  ["demo-booking-return-due-3", "demo-renter"],
]);

export function withoutRetiredDemoBookings(state: Marketplace): Marketplace {
  const isRetired = (bookingId: string | undefined) =>
    !!bookingId && retiredDemoBookingIds.has(bookingId);
  const bookings = state.bookings.filter(
    (booking) => retiredDemoBookingIds.get(booking.id) !== booking.renterId,
  );
  if (bookings.length === state.bookings.length) return state;
  return {
    ...state,
    bookings,
    evidence: state.evidence.filter((item) => !isRetired(item.bookingId)),
    issueReports: state.issueReports?.filter((item) => !isRetired(item.bookingId)),
    messages: state.messages.filter((item) => !isRetired(item.bookingId)),
    notifications: state.notifications.filter((item) => !isRetired(item.bookingId)),
    disputes: state.disputes.filter((item) => !isRetired(item.bookingId)),
    reviews: state.reviews.filter((item) => !isRetired(item.bookingId)),
  };
}

const canonicalCatalogueListingsById = new Map(
  canonicalCatalogueListings.map((listing) => [listing.id, listing]),
);
// Only these fields — the ones cross-state eligibility and delivery-fee calculations
// actually read — are kept in sync, never title/price/description/etc.
const SHIPPING_FIELDS = [
  "parcelWeightKg",
  "parcelDimensionsCm",
  "deliveryRequirement",
  "parcelPackages",
  "shippingCharacteristics",
  "crossStateRestricted",
  "pickupPostcode",
] as const;

/**
 * A normal account's workspace is persisted indefinitely in Supabase, so its copy of every
 * built-in catalogue listing (Sony A7 III, Portable Projector, Standing Air Cooler, etc.) is
 * frozen at whatever data/mock.ts looked like the moment that workspace was first created —
 * it never re-syncs with later corrections to the canonical seed data. A Demo Account's
 * session, by contrast, is re-seeded fresh from data/mock.ts on every login. Left alone,
 * this means the exact same listing could show a different cross-state eligibility badge (or
 * a different delivery fee estimate) to a normal account than to the Demo Account, purely
 * because of when each account happened to first load — not because of any real difference
 * in the product. This refreshes just the shipping-relevant fields of catalogue-owned
 * listings back to their canonical values on every load. It is keyed on BOTH id and ownerId
 * matching the canonical catalogue entry, so it can never touch a renter's or lender's own
 * listing (a different id), even if that listing happens to reuse a catalogue id's owner.
 */
export function withRefreshedCatalogueShippingData(state: Marketplace): Marketplace {
  let changed = false;
  const listings = state.listings.map((listing) => {
    const canonical = canonicalCatalogueListingsById.get(listing.id);
    if (!canonical || canonical.ownerId !== listing.ownerId) return listing;
    const refreshed: Record<string, unknown> = {};
    let fieldChanged = false;
    for (const field of SHIPPING_FIELDS) {
      if (JSON.stringify(listing[field]) !== JSON.stringify(canonical[field])) {
        refreshed[field] = canonical[field];
        fieldChanged = true;
      }
    }
    if (!fieldChanged) return listing;
    changed = true;
    return { ...listing, ...refreshed };
  });
  return changed ? { ...state, listings } : state;
}
