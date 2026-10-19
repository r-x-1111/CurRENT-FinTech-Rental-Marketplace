import type { SavedDeliveryAddress } from "../types/marketplace";

export const DEMO_SAVED_DELIVERY_ADDRESSES: SavedDeliveryAddress[] = [
  {
    recipientName: "Alex Tan",
    phone: "+60120001001",
    addressLine1: "18 Jalan SS 2/72",
    addressLine2: "A-12-3, Residensi SS2",
    postcode: "47300",
    city: "Petaling Jaya",
    state: "Selangor",
    instructions: "Fictional classroom demonstration address.",
  },
  {
    recipientName: "Alex Tan",
    phone: "+60120001002",
    addressLine1: "12 Jalan PJU 1A/3",
    addressLine2: "Unit 8-5, Ara Residence",
    postcode: "47301",
    city: "Ara Damansara",
    state: "Selangor",
    instructions: "Fictional classroom demonstration address.",
  },
  {
    recipientName: "Alex Tan",
    phone: "+60120001003",
    addressLine1: "25 Jalan Tun Razak",
    addressLine2: "Unit 15-2, Example Residences",
    postcode: "50400",
    city: "Kuala Lumpur",
    state: "Wilayah Persekutuan Kuala Lumpur",
    instructions: "Fictional classroom demonstration address.",
  },
];

export const DEMO_DEFAULT_DELIVERY_ADDRESS_INDEX = 0;

export const DEMO_LISTING_TEMPLATE = {
  title: "Portable Projector",
  description:
    "Compact Full HD 1080p smart projector with built-in Harman/Kardon speaker, HDMI/Bluetooth inputs and tripod. Perfect for movie nights, gaming, and presentations.",
  category: "Electronics",
  location: "Kuala Lumpur",
  addressLine1: "Lot 10 Concierge, Jalan Sultan Ismail",
  addressLine2: "",
  postcode: "50250",
  city: "Kuala Lumpur",
  state: "Wilayah Persekutuan Kuala Lumpur",
  dailyPrice: "28",
  estimatedValue: 1200,
  parcelWeightKg: 2.5,
  parcelDimensionsCm: { length: 35, width: 28, height: 18 },
  deliveryRequirement: "fragile" as const,
  deliveryTimeSlots: ["10:00", "14:00"],
};

export function getDemoListingAvailability(now = new Date()) {
  const myDate = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
  if (myDate <= "2026-12-31") return { start: myDate < "2026-10-19" ? "2026-10-19" : myDate, end: "2026-12-31" };
  const start = new Date(`${myDate}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 90);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
