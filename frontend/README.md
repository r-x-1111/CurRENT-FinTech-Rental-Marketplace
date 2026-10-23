# Frontend — CurRENT

CurRENT's frontend is a single Expo Router / React Native (Web) application. It is **not physically relocated into this folder** because Expo Router requires its route tree to live at the project root (`/app`) to resolve routes and generate the web/native bundles; moving it would require rewriting every route reference and risk breaking the working Vercel deployment. Instead, this folder documents the frontend's real location and structure so it can be identified as a distinct, substantial part of the codebase, as required for the BFM3130 submission.

## Where the frontend code actually lives

| Concern | Real path | Purpose |
|---|---|---|
| Screens & routing | [`/app`](../app) | Expo Router file-based routes: tabs, auth, listings, rentals, delivery, disputes, admin, support, risk score, transactions |
| Reusable UI components | [`/components`](../components) | `ListingCard`, `BookingCard`, `RiskGauge`, `ActivityTimeline`, media pickers, animated UI primitives (`ui.tsx`, `MagneticGlow.tsx`, etc.) |
| Shared app state | [`/context/Marketplace.tsx`](../context/Marketplace.tsx) | React Context + reducer holding the in-memory marketplace state (listings, bookings, users, chat, risk scores) that screens read/write |
| Static constants/content | [`/constants`](../constants), [`/data`](../data) | Seeded demo data, copy strings, design tokens |
| Supabase client | [`/lib/supabase.ts`](../lib/supabase.ts) | Initializes the Supabase JS client from `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Types | [`/types`](../types) | Shared TypeScript types (risk levels, listings, bookings, etc.) |

## How the frontend talks to the backend

The frontend never calls a custom REST/GraphQL server. It talks to two things:

1. **Supabase** (Postgres + Auth + Row-Level Security), via the client in [`/lib/supabase.ts`](../lib/supabase.ts), for authentication, persisted catalogue/listing data, and shared messaging (see [`/supabase/migrations`](../supabase/migrations)).
2. **Application-side service modules** in [`/services`](../services) (documented in [`/backend/README.md`](../backend/README.md)), which contain all business logic — booking math, deposit/risk calculations, delivery quoting, demo payment simulation — and are imported directly by screens/components and by the `Marketplace` context reducer. There is no network hop for this layer; it runs in-process in the client bundle, which is why CurRENT has no separate backend server.

## Build/run entry points

- `npm run web` — Expo web dev server
- `npm run build:web` — static web export to `/dist` (deployed to Vercel per [`vercel.json`](../vercel.json))
- `npm run android` / `npm run ios` — native dev builds via Expo

See the root [README.md](../README.md) and [plan.txt](../plan.txt) for the full application architecture.
