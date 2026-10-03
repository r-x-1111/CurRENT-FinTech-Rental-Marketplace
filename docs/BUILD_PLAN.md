# CurRENT Build Plan

This document defines the implementation scope for the CurRENT mobile MVP.

> Implementation update: the core workflows below now operate in a persistent, device-local academic prototype. See [IMPLEMENTATION.md](IMPLEMENTATION.md) for implemented behavior, tests and limitations. Supabase, Realtime and external-provider items in this roadmap remain future live-service work.

## Technical Stack

- React Native with Expo
- TypeScript
- Expo Router
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage for listing and rental-evidence photos
- Supabase Realtime for in-app messaging
- Expo Notifications for future push notifications
- External providers for production eKYC, payments, deposit handling, BNPL and item protection

The repository currently includes a mobile UI foundation, business calculation utilities, a Supabase client, and the initial database schema.

## MVP Priority

The first usable version should make the core rental transaction work from beginning to end.

1. Authentication and profile creation
2. Marketplace listings and search
3. Owner listing creation with image upload
4. Item details and availability
5. Rental request
6. Owner approval or rejection
7. Rental Risk Score
8. Risk-based security deposit
9. Mock checkout and transaction recording
10. Rental dashboard
11. In-app messaging
12. Check-in and check-out evidence
13. Reviews
14. Dispute management
15. In-app notifications

## External Integrations

For the academic MVP, the following should be represented through service adapters or realistic simulated states rather than real production financial transactions:

- eKYC
- Card payment settlement
- Deposit custody and release
- BNPL
- Insurance or item protection

This keeps the application implementable without presenting CurRENT itself as a bank, insurer, BNPL provider or licensed escrow provider.

## Main Navigation

The renter interface uses five primary tabs:

- Home
- Explore
- Rentals
- Messages
- Profile

Owner functions are available through Owner Mode from the user profile rather than a separate application.

## Core Renter Flow

Sign up → Verify account → Browse/search → Item details → Select dates → Review fees and deposit → Submit request → Owner approval → Payment → Deposit secured → Digital agreement → Messaging → Check-in → Active rental → Check-out → Deposit release → Review

## Core Owner Flow

Sign up → Verify account → Create listing → Upload photos → Set price/location/availability → Publish → Receive request → Review renter and risk information → Approve/reject → Confirm payment/deposit → Handover → Check-in → Return → Check-out → Payout → Review renter

## Risk Score

The current code uses a transparent rules-based score for the prototype. It starts at 50 and adjusts for verification, successful rentals, ratings, late returns and disputes. The score is capped between 0 and 100.

Suggested risk levels:

- 75–100: Low Risk
- 50–74: Standard Risk
- 0–49: Higher Risk

The prototype should not claim that this is an AI or machine-learning model.

## Security Deposit

The current prototype calculation is:

- Low Risk: 10% of estimated item value
- Standard Risk: 20%
- Higher Risk: 30%

These are prototype rules and can be changed later after business and regulatory validation.

## Fees

Current project assumptions:

- Borrower service fee: 5% of rental fee, with RM5 minimum where applicable
- Owner commission: 12% of rental fee

Checkout must clearly distinguish the rental fee from the refundable security deposit.

## Database

The initial Supabase schema includes:

- profiles
- listings
- listing_images
- bookings
- payments
- deposits
- messages
- reviews
- rental_evidence
- disputes
- favourites
- notifications

Row Level Security is enabled in the migration. Production policies should be reviewed before release, particularly for financial actions and dispute administration.

## Next Development Tasks

### Phase 1

- Connect a real Supabase project
- Implement sign up, login and logout
- Replace mock marketplace data with database queries
- Add listing creation and image upload

### Phase 2

- Add date availability and booking creation
- Add owner approval/rejection
- Persist Risk Score and deposit calculations
- Implement mock payment flow

### Phase 3

- Realtime messaging
- Check-in/check-out photo uploads
- Reviews and ratings
- Disputes and evidence
- In-app notifications

### Phase 4

- Integrate authorised third-party sandbox/test providers where appropriate
- Improve accessibility and validation
- Add automated tests
- Add analytics and error monitoring
- Prepare store builds with EAS

## Out of Scope for the First MVP

Do not prioritise these until the core rental flow works:

- Referral rewards
- Listing boosts
- Rental bundles
- Advanced recommendation models
- Complex loyalty systems
- Real-money BNPL integration
- Automated dispute decisions
