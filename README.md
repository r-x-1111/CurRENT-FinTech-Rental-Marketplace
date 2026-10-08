# CurRENT

**Published Canva website:** [Explore the CurRENT rental marketplace](https://sea-lion-wbptl0.my.canva.site/copy-of-current-rental-marketplace-website)

**Canva website preview:** [Open the supplied preview link](https://preview.canva.site/4aa9b6e8-5421-43a9-a1aa-780b5ed7d860/current.com/current-rental-marketplace-website)

**Project status:** Academic prototype. The published Canva website presents the marketplace concept and user experience; the React Native / Expo application in this repository is a separate, locally running interactive prototype. Neither is a live financial service.

CurRENT is a Malaysia-based FinTech-integrated peer-to-peer rental marketplace. It allows users to rent items they only need temporarily, while owners can earn income from underused assets.

The initial market focus is Klang Valley.

> **Positioning:** Rent what you need. Earn from what you own.

Alternative brand message: **Own less. Access more.** CurRENT combines temporary access for renters, income from underused items for owners, and a visible trust layer for both.

## Project Goal

CurRENT is designed to make peer-to-peer renting safer and more practical by combining marketplace functions with payment, verification and rental-risk features.

The project has two complementary demonstrations: a publicly accessible Canva website that introduces the product and its rental experience, and a React Native / Expo mobile app in this repository that simulates the renter and owner journeys. The Canva page is not deployed from this repository, and its screens should not be treated as proof of a connected production backend.

## Published Website (Canva)

**Visit:** https://sea-lion-wbptl0.my.canva.site/copy-of-current-rental-marketplace-website

The published website is the public-facing showcase for CurRENT. It introduces a Malaysia-focused peer-to-peer marketplace where renters can access items temporarily and owners can earn from underused belongings. It also explains the FinTech features intended to make a rental clearer and safer. The initial market focus is **Klang Valley**.

### Website Presentation and Product Scope

The following areas describe the website/product brief; the published page's full interactive behaviour has not been independently verified.

| Website area | Purpose and content |
| --- | --- |
| Home and marketplace | Introduces “Rent what you need. Earn from what you own,” search and rental discovery, popular items and featured listings. |
| How renting works | Explains the intended journey from finding an item and selecting rental dates to handover, return and deposit release. |
| Featured item and booking | Illustrates item information, daily prices, dates, rental fees, refundable deposits and optional item protection. |
| FinTech and trust | Presents identity verification (eKYC), the Rental Risk Score, risk-based security deposits, digital payments and item protection as product concepts or prototype flows. |
| Owners and listing | Shows how owners could list underused items, present their availability and manage incoming requests. |
| Dashboard and community | Introduces renter/owner activity, rental tracking, reviews and trust information. |
| BNPL, safety and FAQ | Explains optional buy now, pay later for eligible rental fees, security measures, dispute reporting and frequently asked questions. |
| Connect with CurRENT | Provides a contact/enquiry interface after the FAQ section. |

These sections describe the Canva website's presentation and design scope. **A screen, button or displayed status is not necessarily connected to a real account, booking, payment or support service.** Working functionality should be evaluated separately for the Canva website and for the Expo application.

### Contact and Enquiries

The website includes a **Connect with CurRENT** section with the introduction “Have a question about renting, listing an item, or using CurRENT?” Its form interface has the following fields:

- **Name**
- **Email**
- **What can we help with?** (enquiry category)
- **Message**
- **Send message** action

The form's appearance is confirmed in the Canva design, but submission delivery to an email inbox, form database or support system has **not been verified**. Do not enter sensitive personal or payment details.

### How the Website Relates to This Repository

| Component | Current scope |
| --- | --- |
| Published Canva website | Publicly accessible product showcase and clickable/visual prototype. Hosted by Canva, not by the Expo code in this repository. |
| React Native / Expo app | Separate interactive local demo with renter and owner accounts, booking logic, risk/deposit estimates, simulated payments, messages, evidence and disputes. |
| Live external services | No real eKYC, payment collection, BNPL financing, deposit custody, insurance coverage, messaging server or support-case resolution is established by the website. |

For a hands-on end-to-end rental demonstration using the repository code, follow **Getting Started** and **Try a complete rental** below.


## BFM3130 Business Model and Financial Appendix

This section documents the **original CurRENT business proposal**, based on the 12-page BFM3130 Assignment 1 report and its 11-worksheet Excel appendix (September–October 2026). The report describes a proposed Malaysian FinTech start-up, not an operating company. Its forecasts, competitor comparisons, partner arrangements and market estimates are **academic assumptions or research findings**, not achieved results. The proposed live platform and the local Expo prototype are distinct.

### Problem, Market Opportunity and Evidence

CurRENT aims to make short-term peer-to-peer item renting more affordable and trustworthy. Renters need temporary access without the full purchase cost, while owners want income from underused personal or business assets. Key barriers are fake listings, damage, non-return, high or unclear deposits, informal payment arrangements and limited dispute protection.

| Business-model research component | Evidence or interpretation reported in the assignment |
| --- | --- |
| Market starting point | Malaysia, with an initial focus on the Klang Valley cities of Kuala Lumpur, Petaling Jaya, Subang Jaya, Shah Alam and Cyberjaya. |
| Malaysia's digital economy | 23.5% of GDP in 2024; 25.5% by end-2025 was a cited projection, not a verified outcome. |
| Sharing-economy context | More than 246 sharing-economy platforms; more than 1.6 million gig workers; an estimated RM18.8 billion cumulative Malaysian sharing-economy market size for 2016–2025. |
| Global market context | Sharing economy projected to reach US$1.4 trillion by 2030; source forecast, not current market size. |
| E-commerce fraud context | The report cites 7,662 reported cases and RM70 million losses in 2024, compared with 13,979 cases and RM129 million losses in 2025. These are e-commerce figures, not rental-specific incident counts. |
| FinTech trend | The workbook cites BNPL transaction value rising from RM9.3 billion in H1 2025 to RM11.9 billion in H2 2025, and active accounts from 6.5 million to 7.5 million. |
| Customer habits | The report cites research saying 61% of Malaysian Gen Z respondents actively manage finances through budgeting and related behaviours. It should not be interpreted as evidence that 61% would use CurRENT. |

Market figures are reproduced **as reported in the assignment**. The original references are listed under **Research References** below.

### Customer Segments and Needs

| Segment | Primary / secondary | Profile and example use cases | Problem CurRENT addresses |
| --- | --- | --- | --- |
| Renters / borrowers | Primary | Price-conscious B40 young adults aged **18–35**, including students, fresh graduates, young professionals, creators and freelancers; cameras, GoPros, drones, gaming consoles, projectors, speakers, event or travel equipment. | Short-term access without buying, lower or fairer deposits, verified owners, transparent checkout, convenient collection and reliable returns. |
| Owners / lenders | Primary | M40/T20 asset owners aged **21–45**, including professionals, photographers, creators, hobbyists and gamers. | Turn idle personal assets into rental income while retaining ownership; protect against loss, damage, fraud, non-payment and disputes. |
| Temporary residents | Secondary | International/exchange students, interns, short-term professionals and workers, broadly aged **18–40**; desks, chairs, monitors, appliances, TVs, furniture and household essentials. | Flexible periods, collection/delivery, verified owners and avoiding buying, moving, reselling or disposing of temporary possessions. |
| Micro and small businesses | Secondary | Photographers, event vendors, AV suppliers, videographers, production companies and small offices with cameras, lights, tools, projectors or equipment. | Generate revenue from underused business equipment, with structured bookings, renter verification and item protection. |

These B40/M40/T20 labels are **internal segmentation assumptions**. They are not intended to appear as eligibility labels on customer-facing pages.

**Initial geographic strategy:** Concentrate listings and renters in the Klang Valley to reduce the challenge of low marketplace liquidity and make handovers more practical.

### Primary Research (Appendix A)

The assignment interviewed **three potential users**, not a statistically representative sample. All three said they would consider CurRENT and none reported using a dedicated comparable P2P item-rental platform.

| Respondent | Profile | Main concern | Feature most valued |
| --- | --- | --- | --- |
| 1 | Student, age 21 | Buying expensive items for infrequent use | Lower deposits and secure payment |
| 2 | Young professional, age 27 | Fake listings and damaged items | Verification and item protection |
| 3 | Photographer, age 43 | Underused equipment and risk of non-return | Insurance/protection and Rental Risk Score |

**Interview guide (Figure A1):** prior short-term equipment need; rent-versus-buy willingness; worries about renting from another person; effects of verification, payments, insurance and risk-based deposits; willingness to list idle expensive assets; concerns about lending; existing use of similar rental platforms.

### Value Proposition and Competitive Analysis

**For renters:** affordable access, verified users/listings, platform-managed payment, risk-based deposits, transparent booking terms, optional eligible BNPL and a documented dispute process.

**For owners:** income from idle assets, verified and risk-assessed renters, item-value-sensitive deposits, eligible third-party item protection, evidence-backed returns and clearer payout visibility.

**For temporary residents and SMEs:** flexible rental periods, potential collection or delivery arrangements, improved asset utilisation and more reliable booking records.

| Comparison | RentSmart Asia (research benchmark) | Facebook Marketplace (alternative channel) | CurRENT (proposed differentiation) |
| --- | --- | --- | --- |
| Existing strength | Dedicated rental categories, established listings, verification and protection. | Broad audience, familiar P2P listings and direct messaging. | Integrated renter/owner flows designed specifically for rentals. |
| Identified gap | Assignment cites a standard RM100 deposit, protection up to RM10,000 and no clear public evidence of a behavioural rental score. | Primarily buy/sell; rental deposits, return checks, protection and dispute processes can be informal. | Rental Risk Score, risk-based deposits, digital agreements, condition evidence, structured disputes and proposed protection up to RM60,000 for eligible items. |
| Limitation | Market analysis may change as competitors update services. | No rental-specific controls established by this comparison. | A new marketplace initially lacks user density, rental behaviour data and signed service partners. |

**CurRENT SWOT, from the workbook**

- **Strengths:** rental-specific scoring, risk-based deposits, proposed higher-value partner protection, documented disputes and optional BNPL.
- **Weaknesses:** limited early renter/owner liquidity, little initial data for risk modelling and reliance on outside providers.
- **Opportunities:** rising familiarity with temporary access, valuable electronics/event equipment, FinTech partnerships and owner monetisation.
- **Threats:** competitors adopting similar features, fraud/theft/non-return, and **disintermediation** when renters and owners move repeat transactions off-platform to avoid fees.

**Retention and platform-use ideas (not active offers):** rental agreements and protection linked to on-platform bookings; loyalty points or platform credits; discounts; listing-boost credits; occasion-based discovery; bundled rental packages; and optional BNPL. Any rewards, boosts or bundles require future implementation and commercial validation.

### Intended Product and FinTech Components

The following inventory combines the report, workbook and current documented prototype scope. **Local demo** means simulated in the Expo app as previously documented. **Planned** means the business proposal requires future development or an authorised partner.

| Component | Intended user experience | Status / qualification |
| --- | --- | --- |
| Discovery and item marketplace | Search, categories, locations, prices, available dates, saved listings, galleries, owner information and ratings. | Local demo; presented in website concept. |
| Renter and owner accounts | Sign-in, profile, Owner Mode, item listings, request approval and booking history. | Local demo only; not production authentication. |
| Identity checks | eKYC, verified badges and verification failure/retry states. | Simulated; a real provider is planned. |
| Rental Risk Score | Uses identity, completed rentals, ratings and disputes to communicate estimated renter risk; late returns, transaction behaviour and account history are longer-term inputs. | Explainable local demo; not a trained, externally validated risk model. |
| Risk-based security deposits | Deposit related to item value and renter risk, with secured/held/pending/released/disputed states. | Calculated and tracked in local demo; no real funds are held. |
| Booking and availability | Date-based price quote, 1–90 day rentals, booking conflicts, request, approval or rejection and status tracking. | Local demo. |
| Payments | Itemised rental fee, service fee, deposit, optional protection and total; card/FPX concepts. | Simulated payment and retry states only. |
| Optional BNPL | Eligible higher-value **rental fee only**, excluding deposits and other fees. | Eligibility/payment simulation only; real partner planned. |
| Item protection | Optional demo add-on; proposed third-party insurance/protection for eligible items, potentially up to RM60,000 under partner terms. | No live cover, insurer underwriting or guaranteed claims. |
| Digital agreements | Rental parties, dates, payment terms and agreed collection method. | Local demo. |
| Collection and delivery | Meet Owner, Self-Pickup, Delivery Available. | Selection stored in demo; actual logistics/pricing integration planned. |
| Messaging and notices | Rental-linked renter/owner chat, unread indicators, notifications and rental reminders. | Local device/browser demonstration, not cross-device Realtime. |
| Item check-in and check-out | Condition photos, handover, return and owner inspection. | Local demo. |
| Disputes and claims | Reason, written description, photo evidence and pause in deposit release. | Local dispute record only; human support resolution and insurer claims are planned. |
| Reviews and user trust | Two-way ratings/reviews, rental history and trust guidance. | Local demo. |
| Owner finances | Estimated earnings, commissions, payout history and listing management. | Local demo; no real payout settlement. |
| Occasion discovery and bundles | Explore by occasions such as travel, university work, weddings, events and content creation; rent related items together. | Business proposal; not confirmed live. |
| Listing boosts and referrals | Paid featured listings, referral links/codes, reward tracking and boost credits. | Planned growth features, not confirmed live. |
| Help and contact | FAQ, deposits, verification, payment, cancellation, damage and safety information; Connect with CurRENT enquiry form. | Canva design includes the contact form UI; delivery to an inbox/support system is unverified. |

The report proposes stricter rental limits or account suspension for consistently high-risk behaviour. These are **future policy options**, not automatic decisions demonstrated by the current prototype.

### Customer Acquisition, Channels and Partnerships

**Digital acquisition:** future iOS/Android app distribution, TikTok and Instagram for younger renters, Facebook for community reach and LinkedIn for owners/SMEs. Content ideas include rent-versus-buy comparisons, featured rentable items, creator use cases, potential owner income, fraud-prevention guidance, protection explanations and testimonials. The workbook assumes **RM2,000 per month** in marketing and a theoretical blended customer acquisition cost of **RM5.06 per registered user** for Year 1.

| Partner category | Intended responsibility or distribution role |
| --- | --- |
| Payment provider / bank | Process rental payments, deposit handling, refunds and owner payouts through suitable authorised services. |
| eKYC provider | Verify renter and owner identity and support fraud controls. |
| Insurance / item-protection partner | Underwrite eligible item coverage, manage claims and provide relevant policy terms. |
| BNPL provider | Offer eligible instalments for rental fees, subject to provider checks and commercial agreement. |
| Property, landlord and co-living partners | Refer tenants needing household items at move-in or move-out; potential B2B2C channel. |
| SME associations and business networks | Reach equipment-owning SMEs and encourage listing of idle assets. |
| Logistics and delivery providers | Future pickup/delivery coordination, especially for larger items; charges and responsibility to be defined. |

Potential commercial incentives from the workbook include referral fees, co-marketing, partner revenue sharing and listing-boost credits. **No provider partnership or revenue-share contract is established by these planning documents.**

### Key Resources, Operations and Governance

- **Technology:** mobile and web interfaces, secure accounts, scalable cloud hosting, marketplace/transaction database, APIs, rental-risk logic, storage, monitoring, encryption and fraud controls.
- **People:** founder/management; software development and UI/UX; operations/customer support; sales and partnerships; marketing; finance, risk and compliance; bookkeeping and legal support.
- **Operating processes:** listing quality, identity review, bookings, payment/deposit tracking, handover evidence, condition inspection, customer enquiries, charge/refund coordination, complaints, disputes and claims referrals.
- **Compliance and governance:** Malaysian company setup, applicable personal-data and consent duties, user authentication, appropriate providers for regulated services, clear rental terms, dispute/refund policies, security reviews and access controls.

**No direct regulated status is claimed.** CurRENT is not described as an insurer, bank, BNPL lender or licensed escrow institution.

### Revenue Model and Unit Economics (Excel Appendix)

The base-case forecast assumes an **average RM200 rental fee**.

| Proposed revenue stream | Workbook assumption | Expected contribution to one average completed rental |
| --- | --- | ---: |
| Owner/lender commission | 12% of RM200 | RM24.00 |
| Borrower service fee | 5% of RM200 (prototype also uses RM5 minimum) | RM10.00 |
| Insurance referral income | RM2 per completed rental; model assumes all rentals attach protection | RM2.00 |
| BNPL referral | RM5 for each participating rental at 10% adoption | RM0.50 |
| Listing boost | RM10 per boost, with uptake equivalent to 10% of rentals | RM1.00 |
| **Modelled average revenue** | **All five streams combined** | **RM37.50** |

**Model-versus-prototype distinction:** the financial model assumes insurance referral revenue on *every* completed rental, while the current app offers optional **RM5 per day** demo protection. A demo protection charge is **not** the same as net platform referral income. The workbook's **Key Resources** sheet also discusses a different possible boost-pricing rule (3% of listing price, maximum RM100, payable after rental), while the pro forma uses **RM10** and 10% uptake. The table above follows the **pro forma**, and the alternative is a concept awaiting reconciliation.

**Variable costs and assumptions:** RM1.20 gateway fee per completed rental; RM0.10 per SMS/OTP; two onboarding SMS per registered user and one transaction message per rental; RM0 eKYC in Year 1 based on the assumed provider's first 500 free monthly verifications. Provider prices and capacity are modelling inputs, not secured contracts.

**Core break-even assumption:** RM37.50 expected revenue less RM1.30 direct variable cost per completed rental yields **RM36.20 contribution margin per rental**. The RM1.30 simplification excludes the separate user-onboarding SMS burden and should not be treated as a full long-run cost per transaction.

### Fixed-Cost Budget (Excel Appendix)

The proposed organisation and monthly budget are **forecast staffing costs**, not the current project's actual payroll.

| Staff role | Modelled RM per month |
| --- | ---: |
| CEO | 17,000 |
| Lead Software Engineer | 11,000 |
| Full Stack Web Engineer | 5,500 |
| Mobile Developer | 6,000 |
| UI/UX Designer | 3,800 |
| Operations Manager | 6,500 |
| Customer Support Representative | 2,800 |
| Marketing Executive | 3,500 |
| Partnership and Sales Executive | 3,300 |
| Finance Executive | 3,000 |
| Risk and Compliance Executive | 3,500 |
| Accountant | 5,000 |
| Legal Advisor | 3,400 |
| **Total monthly salaries** | **74,300** |

| Other fixed cost | Modelled RM per month |
| --- | ---: |
| Marketing and advertising | 2,000 |
| Office rent (Petaling Jaya; modelled 1,500 sq. ft.) | 2,700 |
| Cloud hosting / database | 300 |
| Domain / SSL / basic tools | 100 |
| Maintenance and bug fixes | 1,500 |
| Security / third-party tools | 100 |
| Regulatory and data-protection compliance | 420 |
| **Other monthly fixed costs** | **7,120** |
| **All fixed costs per month** | **81,420** |
| **All fixed costs per year** | **977,040** |

The pro forma groups office and technology expenses as **Operations RM4,700/month**, alongside Salaries RM74,300, Marketing RM2,000 and Licensing/Compliance RM420.

### TAM, SAM, SOM and Year 1 Adoption

The assignment's Figure B1 defines **TAM** as approximately **6.0 billion globally digitally reachable users**, **SAM** as approximately **34.9 million digitally reachable Malaysian users**, and **initial SOM** as **9.48 million people aged 18–35 in Klang Valley**. These are very broad population proxies, **not** confirmed rental customers or spend-based addressable market sizes.

- Year 1 registration target: **4,740**, or **0.05%** of the stated 9.48 million SOM.
- Monthly active-user assumption: **20%** of cumulative registered users.
- Monthly conversion assumption: **50%** of active users each complete **one** rental.
- Year 1 total forecast completed rentals: **2,795**; the reported first and final months have **27** and **474** rentals, respectively.
- Blended acquisition-cost scenario: RM24,000 annual marketing / 4,740 registrations = approximately **RM5.06** per registration.

### Year 1 Monthly Pro Forma (Excel Appendix)

All figures below are **forecast RM**, not actual transactions or performance. Revenue combines commission, borrower fee, insurance referral, BNPL referral and listing boosts. Variable costs include processing, eKYC and SMS/OTP; monthly fixed costs are RM81,420.

| Month | New users | Completed rentals | Total revenue (RM) | Variable cost (RM) | Loss before tax (RM) |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 270 | 27 | 1,012.50 | 89.10 | (80,496.60) |
| 2 | 300 | 57 | 2,137.50 | 134.10 | (79,416.60) |
| 3 | 330 | 90 | 3,375.00 | 183.00 | (78,228.00) |
| 4 | 350 | 125 | 4,687.50 | 232.50 | (76,965.00) |
| 5 | 370 | 162 | 6,075.00 | 284.60 | (75,629.60) |
| 6 | 390 | 201 | 7,537.50 | 339.30 | (74,221.80) |
| 7 | 410 | 242 | 9,075.00 | 396.60 | (72,741.60) |
| 8 | 430 | 285 | 10,687.50 | 456.50 | (71,189.00) |
| 9 | 450 | 330 | 12,375.00 | 519.00 | (69,564.00) |
| 10 | 470 | 377 | 14,137.50 | 584.10 | (67,866.60) |
| 11 | 480 | 425 | 15,937.50 | 648.50 | (66,131.00) |
| 12 | 490 | 474 | 17,775.00 | 714.20 | (64,359.20) |
| **Year 1** | **4,740** | **2,795** | **104,812.50** | **4,581.50** | **(876,809.00)** |

The annual pro forma also forecasts approximately **RM100,231 gross profit** before the **RM977,040 fixed-cost** deduction. Year 1 revenue by source is RM67,080 owner commission, RM27,950 service fees, RM5,590 insurance referral, RM1,397.50 BNPL referral and RM2,795 listing boosts.

### Break-Even and Five-Year Scenario (Appendix C)

Using RM977,040 annual fixed costs and RM36.20 contribution per rental, the worksheet calculates **26,990.06**, meaning at least **26,991 whole completed rentals** are required to fully exceed the mathematical break-even threshold. The original report and worksheet **state 26,990 rentals/year**, or about **2,249 per month**, by rounding the displayed result. Both the source figure and the rounding qualification are retained here.

| Year | Target SOM penetration | End-of-year registered users | Projected completed rentals | Comparison with reported 26,990-rental target |
| ---: | ---: | ---: | ---: | --- |
| 1 | 0.05% | 4,740 | 2,795 | Below |
| 2 | 0.10% | 9,480 | 8,532 | Below |
| 3 | 0.18% | 17,064 | 15,926 | Below |
| 4 | 0.30% | 28,440 | 27,302 | Above; proposed break-even year |
| 5 | 0.45% | 42,660 | 42,660 | Above |

Years 2–5 use average beginning/end user populations, 20% monthly activity, 50% rental conversion and 12 months. **Year 4 break-even is a projection contingent on these assumptions**, not proof of future profitability or available financing.

### Source Consistency Notes

The supplied assignment materials contain small differences that should be corrected in the source spreadsheets/report before using the model for funding or external decision-making:

1. **Year 1 revenue:** PDF narrative states **RM104,813.50**; Excel Pro Forma Income Statement annual figure and the sum of its five revenue streams are **RM104,812.50**. This README uses the Excel pro forma amount.
2. **Variable cost:** Excel **Variable Cost** worksheet shows a Year 1 total of **RM4,581.10**, whereas the twelve displayed monthly costs and the **Proforma Income Statement** total **RM4,581.50**. This README retains the pro forma/monthly-sum figure.
3. **Boost pricing:** the Key Resources assumptions mention a **3% of listing price, max RM100** concept; the revenue model uses **RM10 per boost** at 10% uptake. Both are described but **not treated as the same model**.
4. **Insurance:** the financial forecast assumes RM2 referral revenue on every rental; product screens describe optional RM5/day demo protection. A partner's premium economics, customer opt-in rate and actual coverage are unconfirmed.
5. **Round-up:** the worksheet's 26,990.06 estimated break-even transactions are described as 26,990 in the assignment; whole-transaction break-even strictly requires rounding **up**, not down.

### Document and Worksheet Coverage

| Supplied source | Components documented in this README |
| --- | --- |
| PDF pp. 1–2 | Project identity, introduction, market environment and primary renter profile. |
| PDF pp. 3–4 | Owner and secondary segments, competitor comparison, trust and item protection, SWOT-related positioning and retention ideas. |
| PDF p. 5 | Unit pricing, user adoption, customer acquisition assumptions and financial feasibility. |
| PDF pp. 6–7 | Original citations and source links for market and competitor claims. |
| PDF p. 8 / Appendix A, Figure A1 & Table A1 | All seven interview topics and three interviewee findings. |
| PDF p. 9 / Appendix B, Figures B1–B2 | TAM/SAM/SOM estimates and monthly user/rental projection. |
| PDF p. 10 / Appendix B, Figures B3–B5 | CAC formula, five revenue components and three variable cost categories. |
| PDF p. 11 / Appendix B, Figure B6 | Monthly and Year 1 pro forma income statement. |
| PDF p. 12 / Appendix C, Figures C1–C2 | Break-even equation and five-year SOM projection. |
| Excel 1. Market Research | Market overview, growth, fraud, BNPL and demographic evidence. |
| Excel 2. Swot analysis | Competitor and CurRENT strengths, weaknesses, opportunities and threats. |
| Excel 3. Market Segments | Primary renters/owners and secondary temporary residents/SMEs with age, location, products and needs. |
| Excel 4. Value Proposition | Market gaps and distinct gains for each customer group. |
| Excel 5. Channels to Reach | App, social platforms, marketing, core and distribution partnerships, referral programme. |
| Excel 6. Key Resources | Technology, personnel, partners, risk, governance, data security and growth assumptions. |
| Excel 7. Cost Structure | All 13 salary roles plus marketing, office, tech and compliance cost lines. |
| Excel 8. Variable Cost | Monthly new users, payment processing, eKYC, SMS/OTP, cost per transaction and cost assumptions. |
| Excel 9. Proforma income statement | Five revenue streams, month-by-month revenue/cost/loss, Year 1 forecast. |
| Excel 10.Breakeven Analysis | Unit contribution margin, annual/monthly transaction threshold and five-year projections. |
| Excel Summary | Business-model and financial feasibility overview. |

### Research References

Key primary sources cited in the assignment and Excel model (not independently fact-checked for this README update):

- [Deloitte, Malaysia digital trust and sharing economy](https://www.deloitte.com/southeast-asia/en/about/press-room/malaysia-sets-new-benchmark-for-digital-trust-within-the-sharing-economy.html)
- [Research and Markets / GlobeNewswire, global sharing-economy projection](https://www.globenewswire.com/news-release/2025/04/24/3067614/0/en/sharing-economy-industry-to-grow-by-us-1-trillion-reaching-us-1-4-trillion-by-2030-expansion-of-collaborative-consumption-models-drives-adoption-in-various-sectors.html)
- [PDRM, reported e-commerce crime statistics](https://www.rmp.gov.my/news-detail/2026/01/11/besmartstayalert-letsfightscammertogether-scam-alert-statistik-jenayah-e-dagang-bagi-tahun-2024-hingga-2025-posting-pilihan)
- [Bank Negara Malaysia, Financial Stability Review H2 2025](https://www.bnm.gov.my/documents/20124/21185035/fsr2025h2_en_ch1b.pdf)
- [Reeracoen Malaysia, Gen Z lifestyle, work and spending](https://www.reeracoen.com.my/articles/how-gen-z-in-malaysia-thinks-trends-in-lifestyle-work--spending)
- [Jobstreet Malaysia, B40/M40/T20 classifications](https://my.jobstreet.com/career-advice/article/what-is-b40-m40-t20)
- [RentSmart Asia, comparator](https://rentsmartasia.com/how-it-works)
- [Huurne et al. (2017), trust in the sharing economy](https://doi.org/10.1002/cb.1667)
- [Kamal et al. (2020), student accommodation preferences](https://doi.org/10.1007/978-981-15-3859-9_13)

## Mobile Product Brief

CurRENT is one app with renter and owner workflows. Users browse normally and open **Owner Mode** from Profile; the built-in Alex Tan and Aiman Rahman accounts let one device demonstrate both sides of a transaction. The interface is designed for a roughly 390 × 844 mobile viewport, with five bottom tabs: **Home, Explore, Rentals, Messages, Profile**. Product photography, text, prices, badges and actions are separate interface elements.

| Area         | What the prototype demonstrates                                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home         | Search, categories, featured Klang Valley items, notifications and active rental reminders.                                                                          |
| Explore      | Search, category, location, maximum daily price, dates, minimum rating, verified-owner and saved filters, plus price and rating sorting.                             |
| Item details | Photo gallery, owner identity, ratings, rental count, description, collection choices, a 21-day availability preview and a date-based cost quote.                    |
| Rentals      | Request, upcoming, active, return due, completed, cancelled and disputed filters; payment, handover, return, deposit and review steps.                               |
| Messages     | Conversations attached to a specific rental, with unread indicators and collection and return arrangements in context.                                               |
| Profile      | Editable identity and photo, simulated eKYC, explainable Rental Risk Score, reviews, saved items, histories, notifications, Help & Trust and demo account switching. |
| Owner Mode   | Dashboard, listing and collection-method management, incoming requests, renter information, messages, reviews, and simulated earnings and payouts.                   |

The main demo path is **browse → item → dates → cost preview → request → owner approval → payment → deposit secured → agreement → message → handover and check-in → rental → return and check-out → owner inspection → deposit released → reviews**. The alternate path is **problem → dispute with photo evidence → deposit release paused → under review**. The prototype records disputes for review; it does not decide them automatically.

### Product rules

- Rentals last **1–90 days**. The return date is exclusive for charging, while a listing's "available until" date is its final rentable day. Confirmed or approved reservations block overlapping bookings. The item detail screen marks booked and closed days in its 21-day preview; date fields also support dates beyond that preview.
- The borrower service fee is **5% of rental value, with a RM5 minimum**. Owner commission is **12% of the rental fee**. Checkout separates rental fee, service fee, refundable deposit, optional protection and total payable.
- The Rental Risk Score starts at 50 and uses demo identity status, completed rentals, ratings and disputes. Scores **75–100** are low risk, **50–74** standard risk and **0–49** higher risk. Corresponding demo deposits are **10%, 20% and 30%** of estimated item value. Late-return and transaction signals are planned inputs but are not automated in this prototype.
- Payment methods are simulated **Card, FPX and eligible BNPL**. Demo BNPL requires a verified account and rental fees of at least RM200; only the rental fee is eligible. The deposit, service fee and protection remain separate. Failure and retry states are available.
- Protection is an optional **RM5 per rental day** demo add-on for items valued up to RM60,000. Any real coverage, potentially up to RM60,000 for eligible items, would depend on an external partner's terms and conditions. The prototype does not promise compensation.
- A paid rental generates a digital agreement. Handover and return require condition photos; owner confirmation releases the demo deposit and records a demo payout. Opening a dispute during an active rental or return inspection pauses release.
- Listings can be drafts, published, paused or unavailable. Publishing requires a verified demo owner and at least one photo. Owners can pick a main image, move photos earlier, edit details, pause and delete eligible listings.
- Owners choose supported collection methods: **Meet Owner**, **Self-Pickup** or **Delivery Available**. Renters select from those choices at booking. The selection is saved with the rental and written into its digital agreement. Delivery is only a simulated option; a live version would use an external logistics provider, and this prototype calculates no delivery charge.
- Dispute reporting includes a reason, written explanation and photo evidence. The case is recorded as under review and blocks the normal deposit-release action. Resolution remains a support/admin task outside this local demo.

All account, payment, verification, protection and deposit actions are **local simulations**. The app does not move money or perform identity checks. A live service would use appropriately authorised external providers for eKYC, payment processing, deposit handling, BNPL and insurance or item protection. CurRENT is not presented as a bank, insurer, BNPL provider or licensed escrow provider.

### Product presentation and scope

The intended audience includes students, young professionals, freelancers, creators, hobbyists and owners of underused equipment, with temporary residents and small businesses as secondary users. B40/M40/T20 groupings are internal market research labels and do not belong on customer screens. Normal screens show only information useful for a rental decision; internal acquisition costs, salaries, break-even targets and projections stay outside the app.

The master prompt calls for realistic product photographs throughout the marketplace. Product images, names, prices, locations, ratings, verification badges, status labels, buttons and card backgrounds remain separate React Native elements. For further Canva website revisions, use individually editable elements and replaceable image frames where possible; do not flatten functional cards into pictures.

Use the existing navy and blue identity with green reserved for positive states. Prioritise search, categories, listings and the current rental on Home. Vary product rows, gallery views and dashboard modules so the mobile app does not become a sequence of identical cards. BNPL, delivery, occasion discovery, listing boosts, referrals and bundles are secondary to booking, trust, payment, evidence and disputes.

The **Help & Trust** screen explains the four-step rental process, deposits, verification, damage, cancellations, disputes, fees, delivery and the Rental Risk Score. It links back to Rentals for reporting a problem. This is guidance for the local academic prototype, not a live support or claims service.

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
- Reorder photos and preview saved listings
- Set category, description, location and daily price
- Set item availability
- Set supported collection methods
- Review incoming rental requests

At least one item photo is required before a listing can be published.

### Booking

Renters can:

- Select rental dates
- Select a supported collection method
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
5. Choose supported collection methods
6. Publish the listing
7. Receive a rental request
8. Review renter profile and risk information
9. Approve or reject the request
10. Confirm payment and deposit status
11. Complete handover and check-in
12. Monitor the active rental
13. Complete return and check-out
14. Receive payout
15. Review the renter

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

The priority is the complete rental and dispute journeys. Referral rewards, listing boosts and rental bundles remain optional future growth features and do not drive the current interface.

## Technical Foundation

The repository contains an interactive mobile application prototype with local persistence and a browser preview.

### Stack

**Used by the repository's local mobile/web prototype:**

- React Native with Expo
- TypeScript
- Expo Router
- AsyncStorage for device/browser-local state

**Backend foundation and planned integrations (not active in the local prototype or the published Canva website):**

- Supabase PostgreSQL schema and client scaffolding
- Supabase Auth
- Supabase Storage and Realtime for media and cross-device messaging

### Working Prototype

The app now runs as an interactive, device-local academic prototype without Supabase credentials. It opens as Alex Tan, a sample renter. Profile → Demo accounts lets you switch to the item owner to exercise both sides of a rental. This is deliberately a local simulation, not a deployed multi-user service.

Implemented functions:

- Responsive mobile and web marketplace, search, category/location/price/date/rating/verified-owner filters, price and rating sorting, favourites and listing galleries
- Local demo signup, sign-in, sign-out, editable profiles and profile photos
- Simulated eKYC with pending, verified, failed and retry states
- Owner listing creation, photo selection/main-photo management, collection methods, drafts, publishing, editing, pausing and deletion
- Rental dates, a 21-day booked/closed availability preview, overlapping-reservation prevention and owner approval/rejection with renter risk context
- Itemised fee quotes, explainable risk scores, risk-based deposits and optional simulated protection
- Simulated card/FPX/eligible BNPL checkout with processing, success, failure and retry; BNPL excludes the deposit and other fees
- Rental agreements with collection method, participant messaging with unread indicators, notifications and payment history
- Photo evidence at owner handover and renter return, owner inspection and simulated deposit release
- Categorised disputes with evidence that freeze deposit release, two-way reviews, owner earnings and payout records
- Help and Trust & Safety guidance with a practical FAQ
- Local persistence using AsyncStorage, including selected photos, account state and in-progress rentals

Demo accounts and messages share data **only on this device/browser**. Built-in accounts use account-switch buttons. Created demo accounts use a salted password digest, which is only a prototype mechanism, not production authentication. Do not enter real identity documents or reuse a real password. External sample photography requires an internet connection.

The latest master prompt also describes future settings, push reminders, provider-backed delivery pricing and support-led dispute resolution. Those are not live integrations in this repository. The current UI offers local notifications and Help & Trust guidance; it does not claim real settlement, automatic refunds or dispute decisions.

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

The **Canva website is published** as the public product showcase. The repository is a **working local academic app prototype**, not the backend or source code for that published site and not a production marketplace. The app's core renter and owner journeys are implemented and tested in the browser. Native device runtime testing is still required.

Remaining live-service work: Supabase Auth and database/storage synchronisation, server-authoritative permissions and booking concurrency, Realtime messaging across devices, authorised provider integrations, push notifications, support/admin dispute resolution, real refund/payout processing and store-release preparation. The original SQL policies are scaffolding and must not be used as a production security boundary.

See [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) for the full implementation sequence.
