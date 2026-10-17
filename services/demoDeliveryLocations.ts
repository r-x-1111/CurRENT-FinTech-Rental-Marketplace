/** Postcodes for named fictional demo destinations. Never used for real bookings. */
const demoDestinationPostcodes: Record<string, string> = {
  "mont kiara, kuala lumpur": "50480",
  "bangsar, kuala lumpur": "59100",
  "shah alam, selangor": "40000",
  "puchong, selangor": "47170",
  "petaling jaya, selangor": "46100",
  "subang jaya, selangor": "47500",
  "cheras, kuala lumpur": "56000",
  "georgetown, penang": "10000",
  "bayan lepas, penang": "11900",
  "ampang, kuala lumpur": "55100",
  "klang, selangor": "41000",
  "damansara, selangor": "47400",
  "damansara utama, petaling jaya, selangor": "47400",
};

export function demoDestinationPostcode(address?: string): string | undefined {
  return address ? demoDestinationPostcodes[address.trim().toLowerCase()] : undefined;
}

/** One legacy fictional listing is no longer in the catalogue. */
export function demoPickupLocation(listingId?: string): { address: string; postcode: string } | null {
  return listingId === "wedding-arch"
    ? { address: "Damansara Utama, Petaling Jaya, Selangor", postcode: "47400" }
    : null;
}
