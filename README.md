# CurRENT

**Rent what you need. Earn from what you own.**

CurRENT is a FinTech-integrated peer-to-peer rental marketplace designed for Malaysia, starting with Klang Valley. Renters can access items temporarily instead of buying them, while owners can earn from items they do not use regularly. The product combines marketplace, booking, payment, verification and rental-protection features in one experience.

- **[View the CurRENT Canva website](https://sea-lion-wbptl0.my.canva.site/copy-of-current-rental-marketplace-website)**
- [View the Canva website preview](https://preview.canva.site/4aa9b6e8-5421-43a9-a1aa-780b5ed7d860/current.com/current-rental-marketplace-website)

> **Prototype status:** This repository contains an interactive React Native / Expo app that runs locally in a browser or compatible mobile development environment. The Canva website is a **separate product showcase**, not a deployment of this repository. Financial actions, identity checks, insurance and delivery are simulated or proposed; no real money is transferred.

## App Features

### 1. Marketplace and Item Discovery

- Home page with a search bar, categories, featured items and current rental reminders.
- Explore page with search and filters for category, location, rental dates, maximum daily price, minimum rating, verified owner and saved items.
- Sort listings by price or rating.
- Save and revisit favourite items.
- Item detail pages with photos, descriptions, daily rental prices, location, owner information, ratings, supported collection methods and availability.
- A **21-day availability preview** that marks booked or closed dates. Date fields can select later periods.

### 2. Renter Account and Profile

- Local demo sign-up, sign-in and sign-out.
- Editable profile information and profile photo.
- Simulated eKYC with pending, verified, failed and retry states.
- Verification badge, Rental Risk Score explanation, reviews, saved items and rental history.
- Rental-linked messages, notifications and Help & Trust information.
- Switch between built-in demo accounts to experience both sides of a rental.

### 3. Owner Mode and Listing Management

Owners can:

- Access an **Owner Mode** dashboard from Profile.
- Create a listing with its name, category, description, location, daily price and estimated item value.
- Select and manage product photos, choose the main image and reorder photos.
- Save a draft, publish, edit, pause, resume or delete an eligible listing.
- Manage availability and collection methods.
- Choose **Meet Owner**, **Self-Pickup** and/or **Delivery Available**.
- View incoming requests, renter profiles and risk information, then approve or reject rentals.
- Record item handover and inspect the item on return.
- View reviews, estimated earnings and simulated payouts.

Publishing requires a verified demo owner and at least one listing photo. Delivery is only a selection in the current prototype; it does not book a courier or calculate a delivery fee.

### 4. Booking and Rental Management

- Choose start and return dates and receive an itemised price estimate.
- Select one of the owner's supported collection methods.
- Submit a request and wait for approval.
- Approved or confirmed reservations prevent overlapping bookings.
- Complete simulated checkout after approval.
- Track requests and rentals through upcoming, active, return-due, completed, cancelled and disputed states.
- View the digital rental agreement after successful demo payment.
- Coordinate collection and return through rental-specific messages.
- Upload condition photos for handover and return.
- Complete return inspection, deposit release and two-way reviews.

**Rental duration:** 1–90 days. The return date is not charged as a rental day. The current prototype allows cancellation of unpaid requests; post-payment refunds are not implemented.

### 5. FinTech and Trust Features

| Feature | Behaviour in the app prototype |
| --- | --- |
| **eKYC verification** | Simulated identity-verification responses and verified-user status. No real document verification. |
| **Rental Risk Score** | Explainable demo score using identity status, completed rentals, ratings and disputes. Starts at 50; updated from local demo activity. |
| **Risk-based deposit** | Deposit percentage depends on risk tier and estimated item value. The amount is tracked, not held as real money. |
| **Digital payments** | Simulated Card and FPX checkout with processing, success, failure and retry states. |
| **Optional BNPL** | Demo option for verified users when the rental fee is at least RM200. Only the rental fee is eligible, not the deposit or other fees. |
| **Item protection** | Optional demo protection charge. Actual coverage would require an external insurance or protection partner. |
| **Digital rental agreement** | Created after successful demo payment, including participants, dates and collection method. |
| **Check-in / check-out evidence** | Condition photos document handover and return. |
| **Deposit release** | Owner inspection can trigger simulated release; an open dispute blocks normal release. |
| **Dispute reporting** | Reason, written explanation and photo evidence; a case is recorded as under review without automatic resolution. |

#### Demo Pricing and Deposit Rules

- **Borrower service fee:** 5% of rental fee, with a minimum of RM5.
- **Owner platform commission:** 12% of rental fee.
- **Optional protection:** RM5 per rental day for eligible demo items valued at RM60,000 or less.
- **Total checkout:** rental fee + borrower service fee + refundable deposit + optional protection.
- **Owner payout estimate:** rental fee less owner commission, recorded locally after the completed rental.

| Rental Risk Score | Demo risk category | Deposit, based on estimated item value |
| --- | --- | --- |
| 75–100 | Low | 10% |
| 50–74 | Standard | 20% |
| 0–49 | Higher | 30% |

These figures are **prototype business rules**, not a real underwriting, financing or insurance offer. A live product could seek eligible item protection of up to RM60,000 through a partner, but no coverage or compensation is currently provided. Late returns and further transaction signals are possible future risk inputs, not fully automated in the app.

### 6. Messages, Reviews, Notifications and Support

- Rental-specific renter/owner conversations with unread indicators.
- In-app notifications and rental status updates.
- Reviews and ratings by both parties after a rental.
- Rental, payment, deposit, review and estimated payout histories.
- **Help & Trust** guidance for how renting works, verification, fees, deposits, cancellations, return evidence, damage and disputes.
- A **Connect with CurRENT** section in the Canva design, with Name, Email, enquiry category, Message and Send message. Delivery to an actual support inbox is not verified.

### 7. App Navigation

| Tab / Area | Main functions |
| --- | --- |
| **Home** | Featured listings, category shortcuts, search, alerts and active rental reminders. |
| **Explore** | Search, filter, sort and save items. |
| **Rentals** | Requests, rental statuses, checkout, check-in/out, deposits, disputes and reviews. |
| **Messages** | Conversations about collection, handover and returns. |
| **Profile** | Account details, verification, Rental Risk Score, favourites, history, notifications, Help & Trust and demo account switching. |
| **Owner Mode** | Listings, incoming requests, owner actions, messages, reviews, earnings and payouts. |

## How a Rental Works

### Renter Flow

1. Create an account or open the demo renter profile and complete simulated verification.
2. Browse listings, open an item, choose dates and collection method.
3. Review rental fees, service charges, deposit and optional protection.
4. Send the rental request and wait for the owner to approve.
5. Complete simulated payment and view the digital agreement.
6. Message the owner and arrange collection or pickup.
7. Receive the item and confirm the handover.
8. Use the item during the rental period.
9. Upload return condition photos and check out.
10. Wait for the owner to inspect and release the simulated deposit.
11. Leave a review.

### Owner Flow

1. Open Owner Mode and create or publish an available listing.
2. Choose prices, item photos, availability and collection options.
3. Review incoming requests and renter risk information.
4. Approve or reject a request.
5. Confirm the simulated payment and upload handover evidence.
6. Communicate with the renter during the rental.
7. Inspect the returned item and review condition photos.
8. Confirm return to release the simulated deposit and record payout.
9. Review the renter.

### Dispute Flow

If an item is damaged, not returned as expected or another problem arises, a participant can report a dispute, select a reason, describe the issue and attach photos. The rental is marked as disputed and normal deposit release is paused. **The prototype records the case; it does not automatically decide liability, issue a refund or resolve an insurance claim.**

## Technology

The current repository uses:

- **React Native and Expo** for mobile and browser-compatible screens.
- **TypeScript and Expo Router** for app logic and navigation.
- **AsyncStorage** for persistent local demo data.
- **Expo ImagePicker** for listing photos and rental-condition evidence.
- **Supabase client and initial database migration** as scaffolding for possible future backend integration. The app does **not** currently use Supabase for live authentication or shared persistence.

The built-in demo accounts and their messages share state **only within the same device or browser storage**. Use sample information rather than real identity documents, financial data or reused passwords.

## Run the App in VS Code

**Requirements:** Node.js and npm.

```bash
git clone https://github.com/r-x-1111/CurRENT-FinTech-Rental-Marketplace.git
cd CurRENT-FinTech-Rental-Marketplace
npm install
npm run web
```

Open the local URL displayed by Expo. For a mobile development session, use `npm start` and follow the Expo instructions. On Windows PowerShell, `npm.cmd` may be used if `npm` is blocked by execution policy.

No Supabase keys are required for the local prototype.

### Test the Complete Rental

The app starts with **Alex Tan** as the sample renter.

1. As Alex, open the sample Sony camera listing, choose dates and request it.
2. Go to **Profile > Demo accounts** and switch to **Aiman Rahman**.
3. Open **Owner Mode > Requests** and approve the rental.
4. Switch back to Alex and complete the simulated payment.
5. Switch to Aiman to upload handover evidence.
6. Switch to Alex to send a message and upload return evidence.
7. Switch to Aiman to inspect the return, release the simulated deposit and record the payout.
8. Leave a review. To test the alternative outcome, open a dispute before confirming the return.

### Available Validation Commands

```bash
npm run typecheck
npm test
npm run build:web
npm run test:e2e
```

Build the web export before running the browser end-to-end tests. An optional static preview is available with `npm run preview` after the build.

## Project Structure

```text
app/                    Screens and navigation
components/             Reusable UI components
constants/              Design tokens
context/                Local persistent marketplace state
data/                   Sample profiles and listings
services/               Booking, fees, deposits and risk rules
lib/                    Supabase client scaffolding
supabase/migrations/     Initial database schema
tests/                  Business rules and browser tests
types/                  TypeScript types
docs/BUILD_PLAN.md      Future implementation roadmap
docs/IMPLEMENTATION.md  Current implementation and limitations
```

## Prototype Limitations

CurRENT is currently an **academic demonstration**, not a deployed rental or financial service. Real identity verification, insurance protection, card/FPX settlement, BNPL financing, deposit custody, payouts, cross-device communication and support-led claim decisions require external providers and production controls. The current Supabase policies are not production-ready. Native-device behaviour and security also need additional testing.

For implementation details, see [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md). For planned work, see [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md).
