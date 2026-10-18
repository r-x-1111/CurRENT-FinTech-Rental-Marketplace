import type {
  CollectionMethod,
  Listing,
  RentalStatus,
  RiskLevel,
  VerificationStatus,
} from "./index";

export interface RiskIncidentDetail {
  type:
    | "on_time_success"
    | "late_return"
    | "return_timing_unassessed"
    | "minor_damage"
    | "serious_damage"
    | "theft_fraud";
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
  phone?: string;
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
  savedDeliveryAddress?: SavedDeliveryAddress;
  savedDeliveryAddresses?: SavedDeliveryAddress[];
  defaultDeliveryAddressIndex?: number;
}

export interface SavedDeliveryAddress {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  postcode: string;
  city: string;
  state: string;
  instructions: string;
}

export interface Quote {
  days: number;
  rentalFee: number;
  serviceFee: number;
  deposit: number;
  protection: number;
  total: number;
}

export interface PlatformReviewRequest {
  id: string;
  renterId: string;
  listingId: string;
  title: string;
  image: string;
  lenderName?: string;
  start: string;
  end: string;
  pickupTime?: string;
  returnTime?: string;
  durationDays?: number;
  collectionMethod?: CollectionMethod;
  deliveryAddress?: string;
  location?: string;
  dailyPrice?: number;
  estimatedRentalFee?: number;
  status: "pending_review";
  statusLabel?: string;
  createdAt: string;
  notes?: string;
  contextMode?: "normal" | "admin_demo";
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
  /** Stored at checkout so later rate changes never rewrite historical payouts. */
  commissionRate?: number;
  /** Optional Shopee-inspired Rental Protection (demo), chosen and priced at CurRENT rental payment time. */
  insurance?: { selected: true; premium: number; referralIncome: number } | null;
  deliveryDemo?: {
    provider: "GrabExpress (Simulation)" | "J&T Express (Demo)";
    origin: string;
    destination: string;
    /** Combined two-way (outbound + return) delivery fee — the actual amount charged. */
    fee: number;
    /** Outbound leg (pickup → delivery), same formula as the renter-side estimate. */
    outboundFee?: number;
    /** Return leg (delivery → pickup), same formula, calculated separately — never assumed equal to outbound. */
    returnFee?: number;
    area?: string;
    distanceKm?: number;
    vehicle?: "Motorcycle" | "Car" | "MPV";
    weightKg?: number;
    dimensionsCm?: { length: number; width: number; height: number };
    baseFare?: number;
    distanceCharge?: number;
    minimumFare?: number;
    pricingReference?: string;
    // Domestic Courier (Demo) fields — set only when provider is "J&T Express (Demo)".
    shippingZone?: "West Malaysia" | "East Malaysia";
    chargeableWeightKg?: number;
    volumetricWeightKg?: number;
    dispatchDate?: string;
    estimatedDeliveryRangeStart?: string;
    estimatedDeliveryRangeEnd?: string;
    returnDispatchDeadline?: string;
    estimatedReturnRangeStart?: string;
    estimatedReturnRangeEnd?: string;
    outboundTrackingRef?: string;
    returnTrackingRef?: string;
    /** Lender's confirmation of the (CurRENT-recommended) outbound dispatch arrangement.
     * "awaiting_lender_confirmation" is the default right after checkout; the lender resolves it
     * via the confirmOutboundDispatch action. */
    outboundDispatchStatus?: "awaiting_lender_confirmation" | "confirmed" | "proposed_alternate" | "drop_off";
    /** Set only while outboundDispatchStatus is "proposed_alternate". */
    lenderProposedDispatchDate?: string;
    /** True only when a lender-proposed dispatch date would push estimated arrival past the
     * rental's own start date — the renter must approve or the booking stays flagged. */
    requiresRenterDispatchApproval?: boolean;
    /** Set once the renter confirms they've dropped the returned parcel at a courier branch
     * (stamped by the existing returnConfirm action for courier bookings — see "Return Method:
     * Courier Branch Drop-off"). */
    returnDropoffConfirmedAt?: string;
    status: "required" | "paid_demo" | "refunded_demo";
    receiptReference?: string;
    paidAt?: string;
    refundedAt?: string;
  };
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
  deliveryAddress?: string;
  /** Renter's delivery postcode, stored alongside deliveryAddress so the fee can always be
   * recomputed from the same automatic postcode-distance formula used at checkout. */
  deliveryPostcode?: string;
  cancelledAt?: string;
  cancelledById?: string;
  createdAt: string;
  scheduledPickup?: string;
  scheduledReturn?: string;
  /** Renter-selected courier collection time ("HH:mm", e.g. "15:00") on the rental end date —
   * independent of scheduledReturn's time-of-day, which stays anchored to the pickup time for
   * 24-hour rental billing. Purely a logistics/display field; never changes rental duration or fees. */
  returnPickupTime?: string;
  /** Domestic Courier (Demo) equivalent of returnPickupTime — CurRENT's auto-suggested return
   * dispatch date ("YYYY-MM-DD", defaults to the rental's end date) instead of an hourly slot.
   * Courier bookings use this field; GrabExpress bookings use returnPickupTime. Never both. */
  returnDispatchDate?: string;
  durationMinutes?: number;
  cancellationCutoff?: string;
  lenderHandoverAt?: string | null;
  /** Lender's confirmation timestamp for the courier outbound dispatch arrangement — mirrors
   * lenderReturnConfirmedAt's role for the return leg, but for the outbound leg. */
  lenderOutboundDispatchConfirmedAt?: string | null;
  renterReceivedAt?: string | null;
  activationTimestamp?: string | null;
  effectiveReturnDeadline?: string | null;
  renterReturnConfirmedAt?: string | null;
  lenderReturnConfirmedAt?: string | null;
  actualReturnTimestamp?: string | null;
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
  contextMode?: "normal" | "admin_demo";
}

export interface DeliveryTransaction {
  id: string;
  renterId: string;
  bookingId?: string;
  itemTitle: string;
  origin: string;
  destination: string;
  area: string;
  distanceKm: number;
  vehicle?: "Motorcycle" | "Car" | "MPV";
  weightKg?: number;
  dimensionsCm?: { length: number; width: number; height: number };
  baseFare: number;
  distanceCharge: number;
  minimumFare: number;
  fee: number;
  pricingReference: string;
  paidAt: string;
  sample: boolean;
  status: "paid_demo";
}

export interface Evidence {
  id: string;
  bookingId: string;
  authorId: string;
  kind: "check_in" | "check_out" | "dispute";
  photo: string;
  photos?: string[];
  videos?: string[];
  notes: string;
  createdAt: string;
}

export interface ConditionIssueReport {
  id: string;
  bookingId: string;
  authorId: string;
  stage: "check_in" | "check_out";
  text: string;
  createdAt: string;
}

export interface Message {
  id: string;
  bookingId?: string;
  conversationId?: string;
  authorId: string;
  text: string;
  imageUri?: string;
  createdAt: string;
  read?: boolean;
}

export interface ChatConversation {
  id: string;
  listingId: string;
  ownerId: string;
  renterId: string;
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
  conversationId?: string;
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

export interface SupportMessage {
  id: string;
  userId: string;
  sender: "user" | "bot" | "human";
  text: string;
  createdAt: string;
  caseId?: string;
}

export interface SupportCase {
  id: string;
  userId: string;
  status: "waiting" | "replied" | "resolved";
  query: string;
  createdAt: string;
  respondedAt?: string;
  assignedStaffId?: string;
}

export interface Marketplace {
  version: 1;
  currentUserId: string | null;
  mode: "normal" | "admin_demo";
  profiles: Profile[];
  listings: Listing[];
  bookings: Booking[];
  deliveryHistory?: DeliveryTransaction[];
  boostTransactions?: {
    id: string;
    ownerId: string;
    listingId: string;
    listingName: string;
    paidAt: string;
    activatedAt: string;
    expiresAt: string;
  }[];
  messages: Message[];
  chatConversations?: ChatConversation[];
  evidence: Evidence[];
  issueReports?: ConditionIssueReport[];
  reviews: Review[];
  notifications: Notice[];
  disputes: Dispute[];
  platformReviewRequests: PlatformReviewRequest[];
  supportMessages: SupportMessage[];
  supportCases: SupportCase[];
}
