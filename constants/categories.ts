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

export const MALAYSIAN_STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang",
  "Perak", "Perlis", "Pulau Pinang", "Sabah", "Sarawak", "Selangor",
  "Terengganu", "Kuala Lumpur", "Putrajaya", "Labuan",
] as const;

export const locations = [
  "All Malaysia",
  ...MALAYSIAN_STATES,
  "Petaling Jaya",
  "Subang Jaya",
  "Shah Alam",
  "Bangsar",
  "Mont Kiara",
  "Bandar Sunway",
  "Puchong",
] as const;

export const AREA_STATES: Record<string, string> = {
  "Petaling Jaya": "Selangor", "Subang Jaya": "Selangor",
  "Shah Alam": "Selangor", "Bandar Sunway": "Selangor",
  Puchong: "Selangor", Bangsar: "Kuala Lumpur", "Mont Kiara": "Kuala Lumpur",
  "Johor Bahru": "Johor", "George Town": "Pulau Pinang",
};

export function matchesMarketplaceLocation(listingLocation: string, selection: string) {
  if (selection === "All Malaysia" || selection === "All Klang Valley") return true;
  const location = listingLocation.toLowerCase();
  if (location.includes(selection.toLowerCase())) return true;
  return Object.entries(AREA_STATES).some(([area, state]) =>
    state === selection && location.includes(area.toLowerCase()));
}
