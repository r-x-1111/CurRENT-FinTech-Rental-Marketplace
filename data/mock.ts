import type { Listing, Rental } from "../types";

export interface SampleReview {
  id: string;
  itemTitle: string;
  authorName: string;
  location: string;
  rating: number;
  text: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const sampleReviews: SampleReview[] = [
  {
    id: "rev-1",
    itemTitle: "Sony A7 III Mirrorless Camera",
    authorName: "Alex Tan",
    location: "Petaling Jaya",
    rating: 5,
    text: "The camera matched the listing and pickup was smooth. Everything was clear from booking to return.",
  },
  {
    id: "rev-2",
    itemTitle: "Portable Projector",
    authorName: "Sarah L.",
    location: "Subang Jaya",
    rating: 5,
    text: "Easy to arrange pickup and the projector worked well for our event.",
  },
  {
    id: "rev-3",
    itemTitle: "Camping Tent",
    authorName: "Daniel T.",
    location: "Kuala Lumpur",
    rating: 5,
    text: "Clean and in good condition. The return process was straightforward.",
  },
  {
    id: "rev-4",
    itemTitle: "PlayStation 5 + Gamepad",
    authorName: "Jason W.",
    location: "Subang Jaya",
    rating: 5,
    text: "The console was clean, easy to set up and worked perfectly for our weekend gathering.",
  },
  {
    id: "rev-5",
    itemTitle: "Designer Luxury Handbag",
    authorName: "Melissa C.",
    location: "Mont Kiara",
    rating: 5,
    text: "The bag arrived in excellent condition and matched the photos. The handover process was smooth.",
  },
  {
    id: "rev-6",
    itemTitle: "Standing Air Cooler",
    authorName: "Farid H.",
    location: "Bandar Sunway",
    rating: 5,
    text: "The air cooler was easy to move and helped a lot during our event. Pickup and return were straightforward.",
  },
];

export const sampleFaqs: FaqItem[] = [
  {
    question: "How does CurRENT verify users?",
    answer:
      "All users complete simulated eKYC identity verification before being eligible to rent. Verified users receive a trusted badge and an initial Rental Risk Score of 70/100 (Low Risk). Real identity documents are never required or collected in this demo.",
  },
  {
    question: "How is the security deposit handled?",
    answer:
      "The security deposit is determined by the item's reasonable replacement value and your Rental Risk Score. It is held securely during the rental and released in full once both parties confirm a clean physical return with no disputes.",
  },
  {
    question: "How is the security deposit calculated?",
    answer:
      "Deposits are tiered based on your Rental Risk Score: Low Risk (70–100) pays 5% (capped at RM500), Medium Risk (40–69) pays 10% (capped at RM1,000), and High Risk (30–39) pays 15% (capped at RM1,500). Very High Risk (0–29) requires platform review.",
  },
  {
    question: "Can I rent out my own items?",
    answer:
      "Yes! Simply open the Lender Dashboard via your profile or click 'List an Item'. You can set your daily price, published availability, pickup time slots, and manage incoming rentals.",
  },
  {
    question: "How much does CurRENT charge borrowers and lenders?",
    answer:
      "Borrowers pay a 5% service fee (minimum RM5.00). Lenders receive 88% of the rental fee, with CurRENT retaining a 12% platform commission on completed rentals.",
  },
  {
    question: "Is Buy Now Pay Later (BNPL) available?",
    answer:
      "CurRENT supports simulated BNPL for eligible rentals to demonstrate flexible payment options. In this classroom demo, no real credit checks or financial loans are issued.",
  },
];

export const listings: Listing[] = [
  {
    id: "sony-a7iii",
    ownerId: "owner-aiman",
    title: "Sony A7 III Mirrorless Camera",
    category: "Cameras",
    dailyPrice: 45,
    estimatedValue: 4000,
    ownerEstimatedValue: 4500,
    location: "Petaling Jaya",
    rating: 5.0,
    completedRentalsCount: 27,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
    images: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "Full-frame 24.2MP mirrorless camera with 4K HDR recording. Includes 28-70mm lens, 2x batteries, high-speed 128GB SD card, dual charger and padded neck strap.",
    collectionMethods: ["Meet Owner", "Self-Pickup"],
    status: "published",
  },
  {
    id: "portable-projector",
    ownerId: "owner-daniel",
    title: "Portable Projector",
    category: "Electronics",
    dailyPrice: 28,
    estimatedValue: 1200,
    ownerEstimatedValue: 1300,
    location: "Kuala Lumpur",
    rating: 4.7,
    completedRentalsCount: 19,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80",
    images: [
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "Compact Full HD 1080p smart projector with built-in Harman/Kardon speaker, HDMI/Bluetooth inputs and tripod. Perfect for movie nights, gaming, and presentations.",
    collectionMethods: ["Meet Owner", "Delivery Available"],
    status: "published",
  },
  {
    id: "ps5-console",
    ownerId: "owner-sarah",
    title: "PlayStation 5 + Gamepad",
    category: "Gaming",
    dailyPrice: 35,
    estimatedValue: 2400,
    ownerEstimatedValue: 2500,
    location: "Subang Jaya",
    rating: 4.8,
    completedRentalsCount: 34,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1200&q=80",
    images: [
      "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80",
    ],
    description:
      "PlayStation 5 disc edition console with two DualSense wireless controllers, HDMI 2.1 cable, power cord and 3 pre-installed games. Ideal for weekend gatherings.",
    collectionMethods: ["Meet Owner", "Self-Pickup"],
    status: "published",
  },
  {
    id: "monitor-27",
    ownerId: "owner-daniel",
    title: "27\" Computer Monitor",
    category: "Work & Office",
    dailyPrice: 18,
    estimatedValue: 900,
    ownerEstimatedValue: 1000,
    location: "Kuala Lumpur",
    rating: 4.8,
    completedRentalsCount: 15,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80",
    description:
      "27-inch 4K IPS productivity monitor with USB-C 65W power delivery, HDMI and DisplayPort. Ergonomic height-adjustable stand.",
    collectionMethods: ["Meet Owner", "Self-Pickup"],
    status: "published",
  },
  {
    id: "office-chair",
    ownerId: "owner-sarah",
    title: "Ergonomic Office Chair",
    category: "Work & Office",
    dailyPrice: 15,
    estimatedValue: 850,
    ownerEstimatedValue: 950,
    location: "Petaling Jaya",
    rating: 4.7,
    completedRentalsCount: 22,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1580481077195-c328a37db719?auto=format&fit=crop&w=1200&q=80",
    description:
      "High-grade breathable mesh ergonomic desk chair with 3D armrests, dynamic lumbar support and smooth-glide casters.",
    collectionMethods: ["Self-Pickup"],
    status: "published",
  },
  {
    id: "pressure-washer",
    ownerId: "owner-aiman",
    title: "Pressure Washer",
    category: "Tools",
    dailyPrice: 35,
    estimatedValue: 1100,
    ownerEstimatedValue: 1200,
    location: "Shah Alam",
    rating: 4.8,
    completedRentalsCount: 14,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
    description:
      "High-pressure electric washer (140 bar) with 8m hose, foam lance attachment, and adjustable fan nozzle. Perfect for patios and car wash.",
    collectionMethods: ["Meet Owner", "Self-Pickup"],
    status: "published",
  },
  {
    id: "gopro-camera",
    ownerId: "owner-aiman",
    title: "GoPro-style Action Camera",
    category: "Cameras",
    dailyPrice: 30,
    estimatedValue: 1500,
    ownerEstimatedValue: 1600,
    location: "Bangsar",
    rating: 4.9,
    completedRentalsCount: 31,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1564466809058-bf4114d55352?auto=format&fit=crop&w=1200&q=80",
    description:
      "Waterproof 4K action camera with HyperSmooth stabilization, floating hand grip, chest mount, 2 extra batteries and protective casing.",
    collectionMethods: ["Meet Owner", "Self-Pickup", "Delivery Available"],
    status: "published",
  },
  {
    id: "party-speaker",
    ownerId: "owner-daniel",
    title: "Portable Party Speaker",
    category: "Electronics",
    dailyPrice: 40,
    estimatedValue: 1600,
    ownerEstimatedValue: 1700,
    location: "Mont Kiara",
    rating: 4.8,
    completedRentalsCount: 18,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80",
    description:
      "High-output portable Bluetooth speaker with deep bass, dynamic LED light ring, 12-hour rechargeable battery, and wireless microphone.",
    collectionMethods: ["Meet Owner", "Self-Pickup"],
    status: "published",
  },
  {
    id: "drone",
    ownerId: "owner-sarah",
    title: "Drone",
    category: "Electronics",
    dailyPrice: 80,
    estimatedValue: 3500,
    ownerEstimatedValue: 3800,
    location: "Kuala Lumpur",
    rating: 4.8,
    completedRentalsCount: 12,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?auto=format&fit=crop&w=1200&q=80",
    description:
      "Lightweight folding 4K aerial camera drone with 3-axis gimbal, 3x intelligent flight batteries, remote controller and carrying bag.",
    collectionMethods: ["Meet Owner", "Self-Pickup"],
    status: "published",
  },
  {
    id: "luxury-handbag",
    ownerId: "owner-sarah",
    title: "Designer Luxury Handbag",
    category: "Luxury",
    dailyPrice: 120,
    estimatedValue: 6000,
    ownerEstimatedValue: 6500,
    location: "Petaling Jaya",
    rating: 4.9,
    completedRentalsCount: 16,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80",
    description:
      "Authentic designer monogram leather shoulder bag in pristine condition. Includes dust bag, authenticity card, and care booklet.",
    collectionMethods: ["Meet Owner", "Self-Pickup"],
    status: "published",
  },
  {
    id: "luxury-watch",
    ownerId: "owner-aiman",
    title: "Luxury Watch",
    category: "Luxury",
    dailyPrice: 100,
    estimatedValue: 5500,
    ownerEstimatedValue: 6000,
    location: "Mont Kiara",
    rating: 4.8,
    completedRentalsCount: 11,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
    description:
      "Swiss automatic chronometer with sapphire crystal and stainless-steel bracelet. Comes in original presentation box with travel pouch.",
    collectionMethods: ["Meet Owner"],
    status: "published",
  },
  {
    id: "luxury-necklace",
    ownerId: "owner-sarah",
    title: "Designer Luxury Necklace",
    category: "Luxury",
    dailyPrice: 90,
    estimatedValue: 4500,
    ownerEstimatedValue: 4800,
    location: "Petaling Jaya",
    rating: 4.8,
    completedRentalsCount: 9,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=80",
    description:
      "18K gold pendant necklace with brilliant cut accents. Ideal for gala dinners, weddings, and special events.",
    collectionMethods: ["Meet Owner"],
    status: "published",
  },
  {
    id: "standing-cooler",
    ownerId: "owner-daniel",
    title: "Standing Air Cooler",
    category: "Household",
    dailyPrice: 45,
    estimatedValue: 1200,
    ownerEstimatedValue: 1300,
    location: "Bandar Sunway",
    rating: 4.8,
    completedRentalsCount: 25,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    description:
      "Heavy-duty mobile evaporative air cooler with large 45L water tank and ice compartments. Suitable for outdoor parties, patios and workshops.",
    collectionMethods: ["Self-Pickup", "Delivery Available"],
    status: "published",
  },
  {
    id: "microwave",
    ownerId: "owner-daniel",
    title: "Microwave",
    category: "Household",
    dailyPrice: 12,
    estimatedValue: 400,
    ownerEstimatedValue: 450,
    location: "Bandar Sunway",
    rating: 4.7,
    completedRentalsCount: 20,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=1200&q=80",
    description:
      "23L digital inverter microwave with auto-cook menus, express defrost and turntable. Clean and food-safe.",
    collectionMethods: ["Self-Pickup"],
    status: "published",
  },
  {
    id: "tabletop-oven",
    ownerId: "owner-sarah",
    title: "Tabletop Oven",
    category: "Household",
    dailyPrice: 15,
    estimatedValue: 550,
    ownerEstimatedValue: 600,
    location: "Puchong",
    rating: 4.6,
    completedRentalsCount: 17,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=1200&q=80",
    description:
      "35L convection toaster oven with rotisserie spit, baking trays, wire rack and crumb tray. Great for baking and family roasts.",
    collectionMethods: ["Self-Pickup"],
    status: "published",
  },
  {
    id: "fishing-rod",
    ownerId: "owner-aiman",
    title: "Fishing Rod Set",
    category: "Outdoors",
    dailyPrice: 20,
    estimatedValue: 600,
    ownerEstimatedValue: 650,
    location: "Shah Alam",
    rating: 4.8,
    completedRentalsCount: 13,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=1200&q=80",
    description:
      "2-piece carbon fiber spinning rod with smooth reel, braided line, tackle box with hooks and lures, and carry rod bag.",
    collectionMethods: ["Meet Owner", "Self-Pickup"],
    status: "published",
  },
  {
    id: "camping-tent",
    ownerId: "owner-aiman",
    title: "Camping Tent",
    category: "Outdoors",
    dailyPrice: 35,
    estimatedValue: 800,
    ownerEstimatedValue: 850,
    location: "Petaling Jaya",
    rating: 4.8,
    completedRentalsCount: 28,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1478131143081-fd1d858f1e1e?auto=format&fit=crop&w=1200&q=80",
    description:
      "Spacious 4-person waterproof dome tent with double rainfly, ground sheet, peg set, and 2 folding camp chairs. Quick 10-minute setup.",
    collectionMethods: ["Meet Owner", "Self-Pickup"],
    status: "published",
  },
  {
    id: "power-station",
    ownerId: "owner-daniel",
    title: "Portable Power Station",
    category: "Tools",
    dailyPrice: 50,
    estimatedValue: 2200,
    ownerEstimatedValue: 2400,
    location: "Kuala Lumpur",
    rating: 4.7,
    completedRentalsCount: 19,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80",
    description:
      "512Wh LiFePO4 portable battery power station with 500W pure sine wave AC outlets, 65W USB-C PD, and car charging cable.",
    collectionMethods: ["Meet Owner", "Self-Pickup"],
    status: "published",
  },
  {
    id: "wedding-arch",
    ownerId: "owner-sarah",
    title: "Wedding Arch / Backdrop Stand",
    category: "Event Gear",
    dailyPrice: 60,
    estimatedValue: 1500,
    ownerEstimatedValue: 1700,
    location: "Kuala Lumpur",
    rating: 4.9,
    completedRentalsCount: 8,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    description:
      "Heavy-duty gold hexagonal wedding ceremony arch frame with weighted base plates and drapery clips. Disassembles for easy transport in sedan car.",
    collectionMethods: ["Meet Owner", "Self-Pickup"],
    status: "published",
  },
  {
    id: "led-lighting",
    ownerId: "owner-daniel",
    title: "LED Event Lighting Kit",
    category: "Event Gear",
    dailyPrice: 45,
    estimatedValue: 1800,
    ownerEstimatedValue: 2000,
    location: "Petaling Jaya",
    rating: 4.8,
    completedRentalsCount: 21,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80",
    description:
      "Set of 4 RGB wireless uplights with infrared remote, DMX cables, battery-powered and adjustable color temperatures for weddings and gigs.",
    collectionMethods: ["Meet Owner", "Self-Pickup"],
    status: "published",
  },
  {
    id: "photo-booth",
    ownerId: "owner-aiman",
    title: "Photo Booth Setup",
    category: "Event Gear",
    dailyPrice: 100,
    estimatedValue: 4000,
    ownerEstimatedValue: 4400,
    location: "Kuala Lumpur",
    rating: 4.8,
    completedRentalsCount: 15,
    verifiedOwner: true,
    imageUrl:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    description:
      "Ring light tablet booth stand with adjustable height, wireless dye-sublimation mini printer, fun party prop set and tension fabric backdrop.",
    collectionMethods: ["Meet Owner", "Self-Pickup"],
    status: "published",
  },
];

export const rentals: Rental[] = [
  {
    id: "rental-1001",
    listingId: "sony-a7iii",
    listingTitle: "Sony A7 III Mirrorless Camera",
    startDate: "2026-10-12",
    endDate: "2026-10-14",
    status: "active",
    amount: 95.0,
  },
  {
    id: "rental-1002",
    listingId: "ps5-console",
    listingTitle: "PlayStation 5 + Gamepad",
    startDate: "2026-10-25",
    endDate: "2026-10-27",
    status: "upcoming",
    amount: 75.0,
  },
];
