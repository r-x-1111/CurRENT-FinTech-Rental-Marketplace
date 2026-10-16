export type VerificationStatus =
  "not_verified" | "pending" | "verified" | "failed";
export type RiskLevel =
  | "low"
  | "medium"
  | "high"
  | "very_high"
  | "unverified";
export type ListingStatus = "draft" | "pending_review" | "published" | "rejected" | "paused" | "unavailable";
export type CollectionMethod =
  | "Meet Owner"
  | "Self-Pickup"
  | "Delivery Available"
  | "Delivery Only"
  | "Delivery";
export type RentalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "payment_required"
  | "confirmed"
  | "upcoming"
  | "active"
  | "return_pending"
  | "completed"
  | "cancelled"
  | "disputed";

export interface AvailabilityPeriod {
  id?: string;
  start: string;
  end: string;
}

export interface PickupTimeWindow {
  id?: string;
  start: string; // e.g. "10:00"
  end: string;   // e.g. "12:00"
}

export interface Listing {
  id: string;
  ownerId: string;
  title: string;
  category: string;
  dailyPrice: number;
  estimatedValue?: number;
  ownerEstimatedValue?: number;
  location: string;
  publicArea?: string;
  privateMeetingVenue?: string;
  rating: number;
  completedRentalsCount?: number;
  demoViewCount?: number;
  verifiedOwner: boolean;
  imageUrl: string;
  description: string;
  status: ListingStatus;
  rejectionReason?: string;
  images?: string[];
  videos?: string[];
  availableFrom?: string;
  availableTo?: string;
  availabilityPeriods?: AvailabilityPeriod[];
  pickupTimeWindows?: PickupTimeWindow[];
  deliveryTimeSlots?: string[];
  collectionMethods?: CollectionMethod[];
  featuredUntil?: string | null;
}

export interface Rental {
  id: string;
  listingId: string;
  listingTitle: string;
  startDate: string;
  endDate: string;
  status: RentalStatus;
  amount: number;
}
