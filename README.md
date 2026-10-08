# CurRENT

**Rent what you need. Earn from what you own.**

CurRENT is a FinTech-integrated peer-to-peer (P2P) rental marketplace for Malaysia, initially focused on **Klang Valley**. Renters can use items for a short period instead of buying them. Owners can list underused belongings and manage rentals in one place.

The core experience covers **finding an item, requesting a rental, checking identity and rental risk, reviewing fees and deposits, paying, handing over and returning the item, resolving problems, and reviewing each other**.

**Explore the design**
- [CurRENT Canva website](https://sea-lion-wbptl0.my.canva.site/copy-of-current-rental-marketplace-website)
- [Latest Canva website preview](https://preview.canva.site/4aa9b6e8-5421-43a9-a1aa-780b5ed7d860/current.com/current-rental-marketplace-website)

> **Important prototype distinction:** This repository is an interactive React Native / Expo rental app. The Canva website is a separate visual product showcase, not the deployed app. The repository supports a local end-to-end rental demonstration. Identity checks, payments, BNPL, deposits, insurance, payouts and other regulated services are **simulated or proposed**, not live. No real money is collected, held or transferred.

## Core App Functions

### 1. Browse, Search and Discover Rentals

- Search for rental items by name or keyword, including cameras, gaming equipment, household items and tools.
- Browse the **Electronics, Gaming, Luxury, Household, Work & Office, Tools, Outdoors and Event Gear** categories shown in the Canva website.
- Explore listings around Klang Valley, including Kuala Lumpur, Petaling Jaya, Subang Jaya, Shah Alam, Puchong and nearby areas.
- Filter listings by **category, location, rental dates, maximum daily price, minimum owner rating, verified owner and saved items**.
- Sort listings by daily price or rating, and save favourites for later.
- View featured or popular rentals, owner verification badges, ratings, daily prices and locations.
- Open item details to view listing photos, description, owner profile, availability, item condition, daily rate and available collection methods.
- Check the app's **21-day availability preview** for booked or unavailable dates and select later dates through the date fields.
- View active-rental reminders and relevant notifications from the home screen.

The Canva catalogue illustrates items such as Sony cameras, PlayStation consoles, projectors, monitors, office chairs, pressure washers, drones, luxury accessories, camping equipment and event gear. These are **showcase examples**, not a guarantee that every pictured listing exists in the locally seeded app.

### 2. User Accounts, Profile and Identity Verification

- Create a demo account, sign in and sign out.
- Edit profile details and profile photo.
- Use the simulated **electronic Know Your Customer (eKYC)** flow, including pending, verified, failed and retry states.
- Display verified-user or verified-owner status where applicable.
- View a personal **Rental Risk Score**, risk explanation and rental activity.
- Access favourite items, past and current rentals, reviews, transaction records and notifications.
- Use Help & Trust information for payments, deposit handling, returns, safety and disputes.
- Switch between built-in renter and owner demo accounts to test both participants.

Identity checks are represented by demo responses. The app does **not** verify real identity documents or connect to an authorised eKYC service.

### 3. List an Item and Manage Owner Listings

Owners can:

- Enter **item name, category, description, location, daily rental price and estimated replacement/item value**.
- Add product photos, select a cover image and reorder images.
- Set availability, manage blocked dates and choose collection methods.
- Offer **Meet Owner**, **Self-Pickup** and/or **Delivery Available** as supported options.
- Save drafts, publish listings, and edit, pause, resume or delete eligible listings.
- View an estimated daily payout after the **12% owner commission**.
- Receive rental requests and review each renter's verification and risk information.
- Approve or reject requests, monitor booking status and communicate with renters.
- Record handover evidence, inspect returned items and review completed rental activity.
- View estimated earnings, simulated payouts and received reviews.

In the current app, publishing requires a verified demo owner and at least one item photo. Delivery selection does not arrange a real courier or calculate delivery charges.

**Listing Boost:** The Canva concept offers an optional **RM10 Listing Boost** to increase an item's visibility. This is a **proposed/showcase function**, not a confirmed paid promotion or implemented ranking service in the local app. The assignment also discusses referral-earned boost credits.

### 4. Request, Book and Manage a Rental

**Before booking**
- Choose a start date and return date, normally for **1–90 chargeable rental days**.
- Check item availability and choose a collection method offered by the owner.
- Review an itemised price breakdown: rental fee, borrower service fee, refundable risk-based deposit and any optional protection charge.
- Submit a booking request for the owner to accept or reject.
- Prevent overlapping reservations once an existing rental is approved or confirmed.

**After approval**
- Complete a simulated checkout.
- View the digital rental agreement generated after successful demo payment.
- Track the rental from **requested / approved** through **upcoming, active, return due, completed**, or through **cancelled / disputed** when relevant.
- Send rental-specific messages to arrange pickup, handover and return.
- Record handover and return condition using photos.
- Allow the owner to inspect the item and confirm completion before releasing the simulated deposit.
- Leave a review and view the rental, payment and deposit history.

The **return date is exclusive** in the app's fee calculation. For example, 10 October to 12 October is charged as two days. The prototype supports cancellation of unpaid requests only; it does not process refunds after payment.

### 5. FinTech, Rental Safety and Protection

| Function | Intended user experience | Current app status |
| --- | --- | --- |
| **eKYC / verified users** | Both parties can check verification status before proceeding. | Simulated verification and badges only. |
| **Renter Rental Risk Score** | Owners see a 0–100 risk indicator based on verification, rental history and transaction behaviour, updated after rental activity. | Explainable local demo score using verification, completed rentals, ratings and disputes. |
| **Risk-based security deposit** | Deposits vary according to renter risk and the item's estimated value and are shown before booking. | Calculated and tracked locally; no money is held. |
| **Card / FPX payments** | Review the payable amount and use an authorised payment provider. | Simulated processing, success, failure and retry. |
| **Optional Buy Now Pay Later (BNPL)** | Eligible users may spread the **rental fee** of a higher-value rental across instalments; the deposit and other charges remain separate. | Demo choice for verified renters with a rental fee of at least RM200; no lending or credit decision. |
| **Item protection** | Eligible higher-value items may receive cover of **up to RM60,000** through an authorised external protection/insurance partner, subject to policy terms. | Optional demonstration charge only; no actual insurance policy or claims payment. |
| **Digital rental agreement** | Show the item, parties, rental dates, collection method and agreed terms. | Generated after successful demo payment. |
| **Check-in and check-out evidence** | Record the item's condition at handover and return, supporting later review of any damage. | Photo evidence is supported. Video evidence described in the Canva journey is not a confirmed app feature. |
| **Deposit settlement** | Release the refundable deposit after confirmed return and satisfactory inspection. | Simulated release after owner confirmation; a dispute blocks ordinary release. |
| **Dispute reporting** | Report damage, non-return or other rental issues with a reason, description and supporting evidence. | Records a case for review; no automated ruling, refund or insurance settlement. |

#### Rental Risk Score and Demo Deposit Rules

The app derives an explainable score from local demo activity. A new account starts at **50** and the score may change after verification, rentals, reviews and disputes. It is not a production credit score or an insurer-approved risk model.

| App demo score | Demo risk level | Refundable deposit as a share of estimated item value |
| --- | --- | --- |
| 75–100 | Low risk | 10% |
| 50–74 | Standard risk | 20% |
| 0–49 | Higher risk | 30% |

The Canva safety section illustrates a sample **82 / Low Risk** score and uses a simplified visual scale. The table above records the **current implemented app rules** rather than treating the showcase graphic as a different live scoring system. Stricter limits or account suspension for persistent high-risk behaviour are proposed safeguards, not an automated decision feature in the current app.

#### Fees and Checkout Breakdown

- **Rental fee:** Daily rental rate multiplied by chargeable rental days.
- **Borrower service fee:** **5% of the rental fee or RM5 minimum**, whichever is higher.
- **Refundable security deposit:** Based on the risk tier and estimated item value.
- **Optional demo protection:** RM5 per rental day for eligible items with an estimated value of RM60,000 or less. This is not an actual insurance quotation.
- **Total payable:** Rental fee + borrower service fee + refundable deposit + selected optional protection.
- **Owner earnings:** Rental fee less the **12% owner commission**, recorded as a simulated payout after the rental is completed and the deposit is settled.

**Canva booking example: Sony A7 III**

| Item | Example amount |
| --- | ---: |
| Rental price | RM45/day |
| Rental period | 10–12 October 2026 (2 days) |
| Rental fee | RM90 |
| Borrower service fee (RM5 minimum) | RM5 |
| Risk-based refundable deposit | RM200 |
| **Total shown payable** | **RM295** |
| Owner estimated earnings after 12% commission | RM79.20 |

This example follows the Canva showcase and excludes optional protection and any extra delivery charges. Actual demo deposits vary with the renter's score and the item's estimated value. The separate **RM39.60/day** estimated owner payout shown on the Canva listing form assumes one rental day at RM45.

No amount displayed by the app represents a real deposit in custody, an authorised payment, a live BNPL offer or confirmed insurance coverage.

### 6. Handover, Return and Disputes

- The owner and renter coordinate collection or delivery through rental messages.
- The owner records item handover and uploads condition photos.
- The renter confirms receipt, uses the item during the booking period and uploads return-condition photos.
- The owner checks the returned item and either confirms a satisfactory return or reports an issue.
- For a satisfactory return, the simulated deposit is released and the owner's estimated payout is recorded.
- For damage, missing items, late/non-return or disagreement, a participant can submit a **dispute reason, written explanation and photo evidence**.
- Open disputes prevent normal deposit release until a separate review. The prototype stores the report but does not automatically assign responsibility or resolve the case.

The PDF concept also proposes structured claim handling and partner-supported protection. Actual support decisions, insurance claims, compensation and post-payment refund processing remain future integrations.

### 7. Messages, Reviews, Notifications and Help

- Use a **Messages** area for rental-specific renter-owner conversations.
- View unread message indicators and conversations related to pickup, item condition and return.
- Receive in-app updates about rental requests, approvals, payments, returns and other status changes.
- Review the other participant after a completed rental and view ratings on listings and profiles.
- Access rental history, payment records, deposit status and simulated owner earnings.
- Read **How It Works**, **Safety / Help & Trust** and **FAQ** information about identity checks, risk scores, security deposits, fees, BNPL, item protection, cancellations and disputes.
- The broader website concept includes a contact/enquiry channel; a live support inbox and support-led case management have not been connected.

### 8. Dashboards and Navigation

| Area | User functions |
| --- | --- |
| **Home** | Search, category shortcuts, featured listings, notifications and current-rental reminders. |
| **Explore / Browse Rentals** | Search, filters, sort, favourites and item details. |
| **How It Works / Safety** | Booking instructions, verification, risk scoring, deposits, protection and FAQs. |
| **Rentals** | Requests, approvals, checkout, active rentals, return evidence, deposit and dispute status, reviews. |
| **Messages** | Rental conversations and unread-message indicators. |
| **Profile** | Account details, eKYC status, Rental Risk Score, saved items, history, notifications and help. |
| **Owner Mode / List an Item** | Listings, pricing, availability, requests, handover, returns, reviews and payout estimates. |

The Canva website uses **Browse Rentals, How It Works, List an Item, Safety, Messages and Profile** in its navigation. The actual Expo app groups related actions within Home, Explore, Rentals, Messages, Profile and Owner Mode rather than reproducing the Canva page structure exactly.

## Complete Rental Journey

### Renter

1. Sign in or use the sample renter profile, and complete simulated eKYC.
2. Search or filter listings; check photos, owner verification, price and availability.
3. Choose rental dates and a supported collection method.
4. Review the rental fee, service fee, risk-based deposit and optional protection.
5. Send a rental request and wait for owner approval.
6. Complete simulated Card, FPX or eligible BNPL checkout and review the agreement.
7. Message the owner and collect the item, with handover evidence.
8. Return the item and upload condition photos.
9. Wait for owner inspection and simulated deposit release, or submit a dispute.
10. Leave a review.

### Owner

1. Open Owner Mode; create a listing with photos, item value, daily price, location and availability.
2. Publish the listing after simulated verification.
3. Review the renter's profile, Rental Risk Score and proposed deposit.
4. Approve or reject the booking.
5. Coordinate handover, record item-condition evidence and monitor rental status.
6. Inspect the returned item and review the renter's return photos.
7. Confirm a satisfactory return to release the simulated deposit and record estimated earnings, or file a dispute.
8. Review the renter.

## Additional Functions in the Assignment Concept

The BFM3130 report and Excel appendix describe possible enhancements that complement the current rental journey. They are **not confirmed implemented app features**:

- **Occasion-based discovery and rental bundles:** Find or combine items for events, photography, temporary accommodation or other short-term needs.
- **Listing Boosts:** Optional RM10 promotion in the Canva showcase to help owners increase visibility.
- **Referrals and rewards:** Referral links/codes and tracking for lender invitations; rewards may take the form of listing boost credits.
- **Loyalty benefits:** Points or platform credits redeemable for service-fee discounts or listing boosts.
- **Partner-backed pickup/delivery:** Optional logistics integration for bulky items.
- **Expanded risk management:** Additional behavioural signals, restrictions on persistently risky renters and more advanced claim-review processes.
- **Production account security:** Secure authentication, protected identity data, and stronger access controls, potentially including PIN/biometric login.

These are product ideas from the report/appendix, not live services or guaranteed future releases.

## Technology and Local Prototype

- **React Native + Expo** for mobile and web-compatible screens.
- **TypeScript + Expo Router** for app logic and navigation.
- **AsyncStorage** to save local demo listings, users, rentals and messages.
- **Expo ImagePicker** for listing photos and check-in/check-out evidence.
- **Supabase client and an initial migration** as future-backend scaffolding. Live Supabase authentication, shared cloud storage and multi-device syncing are **not enabled**.

Demo accounts and conversations share data only within the same local browser/device storage. Do not enter real identity documents, card details or personal financial information.

### Run in VS Code

Install **Node.js and npm**, open a terminal, then run:

    git clone https://github.com/r-x-1111/CurRENT-FinTech-Rental-Marketplace.git
    cd CurRENT-FinTech-Rental-Marketplace
    npm install
    npm run web

Open the local URL shown by Expo. For a mobile development session, run `npm start`. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm`.

No Supabase API keys are required for the local demo.

### Try the Full Rental Journey

The app starts with **Alex Tan**, the sample renter.

1. As Alex, request the sample Sony camera for available dates.
2. In **Profile > Demo accounts**, switch to **Aiman Rahman**.
3. In **Owner Mode > Requests**, approve Alex's request.
4. Switch back to Alex and complete demo payment.
5. Switch to Aiman and record handover evidence.
6. As Alex, use messages and upload return photos.
7. As Aiman, inspect the return, release the simulated deposit and record the payout.
8. Complete a review. To test a problem case, submit a dispute before approving the return.

### Checks and Tests

    npm run typecheck
    npm test
    npm run build:web
    npm run test:e2e

Build the web export before running browser end-to-end tests. Run `npm run preview` after a successful web build to open the exported static preview.

### Project Structure

    app/                    Screens and navigation
    components/             Reusable UI components
    constants/              Design tokens
    context/                Persistent local marketplace state
    data/                   Demo users and sample listings
    services/               Booking, fee, deposit and risk logic
    lib/                    Supabase client scaffolding
    supabase/migrations/     Initial database schema
    tests/                  Business-rule and browser tests
    types/                  TypeScript types
    docs/IMPLEMENTATION.md  Implementation details and known limitations
    docs/BUILD_PLAN.md      Future implementation roadmap

## Important Limitations

CurRENT is an **academic prototype**, not a deployed financial, payment, insurance or item-rental service. An authorised third party would be needed for real eKYC, card/FPX processing, deposit custody and release, BNPL, insurance/protection, payouts and delivery. CurRENT itself is **not a bank, insurer, identity authority or licensed escrow provider**.

Real cross-device messaging, support-led dispute decisions, production security, refunds after payment, live courier bookings and production-grade compliance controls have not been implemented. Some functions shown in Canva are visual examples only. Any actual partner service would depend on authorisation, eligibility, contractual and regulatory terms.

For technical details, see [Implementation](docs/IMPLEMENTATION.md) and the [Build Plan](docs/BUILD_PLAN.md).
