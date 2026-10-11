# CurRENT — Current Build Plan and Scope

**Documentation status:** Updated 11 October 2026 against the application source on GitHub `main` and the latest README V3.54. This is an **as-implemented classroom MVP inventory**, not approval to change app code, SQL, services, tests or deployment. [IMPLEMENTATION.md](IMPLEMENTATION.md) provides the technical detail. The README remains the master project specification; where an older historical requirement is not implemented, this document explicitly describes the code instead of pretending it is complete.

## Project and technical stack

CurRENT is a peer-to-peer **item-rental marketplace** built with **React Native, Expo, Expo Router, React Native Web and TypeScript**. The customer-facing flow supports a **university classroom demonstration**, not actual financial transactions or insurance.

The current architecture uses:
- **Supabase Auth** for real email/password sign-up, sign-in, session restoration and password reset, if the required public Supabase environment variables are configured.
- **Supabase PostgreSQL** for Normal Account marketplace snapshots in the `marketplace_workspaces` table (migration `002_account_workspaces_and_rls.sql`), with account-owner RLS; do **not** confuse this with individually persisted live relational bookings, messages and payments.
- **Browser `sessionStorage` plus in-memory fallback** for the authenticated Demo Account's changeable fictional workspace; a new successful Demo password login recreates its original fixtures. Supabase Auth also uses `AsyncStorage` for **auth session tokens**; that is not the main Demo marketplace store.
- Shared business rules in `services/marketplace.ts`, `services/booking.ts`, `services/riskScore.ts` and `services/deposit.ts`; seed fixtures in `data/seed.ts`.

The repository contains two Supabase migrations: `001_initial_schema.sql` (earlier relational scaffold and RLS) and `002_account_workspaces_and_rls.sql` (snapshot workspaces and revised policies). Their existence in Git does not prove they have been applied to a specific Supabase project.

## Implemented primary navigation

The signed-in renter's main tabs are exactly **Home**, **Rentals** and **Profile**, declared in `app/(tabs)/_layout.tsx`. There is **no separate Explore or global Messages tab**. Home contains item discovery, category/search and saved-item filtering. Messaging is linked to particular rentals.

Profile links to **Lender Mode** and the distinct **How CurRENT Works**, **Trust**, **FAQ** and **Customer Service** pages. The lender workspace has **Listings**, **Rentals** and **Payout** sections within its Listing dashboard.

## Current renter journey

1. **Account:** Use the real Supabase password form. Sign Up is currently **one page** (Full Name, Email, fixed +60 Malaysian Mobile Number, Password and visible sample six-digit Demo OTP `123456`). It is **not** a five-step registration wizard. The separately simulated MyKad/Passport sample-document and face-scan experience lives under **Profile → Identity Verification (Demo eKYC)**; no genuine SMS or ID verification occurs.
2. **Find an item:** Browse the seeded **22-item catalogue** and any legitimately published session/account listings on Home; open Item Details.
3. **Choose rental:** Select future dates using the month/year calendar and a lender-enabled **Scheduled Delivery Time** (from eight fixed hourly choices, 10 AM–5 PM). Delivery Only applies; validate item availability, address and permitted rental Risk Score.
4. **Checkout:** Eligible verified renters with score **30–100** use the integrated **simulated FPX Pay** flow. `instantBook` creates a paid/confirmed Upcoming booking directly; **there is no owner approval/rejection stage**. Scores **0–29** use **Submit Request to CurRENT** without direct payment or reservation.
5. **Manage rental:** Review the rental in **Your Rentals**; use rental-linked messages, scheduled delivery receipt acknowledgement, renter Check-in/Check-out evidence, issue reporting and return confirmation.
6. **Completion and review:** The lender assesses the renter's return evidence and uses **No Issue – End Rental** to settle a clean return. **How did it go?** is shown after Payment breakdown in Rental Details and becomes editable only when the booking is **Completed AND its scheduled END time has passed**.
7. **Cancellation:** Either authorised participant can cancel a paid **Upcoming** booking at/before the original scheduled start minus **24 hours**; the app simulates rental/service-fee refund and deposit release. No real refund occurs.

## Current lender journey

1. An authenticated, **verified** account with a numerical risk score enters Lender Mode from Profile. Unverified accounts see a restricted Listing view and verification instruction.
2. **Create/Edit Listing** configures description, public locality and protected dispatch address, daily price, date availability and at least **two of the eight fixed delivery-start slots**. Lender payout is calculated from **88% of the rental fee** after a **12% platform commission**.
3. **Publishing media:** Most Normal Account listings need **at least six photos and one video**. The existing Sony listing has a separate legacy 4-photo/1-video rule. The Demo Account can publish with exactly **zero photos and zero videos**; supplying incomplete partial media does not automatically bypass validation. New media-less listings currently have no assured image placeholder.
4. Lender Listings supports **Edit**, **Pause/Resume**, **Delete with linked-rental safeguards** and a **simulated RM10/7-day Boost**. Saves and Completed are derived from stored user/booking data; the current `Views: —` is **not real view tracking**. README §0.10 specifies a separate future Demo-only seeded Views presentation exception; do not claim this has already been coded.
5. **Lender Rentals** shows bookings with the actual renter as counterparty, rental-specific chat, evidence and permitted actions. One lender **Cancel Booking** and one **Apply Dispute** appear in the `Lender Actions` card after the message card. A lender may submit a dispute from the scheduled rental END time, except cancelled/already-disputed bookings. The visible result is **PENDING** (stored as `under_review`).
6. **Lender Payout** and **Net Earnings** are simulated; no money is transferred. The `Active / Upcoming Rentals` KPI counts effective `upcoming`, `active` **and `return_pending`** statuses.

## Rental Risk Score and deposits

This is a transparent **rules-based platform reliability score, not a consumer credit score, AI model or ML prediction**. Before identity verification the score is **N/A**; the first verified score is **80/100 (Low Risk)**. Final rental outcomes adjust the score, bounded to 0–100. Examples supported by `services/riskScore.ts` include **+2** for a confirmed clean on-time completion, **−5** for confirmed lateness, **−10** for confirmed minor damage, **−30** for serious damage/loss and a ban for confirmed theft/fraud. Return timing with insufficient evidence may contribute **0**.

| Score | Risk tier | Direct rental | Refundable security deposit |
|---|---|---|---|
| 80–100 | Low | Yes | **5%** of item estimated value, capped **RM500** |
| 40–79 | Medium | Yes | **10%**, capped **RM1,000** |
| 30–39 | High | Yes | **15%**, capped **RM1,500** |
| 0–29 | Very High | **No**; platform-review request only | No direct checkout/deposit |
| Not verified | N/A | No | Verification required |

The **renter service fee is 5% of rent, minimum RM5**, and the **lender commission is 12% of rent**. Rental fees and deposits are distinct. The present quote sets optional protection to **RM0**; do not describe an active RM5/day insurance/protection product. BNPL is **not an active checkout option**.

## Seeded university Demo

- A fresh Demo password sign-in recreates the preapproved fictional dataset; edits last for the **same session** across navigation/reload and are discarded at fresh sign-in.
- The Demo renter starts with current **84 Low**, reflecting the historical `80 + 2 + 2 + 0 + 0` score path and four linked completed-rental outcomes.
- The Demo lender begins with **two distinct Upcoming rentals and one historical Completed rental** (three unique records). The KPI initially reads **2** and there is **one** historical settled simulated payout. This does not mean the KPI stays 2 after transitions.
- The seeded renter has fictional Klang Valley delivery-address presets. The user may change the current delivery address; saving the current value does not update every preset entry.

## Simulated services and data boundaries

**Implemented as in-app prototypes:** simulated FPX payment, refundable-deposit status, transaction-history rendering, rental evidence, session/account-scoped messages, ratings, notices, scripted Customer Service and lender disputes. An unsupported support question or `Talk to a Human` displays a scripted reply; it **does not prove a real staff handoff**.

**Not demonstrated as production services:** live card/FPX settlement, real escrow/deposit transfer or bank payout, production insurance, genuine eKYC/SMS, BNPL financing, Supabase Realtime messaging or an operational human-support queue. Current financial transaction UI derives substantially from booking/payment state and is **not an independent, immutable refund-event ledger**. Demo session data is **not cross-device synchronized**.

The initial relational schema is still repository scaffolding; the current Normal Account app persists a **single account-owned JSON workspace** via Supabase rather than routing each rental mutation through the older relational tables. Production readiness and policy/security coverage must be independently assessed; do not assume classroom guards equal production-grade transaction authorisation.

## Validation, documentation and optional future work

Useful existing scripts in `package.json`:
- `npm run typecheck` — TypeScript type check
- `npm test` — source business-rule tests (`tests/marketplace.test.ts`)
- `npm run test:e2e` — Playwright browser tests (`tests/e2e/marketplace.spec.ts`)
- `npm run build:web` — Expo web export
- `npm run preview` — locally serve an exported web build

These commands **exist in code**, but this documentation refresh **did not run them** and does not assert that they currently pass.

Potential **separately authorised** follow-up work, not part of this docs update: full browser/device regression testing; verification of deployed Supabase migration/RLS and persistence; production security review; real-provider design if ever requested; or implementing the README's Demo-only seeded Views policy. **Do not implement, migrate, deploy, modify Git history or change App Code solely because this build-plan document was updated.**
