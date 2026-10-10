import { listings } from "./mock";
import type { Marketplace } from "../types/marketplace";

export function createSeed(): Marketplace {
  return {
    version: 1,
    currentUserId: "demo-renter",
    profiles: [
      {
        id: "demo-renter",
        name: "Alex Tan",
        email: "alex@demo.current",
        verification: "verified",
        riskScore: 70,
        riskLevel: "low",
        favourites: ["sony-a7iii"],
      },
      {
        id: "owner-aiman",
        name: "Aiman Rahman",
        email: "aiman@demo.current",
        verification: "verified",
        favourites: [],
      },
      {
        id: "owner-sarah",
        name: "Sarah Lim",
        email: "sarah@demo.current",
        verification: "verified",
        favourites: [],
      },
      {
        id: "owner-daniel",
        name: "Daniel Lee",
        email: "daniel@demo.current",
        verification: "verified",
        favourites: [],
      },
      {
        id: "unverified-renter",
        name: "Chloe Ng",
        email: "chloe@demo.current",
        verification: "not_verified",
        riskScore: null,
        riskLevel: "unverified",
        favourites: [],
      },
      {
        id: "high-risk-renter",
        name: "Kenji Sato",
        email: "kenji@demo.current",
        verification: "verified",
        riskScore: 25,
        riskLevel: "very_high",
        favourites: [],
      },
      {
        id: "overdue-renter",
        name: "Marcus Wong",
        email: "marcus@demo.current",
        verification: "verified",
        riskScore: 65,
        riskLevel: "medium",
        hasOverdueObligation: true,
        favourites: [],
      },
    ],
    listings: listings.map((l) => ({
      ...l,
      images: l.images && l.images.length > 0 ? l.images : [l.imageUrl],
    })),
    bookings: [],
    messages: [],
    evidence: [],
    reviews: [],
    disputes: [],
    notifications: [
      {
        id: "welcome",
        userId: "demo-renter",
        title:
          "Welcome to CurRENT. Rent what you need. Earn from what you own.",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}
