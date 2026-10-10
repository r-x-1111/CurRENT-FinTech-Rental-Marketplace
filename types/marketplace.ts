import type {
  CollectionMethod,
  Listing,
  RentalStatus,
  RiskLevel,
  VerificationStatus,
} from "./index";

export interface RiskIncidentDetail {
  type: "on_time_success" | "late_return" | "minor_damage" | "serious_damage" | "theft_fraud";
  description: string;
  penalty: number;
  hoursLate?: number;
  isWinning: boolean;
}

export interface RiskIncidentRecord {
  id: string;
  bookingId?: string;
  itemTitle: string;
  date: string;
  incidents: RiskIncidentDetail[];
  effectiveAdjustment: number;
  scoreBefore: number;
  scoreAfter: number;
  appealStatus?: "none" | "pending" | "resolved";
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  verification: VerificationStatus;
  favourites: string[];
  passwordHash?: string;
  salt?: string;
  riskScore?: number | null;
  riskLevel?: RiskLevel;
  isBanned?: boolean;
  hasOverdueObligation?: boolean;
  riskHistory?: RiskIncidentRecord[];
}
export interface Quote {
  days: number;
  rentalFee: number;
  serviceFee: number;
  deposit: number;
  protection: number;
  total: number;
}
export interface Booking {
  id: string;
  listingId: string;
  title: string;
  image: string;
  ownerId: string;
  renterId: string;
  start: string;
  end: string;
  collectionMethod?: CollectionMethod;
  status: RentalStatus;
  quote: Quote;
  riskScore: number;
  payment: "required" | "processing" | "failed" | "paid" | "refunded";
  deposit:
    | "required"
    | "secured"
    | "held"
    | "release_pending"
    | "released"
    | "disputed";
  paymentMethod?: string;
  agreement?: string;
  createdAt: string;
  scheduledPickup?: string;
  scheduledReturn?: string;
  durationMinutes?: number;
  cancellationCutoff?: string;
  lenderHandoverAt?: string | null;
  renterReceivedAt?: string | null;
  activationTimestamp?: string | null;
  effectiveReturnDeadline?: string | null;
  renterReturnConfirmedAt?: string | null;
  lenderReturnConfirmedAt?: string | null;
  actualReturnTimestamp?: string | null;
  consecutiveParentId?: string | null;
  chainBookings?: string[];
  conflictOffer?: {
    revisedEnd: string;
    revisedDurationMinutes: number;
    revisedRentalDays: number;
    originalRentalFee: number;
    revisedRentalFee: number;
    originalServiceFee: number;
    revisedServiceFee: number;
    refundAmount: number;
    depositRetained: number;
  } | null;
}
export interface Evidence {
  id: string;
  bookingId: string;
  authorId: string;
  kind: "check_in" | "check_out" | "dispute";
  photo: string;
  notes: string;
  createdAt: string;
}
export interface Message {
  id: string;
  bookingId: string;
  authorId: string;
  text: string;
  createdAt: string;
}
export interface Review {
  id: string;
  bookingId: string;
  authorId: string;
  recipientId: string;
  rating: number;
  text: string;
}
export interface Notice {
  id: string;
  userId: string;
  title: string;
  bookingId?: string;
  read: boolean;
  createdAt: string;
}
export interface Dispute {
  id: string;
  bookingId: string;
  authorId: string;
  reason: string;
  category?: string;
  status: "under_review" | "resolved";
  createdAt: string;
}
export interface Marketplace {
  version: 1;
  currentUserId: string | null;
  profiles: Profile[];
  listings: Listing[];
  bookings: Booking[];
  messages: Message[];
  evidence: Evidence[];
  reviews: Review[];
  notifications: Notice[];
  disputes: Dispute[];
}
