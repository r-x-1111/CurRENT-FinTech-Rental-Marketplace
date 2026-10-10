import { listings } from "./mock";
import type { Marketplace, Profile, Booking, Message, Notice, Dispute, Evidence, PlatformReviewRequest } from "../types/marketplace";

export function createNormalSeed(): Marketplace {
  return {
    version: 1,
    currentUserId: "demo-renter",
    mode: "normal",
    profiles: [
      {
        id: "demo-renter",
        name: "Alex Tan",
        email: "alex@demo.current",
        verification: "verified",
        riskScore: 75,
        riskLevel: "medium",
        favourites: [],
        riskHistory: [],
      },
      {
        id: "owner-aiman",
        name: "Aiman Rahman",
        email: "aiman@demo.current",
        verification: "verified",
        favourites: [],
        riskHistory: [],
      },
      {
        id: "owner-sarah",
        name: "Sarah Lim",
        email: "sarah@demo.current",
        verification: "verified",
        favourites: [],
        riskHistory: [],
      },
      {
        id: "owner-daniel",
        name: "Daniel Lee",
        email: "daniel@demo.current",
        verification: "verified",
        favourites: [],
        riskHistory: [],
      },
      {
        id: "unverified-renter",
        name: "Chloe Ng",
        email: "chloe@demo.current",
        verification: "not_verified",
        riskScore: null,
        riskLevel: "unverified",
        favourites: [],
        riskHistory: [],
      },
      {
        id: "high-risk-renter",
        name: "Kenji Sato",
        email: "kenji@demo.current",
        verification: "verified",
        riskScore: 25,
        riskLevel: "very_high",
        favourites: [],
        riskHistory: [],
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
        riskHistory: [],
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
        title: "Welcome to CurRENT. Rent what you need. Earn from what you own.",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ],
    platformReviewRequests: [],
  };
}

export function createAdminDemoSeed(): Marketplace {
  const normal = createNormalSeed();

  const demoBookings: Booking[] = [
    // 1. Upcoming confirmed booking (for relocated rental-summary card)
    {
      id: "demo-booking-upcoming",
      listingId: "sony-a7iii",
      title: "Sony A7 III Mirrorless Camera",
      image: "/products/sony-a7iii.jpg",
      ownerId: "owner-aiman",
      renterId: "demo-renter",
      start: "2026-11-02T10:00:00Z",
      end: "2026-11-04T10:00:00Z",
      collectionMethod: "Self-Pickup",
      status: "upcoming",
      quote: {
        days: 2,
        rentalFee: 90,
        serviceFee: 5,
        deposit: 400, // 75 Medium = 10% of RM4,000 = RM400
        protection: 0,
        total: 495, // RM495 (Demo)
      },
      riskScore: 75,
      payment: "paid",
      deposit: "held",
      paymentMethod: "Demo FPX",
      agreement: "Digital Rental Agreement V3.15 — Signed by Alex Tan",
      createdAt: "2026-10-08T09:00:00Z",
      scheduledPickup: "2026-11-02T10:00:00Z",
      scheduledReturn: "2026-11-04T10:00:00Z",
      durationMinutes: 2880,
      cancellationCutoff: "2026-11-01T10:00:00Z",
      contextMode: "admin_demo",
    },
    // 2. Active booking with both activation confirmations (Return Due example)
    {
      id: "demo-booking-active",
      listingId: "portable-projector",
      title: "Portable Projector",
      image: "/products/portable-projector.jpg",
      ownerId: "owner-daniel",
      renterId: "demo-renter",
      start: "2026-10-09T14:00:00Z",
      end: "2026-10-11T14:00:00Z",
      collectionMethod: "Meet Owner",
      status: "active",
      quote: {
        days: 2,
        rentalFee: 56,
        serviceFee: 5,
        deposit: 120, // 10% of RM1,200 = RM120
        protection: 0,
        total: 181,
      },
      riskScore: 75,
      payment: "paid",
      deposit: "held",
      paymentMethod: "Demo Card",
      agreement: "Digital Rental Agreement V3.15 — Signed by Alex Tan",
      createdAt: "2026-10-08T10:00:00Z",
      scheduledPickup: "2026-10-09T14:00:00Z",
      scheduledReturn: "2026-10-11T14:00:00Z",
      durationMinutes: 2880,
      lenderHandoverAt: "2026-10-09T14:05:00Z",
      renterReceivedAt: "2026-10-09T14:06:00Z",
      activationTimestamp: "2026-10-09T14:06:00Z",
      effectiveReturnDeadline: "2026-10-11T14:06:00Z",
      contextMode: "admin_demo",
    },
    // 3. Completed rental with evidence and dual clean confirmations (+2 points awarded)
    {
      id: "demo-booking-completed",
      listingId: "ps5-console",
      title: "PlayStation 5 + Gamepad",
      image: "/products/ps5-console.jpg",
      ownerId: "owner-sarah",
      renterId: "demo-renter",
      start: "2026-10-01T10:00:00Z",
      end: "2026-10-03T10:00:00Z",
      collectionMethod: "Meet Owner",
      status: "completed",
      quote: {
        days: 2,
        rentalFee: 70,
        serviceFee: 5,
        deposit: 240,
        protection: 0,
        total: 315,
      },
      riskScore: 73,
      payment: "paid",
      deposit: "released",
      paymentMethod: "Demo FPX",
      agreement: "Digital Rental Agreement V3.15 — Signed by Alex Tan",
      createdAt: "2026-09-30T10:00:00Z",
      scheduledPickup: "2026-10-01T10:00:00Z",
      scheduledReturn: "2026-10-03T10:00:00Z",
      durationMinutes: 2880,
      lenderHandoverAt: "2026-10-01T10:00:00Z",
      renterReceivedAt: "2026-10-01T10:01:00Z",
      activationTimestamp: "2026-10-01T10:01:00Z",
      renterReturnConfirmedAt: "2026-10-03T09:45:00Z",
      lenderReturnConfirmedAt: "2026-10-03T09:50:00Z",
      actualReturnTimestamp: "2026-10-03T09:45:00Z",
      contextMode: "admin_demo",
    },
    // 4. Cancelled booking (cancelled > 24h before scheduled pickup, full refund)
    {
      id: "demo-booking-cancelled",
      listingId: "monitor-27",
      title: "27\" Computer Monitor",
      image: "/products/monitor-27.jpg",
      ownerId: "owner-daniel",
      renterId: "demo-renter",
      start: "2026-11-10T10:00:00Z",
      end: "2026-11-12T10:00:00Z",
      collectionMethod: "Self-Pickup",
      status: "cancelled",
      quote: {
        days: 2,
        rentalFee: 36,
        serviceFee: 5,
        deposit: 90,
        protection: 0,
        total: 131,
      },
      riskScore: 75,
      payment: "refunded",
      deposit: "released",
      createdAt: "2026-10-05T10:00:00Z",
      scheduledPickup: "2026-11-10T10:00:00Z",
      scheduledReturn: "2026-11-12T10:00:00Z",
      cancellationCutoff: "2026-11-09T10:00:00Z",
      contextMode: "admin_demo",
    },
    // 5. Disputed booking (held for dispute review)
    {
      id: "demo-booking-disputed",
      listingId: "pressure-washer",
      title: "Pressure Washer",
      image: "/products/pressure-washer.jpg",
      ownerId: "owner-aiman",
      renterId: "demo-renter",
      start: "2026-09-20T10:00:00Z",
      end: "2026-09-22T10:00:00Z",
      collectionMethod: "Meet Owner",
      status: "disputed",
      quote: {
        days: 2,
        rentalFee: 70,
        serviceFee: 5,
        deposit: 110,
        protection: 0,
        total: 185,
      },
      riskScore: 75,
      payment: "paid",
      deposit: "disputed",
      createdAt: "2026-09-18T10:00:00Z",
      scheduledPickup: "2026-09-20T10:00:00Z",
      scheduledReturn: "2026-09-22T10:00:00Z",
      lenderHandoverAt: "2026-09-20T10:00:00Z",
      renterReceivedAt: "2026-09-20T10:00:00Z",
      activationTimestamp: "2026-09-20T10:00:00Z",
      renterReturnConfirmedAt: "2026-09-22T11:00:00Z",
      actualReturnTimestamp: "2026-09-22T11:00:00Z",
      contextMode: "admin_demo",
    },
  ];

  const demoMessages: Message[] = [
    {
      id: "msg-1",
      bookingId: "demo-booking-upcoming",
      authorId: "owner-aiman",
      text: "Hi Alex! The Sony A7 III is ready for pickup at Jaya One on Monday at 10:00 AM.",
      createdAt: "2026-10-09T11:00:00Z",
      read: false,
    },
    {
      id: "msg-2",
      bookingId: "demo-booking-upcoming",
      authorId: "demo-renter",
      text: "Thanks Aiman! I will be there on time with my demo verification ready.",
      createdAt: "2026-10-09T11:05:00Z",
      read: true,
    },
    {
      id: "msg-3",
      bookingId: "demo-booking-upcoming",
      authorId: "owner-aiman",
      text: "Great! Both fully charged batteries and the 128GB SD card are included.",
      createdAt: "2026-10-09T11:10:00Z",
      read: false,
    },
  ];

  const demoEvidence: Evidence[] = [
    {
      id: "ev-1",
      bookingId: "demo-booking-completed",
      authorId: "demo-renter",
      kind: "check_out",
      photo: "/products/ps5-console.jpg",
      notes: "Console and controllers returned in clean condition without scratch.",
      createdAt: "2026-10-03T09:45:00Z",
    },
    {
      id: "ev-2",
      bookingId: "demo-booking-disputed",
      authorId: "owner-aiman",
      kind: "dispute",
      photo: "/products/pressure-washer.jpg",
      notes: "High pressure nozzle tip shows crack upon return inspection.",
      createdAt: "2026-09-22T11:30:00Z",
    },
  ];

  const demoDisputes: Dispute[] = [
    {
      id: "disp-1",
      bookingId: "demo-booking-disputed",
      authorId: "owner-aiman",
      reason: "Nozzle tip damaged upon return.",
      category: "minor_damage",
      status: "under_review",
      createdAt: "2026-09-22T11:30:00Z",
    },
  ];

  const demoPlatformRequests: PlatformReviewRequest[] = [
    {
      id: "REQ-D4A89C1F",
      renterId: "demo-renter",
      listingId: "drone",
      title: "Drone",
      image: "/products/drone.jpg",
      lenderName: "Sarah Lim",
      start: "2026-11-15",
      end: "2026-11-18",
      pickupTime: "11:00 AM",
      returnTime: "11:00 AM",
      durationDays: 3,
      collectionMethod: "Meet Owner",
      location: "Kuala Lumpur",
      dailyPrice: 80,
      estimatedRentalFee: 240,
      status: "pending_review",
      statusLabel: "Pending CurRENT Review (Demo)",
      createdAt: "2026-10-08T15:00:00Z",
      notes: "Pending CurRENT Review (Demo). Application submitted for CurRENT platform assessment.",
      contextMode: "admin_demo",
    },
  ];

  // Preseeded incident history for the classroom demo scoring audit
  const demoRiskHistory = [
    {
      id: "inc-1",
      bookingId: "demo-booking-completed",
      itemTitle: "PlayStation 5 + Gamepad",
      date: "2026-10-03",
      incidents: [
        {
          type: "on_time_success" as const,
          description: "Completed on-time with no confirmed issues (+2 points)",
          penalty: 2,
          isWinning: true,
        },
      ],
      effectiveAdjustment: 2,
      scoreBefore: 73,
      scoreAfter: 75,
      appealStatus: "none" as const,
    },
  ];

  return {
    ...normal,
    mode: "admin_demo",
    profiles: normal.profiles.map((p) =>
      p.id === "demo-renter"
        ? { ...p, riskHistory: demoRiskHistory, favourites: ["sony-a7iii"] }
        : p
    ),
    bookings: demoBookings,
    messages: demoMessages,
    evidence: demoEvidence,
    disputes: demoDisputes,
    platformReviewRequests: demoPlatformRequests,
  };
}

export function createSeed(mode: "normal" | "admin_demo" = "normal"): Marketplace {
  return mode === "admin_demo" ? createAdminDemoSeed() : createNormalSeed();
}
