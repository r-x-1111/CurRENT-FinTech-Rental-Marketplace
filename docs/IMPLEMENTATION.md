# Prototype implementation

The README’s core rental journey is implemented with React Native, Expo Router and a persistent local store. This enables an academic demonstration without provider credentials or hosted infrastructure.

## Architecture

- `context/Marketplace.tsx` loads a versioned AsyncStorage snapshot and serialises writes in order. Persistence failures appear in the interface.
- `services/marketplace.ts` applies state changes atomically to a copy of the store. It enforces participant roles, listing ownership, verification, allowed state transitions and review uniqueness.
- `services/booking.ts` validates calendar dates, computes exclusive-return rental days, checks availability and creates fee snapshots. An approved booking reserves its interval. Adjacent bookings are allowed.
- `data/seed.ts` contains synthetic demo profiles and listings. No completed rental history is invented; new profiles’ risk scores derive from actual local activity.
- Screens use the same actions for all accounts. Account switching is explicitly a demo control, not a production authorization mechanism.

## Financial simulation

The renter’s fee quote is captured when requesting a rental. Service fee is 5% with a RM5 minimum. The owner’s commission is 12% of rental fees only. Deposit rates are 10%, 20% or 30% of replacement value, determined by the existing explainable risk calculation. Optional demo protection is RM5/day for items valued at RM60,000 or less; this is not an insurance quote.

Payment progresses through required → processing → paid or failed. Success generates a demo agreement and secures the deposit. The owner records check-in evidence, the renter records check-out evidence, and the owner confirms inspection. This releases the simulated deposit and records a simulated payout. A dispute freezes release. No action transfers money or represents CurRENT as a financial provider.

BNPL is a selectable test method for verified renters with rental fees of at least RM200. Only rental fees are presented as financed; deposits and other fees remain separate. No real eligibility check occurs.

## Boundaries and follow-up

- Data is scoped to one device/browser, with no multi-device synchronization or live Supabase queries. Demo sign-in is local and is not a security boundary.
- Photos are selected through Expo ImagePicker and stored as data URLs for persistence. Storage capacity is limited; large uploads show a persistence warning.
- The eKYC flow collects no identity documents. Success/failure controls simulate provider responses.
- Seed ratings are sample ratings. Actual two-way reviews are shown on profiles, rental details and owner information.
- Cancellation is limited to unpaid requests. Support-admin dispute decisions, real refunds, refunds after payment, scheduled payment expiration, late-return detection and automated notifications outside the app remain future work.
- The initial Supabase migration is retained unchanged as scaffolding. It allows clients more control than a production service should. Replace it with trusted transactional commands, protected verification/risk fields, storage policies and narrow participant access before enabling real accounts or funds.
- Native Android/iOS UI and permission behavior require testing on a device or simulator. The browser suite covers the implemented interactions.

## Validation

`npm test` checks the shared business rules. `npm run typecheck` validates screens and tests. `npm run build:web` generates the browser bundle; `npm run test:e2e` exercises it in installed Chrome using a loopback-only preview server. Test artifacts are ignored by Git.

Validation completed: seven business-rule tests, three browser journey tests, TypeScript checks, web export and Android Hermes bundle export. Android export confirms bundling, not installation or operation on a real device. For a local preview after building, run `npm run preview` and open `http://127.0.0.1:4173`.

The dependency audit on 2026-10-03 reported 29 advisories (19 high, 10 moderate) in the Expo/React Native dependency tree. The registry’s proposed fixes require major framework version changes, including downgrades. Versions remain aligned with Expo SDK 57 and locked in `package-lock.json`; resolve or assess these advisories before any public deployment. No production security readiness is claimed.
