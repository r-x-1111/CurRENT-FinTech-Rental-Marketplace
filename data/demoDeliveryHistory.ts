import type { DeliveryTransaction } from "../types/marketplace";
import { quoteDemoDelivery, type DeliveryArea } from "../services/delivery";

// Demo delivery pricing is scoped to Klang Valley and Penang only (see services/delivery.ts).
const examples: { id: string; itemTitle: string; area: DeliveryArea; origin: string; destination: string; distanceKm: number; paidAt: string }[] = [
  { id: "DEMO-GE-SAMPLE-001", itemTitle: "Portable Projector", area: "Klang Valley", origin: "Mont Kiara, Kuala Lumpur", destination: "Bangsar, Kuala Lumpur", distanceKm: 8, paidAt: "2026-09-12T10:00:00+08:00" },
  { id: "DEMO-GE-SAMPLE-002", itemTitle: "PlayStation 5", area: "Penang", origin: "Bukit Mertajam, Pulau Pinang", destination: "George Town, Pulau Pinang", distanceKm: 12, paidAt: "2026-09-19T13:20:00+08:00" },
  { id: "DEMO-GE-SAMPLE-003", itemTitle: "Camping Equipment", area: "Penang", origin: "George Town, Pulau Pinang", destination: "Bayan Lepas, Pulau Pinang", distanceKm: 6, paidAt: "2026-09-27T09:15:00+08:00" },
  { id: "DEMO-GE-SAMPLE-004", itemTitle: "Camera Equipment", area: "Klang Valley", origin: "Petaling Jaya, Selangor", destination: "Subang Jaya, Selangor", distanceKm: 5, paidAt: "2026-10-03T11:30:00+08:00" },
];

export function demoDeliverySamples(): DeliveryTransaction[] {
  return examples.map((entry) => {
    const quote = quoteDemoDelivery(entry.area, "Motorcycle", entry.distanceKm)!;
    return { id: entry.id, renterId: "demo-renter", itemTitle: entry.itemTitle,
      origin: entry.origin, destination: entry.destination, area: entry.area,
      distanceKm: entry.distanceKm, vehicle: "Motorcycle", weightKg: 1,
      dimensionsCm: { length: 20, width: 20, height: 20 },
      baseFare: quote.baseFare, distanceCharge: quote.distanceCharge,
      minimumFare: quote.minimumFare, fee: quote.fee, pricingReference: quote.reference,
      paidAt: entry.paidAt, sample: true, status: "paid_demo" };
  });
}
