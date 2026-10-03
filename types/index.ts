export type VerificationStatus = 'not_verified' | 'pending' | 'verified' | 'failed';
export type RiskLevel = 'low' | 'standard' | 'higher';
export type ListingStatus = 'draft' | 'published' | 'paused' | 'unavailable';
export type RentalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'payment_required'
  | 'confirmed'
  | 'upcoming'
  | 'active'
  | 'return_pending'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface Listing {
  id: string;
  ownerId: string;
  title: string;
  category: string;
  dailyPrice: number;
  estimatedValue: number;
  location: string;
  rating: number;
  verifiedOwner: boolean;
  imageUrl: string;
  description: string;
  status: ListingStatus;
  images?: string[];
  availableFrom?: string;
  availableTo?: string;
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
