import type { Marketplace } from "../types/marketplace";

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
