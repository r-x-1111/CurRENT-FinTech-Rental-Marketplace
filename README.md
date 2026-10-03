# CurRENT

CurRENT is a Malaysia-based FinTech-integrated peer-to-peer rental marketplace. It allows users to rent items they only need temporarily, while owners can earn income from underused assets.

The initial market focus is Klang Valley.

> **Positioning:** Rent what you need. Earn from what you own.

## Project Goal

CurRENT is designed to make peer-to-peer renting safer and more practical by combining marketplace functions with payment, verification and rental-risk features.

The project focuses on a realistic mobile application experience rather than a simple marketplace landing page.

## Main Users

### Renters
People who need temporary access to items without buying them, including students, young professionals, freelancers and short-term residents.

### Owners
Individuals or small businesses with underused equipment or valuable items that can be rented out.

## Core Features

### Marketplace
- Browse and search rental listings
- Filter by category, location, price and availability
- View item photos, prices, ratings and owner profiles
- Save favourite items
- Check rental availability

### Account and Verification
- Sign up and log in
- User profiles
- Profile photo
- eKYC verification through an external authorised provider
- Verification status and verified-user badge
- Reviews, ratings and rental history

### Listing Management
Owners can:
- Create, edit, pause and delete listings
- Upload and manage item photos
- Select a main photo
- Set category, description, location and daily price
- Set item availability
- Review incoming rental requests

At least one item photo is required before a listing can be published.

### Booking
Renters can:
- Select rental dates
- View rental fee, service fee, refundable deposit and item protection
- Submit a rental request
- Wait for owner approval
- Complete payment after approval
- Track booking status
- Cancel where permitted

## FinTech Features

### Rental Risk Score
The Rental Risk Score supports owner decisions and risk-based rental controls.

Possible inputs include:
- Identity verification
- Rental history
- Completed rentals
- Late returns
- Disputes
- Reviews
- Transaction behaviour
- Account history

The score may influence security deposits, rental limits and access to higher-value items.

### Risk-Based Security Deposit
The refundable security deposit may vary based on:
- Item value
- Verification status
- Rental Risk Score
- Rental history

Possible deposit statuses include:
- Required
- Secured
- Held
- Release pending
- Released
- Disputed

Deposit holding should be handled through an appropriate payment or service provider rather than presented as CurRENT operating its own regulated escrow service.

### Payments
The application keeps rental payments on-platform.

Checkout should clearly separate:
- Rental fee
- Borrower service fee
- Refundable security deposit
- Item protection
- Total payable

Current project assumptions:
- Borrower service fee: 5% of rental value, with RM5 minimum where applicable
- Owner platform commission: 12% of rental amount

### Item Protection
Eligible rentals may receive protection through an external insurance or protection provider.

For eligible higher-value items, protection of up to RM60,000 may be available, subject to partner terms, eligibility and coverage conditions.

### Optional BNPL
Eligible users may use an external BNPL provider for selected higher-value rental fees.

The refundable security deposit remains separate from BNPL.

## Rental Process

### Renter Flow
1. Sign up and complete verification
2. Search for an item
3. View item and owner details
4. Select rental dates
5. Review fees and deposit
6. Submit rental request
7. Owner approves or rejects
8. Complete payment
9. Deposit is secured
10. Digital rental agreement is generated
11. Message the owner
12. Complete check-in
13. Use the item
14. Complete check-out
15. Deposit is released where applicable
16. Leave a review

### Owner Flow
1. Sign up and complete verification
2. Create a listing
3. Upload item photos
4. Set price, location and availability
5. Publish the listing
6. Receive a rental request
7. Review renter profile and risk information
8. Approve or reject the request
9. Confirm payment and deposit status
10. Complete handover and check-in
11. Monitor the active rental
12. Complete return and check-out
13. Receive payout
14. Review the renter

## Supporting Functions

- In-app messaging
- Notifications
- Digital rental agreements
- Check-in and check-out photo evidence
- Reviews and ratings
- Transaction history
- Payment history
- Dispute reporting and evidence upload
- Deposit release tracking
- Saved items
- Owner earnings and payout history

## Mobile App Navigation

Primary navigation:

- **Home** — recommendations, categories and active rental reminders
- **Explore** — search, filters and marketplace browsing
- **Rentals** — requests, upcoming, active and completed rentals
- **Messages** — renter and owner conversations
- **Profile** — verification, payments, reviews, settings and account information

Owners can access an **Owner Mode** for listings, rental requests, earnings and payouts.

## Application States

The interface should support realistic states such as:
- Verification pending or failed
- Listing draft, published or paused
- Rental request pending, approved, rejected or cancelled
- Rental upcoming, active, completed or disputed
- Payment processing, paid, failed or refunded
- Deposit held, release pending, released or disputed
- Check-in and check-out pending or completed

## Design Direction

CurRENT should feel like a modern consumer marketplace with a FinTech trust layer.

Main colours:
- Deep Navy `#0B1F3A`
- Cobalt Blue `#2F6BFF`
- Soft Blue `#DCEBFF`
- Pale Blue `#EEF5FF`
- Warm Off-White `#F8F7F3`
- Light Grey `#F3F4F6`
- Status Green `#22C55E`

Use realistic rental-product photography, clear mobile layouts and simple navigation.

## Regulatory Approach

CurRENT should rely on appropriately authorised external providers for:
- Payment processing
- Deposit handling
- eKYC
- BNPL
- Insurance or item protection

CurRENT should not be presented as a bank, insurer, BNPL provider or licensed escrow provider.

## Project Scope

This project is an academic prototype focused on demonstrating an implementable rental marketplace and its FinTech functions.

The prototype should prioritise the core rental journey, owner workflow, payments, verification, risk-based deposits, item protection, messaging, check-in/check-out and dispute management.

Features such as referral rewards, listing boosts and rental bundles can be treated as secondary enhancements rather than core MVP requirements.

## Technical Foundation

The repository contains an interactive mobile application prototype with local persistence and a browser preview.

### Stack

- React Native with Expo
- TypeScript
- Expo Router
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage and Realtime planned for media and messaging

### Working Prototype

The app now runs as an interactive, device-local academic prototype without Supabase credentials. It opens as Alex Tan, a sample renter. Profile → Demo accounts lets you switch to the item owner to exercise both sides of a rental. This is deliberately a local simulation, not a deployed multi-user service.

Implemented functions:

- Responsive mobile and web marketplace, search, category/location/price/date filters, favourites and listing galleries
- Local demo signup, sign-in, sign-out, editable profiles and profile photos
- Simulated eKYC with pending, verified, failed and retry states
- Owner listing creation, photo selection/main-photo management, drafts, publishing, editing, pausing and deletion
- Rental dates, availability checks, overlapping-reservation prevention and owner approval/rejection
- Itemised fee quotes, explainable risk scores, risk-based deposits and optional simulated protection
- Simulated card/FPX/eligible BNPL checkout with processing, success, failure and retry; BNPL excludes the deposit and other fees
- Rental agreements, participant messaging, notifications and payment history
- Photo evidence at owner handover and renter return, owner inspection and simulated deposit release
- Disputes with evidence that freeze deposit release, two-way reviews, owner earnings and payout records
- Local persistence using AsyncStorage, including selected photos, account state and in-progress rentals

Demo accounts and messages share data **only on this device/browser**. Built-in accounts use account-switch buttons. Created demo accounts use a salted password digest, which is only a prototype mechanism, not production authentication. Do not enter real identity documents or reuse a real password. External sample photography requires an internet connection.

### Prototype Screens

- Home marketplace
- Explore and search
- Item details with booking cost preview
- Rentals
- Messages
- Profile and Rental Risk Score
- Owner Mode dashboard

Sample listings initialise the local store once. Subsequent changes persist locally. No real payment, deposit custody, insurance, BNPL or identity checks occur. The optional demo protection fee is RM5 per rental day, and the return date is not charged. Rentals run for 1–90 days. Cancellation is supported before payment; refunds and dispute resolution are not automated in this version.

### Business Logic Included

The repository includes prototype logic for:

- Explainable Rental Risk Score
- Risk-based refundable security deposits
- 5% borrower service fee with RM5 minimum
- 12% owner platform commission
- Estimated owner payouts

### Database Foundation

`supabase/migrations/001_initial_schema.sql` contains the initial schema for:

- profiles
- listings
- listing images
- bookings
- payments
- deposits
- messages
- reviews
- rental evidence
- disputes
- favourites
- notifications

Row Level Security is enabled as a starting point. Policies should be reviewed again before any production release.

## Getting Started

### 1. Requirements

Install Node.js and npm, then clone the repository.

```bash
git clone https://github.com/r-x-1111/CurRENT-FinTech-Rental-Marketplace.git
cd CurRENT-FinTech-Rental-Marketplace
```

### 2. Install dependencies

```bash
npm install
```

### 3. Optional future Supabase connection

**Skip this step to run the working local prototype.** The Supabase client and SQL migration are retained as backend scaffolding; setting these variables does not switch the app to live persistence or authentication. Connecting a shared backend requires replacing the local store with authenticated server operations and reviewing the initial migration’s permissive policies. Financial state transitions and risk/verification fields must be controlled by trusted server code.

Copy the environment template:

```bash
cp .env.example .env
```

Then add your Supabase project values:

```env
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Run the SQL migration in your Supabase project before replacing the mock data with live queries.

### 4. Start the application

```bash
npm start
```

You can then open the project with a compatible Expo Go version or development build. For the browser:

```bash
npm run web
```

On Windows PowerShell with scripts disabled, use `npm.cmd` and `npx.cmd` in place of `npm` and `npx`.

### 5. Try a complete rental

1. As Alex Tan, open the Sony camera, choose dates and request the rental.
2. In Profile, switch to Aiman Rahman. Open Owner Mode → Requests, then approve.
3. Switch back to Alex, open Rentals and complete the demo payment. The provider response controls let you test success or failure.
4. Switch to Aiman and upload a condition photo to confirm handover. Demo handovers can advance before the scheduled date.
5. Switch to Alex, send a message and upload a return photo to check out.
6. Switch to Aiman, inspect the evidence and confirm return to release the demo deposit and record the payout.
7. Either participant can leave a review. For an alternate path, open a dispute before return confirmation to freeze the deposit.

To test a new account, use Profile → Sign in or create another account. Complete the simulated verification before publishing or requesting a rental. Uploaded photos are stored locally; use modest image sizes to stay within device/browser storage limits.

### 6. Validation

```bash
npm run typecheck
npm test
npm run build:web
npm run test:e2e
```

Browser tests use installed Google Chrome and start a local preview of `dist/` on port 4173. Build the web export before running them. Tests cover role permissions, booking conflicts, fee calculations, the complete rental lifecycle, failure/retry states, evidence, disputes, local persistence, account creation and mobile listing management.

## Repository Structure

```text
app/                    Mobile screens and navigation
components/             Reusable interface components
constants/              CurRENT design tokens
data/                    Temporary sample marketplace data
lib/                     Future Supabase client
context/                 Persistent local marketplace store
services/                Risk, deposit and fee calculations
supabase/migrations/     Database schema
tests/                   Business-rule and browser journey tests
types/                   TypeScript application types
docs/BUILD_PLAN.md       Detailed MVP development roadmap
```

## Development Status

The repository is now a **working local academic prototype**, not a production marketplace. The core renter and owner journeys are implemented and tested in the browser. Native device runtime testing is still required.

Remaining live-service work: Supabase Auth and database/storage synchronisation, server-authoritative permissions and booking concurrency, Realtime messaging across devices, authorised provider integrations, push notifications, support/admin dispute resolution, real refund/payout processing and store-release preparation. The original SQL policies are scaffolding and must not be used as a production security boundary.

See [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) for the full implementation sequence.
