import type { Listing, RentalStatus, VerificationStatus } from "./index";

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  verification: VerificationStatus;
  favourites: string[];
  passwordHash?: string;
  salt?: string;
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
