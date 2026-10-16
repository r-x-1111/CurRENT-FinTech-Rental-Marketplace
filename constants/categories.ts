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

export const MOBILE_BROWSE_CATEGORIES = [
  "All Categories", "Electronics", "Tools", "Furniture", "Sports & Outdoors",
  "Vehicles", "Party & Events", "Clothing", "Other",
] as const;

export type MobileBrowseCategory = (typeof MOBILE_BROWSE_CATEGORIES)[number];

export function mobileBrowseCategoryFor(listing: { category: string; title: string }): MobileBrowseCategory {
  const category = listing.category;
  if (category === "Electronics" || category === "Tools" || category === "Vehicles" || category === "Furniture" || category === "Clothing") return category;
  if (category === "Outdoors" || category === "Sports & Outdoors") return "Sports & Outdoors";
  if (category === "Event Gear" || category === "Party & Events") return "Party & Events";
  if (/\b(chair|sofa|table|desk|cabinet|stool|shelf|bed)\b/i.test(listing.title)) return "Furniture";
  if (/\b(dress|shirt|jacket|coat|suit|jeans|skirt|handbag|clothing)\b/i.test(listing.title)) return "Clothing";
  return "Other";
}

export function mobileBrowseCategoryForParam(category?: string): MobileBrowseCategory {
  if (!category || category === "All items" || category === "All Items") return "All Categories";
  if (category === "Gaming" || category === "Luxury" || category === "Household" || category === "Work & Office") return "Other";
  return mobileBrowseCategoryFor({ category, title: "" });
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
