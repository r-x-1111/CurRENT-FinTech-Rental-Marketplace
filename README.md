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

## Business Context and Market Research

This project is informed by the **BFM3130 Entrepreneurship in FinTech CurRENT report (12 pages)** and its **11-worksheet business-model appendix**. The report develops the problem, customer segments, competitive positioning and feasibility assumptions. The appendix covers market research, SWOT, market segments, value propositions, distribution channels, key resources, cost structure, variable costs, the pro forma income statement, break-even analysis and a business-model summary. Figures below are **academic assumptions or forecasts**, not actual operating results.

### Problem and Value Proposition

**For renters**, infrequently needed items can be expensive to buy. Informal peer-to-peer rentals can involve fake listings, high or unclear deposits, unreliable payments and limited recourse for damage or disputes.

**For owners**, valuable personal or business assets can remain unused, but renting them out introduces risks of fraud, late return, damage, non-return, disputed deposits and off-platform arrangements.

CurRENT's core proposal is to combine **affordable temporary access, verified users, a rental-specific risk score, platform-calculated deposits, transparent payments, digital rental agreements, handover/return evidence and structured disputes**. The aim is to make it easier for renters to access items and for owners to earn income while retaining ownership.

The launch focus is **Klang Valley**, including Kuala Lumpur, Petaling Jaya, Subang Jaya, Shah Alam and Cyberjaya. Relevant rental categories include cameras and lenses, drones, action cameras, projectors, gaming consoles, speakers, event equipment, tools, appliances and selected household or office items.

### Target Customer Segments

| Segment | Target users | Main need |
| --- | --- | --- |
| **Primary renters / borrowers** | Young adults aged **18–35**, particularly students, young professionals, new graduates, freelancers and creators | Affordable access to items used occasionally, with reasonable deposits, clear charges and protection. |
| **Primary owners / lenders** | Asset owners aged **21–45**, including photographers, hobbyists, professionals, gamers and creators | Earn from underused high-value items while managing damage, fraud and non-return risk. |
| **Secondary renters** | International students, interns, exchange students, temporary residents and short-term workers | Rent household, study or work items without buying, reselling or disposing of them on departure. |
| **Secondary owners** | Micro and small businesses, photography studios, AV providers and event suppliers | Generate additional income from equipment during idle periods. |

The report uses B40 as a broad profile for price-sensitive renters and M40/T20 for owners with higher-value assets. These are **research segment assumptions**, not platform access restrictions and not customer-facing labels.

### Primary Research and Market Position

The report describes **three exploratory interviews**, which are useful as early qualitative input but do not establish representative demand:

- **Student, aged 21:** valued lower deposits and secure payments because occasional-use products are expensive to purchase.
- **Young professional, aged 27:** prioritised identity verification and protection due to concerns about fake listings and damage.
- **Photographer, aged 43:** valued item protection and renter-risk assessment because of non-return risks for expensive equipment.

All three interviewees expressed interest in CurRENT; none reported using a dedicated comparable peer-to-peer item-rental service. These responses informed the emphasis on **trust, deposits and owner protection**.

The report compares CurRENT with [RentSmart Asia](https://rentsmartasia.com/), Facebook Marketplace and other general marketplaces. CurRENT's intended differentiation is **rental-specific behavioural risk assessment and risk-adjusted deposits**, combined with clearer on-platform booking, evidence and dispute procedures. Competitor features described in the assignment are research observations and may change.

Key SWOT considerations from the workbook are:

| Strengths and opportunities | Challenges and risks |
| --- | --- |
| Integrated verification, rental scoring, flexible deposits, documented return and dispute processes | Limited initial listing and renter activity in a new two-sided marketplace |
| Growth in temporary-access needs and the wider sharing economy | Limited historical rental data for accurate risk assessment |
| Opportunities for payment, eKYC, protection and BNPL partnerships | Dependence on external partners, compliance requirements and their commercial terms |
| Ability for individuals and SMEs to monetise idle items | Theft, damage, non-return, copied features and users bypassing on-platform transactions |

## Revenue Model and Business Assumptions

CurRENT's proposed platform revenue comes from **rental commissions, borrower service fees and optional partner or visibility services**. Refundable security deposits are **not** revenue.

| Revenue source | Financial appendix assumption |
| --- | --- |
| Owner / lender commission | **12% of completed rental value** |
| Borrower / renter service fee | **5% of rental value**; current prototype applies a **RM5 minimum** |
| Insurance or protection referral | **RM2 per completed rental** in the model, conditional on a future partner arrangement |
| Optional BNPL referral | **RM5 per financed rental**, with **10%** assumed adoption |
| Listing boost | **RM10** per purchased boost; forecast assumes boosts equivalent to **10%** of completed rental volume |

The forecast assumes an **average RM200 rental value**, giving modelled average revenue of **RM37.50 per completed rental**, including the expected referral and boost income. These assumptions are not active charges collected by the Canva website.

**Differences that matter:** The Expo app makes protection **optional at RM5 per rental day**, whereas the spreadsheet assumes protection referral revenue on **every completed rental**. The workbook also includes a separate **3% listing-boost concept capped at RM100**, but the income statement is calculated with **RM10 boosts**. The README preserves both as **different proposals**, rather than presenting them as one agreed live pricing policy. Real protection limits, claims, BNPL approvals, payments and deposit handling would depend on authorised external providers.

### Market and User Assumptions

The appendix uses broad reachable-population estimates of **6.0 billion** globally (TAM proxy), **34.9 million** Malaysian internet users (SAM proxy) and **9.48 million** as its initial Klang Valley SOM assumption. These figures are **modelling proxies, not validated counts of paying rental customers**.

The Year 1 forecast assumes:

- **4,740 registered users**, representing 0.05% of its assumed initial SOM.
- **20%** of registered users are active.
- **50%** of active users complete **one rental per month**.
- **2,795 completed rentals** over Year 1 under the monthly adoption model.
- **RM2,000 per month** for digital marketing. Dividing the RM24,000 annual budget by projected registrations produces a simplified **RM5.06 estimated acquisition cost per registered user**, not an observed CAC.

### Year 1 Financial Projection

| Metric | Workbook pro forma |
| --- | ---: |
| Completed rental transactions | **2,795** |
| Total revenue | **RM104,812.50** |
| Variable costs | **RM4,581.50** |
| Fixed costs | **RM977,040.00** |
| Loss before tax | **(RM876,809.00)** |
| Average revenue per rental | **RM37.50** |
| Variable cost per rental used in break-even analysis | **RM1.30** |
| Contribution per rental used in break-even analysis | **RM36.20** |

The business model budgets **RM81,420 monthly fixed costs** for proposed staff, marketing, office space, technology, maintenance and compliance. Key variable assumptions are **RM1.20 per completed rental** for payment processing and **RM0.10 per SMS/OTP**. The first-year model assumes no eKYC verification charges while new monthly registrations remain within a proposed provider's initial free allowance. These are planning figures, not negotiated supplier quotations.

At the modelled contribution, the spreadsheet estimates break-even at **around 26,990 completed rentals annually** (about **2,249 per month**). The multi-year model projects **8,532 rentals in Year 2**, **15,926 in Year 3**, **27,302 in Year 4** and **42,660 in Year 5**. It therefore projects **annual operating break-even around Year 4**, provided its volume, costs and unit-economics assumptions hold. This is not evidence of actual profitability or a guaranteed timeline.

**Model consistency note:** The PDF narrative gives Year 1 revenue as RM104,813.50, while the detailed workbook pro forma calculates **RM104,812.50**. The separate workbook variable-cost summary shows RM4,581.10, whereas the pro forma totals **RM4,581.50**. The table above uses the **pro forma income-statement figures** because they reconcile to the modelled **RM876,809 loss**. Those small source differences should be corrected before using the figures in a pitch or external report. The break-even model is a simplified projection, not a full forecast of all future operating costs.

## Customer Acquisition, Partnerships and Compliance

### Go-to-Market Approach

The workbook proposes **TikTok and Instagram** for young renters, **Facebook** for wider community outreach and **LinkedIn** for SME/owner acquisition. Content would include rental-versus-buy comparisons, practical rental use cases, earning-from-idle-assets examples, fraud-prevention tips and explanations of verification, deposits and protection.

Other proposed channels include **referrals with listing-boost credits**, property and co-living partners helping short-term residents, **SME and industry associations** helping recruit equipment owners, and **logistics partners** supporting optional collection or delivery. **Occasion-based discovery, bundled rentals, loyalty credits and paid boosts** are product-growth concepts, not proven features or revenue streams today.

### Essential Live-Service Partners

A future production marketplace would need:

- **Appropriately authorised payment and deposit-handling providers** for card/online payments, refunds, deposit safeguarding and owner payouts.
- An **eKYC provider** for identity checks and fraud controls.
- An **insurer or item-protection partner** willing to underwrite eligible rented goods, potentially targeting **up to RM60,000** subject to policy wording, limits and exclusions. The project does **not** currently provide such coverage.
- A **BNPL provider** to make financing eligibility and repayment decisions. Deposits, service fees and protection must stay separate from any eligible financed rental fee.
- **Logistics partners** for real pickup, delivery quotes and tracking, together with trained **operations and support staff** for damage claims, disputes, refunds and account reviews.

Future implementation also needs privacy safeguards and consent management, secure account controls, server-authoritative transaction updates, evidence retention, clear rental agreements, consumer disclosures and compliance with applicable Malaysian requirements. CurRENT must **not** be presented as an insurer, bank, BNPL financier or independently licensed escrow provider.

### Source and Status Notes

These sections are derived from the user's **BFM3130 CurRENT report (12 pages, including its primary-research, market, revenue and break-even appendices)** and **BFM3130 Assignment 1 Excel workbook (11 worksheets)**. The sources support the **business concept, projected economics and proposed partnerships**, while the **App Features** and **Technology** sections above describe what is demonstrable in the local Expo prototype. The [published Canva site](https://sea-lion-wbptl0.my.canva.site/copy-of-current-rental-marketplace-website) is a separate visual/clickable website experience, not evidence of live payment, insurance, identity verification or support integrations. The supplied Canva preview could not be fully inspected for operational behaviour, so the README does not claim that every visible control has a working backend.

## Future Features and Integrations

These ideas appear in the product proposal or wider website concept, but are **not confirmed as live, integrated features** in the current app:

- Occasion-based discovery and bundled rentals.
- Loyalty points, referral rewards and paid listing boosts.
- Real logistics bookings, delivery quotations and tracking.
- Provider-backed eKYC, regulated payment/deposit handling and BNPL.
- Real item-protection policies, claims and refunds.
- Cross-device messaging, cloud media storage and push reminders.
- Staff/admin tools for dispute investigation, support enquiries and account moderation.
- More detailed risk assessment using late returns and transaction behaviour.

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
