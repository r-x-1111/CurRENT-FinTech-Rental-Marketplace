export const categories = [
  "All items",
  "Electronics",
  "Gaming",
  "Luxury",
  "Household",
  "Work & Office",
  "Tools",
  "Outdoors",
  "Event Gear",
] as const;

export const MAIN_CATEGORIES = [
  "Electronics",
  "Gaming",
  "Luxury",
  "Household",
  "Work & Office",
  "Tools",
  "Outdoors",
  "Event Gear",
] as const;

// Single shared category vocabulary used by both the Home filter chips and
// every listing's `category` field (set at creation in app/owner/edit.tsx via
// the `categories` export above). Keeping one list means a chip can never
// drift out of sync with the tags actually used on listings.
export const MOBILE_BROWSE_CATEGORIES = ["All Categories", ...MAIN_CATEGORIES] as const;

export type MobileBrowseCategory = (typeof MOBILE_BROWSE_CATEGORIES)[number];

export function mobileBrowseCategoryFor(listing: { category: string }): MobileBrowseCategory {
  return (MAIN_CATEGORIES as readonly string[]).includes(listing.category)
    ? (listing.category as MobileBrowseCategory)
    : "All Categories";
}

export function mobileBrowseCategoryForParam(category?: string): MobileBrowseCategory {
  if (!category || category === "All items" || category === "All Categories") return "All Categories";
  return (MAIN_CATEGORIES as readonly string[]).includes(category)
    ? (category as MobileBrowseCategory)
    : "All Categories";
}

export const MALAYSIAN_STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang",
  "Perak", "Perlis", "Pulau Pinang", "Sabah", "Sarawak", "Selangor",
  "Terengganu", "Kuala Lumpur", "Putrajaya", "Labuan",
] as const;

export const locations = [
  "All Malaysia",
  "Selangor",
  "Johor",
  "Perak",
  "Sabah",
  "Kedah",
  "W.P. Kuala Lumpur",
  "Sarawak",
  "Pulau Pinang",
  "Kelantan",
  "Melaka",
  "Pahang",
  "Terengganu",
  "Negeri Sembilan",
  "Perlis",
  "W.P. Putrajaya",
  "W.P. Labuan",
] as const;

const federalTerritories: Record<string, string> = {
  "W.P. Kuala Lumpur": "Kuala Lumpur",
  "W.P. Putrajaya": "Putrajaya",
  "W.P. Labuan": "Labuan",
};

export const AREA_STATES: Record<string, string> = {
  "Petaling Jaya": "Selangor", "Subang Jaya": "Selangor",
  "Shah Alam": "Selangor", "Bandar Sunway": "Selangor",
  Puchong: "Selangor", Bangsar: "Kuala Lumpur", "Mont Kiara": "Kuala Lumpur",
  "Johor Bahru": "Johor", "George Town": "Pulau Pinang",
};

export function matchesMarketplaceLocation(listingLocation: string, selection: string) {
  if (selection === "All Malaysia" || selection === "All Klang Valley") return true;
  const location = listingLocation.toLowerCase();
  const selectedState = federalTerritories[selection] || selection;
  if (location.includes(selectedState.toLowerCase())) return true;
  return Object.entries(AREA_STATES).some(([area, state]) =>
    state === selectedState && location.includes(area.toLowerCase()));
}
