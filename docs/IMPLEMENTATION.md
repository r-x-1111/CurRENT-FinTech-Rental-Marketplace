# CurRENT — Implemented Architecture and Classroom Constraints

**Source audit:** 11 October 2026, GitHub `main` App code, with README V3.54 as the separate master specification. This page documents the **actual code** and its limitations, replacing old local-only prototype, outdated deposit and approval-flow descriptions. Documentation alone is not evidence that a running deployment, Supabase environment, native app or integration tests have been verified.

See [BUILD_PLAN.md](BUILD_PLAN.md) for product flows, navigation, scores and fees.

## 1. Runtime and account authentication

- **UI:** React Native + Expo + Expo Router + TypeScript; browser support via React Native Web. The signed-in main tabs in `app/(tabs)/_layout.tsx` are **Home / Rentals / Profile**, not Explore or global Messages.
- **Authentication:** `app/auth.tsx` uses Supabase **email/password Auth** for signup, sign-in and password reset. It requires configured `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. No functional sign-in is available when Supabase Auth is unconfigured.
- **Signup layout:** **One Create Account form** accepts Full Name, Email, fixed +60 Malaysian Mobile Number, Password and a displayed sample six-digit `123456` Demo OTP input. The OTP is a **local demonstration check, not SMS authentication**; Supabase email confirmation may be required. The older described five-step signup wizard is **not present**.
- **Demo identity:** `services/auth.ts` uses the authenticated account's protected Auth metadata (`account_kind = demo` and `verified_demo`) plus the approved Demo email to distinguish the presenter Demo Account. It still requires genuine password authentication, not a public dataset-switch button.
- **Normal account:** Authenticated non-Demo users get an account-specific Normal workspace. App routing and listing/booking services check the signed-in profile and relevant role/verification state.
- **Simulated eKYC:** After authentication, `app/(tabs)/profile.tsx` displays fictional MyKad/Passport sample-document choices and a mock face-scan experience. It is not a true identity assessment and does not collect real ID photographs or face biometrics.

`lib/supabase.ts` configures **AsyncStorage for Supabase Auth session tokens**. Do not describe it as the primary persistence engine for all current CurRENT bookings.

## 2. Data persistence and state changes

### Normal Account

`services/marketplacePersistence.ts` creates a Normal workspace with the shared catalogue, the authenticated user's profile, and initially empty personal bookings, chats, evidence, reviews, disputes, notifications and support histories. Unverified users begin with `riskScore: null` and verified users with an initial score of **80 Low**.

The Normal Account's complete `Marketplace` state is loaded and upserted as **JSON** in the Supabase `public.marketplace_workspaces` table, keyed by `owner_id`, not as separate live inserts to every historical `bookings`, `messages`, `payments` or `deposits` relational table. `supabase/migrations/002_account_workspaces_and_rls.sql` defines this table and its account-owner RLS policies. `001_initial_schema.sql` retains the earlier normalized table scaffold and separate RLS definitions.

**Important limitation:** Persistence and RLS are implemented in the repository, but this review has **not** established that a particular hosted Supabase project's migrations are applied, or that the current snapshot-mutating client code is secure for real financial activity.

### Demo Account

`services/demoWorkspaceSessions.ts` uses **browser `sessionStorage`** (with an in-memory fallback) to hold the authenticated Demo account's mutable fictional `Marketplace` snapshot. `startDemoWorkspaceSession` creates a **new baseline from `createSeed("admin_demo")`** after each new successful Demo password Sign In; `loadDemoWorkspaceSession` restores state during the same active session; `closeDemoWorkspaceSession` clears it when the user signs out. There is **no required new Demo Supabase session table, cross-device Demo sync or separate fake local login**.

The shared context in `context/Marketplace.tsx`:
- Restores the actual Supabase Auth session before opening account-specific state.
- Calls `transition` in `services/marketplace.ts` for user actions, with account-state updates and ordered persistence work.
- Uses `actAndPersist` for important actions requiring a successful save, rolling local state back when persistence fails.
- Provides a visible storage warning when persistence fails.

`data/seed.ts` and `services/demoWorkspaceDefaults.ts` provide fictional Demo fixtures. At a fresh Demo Sign In, the renter has **84 Low** and four linked historical completed-rental score outcomes (`+2,+2,0,0`). The lender has exactly **two different Upcoming rentals and one Completed rental**, giving an initial lender KPI of **2** and **one historical completed net payout**. Fictional saved delivery-address presets and a prefilled Demo listing template are part of the seed. Edits to the current delivery address do not rewrite all saved presets.

## 3. Marketplace listings and booking

- **Catalogue:** Shared published items are browsable on **Home**, with search and categories. The existing base catalogue has **22** seeded item entries (`data/mock.ts`).
- **Lender listing editor:** `app/owner/edit.tsx` supports drafting/publishing, location and dispatch address, daily rental price, date availability, media controls and **at least two fixed delivery-start slots** chosen from eight hourly options (10:00 through 17:00 MYT).
- **Media validation:** `services/marketplace.ts` generally requires **6 item photos and 1 item video** for Normal Account publication, with the existing special Sony listing exception (**4 photos + 1 video**). For new Demo listings **0 photos + 0 videos** is accepted. Arbitrary partially uploaded Demo media (e.g. 1 photo, 0 videos) does not pass the saving validator. The saved 0/0 listing may use an **empty `imageUrl`**: the owner card and product screen do not have a guaranteed dedicated visual fallback.
- **Catalogue item availability:** `services/booking.ts` computes rental days and checks publication, date ranges and non-overlapping protected booking intervals. Month/year selectors and selected delivery time options are rendered in `app/listing/[id].tsx`.
- **Booking type:** `instantBook` in `services/marketplace.ts` directly books and simulates paid checkout for eligible verified renters with score **30–100**, creating an `upcoming` booking and a fee/deposit snapshot. **No lender approval/rejection queue is part of the present direct-booking journey.**
- **Restricted risk:** Score **0–29** may submit a **CurRENT Platform Review** request, which is not a paid booking or reserved interval. The product booking panel is **Delivery Only** with a simulated FPX payment path for eligible customers.

## 4. Fees, scoring and simulated money

Current business-rule functions are in `services/deposit.ts` and `services/riskScore.ts`:

| Condition | Current implemented value |
|---|---|
| Starting verified renter score | **80 / 100, Low Risk** |
| Unverified account | **N/A**; cannot direct-book or publish |
| Low (80–100) deposit | **5%** of estimated item value, cap **RM500** |
| Medium (40–79) deposit | **10%**, cap **RM1,000** |
| High (30–39) deposit | **15%**, cap **RM1,500** |
| Very High (0–29) | Platform Review only; no direct checkout |
| Renter service fee | **5%** of rental fee, **minimum RM5** |
| Lender commission | **12%** of rental fee; net **88%** |
| Optional protection in new booking quote | **RM0**, not an active insurance quote |

The score is an explainable **rental-reliability** metric, not a bank credit score or AI model. In the final confirmed-outcome path, clean on-time returns are **+2**, evidenced late returns incur a **fixed −5**, minor damage **−10**, serious damage/loss **−30**, unknown return timing **0**, and confirmed intentional theft/fraud bans the account. The effective score is clamped to 0–100, with one effective confirmed outcome applied per rental record.

### Payment, cancellation and refund representation

The current direct booking creates a paid simulated order with the captured `Quote`, refundable deposit state and chosen demo payment method (normally **Demo FPX**). It **does not** transfer actual funds, escrow a deposit or settle a real bank payout. `app/(tabs)/rentals.tsx` and `app/transactions.tsx` display transaction information derived substantially from the booking state.

Both authorised renter and lender may cancel a paid `upcoming` booking **only up to and including 24 hours before its original scheduled start**. `services/marketplace.ts` changes the record to `cancelled`, marks the booking's payment `refunded`, releases the deposit and creates participant notifications. The UI presents a **simulated full rental/service-fee refund with RM0 cancellation fee**. This is **not an independently stored, immutable per-refund audit-event ledger**, and no money is moved.

`app/owner/index.tsx` calculates **Net Earnings** from completed owner bookings using the 88%-of-rental-fee payout rule; it does not execute an actual transfer. A listing's optional Boost is also an **RM10, seven-day classroom simulation**, not a charge to a real payment provider.

BNPL is **not currently implemented as an active renter payment option**. Nor is any production insurance/protection settlement or real payment gateway implemented.

## 5. Evidence, cancellation, dispute and reviews

The authenticated rental-details route is `app/rental/[id].tsx`, backed by `services/marketplace.ts` role and state transitions.

- **Condition evidence:** Renter Check-in/Check-out media are linked to the rental; eligible submitted evidence requires at least **six photos and one video per stage**, as enforced in the relevant action paths. The lender views linked renter evidence and uses **No Issue – End Rental** after the renter confirms return, without a duplicate lender media-upload requirement.
- **End of clean rental:** When both renter return and lender inspection confirmations exist without an under-review dispute, the booking becomes `completed` and its simulated deposit is `released`. An unassessed actual return timestamp must not be assumed late solely because a button was clicked late.
- **Lender cancellation/dispute UI:** The one lender **Cancel Booking** sits in the **Lender Actions** card below the message/item card, with **Apply Dispute** immediately below. Lender Apply Dispute unlocks only at/after the scheduled rental **END** in Malaysia time, and cannot resubmit for a cancelled/already-disputed rental. The dispute record has stored status `under_review`; the user-facing page/notification says **PENDING**. A dispute submitted after already released funds does not reverse that release or create new charges.
- **Reviews:** Both roles see **Payment breakdown BEFORE How did it go?**. The review form is available only if **booking status is `completed` AND scheduled rental END time has arrived**. The service checks the same prerequisites and enforces one review per author per booking. Passing the END time with status `return_pending` is insufficient.
- **Booking-specific communications:** `app/conversation/[id].tsx` and the rental screens use persisted `Marketplace.messages` records. This is **not live Supabase Realtime messaging**. Notifications are in-app state entries; system push delivery is not claimed.

## 6. Customer Service and other educational features

`app/support/customer-service.tsx` with `services/marketplace.ts` provides eight defined quick-topic choices and an automated scripted chat. For an unknown question or **Talk to a Human**, the app displays this exact bot response:

> Your enquiry has been forwarded to our support team. We aim to respond here within one working hour. Thank you for your patience.

This classroom interaction **does not establish a real connected human-support queue, staff inbox or one-hour service guarantee**. The Profile also links to a distinct FAQ (six questions), Trust and How CurRENT Works pages.

## 7. Technical boundaries and production-readiness cautions

- **No production financial or insurance integration:** FPX/payments, refund, security deposits, lender payout, optional Boost and claims are simulated.
- **No production verification:** Demo OTP and eKYC do not prove control of a phone or identity; normal email/password login uses Supabase Auth.
- **Separate data behaviors:** Normal workspace JSON is stored through Supabase; Demo mutations are browser-session-local and reset on new sign-in. Do not describe either workspace as a completely live, normalized transactional backend with cross-device realtime collaboration.
- **Media caveats:** Listing and condition media are represented in app state and media-picker flows. The repository does **not** by itself establish fully secure production Supabase Storage upload policies, durable object storage or native device permission behavior.
- **RLS caveats:** `002_account_workspaces_and_rls.sql` defines owner policies for workspace snapshots and tightens some initial policies. The reviewed app state logic is still predominantly client-driven; historical SQL tables and the current JSON workspace must be assessed separately before any real user-money deployment.
- **README discrepancies are documented, not fixed in code:** The README V3.54 §0.11 records the eight current-code differences. Its §0.10 Demo-only seeded Listing Views policy remains a **documented desired Demo presentation**, while the reviewed `app/owner/index.tsx` still shows **`Views: —`**. Do not treat a README-only change as an implemented feature.

## 8. Tests, commands and what was actually verified

`package.json` defines these existing commands:

```powershell
npm run typecheck
npm test
npm run test:e2e
npm run build:web
npm run preview
```

- `npm test`: business logic tests in `tests/marketplace.test.ts`, including rental states and Demo fixtures.
- `npm run test:e2e`: **three current Playwright browser test definitions** in `tests/e2e/marketplace.spec.ts`, focused on signed-out Welcome/Sign In, mobile entry width and single-page Sign Up. **Do not claim three end-to-end authenticated rental journeys were verified** by this current file.
- `npm run typecheck`: TypeScript compile/type check without emitting output.
- `npm run build:web`: Expo browser export; `npm run preview` serves the export locally. Native device functionality remains separately unverified by documentation.

**Scope of this documentation update:** We **read GitHub source and configuration only**; we did **not run** these tests, query a live Supabase backend, check the deployed app or assess active vulnerability findings. An older 2026-10-03 dependency audit recorded 29 advisories, but that is **historical**, not a confirmed current dependency scan.

**No code, SQL, tests, migrations, Supabase settings, README or deployment is modified by a documentation-only update of this file.**
