# CurRENT — MASTER APP DEVELOPMENT PROMPT

**Status:** V2.7 — founder-approved for publication in this GitHub README. This authorisation is for the README replacement only; implementing code, connecting services, and deployment still require separate explicit founder approval.

**Repository:** `r-x-1111/CurRENT-FinTech-Rental-Marketplace` (`main` is the existing default branch)

**Product tagline:** *Rent what you need. Earn from what you own.*

**Intended reader:** An AI software-development assistant working with the existing CurRENT repository, guided by the founder, one phase at a time.

---

## 0. Mission, scope and non-negotiable boundaries

Act as an experienced full-stack engineer, Expo/React Native specialist, software architect, UI/UX designer, FinTech product designer, business analyst, QA engineer and technical project manager. Improve and complete the **existing CurRENT application** using the Canva website as the primary **visual** reference, `CurRENT.pdf` and `CurRENT.xlsx` as business context, and the founder's **CurRENT V1.8 Risk Score & Deposit Determination specification** plus all later explicit founder clarifications in this document as the authoritative operating rules. Do not invent a different product or blindly retain conflicting GitHub implementation.

CurRENT is a Malaysian peer-to-peer item-rental marketplace initially focusing on Klang Valley. An account can operate as renter and lender, but the app has **exactly two customer-facing dashboards**, one for each role, and **no Admin Dashboard**. The customer-facing core is discovery, instant booking for eligible renters, simulated checkout, two-sided physical handover activation, 24-hour-block rental pricing, consecutive same-renter rebooking, two-sided return confirmation or dispute, renter risk scoring, refundable risk-based simulated deposits, and rental history.

**Classroom demo boundary:** Provide a polished, meaningful, responsive and interactive classroom demonstration running on Vercel. Do not accept or process money or genuine financial information; no actual eKYC, payment gateway, deposit escrow, bank transfer, insurance issuance or claims submission, BNPL loan, or real insurer valuation. The renter views payment details and explicitly clicks **Simulate Payment & Confirm Booking** to create a demo booking; clicking `Rent` only opens checkout. Label every financial or insurance/claim outcome as **DEMO / SIMULATED**. Use fictional or safe sample accounts/media, not genuine documents or banking data. Keep architecture reasonably extensible, without building costly real integrations.

**Latest founder decisions — binding:** If delayed mutual pickup activation would overlap another renter’s already-confirmed reservation, **protect that next reservation**; offer the current renter a **shorter conflict-free period** with a recalculated and clearly displayed demo financial adjustment, and require their affirmative acceptance **before activation**. No automatic rescheduling of someone else’s booking, no silent rental shortening. New verified renters start at 70 (website's 82 is decorative); V1.8 risk tiers/deposits/incident rules replace Canva/GitHub alternatives; Very High Risk (0–29) platform requests **always stay Pending (demo)** and cannot reach payment; preset fictional approved/rejected **damage claim** cases may be showcased, but never fabricate approval of restricted booking requests. Eligible reservations do **not** require lender approval. Rental duration is charged in **started 24-hour blocks**, not calendar-day difference. The rental clock starts from **mutual two-sided handover activation**, not simulated booking payment. When the same renter completes a **new successful consecutive booking** for the same item and there is no scheduling conflict, treat it as continuous physical possession; no intermediate return, new handover, repeat return evidence, or second deposit, but additional rental/service fees apply. At the final physical return, the renter uploads clear photo/video evidence. Both parties must affirm **Return Complete — No Issues** before an undisputed rental can complete and its entire simulated deposit be released. Either party can instead **Raise Dispute / Request Platform Review**, which BLOCKS no-issue completion and automatic deposit release until a properly represented simulated case resolution. Neither party can force the other to agree there is no dispute.

**Approval restrictions:** The founder has authorised this master prompt's publication in README.md, not application code changes, unrelated GitHub edits, service configuration or deployment. Obtain separate express founder authorisation for each implementation/deployment phase. **Cancellation timing is now confirmed:** renter-requested cancellation of a confirmed booking is permitted only **at least 24 hours before the originally scheduled pickup/start timestamp**. For eligible cancellations, return **100% of the simulated rental fee and 100% of the simulated renter service fee** and release **100% of the simulated security deposit**; charge **no cancellation fee**, label all ledger/refund events Demo only, and never transfer real money. **Shared cross-device accounts and central persistence are now CONFIRMED (Option B)** and are part of this classroom demo; real authentication and access permissions protect demo accounts and data. Preserve working code and app functionality wherever practical. Actual payment/deposit custody, real eKYC and insurance compliance remain future-stage matters only.

## 1. Source-of-truth order and uncertainty policy

Before implementation, read: this **approved** master prompt when approved, the founder's complete V1.8 score/deposit rules reproduced in Appendix A, the website screenshots/links in `CurRENT Website.pdf`, the business proposal `CurRENT.pdf`, `CurRENT.xlsx`, and the live current repository and tests. Screenshots are reliable visual references but do not prove unseen interactions are implemented.

**Resolve conflicts in this order:** (1) latest explicit founder decisions and V1.8 risk/deposit specification; (2) Canva website for *appearance, navigation and non-overridden examples*; (3) PDF and workbook for business intent and forecasts; (4) GitHub as a technical starting point only; (5) clearly identified engineering proposals. **The V1.8 deposit tiers and scoring rules override older website and GitHub values.** The founder has confirmed: `82/100` on the website has **no special meaning**, every newly demo-verified renter instead starts at **70/100**, a listing boost is **RM10 flat** (featured for seven days as the founder's proposed/selected demo rule) rather than a percentage, and **Very High Risk requests stay Pending (demo) without an approval/rejection demonstration**. The founder has now explicitly selected **Option B: real shared cross-device account login, central database, media storage and synchronised renter/lender actions**, while all financial and insurer outcomes remain demo only. The founder also confirmed **delayed-handover conflict Option A**: preserve the next renter’s confirmed reservation, offer the first renter a non-overlapping shorter rental with re-priced demo fees and an explicit renter acceptance step before activation.

Keep a `Confirmed / Implemented / Proposed / Needs founder confirmation` decision log. Do not merge strategic forecast assumptions into runtime per-rental pricing. Do not pretend that simulated eKYC, deposit custody or partner insurance is real. Where the V1.8 operational document uses phrases such as `payment`, `held`, `insurer determines` or `backend`, implement the described **business rule** as clearly labelled simulated financial/identity/insurance states and mock partner outcomes; these demo records **must persist to the real shared backend** as necessary for cross-device workflows. Real backend authentication/data synchronisation is required, while external payment/eKYC/insurance services are not. For item valuation, preserve **distinct internal fields for lender-proposed value and internal demo replacement estimate**. Automatically derive plausible illustrative values for seeded and newly listed items based on item category, description, age/condition and proposed value, using transparent deterministic demo heuristics; do not label those as actual insurer results or interrupt the renter with unnecessary insurance-valuation process text. For a future commercial product, insurer acceptance would be a separate process. The PDF and workbook do not define a complete cancellation/refund schedule. The founder has now defined the binding demo policy: cancellation only **at least 24 hours before original scheduled pickup**, with a **full simulated rental-fee and service-fee refund, full simulated deposit release and no cancellation charge**. Do not substitute workbook forecasts for this founder-confirmed transaction policy.

## 2. Product identity, positioning and audience

- Brand: **CurRENT**, prominent `Cur`/`RENT` wordmark styling, tagline **“Rent what you need. Earn from what you own.”**
- Geographic focus: **Klang Valley**, with examples from Kuala Lumpur, Petaling Jaya, Subang Jaya, Shah Alam, Bangsar, Mont Kiara, Bandar Sunway and Puchong. The workbook additionally discusses Cyberjaya as a target location. Support parent areas and neighbourhood labels; do not incorrectly treat neighbourhoods as separate states.
- Primary renters: cost-conscious people aged approximately 18–35, particularly students, young professionals, freelancers and creators who need temporary access instead of full ownership. These are business target segments, **not automatic eligibility exclusions**.
- Primary lenders/owners: approximately 21–45, including professionals, creators, photographers, gamers and owners of underused assets. Also permit one account to act as both renter and lender; no separate app required.
- Secondary segments: temporary residents, international students, interns and smaller businesses with intermittently used equipment.
- Value proposition: affordability, trust, transparent fees, reduced uncertainty around damage/non-return, rental records, item evidence and a seamless two-sided marketplace.
- Language/currency: English-first interface, amounts in **MYR/RM**, Malaysian locations and day/month/year conventions suitable for local users; store date values in a consistent machine-readable format.

## 3. Visual design: preserve the Canva website

Reproduce the current website's **visual character**, not a generic marketplace template:
- Dark navy hero and footer, bright electric-blue primary actions, light-blue explainer/trust bands, warm off-white listing areas, white cards, muted borders and restrained green verification indicators.
- Use the existing theme constants as a starting point: navy `#0B1F3A`, accent blue `#2F6BFF`, pale blue `#EEF5FF`, off-white `#F8F7F3`, with legible dark body text.
- Clear headline hierarchy, compact supporting copy, rounded cards, subtle shadows, item photo thumbnails, visible price per day, owner verification badges and rating stars.
- Hero copy: **“Rent what you need. Earn from what you own.”** Above/near the fold: search, location dropdown, quick categories, `Browse Rentals`, `List an Item`, and floating sample item cards where space permits.
- Match homepage section order where practicable: header → hero/search → **How it works** (Search, Review, Pay, Return) → Popular Rentals → Trust/Safety → List Your Item → Dashboard Preview → Recent Reviews → FAQ → closing call-to-action → footer.
- Respect Canva's website design as the visual benchmark but adapt spacing/navigation for phones. On narrow viewports use stacked cards, horizontal scroll/chips and obvious tap targets. Do not simply embed the Canva site or use screenshots as the UI.
- Real interactions: clickable listing cards, navigable sections, search submissions, functional filter controls, expandable FAQ, item gallery, feedback for invalid forms, clear empty/loading/error states.
- Use actual source-consistent item titles, categories, areas and sample prices; preserve the **six visible example reviews** as clearly labelled demo/sample content, rather than inventing verified customer activity.
- Treat published Canva screenshots as **visual evidence**; interactions not observable from them require a proposal or a founder decision.

## 4. Screens, routes and navigation

Preserve compatible Expo Router patterns unless there is a compelling reason to change. Web navigation should resemble the Canva website; mobile navigation can retain appropriate native-inspired tabs.

**Public/shared:** landing/home; browse, categories, search/filter; listing detail/gallery; How It Works, Safety, FAQ; **real account sign-up/sign-in/sign-out and account recovery through the shared auth service**; demo-eKYC profile entry; help/contact. Anonymous users may browse public listings, but account-specific renter/lender operations require authentication.

**Renter Dashboard only:** profile; demo eKYC status and flow; risk-score gauge/tier and score history; applicable deposit rate; rental history and incident details; checkout/payment-info simulation; agreement; confirmed and pending restricted booking/request statuses; **two-sided pickup activation status and renter `Confirm Item Received` button**; effective rental clock and consecutive booking availability; messages; notifications; renter return media upload and **`Confirm Return — No Issues` OR `Raise Dispute / Request Platform Review`**; evidence and appeals; damage claims, confirmed obligations, deposit application/release and restrictions.

**Lender Dashboard only:** list/manage items; published availability and pickup windows; direct confirmed bookings; eligible renter's verification and risk relevant to *that transaction*; messaging; **lender `Confirm Item Handed Over` and two-sided activation state**; linked continuous-booking status, effective return deadline, final return evidence review; **`Confirm Item Received — No Issues` OR `Raise Dispute / Request Platform Review`**; submit incident evidence; relevant claims, calculated commission, payout, deposit and compensation-status displays; reviews.

**Strictly no Admin Dashboard or internal staff interface.** Do not add an admin tab, route, sidebar entry, approval panel, operational console or business analytics dashboard. A 0–29 renter's request is to the **CurRENT platform**, not to the lender; the renter only sees **Pending Platform Review (Demo)** for new Very High Risk booking requests. Only separate predefined fictional damage-claim scenarios may display outcome statuses, clearly marked simulated and controlled outside ordinary customer-facing decision actions. Add no ability for ordinary users/lenders to assign themselves an approval or insurer payout.

Web header should visibly support `Browse rentals`, `How it works`, `List an item`, `Safety`, `Messages`, `Profile`; avoid duplicate dead-end routes, ensure safe refresh/deep links and obvious mode switching.

## 5. Website reference listing catalogue (demo seed)

Seed the items **shown in the supplied screenshots**. These examples establish visual/category/location variety; do not invent extra product prices as though they came from Canva. The following **daily rates and locations are screenshot examples**, not compulsory rates for user-created listings.

| Visible sample listing | RM/day | Example area |
| --- | ---: | --- |
| Sony A7 III Mirrorless Camera | 45 | Petaling Jaya |
| Portable Projector | 28 | Kuala Lumpur |
| PlayStation 5 + Gamepad | 35 | Subang Jaya |
| 27-inch Computer Monitor | 18 | Kuala Lumpur |
| Ergonomic Office Chair | 15 | Petaling Jaya |
| Pressure Washer | 35 | Shah Alam |
| GoPro-style Action Camera | 30 | Bangsar |
| Portable Party Speaker | 40 | Mont Kiara |
| Drone | 80 | Kuala Lumpur |
| Designer Luxury Handbag | 120 | Petaling Jaya |
| Luxury Watch | 100 | Mont Kiara |
| Designer Luxury Necklace | 90 | Petaling Jaya |
| Standing Air Cooler | 45 | Bandar Sunway |
| Microwave | 12 | Bandar Sunway |
| Tabletop Oven | 15 | Puchong |
| Fishing Rod Set | 20 | Shah Alam |
| Camping Tent | 35 | Petaling Jaya |
| Portable Power Station | 50 | Kuala Lumpur |
| Wedding Arch / Backdrop Stand | 60 | Kuala Lumpur |
| LED Event Lighting Kit | 45 | Petaling Jaya |
| Photo Booth Setup | 100 | Kuala Lumpur |

Website category chips shown: **Electronics, Gaming, Luxury, Household, Work & Office, Tools, Outdoors, Event Gear**. Organise examples consistently and include suitable camera/audio categories if helpful, without duplicating the same listing in storage. Category refinements must remain subordinate to screenshot fidelity.

Seed sample photos/gallery images responsibly; use available lawful images or clearly identified placeholders. Maintain gallery thumbnails and a main image. The existing repo seed differs from the Canva sample (e.g., PS5 and projector prices, replacement value, and extra drill/bicycle listings): reconcile it instead of blindly preserving mismatches.

## 6. User identities, demo verification and roles

- A signed-in profile may be both renter and lender; switching customer dashboards changes the view, not the account identity. Only the **renter role** has a Rental Risk Score; a person operating as lender does not receive a distinct lender risk score.
- Provide preconfigured safe demo accounts for a renter and lender who can **log in on different browsers/devices** and conduct the same real-time demo booking together. Support genuine application sign-up/sign-in/sign-out using the selected backend authentication service; user identity/session authentication is real for shared data security, while **eKYC status is only simulated**. Allow one authenticated account to switch renter/lender dashboards without changing identity.
- To be allowed to rent, the renter must be in the **successfully demo-eKYC-verified** state. Before verification: `Rental Risk Score = N/A`, no risk tier and no booking permission. Upon the **first successful simulated verification**, assign score **exactly 70/100 (Low Risk)**. Do not award verification bonus points, start at 50, or make website's former 82 the default. Prevent repeated verification from resetting any existing score.
- Verification workflow can show `not_verified → pending_demo → verified_demo/failed_demo`; make this transparently a demo using only fictional/no sensitive input. No real KYC provider, document capture or identity check is involved. The visible verification badge must say `Demo verified` or equivalent rather than imply official verification.
- Lenders also need simulated identity-verification status for the trust badge, but no risk score as lenders. A verified person acting as a renter follows the renter risk rules.
- Apply access controls consistently: renter cannot rent own item; only owner can edit item; renter sees own score/history; lender sees risk/incident information **only for bookings involving their own items**; neither can change risk-score adjustments, platform decisions, insurance coverage or final claim liability.
- **Confirmed Option B:** shared cross-device authenticated profiles, bookings, messages, handover/return confirmations and status changes are mandatory. Treat browser local storage as a non-authoritative cache of UI preferences only; do not implement local fictitious account switching as the primary data model. Never claim demo eKYC verifies real identity.

## 7. Listing creation and lender tools

Functional lender journey: `Profile → Lender Dashboard → List an Item → form → photo preview → Publish → manage available dates/times/edit/pause`. Listing requires name, useful item description/accessories, category, daily RM price, the lender's **declared current item/replacement value**, item age/condition if practical, relevant location, owner-defined available booking periods and pickup time windows, collection method, listing media and active status. Validate all fields. Owners control the availability they publish, **not acceptance/approval of each normal booking**; the platform checks availability and confirms eligible demo bookings directly after demo checkout.

**Internal demo value estimation (confirmed):** The owner supplies their proposed item value, while the app can reasonably calculate or choose its own plausible **internal illustrative replacement-value estimate** using item type, age, condition, typical replacement cost and submitted information. Populate reasonable estimates for the entire demo catalogue and allow new owner listings to obtain a deterministic demo estimate automatically, so deposit calculations work without awaiting a real insurer. Keep both values separately in the data model, and never describe the simulated estimate as an actual insurance assessment, actual insurer approval or guaranteed cover. **Do not clutter customer-facing screens with the behind-the-scenes valuation explanation**; show only the applicable deposit amount and fee breakdown unless a specific disclosure is necessary to avoid a false real-insurance claim. Future commercial insurance valuation by the partner is outside scope. Changing an item listing cannot retroactively alter frozen existing booking amounts.

**Lender payout:** Commission is 12% of rental fee; displayed payout = 88% of the rental fee, not counting refundable security deposit. E.g. RM45/day → RM39.60/day. For an additional continuous booking, the newly charged rental fee gets its own 12% commission and 88% payout calculation.

**Optional Listing Boost (confirmed):** A fixed **RM10 per boost** obtains seven days of `Featured (Demo)` placement for the chosen listing, starting on simulated boost activation. Record activation and expiry timestamps, do not actually charge money, never auto-renew, and remove featured placement on expiry. Featured positions must still honour selected search, date/availability and location filters. The seven-day length is founder-confirmed; the pro forma's 10% is projected uptake, **not** an extra fee rate. The workbook additionally contains an older conflicting 3%-capped description; use the founder's RM10 decision. Boost is a separate lender option, NEVER added to renter checkout.

**Pickup coordination:** The owner publishes pickup availability or suggested time slots; renter chooses a proposed pickup/start date and time at booking, and both may arrange a mutually feasible meeting in the in-app conversation. Coordination messages alone do **not** activate the rental; handover requires both confirmation buttons and a conflict-free state as specified in Sections 9, 13 and 14.

## 8. Discovery, searching and filtering

Enable meaningful text search (title and, if useful, description), category chips, area/neighbourhood filter, price range or max daily price, verified demo owner, availability/date range, saved/favourites, currently active `Featured (Demo)` boosts and useful sorting (price and rating). Selected filters must change real displayed results, be clearable and work together. Display `No items match your filters` with a reset option when empty.

Show item photo, name, area, **RM/day**, example rating, owner badge and an accurate time-bounded `Featured (Demo)` indicator for active RM10 boosts. Favourites must persist in the authenticated user’s shared database records and appear consistently after login on other devices. Tapping a card must navigate to that listing's detail page; never show wrong images/prices for the chosen ID.

Item detail should include image gallery, description, inclusion notes, owner's display details, location, daily price, review/rating context, date pickers, rental duration, quote breakdown, collection options, deposit explanation and a clear **Rent** call to action. Ensure a user can't rent their own listing.

## 9. Rental duration, availability, actual activation time and consecutive bookings

**Founder-confirmed 24-hour model (overrides the prior calendar-day method):** Renter selects proposed pickup/start **date and time**, proposed return **date and time**, in `Asia/Kuala_Lumpur`. Validate that requested end occurs after requested start. Use the exact requested duration in hours for the booking's **agreed occupancy duration** and charge one whole rental day for **each started 24-hour block**, with a one-day minimum:

```text
agreedDurationMinutes = requestedReturnInstant - requestedPickupInstant  // positive
chargeableRentalDays   = max(1, ceil(agreedDurationMinutes / (24 * 60)))
rentalFee              = dailyPrice × chargeableRentalDays
```

Examples (daily rate RM90): exactly 24h costs RM90; 31h costs RM180; exactly 48h costs RM180; 55h costs RM270. **The agreed duration in hours and the number of 24-hour blocks billed are separate**: a 31-hour requested rental costs two daily units while its agreed return deadline is 31 hours after actual activation, not silently 48 hours later. Show the cost/duration clearly. **Do not use** `calendarDaysBetween(startDate, returnDate)`; calendar labels alone cannot determine chargeable days. Do not add hourly charges beyond the started-block daily fee.

**Reservation vs actual use:** Booking is **Confirmed (Demo)** after explicit simulated payment/checkout, reserving the item for its originally selected interval, but its `Active` rental clock does **not** start until physical handover is mutually confirmed: lender clicks `Confirm Item Handed Over`, renter clicks `Confirm Item Received`, and both confirmations refer to the same booking. Each action records its own timestamp. Upon the second valid confirmation, define **activationTimestamp** as the time the second confirmation is accepted, and derive `effectiveReturnDeadline = activationTimestamp + agreedDurationMinutes`. For example: scheduled Nov 2 10:00 → Nov 5 10:00 (72h) but actual jointly confirmed pickup Nov 2 23:00 → deadline Nov 5 23:00 **only if availability permits**. No extra rental fee solely because handover was delayed. Return lateness uses the agreed **effective** deadline, not the original arbitrary proposed pickup hour. The first two late hours are a grace period for **risk scoring** only; they are not an automatic extra rental allocation or new monetary charge.

**Protect confirmed future bookings — founder-confirmed Option A remedy:** Recheck owner-published availability and all confirmed reservations during quote, at demo checkout, **and immediately before activation** using the actual handover time. If the full paid duration shifted to actual handover would overlap another renter's **already confirmed** reservation, do not move or invalidate that reservation. Show `Scheduling Conflict — Revised Rental Offer Required (Demo)` to the current renter, and compute a **shorter available occupancy period** ending no later than the first conflicting reserved start (and respecting any other owner availability limits). This is an offer, **not an automatic shortening or activation**. Display the exact proposed actual start, revised return deadline, original vs revised duration, started-24-hour rental-day count, original vs revised rental fee and renter service fee, the **difference/refund (which may be RM0)**, and the retained initial security deposit. Recompute amounts **only from the approved started-24-hour formula**; no improvised hourly proration, penalty, compensation fee or change of deposit. The renter must explicitly **Accept Revised Rental** before the app can activate it; lender booking approval is still not required. If the renter declines, the offered interval is infeasible, or availability changes before acceptance/activation, keep the rental inactive in an honest `Conflict Unresolved` state and do not falsely issue a new deadline, settle a refund or affect other reservations. Require a new valid conflict-free proposal rather than fabricating an outcome. After the renter accepts, recheck availability **transactionally** at final two-sided activation and commit the accepted interval, activation time, adjusted fees/commission, and any simulated refund **exactly once**. A revised quote expires/refreshes if delay means its availability no longer holds. A booking may not use ordinary >24h cancellation as a substitute for this delayed-handover conflict flow. Never treat an unaccepted offer as active. For example, originally 72 hours for 3 chargeable days but shortened to 63 hours remains 3 chargeable days under this billing rule; display `RM0 fee adjustment` honestly, not a fictitious refund. Quotes and pending Very High Risk requests do not reserve inventory.

**Consecutive booking is the only V1 extension mechanism:** The SAME renter can use the app to make a NEW eligible booking for the SAME item starting **exactly at the previous effective return deadline**, provided the owner's published availability and all other confirmed bookings allow that additional interval. There is **no independent owner-approval extension request or owner override**. A successful simulated checkout for the additional interval recognises a **continuous possession chain**, automatically extends the current effective return deadline by the agreed additional hours, and notifies both users. Renter **does not** physically hand back the item, upload intermediate return media, or press the two activation buttons again at the prior end time. If any gap, item mismatch, renter mismatch, failed checkout or unavailable time exists, the app MUST NOT call it a continuous extension, and the old return deadline remains in force. Do not give away another confirmed renter's reserved dates.

**Deposit and scoring for a continuous chain:** Keep the FIRST chain booking's simulated security deposit as the one continuing held deposit. Charge **only additional rental fee plus its 5%-minimum-RM5 service fee** for each successful consecutive booking; **zero additional deposit**. Keep one linked chain/physical-possession record with all chargeable booking segments and financial snapshots. Release/adjust the original deposit only after the **final** two-sided return or completed dispute process. Treat the final return and its incidents as **one continuous physical rental outcome**, thus **one final risk-score adjustment** for the chain, never one +2 or penalty per payment segment. Apply late-return timing against the chain's latest valid effective return deadline, with all segment history retained. This does not authorise any separate unapproved extension or second deposit.

**Confirmed booking-cancellation eligibility — founder decision:** A renter may cancel a **confirmed, not-yet-activated** booking only if the request timestamp is **at or before** `scheduledPickupStartAt - 24 hours` (Asia/Kuala_Lumpur). Calculate the cutoff from the **scheduled booking pickup/start timestamp captured at simulated confirmation**, not the later physical handover or two-sided activation timestamp. Display the exact cancellation deadline, and disable/hide the cancellation action once the cutoff has passed or the rental is already active/completed. If a new booking is confirmed fewer than 24 hours before its scheduled pickup, it has no eligible cancellation window; disclose this during its simulated checkout. Do not allow chat negotiations, owner/lender actions, or delayed pickup to silently reset the cancellation window. Do not treat abandonment of an unpaid quote as cancellation of a confirmed booking.

**Cancellation settlement — founder confirmed Option A:** Upon a valid cancellation **at least 24 hours before the original scheduled pickup**, reverse/refund **100% of the simulated rental fee and 100% of the simulated renter service fee**, release **100% of the original simulated security deposit**, and charge **RM0 cancellation fee**. Display distinct Demo-only refund/deposit-release ledger entries (no actual transfer). Mark the booking Cancelled (Demo), make the cancelled time range available again, notify relevant renter/lender, record an audit trail and prevent duplicate simulated refunds/releases on repeated clicks. Current repo's 1–90 day rental-length limit, if retained, is provisional and not a founder-confirmed business rule.

## 10. Financial calculations and deposit ledger — canonical formulas

Use ONE tested financial/booking domain service for quotes, checkout, deposit, booking snapshots, lender payouts, extensions, dashboards and test fixtures. Work in integer MYR sen or exact-decimal arithmetic; round consistently to two decimals. Quoted money never changes due to a screen refresh.

```text
agreedDurationMinutes    = requestedReturnInstant - requestedPickupInstant // > 0
chargeableRentalDays     = max(1, ceil(agreedDurationMinutes / 1440))
rentalFee                = dailyRentalPrice × chargeableRentalDays
renterServiceFee         = max(RM5.00, roundToSen(rentalFee × 0.05))
lenderCommission         = roundToSen(rentalFee × 0.12)
estimatedLenderPayout    = rentalFee - lenderCommission
securityDepositFirst    = min(roundToSen(demoReplacementValue × tierRate), tierCap)
checkoutTotalFirst      = rentalFee + renterServiceFee + securityDepositFirst
checkoutTotalConsecutive = additionalRentalFee + max(RM5.00, roundToSen(additionalRentalFee × .05)) + RM0 extra deposit
revisedFeeIfLateHandover = dailyRentalPrice × max(1, ceil(acceptedShorterDurationMinutes / 1440))
revisedServiceFee       = max(RM5.00, roundToSen(revisedFeeIfLateHandover × 0.05))
refundOnActivatedRevision = (originalRentalFee + originalServiceFee) - (revisedFeeIfLateHandover + revisedServiceFee) // normally ≥ RM0; demo ledger only
```

**V1.8 authoritative deposit table (supersedes old website and GitHub):**

| Score | Tier | Deposit basis | Booking route |
| --- | --- | --- | --- |
| N/A | Unverified | No rental/deposit quote | Booking blocked |
| **70–100** | Low | **5% of internal demo replacement value, capped RM500** | Direct demo checkout |
| **40–69** | Medium | **10%, capped RM1,000** | Direct demo checkout |
| **30–39** | High | **15%, capped RM1,500** | Direct demo checkout |
| **0–29** | Very High | Platform determines if ever approved | **Pending platform review only** in this classroom demo; no checkout |

At illustrative RM12,000 replacement value, deposits are RM500/RM1,000/RM1,500 for Low/Medium/High. Boundary scores 29, 30, 39, 40, 69 and 70 must be tested. The website's illustrative camera checkout can still read **Sony A7 III RM45/day × 2 started 24-hour periods = RM90 rental + RM5 minimum service + RM200 Low Risk deposit = RM295**, with an internal illustrative replacement-value estimate of RM4,000. This is a scenario fixture rather than a real insurer's valuation. Corresponding lender commission = RM10.80 and payout = RM79.20. For the website-style 2-day example, choose timestamps **exactly 48 hours apart** to demonstrate the same RM295 total. No additional lender/owner commission or optional protection charge is imposed on the renter.

**Founder-confirmed late-handover revision is an explicit exception to otherwise frozen amounts:** A renter-accepted shortened occupancy period due to a next confirmed booking requires recomputation of **rental fee, renter service fee, lender commission and payout** using canonical started-24-hour pricing. Preserve original and revised snapshots and a separate idempotent **Demo Adjustment / Refund** record upon successful revised activation only. Do not refund or change the original deposit solely because the period shortened. If the original and revised durations fall in the same chargeable-day band, show a **RM0 fee change**, not a false promise of a refund. Never automatically shorten or finalize amounts without renter acceptance.

**Freeze amounts:** Revalidate quote/eligibility and availability just before `Simulate Payment & Confirm Booking`, then fix booking's rental rate, chargeable days, fee, commission, relevant risk score/tier, replacement-value estimate, deposit and demo confirmation timestamp. Later score changes affect future ordinary rentals, not the already-frozen deposit. Every continuous-chain additional booking freezes **its own rental/service-fee** and commission, but uses **the initial held deposit** with no second simulated deposit charge (even if the person's current score later changes). The refundable deposit is never platform revenue. The RM10 owner boost is not in renter checkout. Do not include the repository's unsupported optional RM5/day protection fee.

**Deposit release is CONDITIONAL, not automatic on upload or unilateral confirmation:** In the clean return path, the renter must upload clear final item-condition images/video, both parties must have physically met and both press `Confirm Return — No Issues` on the same physical handback. **Only then** mark the entire original simulated deposit `Released (Demo)`, close the continuous rental and apply the single final risk-score adjustment. If **either** party raises `Dispute / Request Platform Review` before both no-issue confirmations, block issue-free completion and retain `Held for Dispute (Demo)` until a predefined, explicitly fictional case resolution or future platform process determines properly confirmed liability, deposit application and release. Record each deposit change exactly once. No real funds are held, deducted or refunded.

## 11. Rental Risk Score — mandatory V1.8 rules

**This section and Appendix A supersede all earlier Canva risk examples and GitHub's base-50/rating-based scoring logic.** The website's former `82/100` was a visual demo number **with no required significance**. It must not dictate a new user's initial score or an artificial computation. **Only renters** receive a score, only **after successful demo-eKYC**, initially **70**; unverified users show **N/A**. All scores are integers in `[0,100]`, higher = better, and tier mapping is 70–100 Low, 40–69 Medium, 30–39 High, 0–29 Very High.

**Adjustments per completed rental after final confirmation/resolution:**

| Final outcome | Risk score consequence |
| --- | --- |
| Completed on time, no confirmed issues | **+2** |
| Unapproved late return more than 2 hours | **−min(5, ceil(max(0, hoursLate − 2)))** |
| Confirmed minor damage | **−10** |
| Confirmed serious damage **or accidental loss** | **−30** |
| Confirmed intentional theft/fraud | **Permanent booking/account ban**, separately from score |

**Late returns:** two-hour grace measured from the **effective deadline after mutual handover activation and any successful consecutive same-renter rebookings**, NOT from initial reserved pickup or late lender-click timestamp. V1 extensions require fresh availability-checked consecutive bookings; no owner approval. The final physical return time (confirmed/recorded independently of delayed button clicks) is the lateness endpoint. Late penalty is minus 1 per *additional started hour* after grace and maximum −5 per continuous physical rental: up to 2h = 0; >2 to 3h = −1; >3 to 4h = −2; >4 to 5h = −3; >5 to 6h = −4; >6h = −5. At **exactly 4 hours late, −2**. Calculate from actual physical handback and the latest valid effective deadline, including confirmed consecutive bookings; no confirmed dispute outcome means no score deduction yet.

**Exactly one adjustment per physical rental, including the full continuous same-renter booking chain.** If there is more than one confirmed violation, record **all** incidents but apply **only the most serious confirmed penalty**, not their sum. E.g. 4h late plus confirmed minor damage: late shown **`Recorded`**, minor damage **`−10`**, **final adjustment `−10`**, 70 → 60. A violating rental gets **no +2** reward. Pending complaints, normal wear and tear, unproven allegations, ordinary failed payment attempts, inactivity and unpaid damage obligations **never** automatically change score. There are no streak bonuses. Confirmed intentional fraud results in a ban even if no additive risk-score deduction is defined. Late/non-return allegation alone is **not fraud**.

**Corrections and appeals:** score changes only when final outcome is confirmed and disputes resolved. Maintain an immutable/auditable incident history, a **single effective adjustment** per booking and before/after scores. If a later outcome is more serious or an appeal succeeds, **replace/recompute the earlier booking adjustment**, never append duplicate penalties. Retain the earlier incident/correction history. Clamp scores to `[0,100]`; do not double-adjust on refresh, reload or duplicate event handling. Consider rebuilding score deterministically from verified base 70 plus effective per-booking adjustments in chronological order, including corrections, so intermediate prior/new values remain coherent.

**Renter history UI:** per booking show item, location, start date, scheduled/agreed return deadline, actual return timestamp, all incidents and evidence, dispute confirmation status, actual penalty **only on winning incident**, other incidents marked **`Recorded`**, one final adjustment, before/after score and appeal status. Lender sees only records concerning **their own item bookings** and cannot change risk-score outcomes. A renter with a score 0–29 must request **CurRENT platform** approval for each specific booking; no owner approval or customer-facing admin interface.

The gauge must update dynamically from the actual demo score. Show plain-language rationale without describing it as a credit score, statistical underwriting or genuine fraud detection. See Appendix A for V1.8's full detailed requirement list and example.

## 12. Booking confirmation, payment-information screen and restricted requests

**Eligible booking path:** renter chooses an available item and valid scheduled pickup/return timestamps → app computes `ceil(agreedHours/24)` billed days, service fee and V1.8 deposit → renter clicks `Rent` to open a **payment-information/checkout screen**, NOT to confirm a reservation → renter presses **Simulate Payment & Confirm Booking** → store a `Confirmed (Demo)` reservation and notify lender. Booking becomes active **only later**, after a real-world-meeting demo handover and both activation buttons. The lender receives notice but has **no approval button** for eligible renters. Display `No money charged — classroom simulation` and never request real card/FPX/bank details. Store frozen quote, booked duration, original planned collection interval and later activation. Confirmation must be idempotent and recheck availability.

**Checkout requires:** fictional verified eKYC (new verified score 70), account not suspended/banned, no confirmed overdue damage balance 7 days after notice, listing active, dates/times valid and not conflicting, and score tier permitting direct checkout (30–100). The system also blocks renting one's own item and duplicate booking submissions. **Very High Risk 0–29** cannot enter checkout: they submit a CurRENT platform request tied to that item/dates, get `Pending Platform Review (Demo)` and remain pending indefinitely. Do not demonstrate approvals/rejections, fake payment unlocks, customer admin buttons or owner booking approval. Fictional approved/rejected **damage claim** cases are allowed independently and must never unlock these requests.

**Consecutive booking payment:** From an active rental, same renter may select fresh adjacent availability that **begins exactly at the current effective return deadline**. If available, checkout shows **additional rental fee + additional service fee + RM0 additional deposit** because the original simulated deposit carries forward. After explicit simulated confirmation, link the extension segment to the active physical rental, update final effective deadline, notify both users; no new handover or middle return media is required. If it is not consecutive or cannot be booked, normal booking/deposit rules and an appropriate new handover apply, subject to policy. There is no special owner approval extension flow.

**Cancellations:** Quote abandonment before confirmation is free and creates no booking. After simulated payment confirms a booking, permit cancellation requests only **at least 24 hours before the original scheduled pickup/start** (not actual two-sided activation). Show the exact cutoff and lock the action after the cutoff. There is **no separate cancellation fee**. When eligible cancellation is confirmed, mark **Cancelled (Demo)**, restore availability, record **full simulated rental-fee refund + full simulated service-fee refund + full simulated deposit release**, and charge **no cancellation fee**. Do not process real money. An unpermitted late cancellation or no-show is **not** automatically eligible for this full-refund treatment; any additional no-show remedy is not founder-specified.

## 13. Explicit booking/activation/return/dispute state machines and actor permissions

Use persistable, tested domain states rather than merely visual status chips. Treat naming below as an implementation guide; it may be mapped to existing types after repository audit.

```text
Eligible booking:
  quote -> payment_info_demo -> confirmed_demo (dates reserved, rental clock OFF)
         -> pickup_arranged -> handover_awaiting_both
  handover_awaiting_both -> one_side_confirmed -> both_handover_confirmed
         -> availability_rechecked -> active (activationTimestamp recorded, clock ON)
  availability_rechecked -> activation_scheduling_conflict (protect next confirmed booking)
  activation_scheduling_conflict -> revised_shorter_offer_demo (price/interval shown; rental still inactive)
  revised_shorter_offer_demo -> renter_accepts_revised_terms -> recheck_availability_atomically
  recheck_availability_atomically -> active_at_mutual_confirmed_handover (activate once; adjusted demo ledger once)
  revised_shorter_offer_demo -> renter_declines / no_conflict_free_interval -> conflict_unresolved (no activation)
  recheck_availability_atomically -> availability_changed -> renewed_conflict_offer_required (no activation)

Same-renter consecutive availability-checked booking:
  active -> new_consecutive_quote -> additional_demo_checkout -> additional_confirmed_demo
         -> active_chain_deadline_extended (original deposit continues; no 2nd handover)
  missing availability / different renter / gap / failed checkout -> no extension

Physical return (final chain segment only):
  active -> return_evidence_required -> physical_handback -> return_awaiting_both_no_issue
  return_awaiting_both_no_issue -> one_side_no_issue_confirmed
         -> both_no_issue_confirmed -> completed_issue_free_demo
         -> full_original_deposit_released_demo (once)
  [from any incomplete no-issue return state]
         -> dispute_raised_by_either -> return_under_platform_review_demo
         -> original_deposit_held_for_dispute_demo
  return_under_platform_review_demo -> preconfigured_fictional_claim_outcome
         -> liability_applied_demo / deposit_remainder_released_demo / appeal_demo
         -> closed_after_demo_settlement (not labelled no-issue)

Cancellation gating (confirmed booking, not yet activated):
  confirmed_demo_booking -> cancellation_eligible (now <= scheduledPickupStartAt - 24h)
  cancellation_eligible -> cancelled_demo + full_rental_fee_refund_demo + full_service_fee_refund_demo + full_deposit_release_demo + release_reserved_inventory
  now > cancellationCutoff / active / completed -> cancellation_not_available
  Note: all cancellation/refund/deposit-release transitions must be idempotent, actor-authorised, auditable and strictly simulated (no real funds).

Very High Risk booking request (class demo only):
  quote -> platform_request_pending_demo
  [no approval/rejection transitions, no checkout unlock]
```

**Late-handover conflict guard:** Offer the current renter a shorter collision-free period with transparent original/revised demo price comparison and require acceptance before the two-sided activation is finalised. Both confirmations can be recorded as pending while resolution is required, but no rental timer starts, no revised refund posts and no booking is marked Active until explicit acceptance plus a successful final conflict/authorization check. Activation timestamp is the time the last required condition (both valid handover confirmations **and** renter acceptance) is committed; calculate the deadline from the **accepted shortened duration**. If physical exchange already occurred before the app detected a conflict, avoid pretending the rental was active before acceptance; the UI should encourage settling the revised offer before handing over. Never double-activate or modify the later renter’s reservation.

**Mutual handover:** Lender button `Confirm Item Handed Over`; renter button `Confirm Item Received`. Neither alone activates rental. Both button states, actor IDs and timestamps must be visible/persisted. Record activation exactly once using the accepted second confirmation timestamp, not the simulated payment timestamp. Physical item-condition pickup evidence may be attached by the parties. Before scheduling activation, guard against overlaps created by lateness and flag unresolved conflicts without altering someone else's confirmed booking.

**Mutual clean return:** Renter first uploads clear return photos/videos and marks item physically handed back; lender confirms actual receipt. Each party is given **two honest choices**: `Confirm Return — No Issues` OR `Raise Dispute / Request Platform Review`. Clicking the no-issues button is an affirmative statement of **both physical handback/receipt AND no item/deposit dispute**. If there is any issue, do **not** use the no-issues button. A single unilateral no-issue click never closes the rental or releases the deposit. If **either** party raises dispute before the second no-issue confirmation, their dispute state prevails and blocks ordinary completion/release even if the other already agreed. Renter and lender cannot finalize the other's button state. Preserve timestamps for actual handback vs upload/confirmation to prevent a late-click causing false late-return point deductions.

**Insurance/claims vs platform request:** Damage/loss dispute review may show PREDEFINED clearly fictional `Claim approved / rejected / appealed / corrected` outcomes; no new user claim automatically receives a positive outcome. This is NOT approval for Very High Risk platform booking requests, which must stay Pending (demo). Neither public renter nor lender may edit scored outcomes, insurer coverage, ban decisions or liability. No Admin Dashboard, regardless of internal scenario states.

**Financial/incident transitions:** Never double-confirm checkout, activate twice, apply a score twice per continuous physical rental, charge a second chain deposit, settle the same deposit twice or show funds as real. Only after final dispute decision/review should one effective risk adjustment be applied. For a clean return, both no-issue confirmations release the simulated deposit in full and allow the +2 reward if returned on time/no violation, or a single late penalty if the physical return was actually late and confirmed. **Do not award +2 to a confirmed late-violation case simply because no item damage occurred**; the no-dispute return affirmation is distinct from risk/timeliness assessment.

**7-day overdue clock:** Starts only when confirmed liability is determined, relevant mock protection outcome known, deposit applied, remaining balance notified and notification timestamp recorded. At seven days unpaid, an independent booking restriction applies even at 100/100; disputed/unproven claims cannot create this restriction. Mock settlement or reversal removes only that restriction, not valid historical penalties or separate bans.

## 14. Two-sided physical pickup/activation, item evidence, checkout/return and dispute

**Customer screen design (mandatory, implementation details flexible):** Provide easy-to-find actions in both renter and lender dashboards, and appropriate booking detail screens. Payment checkout and rental **return checkout** are different concepts and must not share confusing labels. Use clear real-world nouns; every action must have an appropriate active/disabled state and make the other party's confirmation status visible.

### 14.1 Arrange pickup and activate rental

1. On a **confirmed simulated booking**, show scheduled pickup and return, agreed paid duration, pickup options and a secure message thread. Owner may publish suggested meeting slots; renter selects a proposed date/time; parties can coordinate actual meeting details. The lender does **not** approve the booking.
2. At physical handover the lender inspects/records item condition as appropriate and presses **`Confirm Item Handed Over`**. The renter inspects/receives the item and presses **`Confirm Item Received`**. Use identity-specific access and timestamps. A single click alone leaves the rental in `Awaiting Other Party`.
3. When **both** confirmations exist, check that full agreed occupancy duration starting now is compatible with previously confirmed reservations/owner availability. If clear, persist activation once, switch to `Active`, and set effective return deadline = second-confirmation timestamp + original requested/paid agreed duration hours. This is the moment the **rental-use clock begins**, not booking checkout payment.
4. If actual start is later than scheduled, shift the full agreed duration only when it remains available. E.g., Nov 2 10:00–Nov 5 10:00 (72h), with handover Nov 2 23:00, means proposed Nov 5 23:00 return **only if free**. If another renter is already confirmed starting Nov 5 14:00, preserve that reservation and **offer this renter a shorter Nov 2 23:00–Nov 5 14:00 period (63h)**. Recalculate the revised quote using started 24-hour blocks; in this 72h→63h example both periods cost **3 rental days**, so display the unchanged rental/service fees and **RM0 refund** transparently. If a shorter period changes the number of charged days, show corresponding lower rental/service fees and the demo refund difference. The initial simulated security deposit remains held and unchanged. The current renter must select **Accept Revised Rental** before activation; if declined, no valid shortened interval exists, or another reservation/owner availability changes, remain `Conflict Unresolved` rather than activating or overwriting a booking. Only finalize revised duration, actor confirmation and any financial adjustment transactionally after acceptance and revalidation. Do not force lender approval or manufacture hourly credits. Both parties' clicks alone cannot override a scheduling conflict.
5. Persist user and event IDs, planned collection timestamp, first and second actual confirmation times, final activation and effective deadline. Avoid requiring an intermediate meeting if this is an authorised consecutive same-renter chain continuation.

### 14.2 New adjacent booking during an active rental (automatic continuity)

- A renter who wants to keep an item must check **available additional dates** published by the owner. If the additional slot **starts exactly at the active chain's latest effective return deadline** and passes normal eligibility/availability checks, they may make a **new simulated payment-information checkout** directly; no owner permission is sought.
- Once confirmed, automatically link the payment/booking segment to the same continuous physical rental, extend final agreed deadline, and display a notification on both dashboards. Renter keeps possession, with **no return visit, no original-deadline photos, no lender/renter reactivation clicks**, and **no new deposit**. The original deposit stays outstanding until final completion.
- Extra booking costs include its separately calculated additional rental and service fees. No automatic extension exists unless the new booking is actually confirmed. Unavailable consecutive dates leave the original deadline unchanged.

### 14.3 Physical final return and no-dispute completion

1. At the end of the **final** rental segment, renter physically brings/returns the item to the lender. Renter must upload **clear photos and/or videos of actual returned condition**, showing sufficiently useful views (e.g. all sides, known problem areas and included accessories). The app should provide framing guidance, preview, replacement/retake and basic file-format/size validation; do **not** claim perfect automatic truth or image clarity detection. At least one usable photo/video item must be required for issue-free confirmation. If upload fails, retry and do not bypass evidence requirement.
2. Show the renter **`Confirm Return — No Issues`** only when they truthfully confirm physical item handback AND have no outstanding issue/dispute. Show lender **`Confirm Item Received — No Issues`** only after lender physically receives and examines the returned item AND has no damage/deposit dispute. Both labels may share the conceptual action `Confirm Return — No Issues`, but visible roles should remain distinct. **Both** must press their own no-issues button to complete the issue-free path.
3. If the renter presses no-issues first, show `Awaiting Lender Confirmation`; if lender presses first, show `Awaiting Renter Confirmation`. **No full refund, no completion and no risk event** from just one click. If both clean confirmations are valid and **no dispute is pending**, mark the physical rental complete; record `Deposit Released (Simulated)` in full exactly once. If the return is on time and no violations are confirmed, apply one +2 score. If physical lateness is established, use V1.8's grace/penalty even if both agree there is **no item condition or deposit dispute**; a no-dispute return is not an automatic guarantee of a +2 reward.
4. Record **actual physical handback timestamp** distinctly from media upload time and either click. Let renter submit the physical handback time and lender explicitly verify/agree to it as part of the no-issue return confirmation; if they disagree about the return time, use the **dispute route** rather than forcing clean completion. Do not simply set physical handback time to the second button-click time. A lender who presses the button late cannot automatically cause renter late points. Actual late physical handback may still produce the appropriate score penalty once the outcome is finalised.

### 14.4 Any issue → separate dispute path, never fake a clean checkout

- If **either** party identifies damage, missing accessories, disputed condition, incomplete return, disputed deadline, loss or deposit-related disagreement, they must use **`Raise Dispute / Request Platform Review`** instead of claiming no issues. The app lets each upload evidence, describe their concern and see `Under Platform Review (Demo)`; preserve a physical-return-occurred flag if the item was actually handed back.
- Raising a dispute **before both no-issue confirmations** immediately **blocks ordinary return completion** and **holds the entire original simulated deposit** pending relevant confirmation/resolution. This remains true if the other participant already clicked no-issue. Do not release a deposit or award a successful-return bonus automatically based on one click, mere photos or the platform receiving a new allegation.
- New claims normally remain `Under Review (Demo)`. Separate, explicitly chosen **predefined fictional claim scenarios** can demonstrate confirmed/rejected claim outcome, illustrative protection, appropriate deduction, remainder release and appeal. Any final penalty must follow V1.8's one-per-continuous-rental rule and confirmed final facts. Lenders cannot unilaterally deduct deposits; renters cannot unilaterally force release.
- Clear no-dispute completion and a **disputed/claim-resolved closure** must remain visibly distinct. No actual money is transferred, secured, refunded or paid.

**Availability caution:** Record when the item physically comes back and whether it is safe/available for future renters. Do not silently advertise damaged or unreturned items as ready. Claim liability and physical possession may have different statuses; do not conflate them.

## 15. Item protection, claims, deposit application and overdue obligations — V1.8

**This is an educational representation of a proposed real-world insurance workflow, NOT active coverage.** The startup proposes eligible high-value item protection **up to RM60,000 through a future authorised partner**, subject to eligibility, exclusions and policy. CurRENT is **not** an insurer and must not guarantee coverage or payouts. Potential exclusions include intentional misuse, prohibited use, gross negligence, unauthorised subletting and partner-policy conditions. The app may explain possible coverage, but all shown sample coverage decisions/amounts must say `Illustrative demo scenario — no claim submitted/no compensation paid`.

**Damage-claim lifecycle:** lender reports damage and uploads images/video/description → renter sees claim and can submit evidence/dispute → CurRENT's **simulated platform review** records incident confirmation and renter responsibility → optional **illustrative insurer outcome** (eligible amount, deductible, exclusions), not an actual claim submission → calculate confirmed renter liability separately → apply available **simulated deposit** to that liability → calculate remaining **simulated** payable amount → notify renter → track dispute, appeal and settlement states. Preserve coverage, renter liability, deposit deductions and remaining balance as **distinct quantities**; **prevent double recovery** for the same loss (coverage + renter liability must not exceed properly established loss). No real funds move. Never treat allegation as settled claim, or payment as completed when not actually processed.

**Loss/non-return:** report and investigate accidental loss, third-party theft, unresolved non-return and confirmed intentional renter theft/fraud separately. An overdue item is **not automatically theft**. Confirmed accidental loss: −30 risk penalty; intentional theft/fraud: permanent account ban (demo account restriction). A lender report alone never establishes guilt. Allow appeals and corrections. Eligibility for illustrative insurer coverage is separate from risk scoring and renter accountability.

**Independent unpaid-damage restriction:** Only after liability is assessed, indicative protection outcome determined, available deposit applied, remaining payable amount **confirmed and notified**, start the seven-day clock. If unpaid **7 days after notification**, prevent *all* new bookings/checkout regardless of score (including 100/100). Automatically lift this specific restriction after **confirmed simulated full settlement** or overturned/cancelled obligation. Keep historical valid score penalties; no additional score deduction for nonpayment. Pending/disputed claims do not trigger this confirmed-overdue restriction. Platform approval at score <30 cannot bypass overdue-payment restriction. Model bans/suspensions separately.

**Deposit view:** quote amount fixed at simulated first booking confirmation, carried over for an eligible same-renter continuous chain; full no-issue release only after BOTH renter and lender clean return confirmations, while any timely dispute blocks release; status can be `calculated_demo`, `recorded_demo`, `held_for_review_demo`, `applied_to_liability_demo`, `partially_released_demo`, `released_demo`. Apply a deposit only to **confirmed** renter liability and show any remaining refundable portion. Document all decisions, claim changes, deposit applications, appeal outcomes, notification times and restriction changes in an audit trail. The lender may view claims for their own rental only, not decide coverage or liability.

**Operational delivery without an admin dashboard:** customer-facing app provides intake/evidence and request/claim tracking. **Very High Risk platform requests remain `Pending platform review (demo)` with no outcomes demonstrated.** **For damage/loss claims only**, enable a small library of **predefined demo fixtures** to illustrate: claim reported → evidence → demo review outcome `Approved (fictional example)` or `Rejected (fictional example)` → any illustrative insurer-covered amount/exclusion → renter liability → simulated deposit deduction/release → appeal/reversal. These scenarios are expressly **founder-authorised**; they must never be conflated with platform approval of Very High Risk bookings. New real-time demo submissions remain `Under review (demo)` unless a fictional scenario is explicitly used. No real insurer has valued an item, reviewed a claim or paid compensation; label those states unequivocally. Do not expose insurer/claim-decision authority to ordinary renter or lender. Review Appendix A for detailed claim, restriction and fairness rules.

## 16. BNPL, listing boost and other optional monetisation

- Real BNPL cannot be offered. The proposal includes optional BNPL for eligible higher-value rentals; any current repo threshold (such as RM200 rental fee) is not verified founder policy. Keep it an **informational/simulated future possibility**, not an approval, financing obligation or live instalment agreement.
- **Confirmed flat RM10 optional lender listing boost**, treated as an entirely separate **simulated** lender purchase, provides **seven days of visibly featured placement** after demo activation. Display activation/expiry and a clear `Featured (Demo)` badge; do not automatically renew; never charge money. This seven-day duration is a **founder-selected new feature, not found in the finance workbook**. The workbook's pro forma uses **RM10 per boost with assumed 10% uptake**, while the older `6. Key Resources` row B36 contains a conflicting **3% (max RM100)** historical model. **Use RM10 flat only**. Never add it to renter checkout or calculate 10% of item price as a user fee.
- RM2 per rental insurance referral and RM5 BNPL referral, together with 10% uptake assumptions, belong **only to forecasts**, not active user fees or demonstrated actual earnings.
- Event bundles, loyalty credits and enhancements other than the **approved RM10/seven-day featured placement** require separate founder approval.

## 17. Messaging, in-app notifications, reviews and social trust

Enable private renter/lender messages (per booking) with timestamps, read/unread and **shared database-backed, cross-device synchronised history**; only booking parties can see them. No actual courier dispatch, SMS or email gateway. Notification triggers should include: verification result, booking confirmation (not rental activation), pickup meeting coordination, lender handover confirmed / renter receipt confirmed / awaiting second confirmation, actual activation and deadline, scheduling conflict, successful consecutive additional booking and moved deadline, final return evidence submitted, first and second clean-return confirmations, dispute raised and normal completion blocked, deposit release only after BOTH clean confirmations, claim review/resolution, score change or appeal, liability notification, seven-day restriction activation/removal and simulated settlement.

Allow 1–5-star reviews after completed rental (at most one per reviewer per booking). Keep the six Canva Recent Reviews visibly **sample/demo** unless backed by actual demo bookings; do not count ratings as a **risk score factor** (V1.8 scoring is event based and specifically excludes the old repo's rating bonus).

FAQ must explain verification, four risk tiers, capped deposits, Very High Risk platform approval, separate 7-day payment restriction, claims and appeals, 12% lender commission, 5%-minimum-RM5 renter service fee, optional RM10 boost and non-operational insurance/BNPL.

## 18. Exactly two dashboards, profiles, history and access limits

**Renter Dashboard** must show: scheduled vs actual pickup/activation time, lender and renter confirmation flags, booked vs chargeable duration (started 24h units), current effective return deadline and any linked consecutive paid bookings; renter upload/retake of mandatory return evidence, own no-issue return confirmation and dispute-action state; own profile; `Verified (demo)` state; current **70–100/40–69/30–39/0–29** tier and score (or `N/A`); applicable deposit rate/cap or case-by-case review; complete own rentals and booking details; detailed rental behaviour including *every* reported incident, evidence/confirmation status, agreed and actual return times, applied adjustment on only one winning incident and `Recorded` on others, before/after scores, appeals/corrections; pending Very High Risk platform-review request (no decision outcome shown in this classroom demo); deposit amount/status/deductions; damage/loss claims, illustrative insurer coverage, confirmed liability, outstanding amount, 7-day due/restriction status; demo settlements and notifications. May submit own evidence and appeals but **cannot change final decisions**.

**Lender Dashboard** must show: manage listings/availability, published meeting windows, direct confirmed rentals (no lender approval), both handover-confirmation statuses and activation timestamp, linked same-renter consecutive rentals, lender final receipt/no-issue confirmation OR dispute action, final deposit status tied to BOTH clean clicks, relevant renter demo verification and risk information for *their own booked items*, messages, handover, return confirmation, report damages and upload evidence, incident and claim progress limited to own rentals, deposit status and illustrative compensation details, reviews, 12% platform commission, estimated **88% simulated rental payout**, and optionally selected **RM10 demo listing boosts**. Lender cannot change renter risk score, platform approval, insurer outcome or claims liability.

There must be **no admin dashboard, staff portal or staff business-management interface anywhere in app navigation**. The current demo shows **pending-only Very High Risk requests**; no customer can see or trigger a fabricated approval/rejection. Any other scenario-based claims demonstration must be visibly simulated and separately authorised. No unrestricted disclosure of other renters' histories or unrelated claim evidence. Simulated financial figures must not appear as real balances.

## 19. Business-plan assumptions versus app transaction calculations

Preserve the workbook as business/forecast context, not runtime pricing configuration:

| Business-plan measure | Source assumption / figure | Required app treatment |
| --- | --- | --- |
| Typical rental transaction value | RM200 | Planning assumption; real demo listing totals use actual date × daily price |
| Owner commission | 12% rental value | Implement per confirmed booking |
| Borrower service fee | 5%, website minimum RM5 | Implement per quote |
| Insurance referral | RM2 per completed rental | Business-plan illustration only; no live policy/revenue |
| BNPL referral | RM5, assumed 10% uptake | Forecast illustration, not live charge |
| Listing boost | RM10 with 10% uptake in pro forma | Optional simulated UI; separate workbook description conflicts |
| Payment processing cost | RM1.20 per completed rental | Forecast/cost assumption; no real processor |
| OTP/SMS cost | RM0.10/message; two onboarding + one transaction | Forecast only; no actual SMS required |
| eKYC cost | RM0 while under assumed free monthly tier | Forecast only; no provider integration |
| Registered users (Year 1) | 4,740 | Not fabricated real sign-ups |
| Completed rentals (Year 1) | 2,795 | Not fabricated real transactions |
| Annual fixed cost | RM977,040 | Forecast only |
| Contribution margin / break-even | RM36.20 / ~26,990 rentals per year | Forecast only; not a live revenue KPI |

**Model-data caution:** the uploaded PDF refers to **RM104,813.50** annual revenue, while the workbook's total in the pro forma table is **RM104,812.50**; the workbook's variable-cost sheet also shows a total of **RM4,581.10** while its pro forma summary shows **RM4,581.50**. Do not silently “correct” business documents or make the application reproduce those discrepancies. If an optional investor/financial-model screen is proposed, obtain founder confirmation of the canonical figures first. The default rental app does **not** need an internal break-even simulator.

## 20. Existing stack and founder-confirmed shared backend (Option B)

**Keep the compatible frontend:** Expo / React Native / React Native Web, Expo Router, TypeScript, existing services (`services/booking.ts`, `services/deposit.ts`, `services/riskScore.ts`, `services/marketplace.ts`), screens/components, tests and Vercel web build. **Replace AsyncStorage/local-only user/booking persistence as the source of truth**. The repository contains Supabase scaffolding; inspect and verify it rather than assuming its existing wiring, migrations or policies work.

**Selected classroom-demo architecture:** Prefer **Supabase Auth + Postgres + Storage + Realtime** with the existing Expo client, because it supports founder-required accounts on separate devices without building a separate custom server. This is a technical implementation recommendation within the confirmed **shared backend** choice, not a claim that Supabase is already configured or commercially approved. If the current repository requires a materially different backend, explain the trade-off and obtain founder approval before substituting it. Configure backend credentials as deployment secrets/environment variables; never commit privileged/service-role keys to the repository or expose them to the browser. Enable appropriate Row Level Security (RLS) and storage access policies; verify privacy against both normal client access and maliciously modified requests. Public/anon keys alone are not authorisation.

**Actual account authentication, simulated FinTech:** Use genuine per-user login sessions with safe test/demo accounts for multi-device demonstration. Keep the eKYC badge, risk engine, checkout/payment, payout, insurer eligibility, claim status, deposit and refund amounts **explicitly simulated**: backend records describe demo events, not monetary transfers or genuine identity verification. Do not request real identity documents, banking details, card numbers or medical/sensitive data. Maintain exactly two customer-facing dashboards (Renter and Lender); no Admin Dashboard.

**Central data and authorisation:** Persist users/profiles, role choice, demo verification, risk-score and incident audit, listings, time-based inventory availability, reservations/segments, physical rental chains, messages, notifications, item media and return evidence, two-sided handover and clean-return confirmations, disputes, demo claims, demo-deposit ledger and demo payment/refund events in a shared database/storage. Apply transaction-level access restrictions: a renter views/acts on their own rentals; a lender only on listings/bookings they own; neither can impersonate the other, change scores/claim decisions, or read unrelated private messages/evidence. Uploaded private evidence should use private storage with signed or authorised access, not unprotected public URLs.

**Backend-authoritative business transitions:** Client displays may calculate preview quotes from central pure domain functions, but booking creation, availability checks, instant reservation, cancellation-cutoff evaluation, deposit snapshots, payment simulation recording, activation, chain continuation, dispute blocking, score updates and settlement must be revalidated and committed atomically by authenticated server-side functions/transactions (Supabase RPC, Edge Functions or equivalent). Server timestamps determine event time and 24-hour cancellation/late-return boundaries; UI clocks are illustrative only. Use unique constraints, exclusion/overlap safeguards where applicable, conditional state transitions and idempotency keys. Never let two simultaneous renters reserve an overlapping interval, activate a chain with an incompatible next reservation, double-spend a demo deposit, or bypass a 0–29/overdue-account restriction by modifying browser state.

**Cross-device synchronisation:** Renter and lender using different sessions must see newly confirmed bookings, each other's activation actions, final effective deadlines, return media, independent no-issue confirmations versus disputes, deposits, messages and notifications consistently. Subscribe to scoped Supabase Realtime channels or use a reliable polling/refetch fallback; refresh/refetch after mutations and recover from reconnects/duplicate events without losing an accepted state. On device B, another party's confirmation must be visible promptly; completion occurs only after both authorised persisted events. Display clear loading/offline/retry errors; do not claim confirmed operations while an upload, mutation or connection fails.

**Schema/migration and deployment plan:** Prefer incremental migrations and typed data access over rebuilding everything. Provide migration scripts, indexes, RLS/storage policies, env-key templates (no real secrets), safe sample account/seed provisioning, a development/test data isolation/reset strategy and web deployment environment configuration. Use production-style permission boundaries even though checkout, eKYC and insurance are demo-only. Do not keep separate per-device mock ledgers as an alternative source of truth; AsyncStorage may cache non-sensitive presentation preferences only.

**Architecture principle:** Central pure domain functions for tier, fees, deposit, score, deadline and event checks are reused by the frontend and trustworthy server validation. FinTech/insurer third-party results remain named mock adapters and visibly fictional fixtures, not real integrations. Future commercial deployment would additionally need regulated partner services and compliance; this is outside the classroom scope and does **not** make the shared backend optional.

## 21. Typed data model, occupancy chains and event audit (extend existing entities)

Prefer extending current types/services rather than inventing an unrelated new app/database. Support:

- `Profile`: stable ID, fictional verification state/date, renter/lender role choice, score `null` until demo verified then initial 70, independent ban/suspension/confirmed overdue-obligation restriction.
- `Listing`: owner ID, title/category/photos/location/rate in sen, **owner-entered value**, internal sensible **demo replacement estimate**, category/condition, owner-published availability and pickup time slots; RM10 featured boost start/end/state.
- `BookingSegment`: same renter/listing as a full payment segment, planned pickup and planned return instants, **agreedDurationMinutes**, **chargeableRentalDays = ceil(minutes/1440)**, rental/service/commission snapshots, deposit applicable or `0` for approved adjacent chain segment, price/risk snapshot, demo checkout confirmation status and order/reference ID. Do not mistake confirmed reservation for active possession.
- `RevisedHandoverOffer` (or compatible event): original scheduled and intended actual start/end, conflicting confirmed reservation reference (private), candidate conflict-free end, original/revised duration and chargeable days, original/revised rental fee, service fee, lender commission, payout, **demo refund (possibly RM0)**, renter acceptance/refusal state, expiry/revalidation timestamp, server-side conflict check and auditable actor ID. The accepted revision becomes effective only at successful final two-sided activation; preserve the initial deposit and never edit the next renter’s confirmed booking.
- `PhysicalRentalChain` (or compatible existing booking aggregate): linked first and optional later consecutive segments for the **same renter + same listing**, initial deposit reference, planned reservations, activation status, **actual two-sided confirmed activation timestamp**, effective return deadline (latest if chain extended), physical item possession/return timestamp, final condition/dispute status, one terminal scoring result. A chain is linked only if truly gap-free and availability-checked; one physically continuous chain means **one scoring opportunity**, not one per segment.
- `HandoverConfirmation`: `bookingChainId`, actor role, actor ID, action (owner handed over/renter received), authenticated demo timestamp, attachment refs if any, idempotency key. Do not activate at the first confirmation; prevent replay/unrelated user confirmation. If actual handover shifts into a different person's reservation record conflict, do not overwrite that booking.
- `ReturnEvidence`: chain ID, uploader renter, photo/video media reference(s), upload time, readable preview/retake status, optional condition note and physical return timestamp separate from confirmation timestamps. Required for clean completion.
- `ReturnConfirmation`: role-specific renter handed back/no issues and lender received/no issues, individual timestamps and actor IDs, physical-return agreement, no-issue declaration, dispute-block flag. Deposit release gated on **both** clean confirmations, valid evidence, no pending dispute and idempotent settlement operation.
- `RentalDispute`/`RentalIncident`: reporting side, disputed aspect, relevant physical return status, description, media, reported/confirmed/rejected/corrected states; multiple incidents allowed but only the most serious confirmed one drives the single final score adjustment per chain. Escalation can pre-empt one-sided no-issue status.
- `RiskScoreEvent`/`Ledger`: physical rental chain ID, winning effective adjustment (at most one), before/after scores, incident linkage, finality, corrections, appeal audit and replay protection.
- `PlatformApprovalRequest`: per renter/listing/requested dates, score snapshot, **pending only** in demo; no approved/rejected outcomes or public decision power for 0–29 requests.
- `DemoPaymentTransaction`: per booking segment, simulated checkout/boost no-real-charge reference and timestamp, consistent financial snapshot; no real payment credentials.
- `DemoDeposit`: **one carried-forward first-chain deposit**, frozen rate/cap and amount, status with audit events; only settle once on mutual no-issue return or separately concluded fictional dispute liability/release; never part of rent revenue.
- `Claim`, `ClaimEvidence`, `ClaimOutcome`, `Appeal`, `DamageObligation`: separately represented confirmed loss, hypothetical coverage, deductible, renter liability, deposit applied, notified remaining confirmed balance, seven-day due time/restriction, predefined fictional scenario ID, permitted correction/appeal; no invented live insurer decisions.
- `Message`, `Notification`, `Review`, `Favourite`, `AuditEvent` with participant/role permissions.

Use consistent canonical instants and local `Asia/Kuala_Lumpur` formatting. Never store timestamps as ambiguous date strings. Enforce transition guards, stable IDs, no double booking, media accessibility, double click idempotency, exactly-once deposit closure/score updates, and maintain client-friendly fictional demo fixtures while enforcing trusted server-side permissions, transaction guards and row-level policies in the **confirmed shared backend**. Financial and identity-provider operations remain simulated even though authentication/data synchronisation are real.

## 22. Classroom-demo quality, security honesty and privacy

Support responsive desktop/mobile, accessible keyboard actions, consistent focus/contrast, readable fee tables, working controls, helpful empty/loading/error states and bounded photo/video handling. Use imaginary/demo identity information; **never ask for real bank details, real card numbers, CVV, passwords reused elsewhere, biometric scans or genuine identity-document photos**. Demonstration eKYC is a visibly fictional simulation.

Never show `Payment successful`, `Deposit held in escrow`, `Refund issued`, `Insurer paid RM…` or `Officially eKYC verified` as real outcomes. Use explicit `Demo only — no funds transferred, no deposit held, no insurance policy issued or claim sent to an insurer.` Risk scoring is rules-based classroom logic, not a real consumer credit score or fraud determination. Serious theft/fraud or damage classification must require explicit independently configured confirmed decisions and allow appeals.

Client-side-only checks are not a security boundary. Enforce shared-backend authentication, row-level access permissions and server-trusted domain transitions for genuine multi-device data integrity, while remaining truthful about simulated FinTech outcomes. Do not expose unrelated users' evidence, conversations or rental histories in UI. Validate text, prices, dates, timestamps and state changes; avoid exposing partner branding as an actual endorsement.

## 23. Mandatory end-to-end demonstration journeys

**A — Normal renter, money and full handover/return:** Fresh demo-eKYC renter has score N/A until verified, then **70 Low**. Book an item at RM45/day for **exactly 48 hours** (two started 24-hour blocks), with internal replacement estimate RM4,000: rental RM90 + service RM5 + first deposit RM200 = **RM295**. Click Rent → checkout details (not yet booked) → explicitly confirm simulated payment → `Confirmed (Demo)` but rental clock OFF. At physical handover lender clicks `Confirm Item Handed Over`, renter clicks `Confirm Item Received` → only after both and availability recheck, `Active`; clock begins at second confirmation timestamp. At final return renter uploads clear condition media, both physically meet and independently confirm **no issues** → full simulated RM200 deposit released, completed on-time event **+2 once** (70→72).

**B — Late owner meetup does not steal renter duration:** Book Nov 2 10:00–Nov 5 10:00 = 72 hours (3 × 24h). Both confirm physical pickup at Nov 2 23:00 → actual deadline Nov 5 23:00 if availability permits; no new fee just for the late meetup. If another renter is confirmed to start Nov 5 14:00, protect that booking and show renter A the revised **63-hour** offer Nov 2 23:00–Nov 5 14:00; it remains **three charged days** under started-24h pricing, so show **RM0 refund** in this example and require acceptance before activation. For any shortened interval that lowers charged days, show the correctly recomputed rent/service fee, reduced lender commission/payout and a single simulated refund. Renter declines/no available interval → unresolved and inactive; no displacement or fabricated settlement.

**C — Same-renter consecutive rental/continuity:** First booking Nov 1 10:00–Nov 3 10:00 (48h), physically activated Nov 1 10:00; original deposit **RM200**. Before deadline same renter selects a genuinely available next Nov 3 10:00–Nov 5 10:00 interval for same item; succeeds at new demo checkout. Charge extra rental fee + its service fee **without second deposit**; keep item, no original-deadline physical return/photos, no new activation; deadline moves to Nov 5 10:00, and one final physical return and **one score event for entire chain**. Adjacent-but-unavailable, gap, different item or different renter must not become continuous booking.

**D — Mutually disputed return:** Renter uploads return evidence and physically returns item. Renter presses clean confirmation but lender sees damage and presses **Raise Dispute** (or reverse roles). Do NOT complete as issue-free, release deposit or award +2; flag review and retain deposit. A separate PREDEFINED fictional claim scenario (not a fabricated new-staff action) can illustrate claim upheld/rejected, insurer-style illustrative coverage/deductible, renter liability, application of deposit, any remainder released and an appeal. Only after final facts confirmed apply ONE most-serious risk adjustment; 4h late plus minor damage = −10 once, late incident marked `Recorded`. Lender's delayed confirmation alone must not falsely increase measured lateness.

**E — Restricted request:** Score 29 seeks item → no checkout, submit Very High Risk platform review → status stays `Pending Platform Review (Demo)`, across refresh; no approved/rejected outcome, no fake auto approval, no lender approval, no Admin Dashboard. Confirmed unpaid damage balance seven days after notification blocks a renter with even score 100, independent of score.

**F — Lender/discovery:** List item with owner-entered item value; obtain sensible internal demo deposit value without interrupting with simulated-insurer valuation explanations; optionally activate RM10/7-day boost and see featured placement obey filters. Lender sees normal instant reservation, handover action, renter's corresponding confirmation, linked consecutive slots, actual deadline, return evidence, clean acknowledgement or dispute action, 12% commission and 88% payout; cannot authorise score/claim/insurer actions.

**G — Error cases:** Past/backwards/zero-length timestamps, a 24h boundary vs 24h+1m, simultaneous checkout, overlapping reservations, delayed activation overlap, second confirmation replay, one-sided return completion attempts, return evidence failure, dispute raced against second clean click, duplicate claim settlement, score rerun/appeal, chain gaps and changed score between segments must never corrupt authoritative demo states.

**H — Reduced-day shortened-rental fixture:** If a 72h originally paid reservation must be shortened to **47h** to protect the next confirmed booking, repricing is 3 days → **2 started 24-hour days**. Recalculate both rental and minimum-5%-based renter service fees, adjust the lender commission/payout, preserve the original deposit, and issue only a **simulated** rent/service difference on final accepted activation. If the renter does not accept, do not activate or post any adjustment.

## 24. Automated tests, state invariants and manual QA

Adapt and extend existing unit/integration/end-to-end tests; never delete failing tests to green-light deployment. Mandatory invariants:

**Duration/pricing:** `exactly 24h→1 billable day`; `24h+1min→2`; `31h→2`; `exactly 48h→2`; `55h→3`; 72h→3; zero/negative duration rejected. Clock display in Malaysia zone and unambiguous timestamps. RM45/day × exactly 48h = RM90; service max(RM5,5%) = RM5; demo first deposit 5% × RM4,000 = RM200 → **RM295**. 12% lender commission RM10.80, payout RM79.20. Deposit caps at assessed value RM12k → RM500/RM1,000/RM1,500, tiers at 29/30/39/40/69/70/100, unverified N/A, rounded sen, no added optional protection or owner's RM10 boost to renter cart.

**Cancellation window:** At exactly 24h before the original scheduled pickup, the cancel action is eligible; at 23h59m59s it is unavailable. Shifting actual activation later must not change cutoff. A booking confirmed within 24h of its scheduled start has no cancel window. For an eligible cancellation, assert full simulated refund of rental fee and service fee, full simulated deposit release, RM0 cancellation fee, restored item availability and a single idempotent ledger settlement; assert no real money movement.

**Booking versus activation:** Clicking Rent only opens payment information; only explicit no-money demo payment confirms reservation. Booking remains NOT ACTIVE after simulated checkout. Only both role-specific physical handover confirmations activate, with latest accepted timestamp; 1 click shows waiting status. Delayed pickup shifts effective deadline by the agreed booked hours, not starting at simulated payment or earlier message time; lender late example 72h at 23:00 returns 23:00. A shift that overlaps the next confirmed booking triggers a proposed shortened period **without moving the other booking**, with a visible original/revised fee comparison and a required explicit renter acceptance **before activation**. Validate that 72h→63h still costs 3 days (RM0 refund), while 72h→47h costs 2 days (appropriate simulated rent/service refund). Renter refusal, invalid shortened period or new overlap prevents activation and financial posting. All final checks and event/refund commits are idempotent and backend-authorised.

**Consecutive bookings:** New adjacent availability checked for same renter and same item; successful new demo checkout extends exactly from **current effective deadline**, no owner approval, no new intermediate handback/photos, no second activation, **RM0 extra deposit**, original held until final return, new rental/service fees charged only in simulation, one final risk-score event for chain. Unavailable/gapped/different-renter/date-mismatched booking does not extend. Freeze and test each segment's prices. If second booking fails, original return deadline remains.

**Return/dispute:** At least one usable renter photo/video evidence submission and preview required before clean completion; both sides must physically hand back/receive, accept the actual physical return timestamp and press separate no-issue buttons. First no-issue click = Waiting, no deposit release/completion. Second click when no dispute = `Completed (Demo)` and **full original deposit `Released (Demo)` once**. Either party dispute before both confirmations preempts clean completion, holds deposit and opens review even if one party clicked clean. Lender delay in pressing button does not automatically add lateness: use independently recorded physical return time. Dispute resolution fixture may show simulated deduction/remainder/appeal but must never claim live insurer paid. Repeated clicks cannot double-release. Clean return can still incur confirmed late points without falsely implying a damage/deposit dispute; no +2 on a confirmed late violation.

**Scoring & restrictions:** Initial verified score 70 exactly, N/A unverified; successful on-time no-issue +2 only once; exactly 2h late 0, >2h −1 started-hour increments, exactly 4h −2, >6h cap −5; 4h late + confirmed minor damage −10 ONLY, non-winning late row `Recorded`; serious damage/accidental loss −30; theft/fraud ban independent. Corrections and appeals replace rather than stack penalties. Seven-day confirmed outstanding damage obligation independent of score; unproven and pending disputes do not trigger it; full fictional settlement lifts payment restriction without erasing valid penalties or bans.

**Two-device shared-backend tests:** Create/log into renter and lender accounts in different sessions. Verify RLS prevents direct reading/editing of each other's unrelated bookings, profile, messages, evidence and demo deposit ledger. Confirm that an authenticated renter books an available listing and the lender sees the reservation after sync; two role-specific handover clicks on different devices activate **exactly once**; both parties see the authoritative activation/deadline; a renter can upload private return media which the booking lender can access but a third party cannot; first no-issue click does not release the deposit and second clean click does; a dispute from either side blocks settlement; simultaneous attempted overlapping bookings admit at most one; reconnect/refresh preserve data and statuses; duplicate mutations do not create repeated charges/refunds/score events. Use only fictional demo payment/eKYC/insurance records.

**Role security and presentation:** Exactly two dashboards. Renter/lender can only confirm their own role and access relevant own rental media; no fake platform/insurer decision control, no public Admin Dashboard. Score 0–29 pending-only, no approvals/rejections. Expiring RM10/7-day Featured boost honours filtered results. Confirmed-booking cancellation must use the **founder-confirmed at-least-24h-before-scheduled-start cutoff**, with a confirmed full simulated rental-fee and service-fee refund, full deposit release and no cancellation fee. Verify accessible responsive web, compile/typecheck, existing test suite and later authorised Vercel smoke checks; report observed outputs, not assumptions.

## 25. GitHub implementation phases, permissions and quality gates

**Never change application code, make further commits or deploy without explicit phase-specific founder approval.** Before each phase, inspect actual current GitHub repository, README, routes, TypeScript services, fixtures, tests and connected Vercel deployment; reuse useful implementation, explain affected files/tests and preserve working features. The master prompt will only be committed to README **after** final founder approval.

- **Phase 0 — Baseline & shared-backend plan:** Inspect existing Expo/React Native Web repository, Supabase scaffolding and Canva references; run baseline typecheck/tests/web build; document GitHub vs source contradictions, schema/RLS requirements and incremental migration strategy. Set up an isolated demo Supabase project only after authorisation.
- **Phase 1 — Canva-faithful browsing and shared account foundation:** Configure Supabase Auth/session handling, protected routes and RLS, plus homepage, real listing navigation, 21 screenshot examples stored centrally, owner availability, text/category/location/date filters, galleries, favourites synced by account, six labelled sample reviews, FAQs, messaging-ready structure and responsive desktop/mobile.
- **Phase 2 — Roles, financial and risk model:** Exactly two dashboards on real authenticated accounts; simulated eKYC verification → score 70; shared DB profile and risk/incident ledger with authenticated server validation; V1.8 deposits/caps; internal sensible demo replacement estimates; first booking and additional chain quote math; RM295 camera example; lender 12% commission; optional RM10/7-day boost. Tests for all formulas and cross-user permissions.
- **Phase 3 — Backend-backed booking & activation:** Date+time scheduling and `ceil(durationMinutes/1440)` charges; transaction-safe no-owner-approval booking; eligibility/0–29 pending-only enforced server-side; no-real-payment checkout and centrally persisted confirmed reservations; **two-sided actual item handover buttons on separate devices**, recorded activation time and shifted deadline, collision detection with future confirmed bookings; synced booking messages/time-slot coordination.
- **Phase 4 — Synced consecutive rental and final physical return:** Additional **adjacent** fresh server-checked same-renter booking; fee/service fee only and keep original deposit; continuous chain; authorised private evidence uploads; two-sided return UI requiring clear renter photo/video evidence; **both clean confirmations on distinct authenticated devices OR a separate dispute action**, with server-atomic deposit gate, physical return timestamps and synchronised notification/status flows.
- **Phase 5 — Claims, score and financial state reconciliation:** Multiple incidents with one final score adjustment per physical rental chain, renter/lender auditable history, predetermined fictional claim approval/rejection and appeal examples, hold/apply/release simulated deposit, seven-day confirmed damage-balance restrictions, bans/appeals, and review-state privacy.
- **Phase 6 — Class presentation & Vercel:** Safely provision/reset demo fixtures and two logged-in devices; verify Supabase-backed sign-up/sign-in, RLS/storage policies, event synchronisation and reconnect handling; accessible polished app, video/photo testing, loading/error paths, regression suite, Vercel site deployed/verified only with founder approval. Keep actual payment, KYC, insurer providers and financial custody out.

After each approved phase, report exactly which files changed and observed test/build results, remaining policy ambiguities, assumptions, known limitations and any effect on authorised Vercel deployment. The user may approve phases independently. The shared backend/account syncing is already founder-approved as a **requirement of the master prompt** (implementation still requires separate phase approval). Expand into bundle/loyalty or real FinTech integrations only with later explicit approval.

## 26. Vercel deployment and classroom presentation readiness

Retain the existing Expo/React Native Web setup, working web output (e.g. `npm run build:web` / `dist` where verified), `vercel.json` configuration and route refresh handling. After explicit permission to implement and deploy, verify the published Vercel URL on desktop and mobile; do not assume GitHub push guarantees a successful build. The live class demo must clearly show that no money was moved, no genuine insurance/claims or eKYC took place.

Prepare reliable fictional demos for verified 70-score renter → 48h camera RM295 → simulated booking confirmation → both handover activation buttons → clock based on actual meeting → both clean return buttons and full deposit release/+2, as well as a delayed meeting/availability conflict, successful adjacent same-renter extension keeping deposit, lender-reported damage via **dispute path** and fictional claims/appeal, and the 0–29 Pending-only restricted request. Include a separate example of confirmed balance seven days overdue blocking booking. Reset classroom fixtures with confirmation; do NOT create an Admin Dashboard. Presenter must be able to navigate/show both customer dashboards and their distinct permissions without external financial or insurer providers.

## 27. Classroom-demo acceptance criteria

A phase/build is acceptable only if all applicable agreed behaviours are verifiably functional:

1. Canva-style brand, sections, listing examples, galleries, categories, search, filters and responsiveness preserved; RM10 boost features eligible listings for seven days without overriding filters.
2. Exactly **Renter and Lender** customer dashboards, no Admin Dashboard; owner can publish listing/availability; demo-estimated item replacement values are internally plausible and distinct from owner-entered values, never represented as genuine insurer valuations.
3. Fictional eKYC gates rental, newly verified renter score 70, unverified N/A. Risk tiers 70–100/40–69/30–39/0–29 and deposits 5% ≤RM500 / 10% ≤RM1,000 / 15% ≤RM1,500; 0–29 request Pending-only and cannot check out.
4. Booked duration and money based on **started 24-hour blocks**, not calendar-date differences; chosen date+time interval preserved; deposit separate from revenue, service fee 5% min RM5, lender commission 12%, camera RM295 fixture consistent.
5. Clicking **Rent** leads to payment-information page, while only separate explicit **simulated checkout confirmation** creates booking; no money or usable payment credentials. Lender does not approve standard eligible bookings.
6. **Two-sided physical pickup buttons** mandatory: lender handed over and renter received. Booking does not become Active or start rental clock until both accepted, with valid availability. Delayed pickup conflict must protect the next confirmed renter and offer a shortened conflict-free period with transparently recalculated (possibly unchanged) fees. The first renter must explicitly accept this offer before activation; original and revised amounts/intervals and any simulated refund are audited. Declined/infeasible offers cannot activate or move the next booking.
7. Active same-renter SAME-item **consecutive booking** checks the owner's published availability and other reservations, requires new simulated checkout, charges only additional rental/service fees, retains first deposit, and requires **no intermediate return media, physical handover or second activation**. One continuous possession chain gives one final scoring opportunity.
8. Final return requires **renter's clear photo/video evidence** and actual physical handback. Both parties separately press role-appropriate **Confirm Return — No Issues** for ordinary completion, **full simulated deposit release only after BOTH**. A dispute raised by EITHER party blocks no-issue completion and release and opens platform-review status; no one-sided owner claim can unilaterally settle funds.
9. Actual physical return time is stored separately from confirmation clicks, preventing unfair late-return deductions for delayed responses. V1.8 grace/penalty, incident `Recorded` display, one most-serious adjustment, appeal/correction, accidental loss vs fraud distinction, and independent seven-day unpaid-damage restrictions work.
10. Damage claim **predefined fictional** accepted/rejected/appealed examples may display clearly labelled illustrative coverage/liability/deposit deduction; newly reported cases stay Under Review unless a fictional scenario is selected. Never portray demo outcomes as real claims or use them to approve 0–29 booking requests.
11. Genuine cross-device authenticated users with shared database/storage, correctly scoped RLS and server-side transition guards, synchronised booking/activation/return/dispute/message state, reliable retry/offline error feedback, idempotent mutations, private photo/video uploads, end-to-end two-device tests, TypeScript/build/tests and authorised Vercel web deployment behave as observed.
12. A renter may cancel only **at least 24 hours before original scheduled pickup/start**, and never after activation. Full simulated rental-fee and service-fee refund plus full deposit release and RM0 cancellation fee are now confirmed; shared cross-device backend/account synchronisation is confirmed as Option B; no further GitHub edits without explicit founder approval.

## 28. Founder decision register — definitive and deferred matters

**Binding decisions (do not ask again unless founder changes them):**

- **Demo scope:** Interactive, classroom-ready, Vercel web experience; no real bank/card processing, actual deposit custody, identity-provider eKYC, insured claims or lender transfers; honest demo labels and only **Renter** / **Lender** dashboards.
- **Normal checkout:** Eligible user directly rents without owner approval; `Rent` opens payment info, only **Simulate Payment & Confirm Booking** creates `Confirmed (Demo)`. Confirmation reserves a period but **does not start the rental-use clock**.
- **Risk/verification/deposit:** V1.8 authoritative, initially verified renter **70/100** (website 82 arbitrary), 70–100 Low 5% max RM500, 40–69 Medium 10% max RM1k, 30–39 High 15% max RM1.5k, 0–29 Very High needs CurRENT approval but all new classroom requests **stay Pending**, no checkout approval demonstrated. Only renter role gets risk score.
- **Behaviour and claims:** 2h late grace, −1 per further started hour capped −5; on-time no issue +2; confirmed minor −10, serious/loss −30, intentional fraud ban; only one effective score change per continuous physical rental and all other incidents separately `Recorded`; appeals/corrections, independently confirmed obligations unpaid seven days restrict new bookings. Predefined fictional **damage-claim** approved/rejected and appeal outcomes permitted, separate from restricted booking approvals.
- **Financial:** Daily rental units calculated as **ceil(actual requested booking duration / 24h)**, minimum 1; user selects **date and time**. Rent fee = daily price × started 24h periods; 5% renter service minimum RM5; 12% lender commission; first risk-based deposit; optional **RM10** lender listing boost yields seven days Featured. Workbook 10% refers to boost uptake, and its older 3% capped model is superseded.
- **Value assessment:** Owner enters their proposed replacement value. App assigns sensible internal illustrative replacement values for demo items and newly listed items, without claiming or displaying a live insurance-company valuation process. In a real business an insurer would be responsible for approved item valuation; not built now.
- **Two-sided activation and delayed-handover conflict Option A (confirmed):** At physical pickup lender presses `Confirm Item Handed Over` and renter presses `Confirm Item Received`; rental clock starts only when both valid confirmations and any necessary **renter-accepted revised offer** are complete. Normally deadline shifts by agreed booked hours. If that infringes a later confirmed booking, **protect the later booking**, calculate a non-overlapping **shorter available rental period**, show exact revised deadline and comparison of original/repriced rental fee, service fee and **possible RM0 adjustment**, retain original deposit, and require **renter acceptance before activation**. Recheck at commit, apply any demo refund and lender commission adjustment once. Renter refusal/infeasibility → inactive conflict state, not automatic change to someone else’s booking.
- **Consecutive booking / extension:** Same renter + same item + new separate successful simulated checkout beginning EXACTLY at previous effective deadline + owner published availability + no overlap → automatic continuous possession/updated deadline, no new owner approval, no second physical handover, no original-deadline evidence, **retain original first deposit, add only rental and service fees**. One final physical return and risk outcome for whole chain. If unavailable, no extension.
- **Two-sided return/checkout:** Renter takes/uploads clear photos or videos and physically returns item. Renter and lender EACH must affirm `Confirm Return — No Issues` **after meeting**. This affirmative action means physical handback accepted AND **no deposit/condition dispute**. Only both confirmations cause clean completion and **full simulated deposit release**. If EITHER party raises `Dispute / Request Platform Review`, they **must not** click clean completion and the system holds deposit and awaits review instead. Predefined fictional claim outcomes can separately demonstrate a resolved case. Actual handback time is stored independently of clicks to prevent false lateness.
- **Cash penalties and cancellation:** No extra monetary late-return fine; V1.8 score consequences only. No cancellation fee. **Eligible cancellation requires at least 24 hours before original scheduled pickup/start; full simulated rental-fee and service-fee refund, full deposit release and RM0 cancellation charge are mandatory.**
- **Shared backend (confirmed Option B):** Separate device sessions and real account login, central shared Supabase-style Auth/Postgres/Storage/Realtime, server-authenticated business transitions, RLS/privacy and synchronised two-sided actions; no actual financial provider integration.
- **Development:** Preserve existing Canva aesthetics/Expo code, validate tests phase-by-phase, never edit/push README or code without express authorisation.

**Outstanding/queued questions (not license to invent):**

| Priority | Topic | Decision handling |
| --- | --- | --- |
| Resolved — founder Option A | Remedy when late two-sided actual handover conflicts with a later confirmed reservation | Protect later renter; offer shorter available period and show started-24-hour repricing/any simulated refund; first renter must explicitly accept before activation. If declined/infeasible, keep inactive conflict state. |
| Optional later-stage detail | Real-time videos, max rental length, delivery charge, address disclosure, BNPL threshold, optional bundles | Implement only supported classroom behaviour; use sensible UI defaults as clearly provisional or omit unconfirmed commercial charges. |

**No longer open:** Shared backend/account synchronisation (**Option B confirmed, not local-only**); how to assign demo item values (**internal reasonable estimates confirmed**); owner extension approval (**none; consecutive rebook only**); base score (**70**); payment/booking distinction (**confirmed only at demo payment**); double deposit on adjacent rebooking (**not allowed**); renter/lender activation buttons (**required**); two-sided clean return gate and dispute button (**required**); boost price/duration (**RM10/7 days**). Do not ask these questions again.

### Source-reconciliation notes

- Business PDF/workbook provide concept, assumptions, deposit and trust motivations, but do not spell out the founder's later **two-button activation**, **24h started-block pricing**, **consecutive rental chain**, or **two-sided no-issues/dispute and deposit gate**. These are later founder-authorised rules with highest precedence.
- `9. Proforma income statement` describes RM10 boosts with assumed 10% uptake, whereas `6. Key Resources` contains an alternative 3%-capped boost model. Use founder-confirmed **RM10/7-day** behaviour.
- PDF and workbook contain no fully specified confirmed-booking cancellation fee/refund matrix. The founder has confirmed a cutoff of **at least 24h before the scheduled start** and full simulated rental/service-fee refund plus full simulated security-deposit release on eligible cancellation, with no cancellation fee. Do not confuse the normal booking simulation payment with a late monetary fine, deposit release or cancellation reimbursement.
- V1.8's references to authorised insurer and payment partners are future business policies; all implementations here are **clearly labelled classroom simulations**. Keep owner-entered and internal demo replacement values distinct without presenting the app as a real insurance assessor.

## 29. Instructions for a future coding AI

After the founder has approved this master prompt and separately authorises an implementation phase:

1. Read the full prompt including **Appendix A (CurRENT V1.8 Risk Score + Deposit Determination)** and inspect the current repo; the appendix is the source for detailed incident, claim and restriction semantics. Never substitute old GitHub thresholds or Canva's 82 graphic.
2. State the selected scope, smallest maintainable implementation plan and exact files likely affected. All rules in Sections 9–14 and 28 are now confirmed (24h billing, dual activation, consecutive chain with same deposit, and dual clean return/dispute gate). The **new-listing demo value is no longer open**. Cancellation cutoff **at least 24h before original scheduled pickup**, **full simulated rental-fee and service-fee refund**, **full simulated deposit release**, and **no cancellation fee** are all confirmed; do not ask again. The founder has **already confirmed Option B shared cross-device backend/accounts** and **late-handover conflict Option A**; do not ask these again; implement only after separate phase approval. Very High Risk platform review is pending-only.
3. Never edit source, README, deployment or GitHub before explicit permission for that operation. Implement only the approved phase and keep a testable increment.
4. Ensure all views use the same money, score and booking-eligibility domain logic, consistent audit trails and participant permissions; preserve successful existing behaviours.
5. Represent external interactions truthfully as simulated, and don't build an Admin Dashboard or fake actual staff/insurer approval.
6. Execute tests/typecheck/web build, inspect actual results and report evidence, limitations, and how Vercel would be affected by GitHub changes.
7. After approval, preview/test, then commit/push/deploy as authorised; verify live link rather than assuming automated deployment succeeded.

**Definition of success:** a properly handled renter-accepted shorter-interval offer when delayed handover conflicts with another confirmed booking, with demonstrably correct canonical repricing, plus a visually faithful, fully interactive classroom CurRENT marketplace featuring accurate started-24-hour pricing, booking-vs-activation separation, mandatory two-sided pickup, consecutive new paid bookings with no extra deposit, two-sided issue-free physical return OR dispute, correctly gated simulated deposit release, V1.8 scoring/claims and exactly two dashboards—with **real cross-device renter/lender accounts and synchronised backend state**, but without real payment processing, insurers or contradictory business policies.

## Source-reference note (for maintainers)

- **`CurRENT Website.pdf`:** Canva site links and page images: visual layout, sample item listings, RM295 camera example, sample reviews, FAQ and trust cards. **V1.8 explicitly supersedes the earlier risk/deposit illustration.**
- **`CurRENT.pdf` and `CurRENT.xlsx`:** concept, target market, financing/monetisation projections and assumptions; forecasting is not genuine transaction logic or active insurer/payment services.
- **Existing repository / ZIP:** `README.md`, implementation notes, relevant TypeScript domain services, context, seed data, app screens, tests and Supabase scaffolding. They are reusable code, not the final source of policy.
- **Founder clarification:** classroom demo; no actual payment execution; click Rent → checkout → explicit simulated confirmation before booking; selected pickup/return times; proposed value distinct from fictional demo-assessed value (future insurance partner assessment); direct booking for eligible renters; V1.8 scoring/deposits/claims override earlier rules; RM10/seven-day featured boost; **predefined fictional claim outcomes allowed**, no real approvals or payments; exactly Renter/Lender dashboards; shared-backend cross-device accounts confirmed as Option B; Very High Risk review stays Pending only (Option A); GitHub README untouched pending final explicit approval.

## Appendix A — Authoritative founder-supplied CurRENT V1.8 Risk Score and Deposit Specification

**Integration note / demo-language interpretation:** The following appendix preserves the founder-supplied V1.8 business policy and granular requirements for reference. **Later founder decisions in Sections 9–14 and 28 override older operational assumptions in this appendix for the CURRENT CLASSROOM DEMO**: rental days are started 24-hour blocks; actual rental time starts only after BOTH handover confirmations; a separately checked successful same-renter contiguous booking is the V1 extension mechanism (no owner approval); the initial simulated deposit continues without a second charge; both physical-return no-issue confirmations (with renter-uploaded media) are necessary before full clean deposit release, while either party may open a blocking dispute. None of these changes alters V1.8 risk tiers, score deductions, claim fairness or independent payment restrictions. It was originally written with **commercial payment, eKYC and insurance-provider operations** in mind. For the **current class demo only**, any reference to successful payment, holding/releasing actual funds, approved insurer payouts, real eKYC, or secure backend external decisions means a **clearly labelled simulated status stored in the shared demo backend, or pre-seeded fictional demonstration status**; no financial/insurance/identity-provider integration exists. “Direct payment” means the **demo payment-information/checkout flow**, not a real transfer. The booking's financial snapshot is frozen on **Confirm Demo Booking** rather than actual payment capture. “Platform approval” is not lender approval. **Founder-confirmed classroom-demo rule: new 0–29 platform requests stay Pending with NO demonstrated Approved or Rejected outcomes and cannot proceed to checkout.** The original V1.8 commercial policy describes what a future approval process could involve; it does not authorise implementing one now. This note changes the *implementation medium* to a truthful demo, **not** any V1.8 thresholds, deposit caps, score adjustments, rights, bans or restrictions. Sections 0–29 incorporate and operationalise these rules.

---

**Founder-supplied policy source: CurRENT V1.8.**

**Dashboard scope:** renter and lender only; platform decision processes remain conceptual and must be represented truthfully in the demo.

# PART 1 — CurRENT Rental Risk Score System

**Version 1.8 — Final Customer-Facing App Development Specification**

## 1. User Verification & Initial Score

- Every user must successfully complete eKYC identity verification before being eligible to rent.
- Unverified users have no Rental Risk Score (N/A) and cannot rent.
- Every newly verified renter starts at **70/100 (Low Risk)**.
- Scores range from 0 to 100. Higher scores represent better rental reliability.
- Risk scores change based on confirmed rental outcomes and behaviour.
- Only renters have a Rental Risk Score. Lenders have eKYC verification, ratings and reviews, but no separate risk score.

## 2. Risk Levels

| Risk Score | Risk Level     | Booking Permission         |
| ---------- | -------------- | -------------------------- |
| 70–100     | Low Risk       | Direct payment             |
| 40–69      | Medium Risk    | Direct payment             |
| 30–39      | High Risk      | Direct payment             |
| 0–29       | Very High Risk | Platform approval required |

Security deposit percentages and caps are defined in Part 2.

## 3. Risk Score Adjustments

| Rental Event                                  | Score Adjustment                                   |
| --------------------------------------------- | -------------------------------------------------- |
| Successful rental (on-time return, no issues) | +2                                                 |
| Unapproved late return exceeding 2 hours      | −1 per additional hour or part thereof, maximum −5 |
| Confirmed minor damage                        | −10                                                |
| Confirmed serious damage or accidental loss   | −30                                                |
| Confirmed intentional theft or fraud          | Permanent account ban                              |

### Late Return Penalty

- The first 2 hours after the scheduled return time are a grace period.
- After exceeding 2 hours, deduct 1 point for each additional hour or partial hour.
- The maximum late-return penalty is −5 points per rental.
- Approved rental extensions do not incur late-return penalties.
- Record the actual late-return duration in the rental behaviour history.
- Calculate lateness using the agreed return deadline, including any approved extension.

**Formula:**

Late Return Penalty = −min(5, ceil(max(0, Hours Late − 2)))

| Actual Late Return Duration | Score Deduction |
| --------------------------- | --------------- |
| Up to 2 hours               | 0               |
| More than 2 to 3 hours      | −1              |
| More than 3 to 4 hours      | −2              |
| More than 4 to 5 hours      | −3              |
| More than 5 to 6 hours      | −4              |
| More than 6 hours           | −5 (maximum)    |

**Example:** An item returned exactly 4 hours late receives a −2 adjustment, provided there is no more serious confirmed incident.

### Scoring Rules

1. **Only one score adjustment per rental.** If multiple incidents happen during the same rental, apply only the most serious confirmed penalty, not the sum of all penalties.
2. For example, a 4-hour late return (−2) and minor damage (−10) during the same rental result in a total adjustment of −10, not −12.
3. If an investigation later confirms a more serious outcome, replace the earlier adjustment instead of applying another deduction.
4. A rental with any confirmed violation does not receive the +2 successful-rental reward.
5. No additional score deduction for unpaid damage obligations. Outstanding payment restrictions operate separately from the risk score.
6. Normal wear and tear, unproven complaints and ordinary failed payment attempts do not affect the score.
7. Score updates occur after the rental outcome is finalised and relevant disputes are resolved.
8. Renters can appeal incorrect penalties. The platform can correct or reverse score adjustments following review.
9. Scores are capped between 0 and 100.
10. No inactivity penalties or consecutive-rental bonuses.
11. Approved rental extensions do not count as late returns.

## 4. Very High Risk Renter — Platform Review (Score Below 30)

Renters scoring 0–29 cannot make direct rental payments. They must obtain CurRENT platform approval for each booking.

### Booking Process

1. Renter selects an item and clicks "Rent".
2. The system checks eKYC verification, account status, overdue damage obligations and risk score.
3. If the risk score is below 30, direct payment is blocked.
4. The renter submits a rental request to CurRENT for review.
5. CurRENT reviews the renter's rental history, incidents and requested item through its internal operational process.
6. **Approved:** The platform determines the applicable security deposit and unlocks payment for that specific booking.
7. **Rejected:** The booking cannot proceed, and the renter receives a notification.

### Additional Rules

- Every new rental request made while the score remains below 30 requires separate platform approval.
- Approval of one rental does not automatically approve future rentals.
- Platform approval does not automatically increase the risk score.
- Renters with overdue confirmed damage-payment restrictions, suspended accounts or permanent bans cannot bypass these restrictions through platform approval.
- Lender approval is not required for normal direct rental transactions.
- The customer-facing app only needs to display request submission, approval status, rejection status and relevant notifications. **Do not develop an Admin Dashboard.**
- Platform decisions must be recorded through a secure backend or separate operational process. Do not automatically approve restricted bookings merely because no Admin Dashboard exists.

### Renter Notification

"Your Rental Risk Score requires additional platform review before this rental can proceed. Please submit your request and wait for CurRENT's approval. You will be notified once the review is complete."

## 5. Non-Return, Accidental Loss & Fraud

- Late or unreturned items trigger investigation, not automatic fraud classification.
- CurRENT may temporarily restrict new bookings during serious non-return investigations.
- Confirmed accidental loss results in a −30 score penalty and applicable compensation procedures.
- Confirmed intentional non-return, theft or fraudulent behaviour by a renter results in permanent account removal, regardless of their risk score.
- Serious incidents require investigation and confirmation. A lender's allegation alone is insufficient.
- Appeals and corrections must be supported.
- Insurance eligibility for theft, damage or loss is handled separately under Part 2.

## 6. Rental Behaviour History & Score Transparency

### Record All Rental Behaviour

Every completed rental must have a detailed rental behaviour history record.

Record all incidents separately, even when multiple issues happen during the same rental.

Each rental record must include:

- Item name and rental location.
- Rental start date and scheduled return date/time.
- Actual return date/time.
- All reported incidents and relevant details.
- Late-return duration, if applicable.
- Damage description and supporting evidence, if applicable.
- Incident confirmation or dispute status.
- Actual risk score adjustment applied.
- Previous and updated risk scores.

All confirmed incidents remain in rental history, including those that do not affect the final risk score.

Pending or unverified incidents must be clearly labelled and cannot affect the risk score until confirmed.

### Penalty Display Rules

1. Display a numerical score adjustment only beside the incident that actually affects the renter's score.
2. For other confirmed incidents within the same rental, display **"Recorded"**, without a numerical penalty.
3. Show the final risk score adjustment only once per rental.
4. Do not display unused penalties as crossed-out or hypothetical deductions.
5. Preserve all incident records, even if no additional deduction is applied.
6. If an appeal changes the confirmed outcome, update the applied adjustment while retaining the original incident and correction history.

### Example — Rental Behaviour Record

**Item:** Camera\
**Location:** Puchong, Selangor\
**Return Date:** 12 December 2026\
**Status:** Issues Confirmed

| Rental Behaviour | Details                         | Score Impact |
| ---------------- | ------------------------------- | ------------ |
| Late Return      | Returned 4 hours late           | Recorded     |
| Minor Damage     | Confirmed damage to camera body | −10          |

**Final Risk Score Adjustment: −10**

Previous Score: 70\
New Score: 60

Both incidents remain visible in the rental history. Only the confirmed minor damage affects the score because it has the more serious penalty.

The late return is recorded without displaying its unused −2 penalty.

## 7. Customer-Facing Dashboard Requirements

### Renter Dashboard

Renters must be able to view:

- Current Rental Risk Score and risk category.
- Applicable security deposit rate.
- Complete personal rental history, including item names, locations and dates.
- Detailed rental behaviour records.
- All recorded incidents, including incidents without score deductions.
- Actual score adjustments, previous scores and updated scores.
- Damage claim and outstanding payment status.
- Booking restrictions and platform approval-request status.
- Notifications about claims, penalties, payments, restrictions and booking approvals.
- The ability to submit supporting evidence and appeals for relevant disputes.

### Lender Dashboard

Lenders must be able to:

- View verification status and relevant renter risk information for confirmed bookings.
- View detailed rental behaviour records for rentals involving their own listed items.
- See all recorded incidents, including late returns, damage details, confirmation status and actual score adjustments.
- Confirm item returns and report damage.
- Access relevant incident evidence and dispute outcomes for their own transactions.
- Submit photos/videos and descriptions for damage claims.
- Track claim progress and relevant compensation status.

Lenders cannot manually change renters' risk scores or incident outcomes.

Renters have access to their own rental history. Lenders have access to transactions involving their own items, without unrestricted access to other lenders' private records.

### Dashboard Scope

- Develop only the **Renter Dashboard** and **Lender Dashboard**.
- Do not build an Admin Dashboard, admin portal, internal staff interface or business management dashboard.
- Platform approvals, dispute decisions and other operational outcomes remain part of the backend business logic, but are not managed through a customer-facing administrator interface.
- Display the outcomes and relevant statuses to renters and lenders when appropriate.

## 8. Backend Requirements

- Store user verification status and risk score separately.
- Assign the initial score of 70 only after successful eKYC.
- Store every rental incident separately from the actual score adjustment, linked by rental ID.
- Preserve all confirmed incidents, including those that do not affect the score.
- Calculate progressive late-return penalties accurately using the actual return timestamp and agreed deadline.
- Apply only one final score adjustment per rental.
- Prevent duplicate deductions.
- Maintain audit records of incidents, scoring decisions, corrections and appeals.
- Enforce risk-based booking eligibility and account restrictions on the backend.
- Recheck booking eligibility before payment.
- Enforce appropriate permissions for renter and lender access.
- Support secure processing of platform decisions without developing an Admin Dashboard.

---

# PART 2 — CurRENT Deposit Determination

**Version 1.8 — Risk-Based Security Deposits, Item Protection & Claims**

## 1. Risk-Based Security Deposit Structure

The security deposit depends on the renter's current Rental Risk Score and the item's current replacement value.

| Risk Score | Risk Level     | Security Deposit                     | Booking Permission       |
| ---------- | -------------- | ------------------------------------ | ------------------------ |
| 70–100     | Low Risk       | 5% of item value, capped at RM500    | Direct payment           |
| 40–69      | Medium Risk    | 10% of item value, capped at RM1,000 | Direct payment           |
| 30–39      | High Risk      | 15% of item value, capped at RM1,500 | Direct payment           |
| 0–29       | Very High Risk | Determined by platform if approved   | Platform review required |

### Deposit Formula

**Security Deposit = min(Item's Current Replacement Value × Applicable Deposit Rate, Deposit Cap)**

### Example — Item Valued at RM12,000

| Risk Level | Calculation                  | Final Deposit             |
| ---------- | ---------------------------- | ------------------------- |
| Low        | 5% × RM12,000 = RM600        | RM500                     |
| Medium     | 10% × RM12,000 = RM1,200     | RM1,000                   |
| High       | 15% × RM12,000 = RM1,800     | RM1,500                   |
| Very High  | Platform assessment required | Determined after approval |

### Deposit Rules

1. Calculate the deposit automatically at checkout based on the renter's risk score.
2. Use the item's reasonable current replacement value, not its daily rental price.
3. Apply the relevant deposit percentage and maximum cap.
4. Fix the calculated deposit for that booking once payment is successfully completed.
5. Subsequent changes to a renter's score affect future bookings only.
6. Renters scoring below 30 cannot pay before platform approval.
7. For approved Very High Risk bookings, the platform determines the deposit individually.
8. The deposit is held securely through the platform's authorised payment/deposit-handling arrangements.
9. At rental completion, release the refundable deposit after return confirmation and resolution of any applicable claims or disputes, deducting only confirmed amounts properly payable by the renter.

## 2. Item Protection & Insurance

CurRENT integrates item protection through an authorised external insurance partner.

### Coverage Principles

- Eligible high-value items may receive protection of up to **RM60,000**, subject to the insurance partner's eligibility criteria, coverage limits, exclusions and policy terms.
- Eligible accidental damage may be covered under the applicable protection policy.
- Theft or loss may be covered where expressly included in the insurance partner's policy.
- Insurance protection is not guaranteed for every item, rental or incident.
- Claim eligibility and the approved payout amount are determined by the insurance/protection partner under the applicable policy.
- CurRENT must not promise automatic insurance payouts or guaranteed compensation before claim approval.

### Potential Insurance Exclusions

Insurance may exclude loss or damage resulting from:

- Intentional misuse.
- Prohibited use.
- Gross negligence.
- Unauthorised subletting.
- Other excluded behaviour or circumstances specified by the insurance partner.

If coverage is excluded, the renter may remain liable for uncovered repair or replacement costs, potentially up to the full current value of the item, subject to the rental agreement and applicable law.

The platform must clearly distinguish between insured amounts and renter liabilities.

## 3. Damage Claim Process

When an item is damaged during a rental, use the following process:

1. **Damage Reported:** The lender reports damage and submits supporting photos/videos and descriptions.
2. **Claim Assessment:** CurRENT assesses the incident and renter responsibility, including any dispute or evidence submitted by the renter.
3. **Insurance Claim:** Where eligible, the claim is submitted to the authorised external insurance/protection partner.
4. **Insurance Coverage:** The partner determines and covers the approved eligible amount, subject to policy terms and coverage limits.
5. **Renter Liability:** Any applicable excess, deductible or excluded amount is assessed as the renter's responsibility, subject to the rental agreement and applicable law.
6. **Deposit Application:** Apply the available security deposit towards the renter's confirmed liability.
7. **Outstanding Balance:** Notify the renter of any remaining confirmed payable amount.
8. **Payment Settlement:** Record payments, deposit deductions, approved insurance coverage and any remaining outstanding balance.

Insurance payouts and renter payments must be reconciled to prevent recovering the same loss twice.

## 4. Theft, Non-Return & Accidental Loss

### Investigation Process

1. Theft, accidental loss or non-return is reported with supporting evidence.
2. CurRENT investigates the incident to determine the circumstances and renter responsibility.
3. Distinguish between:
   - Accidental loss.
   - Third-party theft.
   - Unresolved non-return.
   - Confirmed intentional theft or fraudulent non-return by the renter.
4. Where eligible, submit the incident to the authorised insurance/protection partner.
5. The insurer determines whether the loss is covered and the amount payable under its policy.
6. Any uncovered renter liability is assessed separately, subject to the rental agreement and applicable law.
7. Apply the available security deposit towards confirmed renter liability and record any remaining payable amount.

### Enforcement Rules

- An overdue or unreturned item must not automatically be classified as theft.
- Serious unresolved non-return incidents may result in temporary booking restrictions during investigation.
- Confirmed accidental loss results in a −30 risk score adjustment.
- Confirmed intentional theft or fraudulent non-return by the renter results in permanent account removal.
- Permanent account removal is independent of whether an insurance claim is approved.
- Insurance coverage and renter accountability must be assessed separately.
- Confirmed fraudulent behaviour may be excluded from insurance coverage, depending on the policy.
- Appropriate appeal and correction procedures must remain available.

## 5. Outstanding Damage Payments & Independent Booking Restrictions

**Important: Outstanding damage-payment restrictions must operate independently from the Rental Risk Score.**

### When an Outstanding Obligation Arises

An unpaid damage obligation exists when:

1. A damage claim has been assessed.
2. Insurance/protection coverage, if applicable, has been determined.
3. The renter's remaining liability, including applicable excess, deductible or excluded amounts, has been confirmed.
4. The available security deposit has been applied towards that liability.
5. A confirmed outstanding balance remains and the renter has been notified.

If the confirmed balance is still unpaid **7 days after notification**, an automatic booking restriction applies.

### Booking Restriction Rules

- Any renter with a confirmed damage balance overdue by 7 days is blocked from making new rental bookings, regardless of their risk score.
- No new bookings or rental payments are allowed while the overdue balance remains.
- This restriction applies even to Low Risk renters with scores as high as 100.
- The restriction is removed automatically once full payment is confirmed.
- The restriction is also removed if the underlying obligation is cancelled or corrected after a successful review or appeal.
- Paying the outstanding amount does not automatically reverse a valid historical damage-related score penalty.
- Unresolved or disputed claims must not be classified as confirmed overdue obligations.
- No additional risk score penalty is imposed solely because a damage obligation remains unpaid.
- Suspended or permanently banned accounts remain restricted independently of payment settlement.
- Platform approval for Very High Risk renters cannot override an overdue damage-payment restriction.

### Example

A renter has a Rental Risk Score of 90 (Low Risk) but also has a confirmed overdue damage balance of RM300.

**Result: The renter cannot make new bookings despite having a Low Risk score.**

After the RM300 is fully settled, the outstanding payment restriction is lifted. Their original risk score and any valid historical incident penalties remain unchanged.

### Key Principle

**Risk Score = Rental behaviour and reliability history.**

**Payment Restriction = Whether the renter has unresolved confirmed overdue damage-payment responsibilities.**

These are independent mechanisms.

## 6. Claim & Deposit Information in Customer Dashboards

### Renter Dashboard

Display:

- Security deposit amount and applicable percentage for each booking.
- Deposit status and refund information.
- Damage/loss claim status.
- Approved insurance/protection coverage, where applicable.
- Confirmed renter liability.
- Deposit deductions.
- Outstanding payment amount and deadline.
- Payment settlement history.
- Booking restrictions linked to overdue damage balances.
- Claim and dispute notifications.
- Ability to submit relevant evidence and appeal an incorrect claim or liability decision.

### Lender Dashboard

Display for the lender's own rental transactions:

- Security deposit status.
- Return confirmation and damage-reporting functions.
- Claim details and supporting evidence.
- Insurance/protection claim status and approved coverage.
- Confirmed deductions, liabilities and compensation status.
- Relevant dispute outcomes.
- Ability to submit incident evidence and track claim progress.

Lenders cannot directly determine risk score adjustments, insurance coverage or final claim liability.

### Dashboard Scope

- Develop only the Renter Dashboard and Lender Dashboard.
- No Admin Dashboard or internal staff-facing claim management interface is required.
- CurRENT's internal decisions must be reflected in the customer-facing app through claim statuses, payment records, approval results and notifications.
- The app must not present pending claims, approvals or insurance payouts as confirmed before the relevant decision is received.

## 7. Backend & Payment Requirements

- Store security deposits, insurance/protection claims, renter liabilities and outstanding balances separately from Rental Risk Scores.
- Record all claim decisions, deposit applications, payment settlements and restriction changes.
- Enforce deposit calculations and caps on the backend.
- Enforce booking restrictions before checkout and payment.
- Prevent duplicate claims, deductions or compensation for the same loss.
- Apply deposits only towards confirmed renter liability.
- Support pending, approved, rejected, settled and disputed claim/payment statuses.
- Automatically activate booking restrictions when confirmed damage balances become overdue by 7 days.
- Automatically remove overdue-payment restrictions after confirmed settlement or cancellation of the obligation.
- Preserve complete audit records and appropriate user-access permissions.
- Make insurance eligibility, external claim decisions and coverage limitations clear in the app.
- Use the authorised payment/deposit-handling and insurance partner workflows rather than treating CurRENT itself as an insurer.
- Support the receipt and processing of platform decisions through secure backend mechanisms without creating an Admin Dashboard.

---

## Final Integration Requirements

The CurRENT app must integrate Part 1 (Rental Risk Score System) and Part 2 (Deposit Determination) into one consistent booking, payment, return, dispute and claim-management process.

The system must ensure that:

1. Only eKYC-verified renters receive a risk score and become eligible to rent.
2. Risk scores influence security deposits and booking permissions.
3. Late returns exceeding 2 hours incur progressive penalties of 1 point per additional hour or partial hour, capped at 5 points.
4. Every rental incident is recorded, but only the most serious confirmed incident affects the score for that rental.
5. Both renter and lender dashboards display detailed records for transactions they are authorised to view.
6. Insurance eligibility, approved coverage and remaining renter liability are assessed separately.
7. Confirmed overdue damage obligations block new rentals independently of the risk score.
8. Very High Risk renters must receive platform approval before payment.
9. Confirmed intentional theft or fraud results in permanent account removal.
10. All booking permissions, financial calculations, score updates and account restrictions are enforced securely on the backend.
11. The app includes **only two customer-facing dashboards: Renter and Lender**.
12. No Admin Dashboard, staff portal or internal business management interface should be developed.
13. Platform approval, dispute resolution and claim decisions must still be supported through secure backend statuses and operational workflows.
14. Do not simulate successful approvals, claim settlements or insurer payouts as genuine completed transactions.

**Development Scope:**

Build the customer-facing CurRENT experience for renters and lenders, including risk scores, rental behaviour history, risk-based deposits, booking restrictions, payments, item protection information, damage reporting, claims tracking and relevant notifications.

Keep the application simple, clear, transparent, fair and practical to implement. Do not introduce unnecessary scoring factors, dashboards or complex features beyond this specification.

---

**END OF DRAFT V2.7 — FOUNDER REVIEW ONLY. NO GITHUB CHANGE UNTIL EXPLICIT APPROVAL.**

## Appendix B — Latest founder-confirmed rental-activation and return policy (binding addendum)

This appendix is an easy-to-locate **binding digest** of the additions in Sections 9–14 and 28. It is not an extra dashboard or future-work idea.

1. **Pricing and dates:** Date and clock-time selection are mandatory. Price per day applies to each started 24-hour period: `ceil((requestedReturn - requestedPickup)/24h)`, minimum 1. A paid 31-hour requested period is charged as 2 daily units but retains an agreed 31-hour occupancy duration; the later actual activation shifts its end by 31 hours. No calendar-date subtraction or invented money late fee.
2. **Booking is not activation:** Completing the clearly simulated payment step confirms an item reservation, not physical possession or rental start.
3. **Both activate, subject to collision-free availability:** Lender clicks **Confirm Item Handed Over**, renter clicks **Confirm Item Received** when they actually exchange the item. Normally clock begins when the second authorised confirmation is recorded and deadline = activation + agreed booked duration. If a shifted deadline would overlap another confirmed booking, **protect it**; the renter sees and must accept a shorter available rental with original/revised duration and started-24-hour fee differences (including an honestly displayed RM0 adjustment if unchanged) **before activation**. Upon acceptance and final atomic recheck, activate once using the timestamp when all conditions are satisfied, with accepted shortened duration; apply any demo rent/service refund exactly once, keeping the initial deposit. Otherwise remain inactive and unresolved. Record individual timestamps; never override another renter’s slot.
4. **Automatic consecutive rental:** If the SAME renter newly rents the SAME item beginning at the EXACT current deadline and the owner has published available dates, successful second simulated checkout extends current possession without another lender approval, handover, interim return or photo upload. No second security deposit. Additional fee/service fee still owed in simulation; first deposit continues until FINAL physical return. Exactly one final risk-score adjustment for entire continuous chain.
5. **Both must confirm clean return:** At final physical meeting renter takes/uploads clear photo/video evidence of returned item. Renter clicks **Confirm Return — No Issues**, lender clicks **Confirm Item Received — No Issues**, separately and truthfully. One click alone does not end the rental/release a deposit. After both no-issues confirmations and no pending dispute, complete the clean return and release full simulated deposit once; apply final risk scoring using actual physical handback time.
6. **Dispute overrides incomplete no-issue return:** EITHER party sees damage, missing item/accessories or a deposit dispute → **Raise Dispute / Request Platform Review** instead of falsely clicking clean return. This action immediately stops clean completion and deposit release, even if one party already clicked clean. Hold simulated deposit until an expressly fictional predefined claim scenario outcome or future genuine review; no real insurer/cash. Maintain physical-return facts apart from dispute status.
7. **Two dashboards; no false claims:** Renter and Lender only, no admin. Very High Risk booking requests stay Pending (Demo); separate preset fictional DAMAGE CLAIM outcomes may show approval/rejection/appeal. Simulated deposit closure is not actual money transfer.
8. **Remaining deliberate decisions:** Cancellation is allowed only at least 24 hours before the originally scheduled pickup/start; the **simulated refund of the full rental fee and service fee and full deposit release with no fee** are confirmed and not open for clarification. Shared real cross-device accounts/backend (**Option B**) and the shorter-rental delayed-handover conflict remedy (**Option A**) are already founder-confirmed; neither needs to be re-asked. No further GitHub changes without the founder's explicit approval.
