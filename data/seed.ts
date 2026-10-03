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
        favourites: [],
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
    ],
    listings: [
      ...listings.map((l) => ({ ...l, images: [l.imageUrl] })),
      {
        id: "camping-tent",
        ownerId: "owner-aiman",
        title: "Weekend Camping Kit",
        category: "Outdoors",
        dailyPrice: 28,
        estimatedValue: 650,
        location: "Shah Alam",
        rating: 4.8,
        verifiedOwner: true,
        imageUrl:
          "https://images.unsplash.com/photo-1478131143081-fd1d858f1e1e?auto=format&fit=crop&w=1000&q=80",
        description:
          "A roomy two-person tent, groundsheet and two camping chairs. Pack light and make a weekend of it.",
        status: "published",
      },
      {
        id: "bosch-drill",
        ownerId: "owner-daniel",
        title: "Bosch Cordless Drill Set",
        category: "Tools",
        dailyPrice: 18,
        estimatedValue: 550,
        location: "Petaling Jaya",
        rating: 4.9,
        verifiedOwner: true,
        imageUrl:
          "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1000&q=80",
        description:
          "Ready for your next DIY project. Includes drill bits, two batteries, charger and carry case.",
        status: "published",
      },
      {
        id: "city-bike",
        ownerId: "owner-sarah",
        title: "City Explorer Bicycle",
        category: "Outdoors",
        dailyPrice: 25,
        estimatedValue: 900,
        location: "Kuala Lumpur",
        rating: 4.7,
        verifiedOwner: true,
        imageUrl:
          "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1000&q=80",
        description:
          "Comfortable city bicycle with helmet and lock. Perfect for a slow weekend exploring the city.",
        status: "published",
      },
    ],
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
          "Welcome to CurRENT. Your next adventure starts with a little less ownership.",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}
