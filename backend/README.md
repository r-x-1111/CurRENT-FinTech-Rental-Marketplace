# Backend — CurRENT

CurRENT has **no standalone backend server** (no Express/Next API/Fastify process). It deliberately uses a **Backend-as-a-Service (Supabase) + application-side service-layer** architecture, which is a legitimate and common FinTech prototype pattern. This folder documents that backend layer rather than duplicating or re-hosting it, to avoid introducing a parallel, untested server that is not part of the real, running application.

## Backend responsibilities and where they actually live

### 1. Managed backend services — Supabase
Path: [`/supabase/migrations`](../supabase/migrations), configured via [`/lib/supabase.ts`](../lib/supabase.ts)

- **Database**: Postgres tables for accounts/workspaces, listings/catalogue, shared messaging, chat history, listing moderation (see migration files `001`–`007`).
- **Authentication**: Supabase Auth (email/password, OTP for the demo account) — see [`/services/auth.ts`](../services/auth.ts).
- **Authorization**: Row-Level Security (RLS) policies defined in `002_account_workspaces_and_rls.sql`.
- **Realtime/shared state**: shared messaging tables (`003`–`005`) back the renter/lender chat.

### 2. Application-side business logic — `/services`
Path: [`/services`](../services)

These TypeScript modules implement all CurRENT business rules and run inside the client application (no network round-trip); they are the de facto "backend logic" layer of the prototype:

| Module | Responsibility |
|---|---|
| `marketplace.ts` | Core reducer/actions orchestrating listings, bookings, chat, FAQ, lifecycle transitions |
| `marketplacePersistence.ts` | Persists/restores marketplace state (Supabase + local storage) |
| `booking.ts` | Rental fee quoting, payment-method labeling (FPX/BNPL demo), Rental Protection premium/limit calculations |
| `deposit.ts` | Security deposit tiers by risk level, borrower service fee (5%, no minimum), lender commission (13%) and payout, Listing Boost fee (RM35) |
| `riskScore.ts` | Rental Risk Score computation and history |
| `delivery.ts` | Same-state (GrabExpress-style) vs cross-state (Domestic Courier) delivery quoting and eligibility |
| `deliveryAddresses.ts`, `demoDeliveryLocations.ts` | Address book and demo delivery location data |
| `catalogue.ts` | Listing data shaping, cross-state eligibility fields |
| `chat.ts` | Rental-scoped messaging helpers |
| `demoAccountProvisioning.ts`, `demoWorkspaceDefaults.ts`, `demoWorkspaceSessions.ts`, `repairDemoDeliveryPayments.ts` | Seeded/demo-account workspace setup and repair utilities (isolated from normal-account data) |
| `geo.ts` | Malaysian state/postcode helpers |

### 3. Why there is no separate server process

Introducing a new Express/Node API server now would (a) duplicate logic already implemented and tested in `/services`, (b) require re-plumbing every screen's calls and the Vercel static-web deployment, and (c) risk diverging from the actual, working business rules. Per the submission's own constraint to preserve existing functionality, CurRENT's backend is documented here as the Supabase + service-layer architecture it actually is, rather than faked as a conventional server.

See [`/frontend/README.md`](../frontend/README.md) for how the client consumes this layer, and the root [plan.txt](../plan.txt) for full system design.
