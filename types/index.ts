export type VerificationStatus =
  "not_verified" | "pending" | "verified" | "failed";
export type RiskLevel =
  | "low"
  | "medium"
  | "high"
  | "very_high"
  | "unverified";
export type ListingStatus = "draft" | "published" | "paused" | "unavailable";
export type CollectionMethod =
  "Meet Owner" | "Self-Pickup" | "Delivery Available";
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

export interface Listing {
  id: string;
  ownerId: string;
  title: string;
  category: string;
  dailyPrice: number;
  estimatedValue: number;
  ownerEstimatedValue?: number;
  location: string;
  rating: number;
  completedRentalsCount?: number;
  verifiedOwner: boolean;
  imageUrl: string;
  description: string;
  status: ListingStatus;
  images?: string[];
  availableFrom?: string;
  availableTo?: string;
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
