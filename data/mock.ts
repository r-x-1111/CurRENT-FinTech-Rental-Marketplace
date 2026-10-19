import type { Listing, Rental } from "../types";

export interface SampleReview {
  id: string;
  itemTitle: string;
  authorName: string;
  location: string;
  rating: number;
  text: string;
}

export const faqCategories = [
  "About CurRENT",
  "Refundable Security Deposit",
  "Optional Rental Protection",
  "Rental Protection and Compensation Comparison",
  "Delivery and Delivery Company Compensation",
  "Payments, Fees and Disputes",
] as const;

export type FaqCategory = (typeof faqCategories)[number];

export interface FaqCoverageRow {
  situation: string;
  withProtection: string;
  withoutProtection: string;
  deposit: string;
  deliveryCompensation: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  category: FaqCategory;
  /** Only present on the Q21 comparison FAQ — renders as a structured table, not prose. */
  coverageTable?: FaqCoverageRow[];
}

// Section 3 & 15: Exactly ONE review on Sony product detail only (Alex Tan, 5 stars, Demo / Sample Review)
export const sampleReviews: SampleReview[] = [
  {
    id: "rev-1",
    itemTitle: "Sony A7 III Mirrorless Camera",
    authorName: "Alex Tan",
    location: "Petaling Jaya",
    rating: 5,
    text: "The camera matched the listing and delivery was smooth. Everything was clear from booking to return.",
  },
];


// Section 14.3: Full customer-facing FAQ — 30 questions across six categories (replaces the old
// six-question founder-screenshot set). Kept as a single shared source for the FAQ page and the
// Help & Trust page. All insurance, delivery and payment flows referenced below are simulated.
export const sampleFaqs: FaqItem[] = [
  // CATEGORY A. ABOUT CurRENT
  {
    category: "About CurRENT",
    question: "What is CurRENT?",
    answer:
      "CurRENT is a Malaysian peer-to-peer rental marketplace that connects renters with individuals and businesses offering items for rent.\n\nRenters can browse listings, select rental dates, arrange delivery and complete simulated payments through the platform. Lenders can list eligible items, manage their rentals and track their earnings.\n\nCurRENT acts as a marketplace intermediary. It facilitates bookings, communication, transaction records, dispute management and access to proposed third-party services. CurRENT does not directly provide insurance or delivery services.\n\nCurRENT is currently a demonstration platform. Payment transactions, insurance arrangements, escrow and courier services are simulated.",
  },
  {
    category: "About CurRENT",
    question: "How do I rent an item on CurRENT?",
    answer:
      "1. Browse available items and select the item you want.\n2. Choose your rental start date and your preferred start time from the available slots.\n3. Enter your delivery information and review the estimated two-way delivery fee.\n4. Complete the simulated delivery payment.\n5. Review the rental fee, CurRENT service fee, refundable security deposit and optional Rental Protection.\n6. Complete the simulated rental payment using an available payment method.\n7. Receive the rented item and submit the required condition evidence.\n8. Return the item according to the agreed arrangements.\n9. The lender inspects the returned item before the refundable deposit is released or any dispute is assessed.\n\nEligible renters can book directly according to their Rental Risk Score. Renters who require Platform Review must complete the applicable assessment process before booking.",
  },
  {
    category: "About CurRENT",
    question: "Can I choose any rental start time, and how are rental periods measured?",
    answer:
      "Yes. You can select your preferred rental start date and start time from the available time slots — CurRENT does not lock everyone to a fixed starting hour such as 10 AM.\n\nRental periods are only available in complete 24-hour blocks measured from that start time: 24 hours (1 day), 48 hours (2 days), 72 hours (3 days) and so on. Your return time automatically matches your selected start time, so every rental you book is an exact multiple of 24 hours — CurRENT does not accept a return time that would create a partial block, such as 50 hours.\n\nThe rental fee is calculated as the daily rental price multiplied by the number of complete 24-hour periods. Choosing a different start time does not change this calculation; it only shifts which clock hour each 24-hour period runs from.",
  },
  {
    category: "About CurRENT",
    question: "Can I rent out my own items?",
    answer:
      "Yes. CurRENT allows eligible individuals and businesses to list items for rental.\n\nLenders must provide accurate item descriptions, photographs, rental prices, estimated item values and delivery information. New listings are submitted for CurRENT's moderation review before publication.\n\nLenders are responsible for recording the item's condition before dispatch, following the agreed delivery arrangements and inspecting the item after its return.\n\nCurRENT charges a 13% lender commission on the rental fee for new bookings.",
  },
  {
    category: "About CurRENT",
    question: "How does CurRENT verify users?",
    answer:
      "CurRENT's proposed verification process involves authorised third-party electronic Know Your Customer (eKYC) providers.\n\nThe current application uses simulated identity verification for demonstration purposes. Newly verified renters begin with a Rental Risk Score of 80, classified as Low Risk.\n\nActual identity verification through a third-party provider would require a future provider integration.",
  },
  {
    category: "About CurRENT",
    question: "What is the CurRENT Rental Risk Score?",
    answer:
      "The CurRENT Rental Risk Score is an internal platform reliability measure ranging from 0 to 100. It is not a consumer credit score.\n\nThe score helps determine booking eligibility and the required refundable security deposit. The risk categories are:\n\n80–100 — Low Risk\n40–79 — Medium Risk\n30–39 — High Risk\n0–29 — Very High Risk\n\nNewly verified renters start with a score of 80. The score may change according to verified rental outcomes, including successful returns and confirmed rental incidents. Very High Risk renters require CurRENT Platform Review before proceeding with a rental.",
  },

  // CATEGORY B. REFUNDABLE SECURITY DEPOSIT
  {
    category: "Refundable Security Deposit",
    question: "What is a refundable security deposit?",
    answer:
      "A refundable security deposit is an amount collected as financial security against verified renter liability. It helps protect lenders if a renter is responsible for damage, loss, failure to return an item or another eligible obligation under the rental terms.\n\nThe deposit is held in simulated escrow during the rental. It is separate from the rental fee, optional Rental Protection premium and delivery charges.\n\nThe deposit is not an insurance policy and is not automatically paid to the lender when an incident occurs. If the rental is completed without outstanding liabilities, the deposit is refunded according to the platform's return confirmation process.",
  },
  {
    category: "Refundable Security Deposit",
    question: "How is my security deposit calculated?",
    answer:
      "CurRENT calculates the deposit using the renter's Rental Risk Score and the item's estimated market value.\n\nLow Risk (80–100) — 5% of item value, capped at RM500\nMedium Risk (40–79) — 10% of item value, capped at RM1,000\nHigh Risk (30–39) — 15% of item value, capped at RM1,500\nVery High Risk (0–29) — Platform Review required\n\nExample: a Low Risk renter wishes to rent a camera with an estimated value of RM4,000. The refundable security deposit is RM4,000 × 5% = RM200.\n\nThe deposit is calculated from the item's estimated value, not the rental fee.",
  },
  {
    category: "Refundable Security Deposit",
    question: "When will my security deposit be refunded?",
    answer:
      "The refundable security deposit is released after the renter completes the return process and the lender confirms that the item has been returned without outstanding issues.\n\nIf a booking is cancelled instead, and a deposit had already been collected, it releases within 5 Malaysia working days of the cancellation being approved (weekends and Malaysia public holidays are not counted) — never on the original scheduled rental end date. If a deposit was never collected because the booking was cancelled before payment, no deposit release applies.\n\nIf a dispute is raised, the simulated deposit may remain on hold while the evidence and liability are assessed. Any amount not legitimately required to settle verified renter liability must be refunded.\n\nCurRENT currently demonstrates escrow holding, release and refund records. No actual funds are held by a real escrow provider.",
  },
  {
    category: "Refundable Security Deposit",
    question: "Can CurRENT deduct my security deposit if an item is damaged?",
    answer:
      "A security deposit deduction may apply if the renter is found responsible for verified damage, loss or another eligible financial obligation under the rental terms.\n\nCurRENT considers the submitted evidence, the cause of the incident and any compensation already approved through insurance or delivery company claims. The lender cannot automatically keep the entire deposit simply because damage has been reported.\n\nIf an insurer or delivery company has already compensated part of the verified loss, the deposit must not be used to compensate that same amount again. Any unused deposit balance must be refunded.",
  },
  {
    category: "Refundable Security Deposit",
    question: "Does the security deposit cover all damage costs?",
    answer:
      "Not necessarily. The security deposit provides financial security up to the amount held. It does not guarantee that all damage costs will be compensated.\n\nIf verified renter liability exceeds the deposit, any remaining obligation depends on the applicable rental terms and dispute outcome.\n\nThe deposit must not automatically be deducted for damage caused by the delivery company, pre-existing defects, ordinary wear and tear or incidents for which the renter is not responsible.",
  },

  // CATEGORY C. OPTIONAL RENTAL PROTECTION
  {
    category: "Optional Rental Protection",
    question: "What is Rental Protection?",
    answer:
      "Rental Protection is an optional, proposed third-party insurance product intended to protect eligible rented items against certain accidental damage risks. Rental Protection is not provided or underwritten by CurRENT.\n\nUnder the proposed arrangement: a third-party insurance company would provide and underwrite the coverage, assess insurance claims and pay compensation for approved claims. CurRENT would facilitate Rental Protection selection, simulated premium collection, claim submission and communication between the relevant parties.\n\nCurRENT does not make insurance coverage decisions or pay insurance compensation. No actual insurance partnership or issued policy has been confirmed. The current Rental Protection feature is a simulation and does not provide real insurance coverage.",
  },
  {
    category: "Optional Rental Protection",
    question: "How much does Rental Protection cost?",
    answer:
      "Rental Protection costs 5% of the total rental fee under CurRENT's proposed demo model.\n\nFor example, if your total rental fee is RM56, the optional protection premium is RM2.80.\n\nThe rental duration is already included in the total rental fee. There is no additional seven-day billing period or minimum protection charge in the demo.\n\nThe protection premium is separate from your refundable security deposit, CurRENT service fee and delivery charges.\n\nUnder the proposed demo terms, the protection fee becomes non-refundable once the protected rental begins, subject to the applicable cancellation conditions. Before the rental begins, any refund depends on those conditions.\n\nThe 5% premium is a simulation assumption, not an actual insurer quotation.",
  },
  {
    category: "Optional Rental Protection",
    question: "What does Rental Protection cover?",
    answer:
      "Rental Protection is a proposed third-party insurance product intended to cover eligible accidental physical damage while a rented item is in the renter's possession.\n\nExamples that may be considered for coverage include accidentally dropping an item or unintentionally damaging it during normal use.\n\nHowever, not every accident is automatically covered.\n\nPossible exclusions include intentional damage, normal wear and tear, pre-existing damage, misuse and other circumstances excluded by the future insurer's policy.\n\nDamage or loss during transportation is handled separately through the applicable delivery company's compensation process under CurRENT's proposed model.\n\nActual coverage and exclusions would depend on the insurance company's policy and claim assessment.\n\nNo real insurance policy has been issued.",
  },
  {
    category: "Optional Rental Protection",
    question: "What is the maximum Rental Protection coverage?",
    answer:
      "CurRENT uses a proposed maximum coverage limit of RM60,000 for demonstration purposes.\n\nThe displayed protection limit is calculated using the item's estimated replacement value, subject to the proposed RM60,000 maximum. For example:\n\nItem Replacement Value RM1,200 → Proposed Protection Limit RM1,200\nItem Replacement Value RM5,000 → Proposed Protection Limit RM5,000\nItem Replacement Value RM30,000 → Proposed Protection Limit RM30,000\nItem Replacement Value RM60,000 → Proposed Protection Limit RM60,000\nItem Replacement Value RM80,000 → Subject to eligibility review, with a proposed maximum of RM60,000\n\nThese amounts represent illustrative coverage ceilings, not guaranteed compensation.\n\nThe insurer would assess the actual eligible loss and determine the approved compensation according to its policy.\n\nNo actual insurer has confirmed the RM60,000 coverage limit.",
  },
  {
    category: "Optional Rental Protection",
    question: "Does Rental Protection cover damage during delivery?",
    answer:
      "Not automatically. Standard optional Rental Protection should not be described as covering damage during transportation unless the eventual third-party insurance policy expressly includes shipping risks.\n\nDamage or loss occurring during delivery should be reported through the applicable delivery company compensation process. Eligible delivery company compensation may be available whether or not the renter purchased optional Rental Protection.\n\nCurRENT helps coordinate the relevant claim but does not guarantee approval or compensation.",
  },
  {
    category: "Optional Rental Protection",
    question: "What happens if I accidentally damage a rented item?",
    answer:
      "If an item is accidentally damaged, report the incident through CurRENT and submit photographs, videos and a description of what happened.\n\nIf you purchased Rental Protection, CurRENT would facilitate the claim submission to the proposed third-party insurance company.\n\nThe insurer would review the evidence, determine whether the incident is covered and pay any approved compensation.\n\nAny remaining verified renter liability may be considered against your refundable security deposit.\n\nIf you did not purchase Rental Protection, your financial responsibility would depend on the verified damage, rental agreement and dispute assessment.\n\nThe lender cannot receive duplicate compensation for the same loss.\n\nAll insurance claim processes currently shown in CurRENT are simulated.",
  },
  {
    category: "Optional Rental Protection",
    question: "What happens if I do not purchase Rental Protection?",
    answer:
      "Rental Protection is optional — you can still rent items without purchasing it.\n\nHowever, if you cause damage or loss and are found responsible, you may be required to pay the verified costs under the applicable rental terms. Your refundable security deposit may be used toward that liability after assessment. If the verified liability exceeds the available deposit, any remaining obligation depends on the rental terms and dispute outcome.\n\nNot purchasing Rental Protection does not automatically make you responsible for damage caused by a delivery company, pre-existing defects or ordinary wear and tear. You can still submit an eligible delivery company compensation claim without purchasing Rental Protection.",
  },
  {
    category: "Optional Rental Protection",
    question: "Who decides whether my Rental Protection claim is approved?",
    answer:
      "Under the proposed arrangement, the third-party insurance company would make the final decision about insurance coverage and compensation. CurRENT would assist with documentation, claim submission and communication.\n\nCurRENT may separately assess platform disputes and refundable security deposit deductions, but CurRENT must not be presented as the insurer or as the party deciding insurance claims.\n\nThe current demo does not provide an active third-party insurance claims service.",
  },
  {
    category: "Optional Rental Protection",
    question: "Can the lender receive both insurance compensation and my security deposit?",
    answer:
      "A lender may receive insurance compensation and an eligible security deposit deduction only when they address different portions of a verified loss. For example:\n\nVerified damage: RM1,000\nApproved insurance compensation: RM800\nRemaining verified damage: RM200\nAvailable security deposit: RM200\n\nIf the remaining RM200 is valid renter liability, up to RM200 of the deposit may be deducted. The lender would receive RM1,000 in total, not RM1,200.\n\nAny deposit amount that is not needed to settle verified renter liability must be refunded.\n\nInsurance compensation is subject to the insurer's approval. An insurance claim rejection does not automatically justify deducting the renter's deposit.",
  },
  {
    category: "Optional Rental Protection",
    question: "Is Rental Protection the same as a refundable security deposit?",
    answer:
      "No. Rental Protection is a proposed third-party insurance product intended to compensate eligible insured damage following an approved claim. The refundable security deposit is money held as financial security against verified renter liability.\n\nRental Protection is optional and has a proposed premium of 5% of the rental fee. The refundable deposit is calculated using the renter's risk level and the item's estimated value.\n\nPurchasing Rental Protection does not remove the requirement to pay the applicable refundable security deposit.",
  },

  // CATEGORY D. RENTAL PROTECTION AND COMPENSATION COMPARISON
  {
    category: "Rental Protection and Compensation Comparison",
    question: "Which situations are covered by Rental Protection, the security deposit or delivery company compensation?",
    answer:
      "Different rental incidents may involve different forms of protection or compensation. The table below illustrates CurRENT's proposed demonstration model — it does not represent an issued insurance policy, confirmed delivery company compensation terms or guaranteed claim outcomes.\n\n\"Potentially covered\" means an insurance claim may be eligible for assessment; it does not guarantee payment. \"May cover\" means the refundable deposit may be considered only after an assessment of verified renter liability. Delivery company compensation depends on the provider's applicable terms, limits, evidence requirements and claim approval.",
    coverageTable: [
      { situation: "Renter accidentally drops and breaks an item", withProtection: "Potentially covered if insurer approves", withoutProtection: "Renter may be responsible for verified damage", deposit: "May cover remaining renter liability", deliveryCompensation: "Not applicable" },
      { situation: "Renter accidentally causes water damage", withProtection: "Depends on insurance policy", withoutProtection: "Renter may be responsible for verified damage", deposit: "May cover verified renter liability", deliveryCompensation: "Not applicable" },
      { situation: "Damage caused by misuse or negligence", withProtection: "Depends on policy exclusions", withoutProtection: "Renter may be responsible if liable", deposit: "May cover verified renter liability", deliveryCompensation: "Not applicable" },
      { situation: "Renter intentionally damages an item", withProtection: "Generally excluded under proposed insurance model", withoutProtection: "Renter may be responsible for damage", deposit: "May cover verified renter liability", deliveryCompensation: "Not applicable" },
      { situation: "Renter loses an item", withProtection: "Only if loss is expressly covered", withoutProtection: "Renter may be responsible if liable", deposit: "May cover verified renter liability", deliveryCompensation: "Not applicable" },
      { situation: "Item is stolen during the rental", withProtection: "Depends on policy and circumstances", withoutProtection: "Liability depends on investigation", deposit: "May apply if renter liability is established", deliveryCompensation: "Not applicable unless courier-related" },
      { situation: "Renter fails to return an item", withProtection: "Not assumed covered", withoutProtection: "Renter may be responsible for resulting loss", deposit: "May cover verified renter liability", deliveryCompensation: "Not applicable" },
      { situation: "Item damaged during delivery to renter", withProtection: "Not automatically covered", withoutProtection: "Delivery claim may still be available", deposit: "Not automatically deductible", deliveryCompensation: "May compensate if claim is approved" },
      { situation: "Item damaged during return delivery", withProtection: "Not automatically covered", withoutProtection: "Delivery claim may still be available", deposit: "Not automatically deductible", deliveryCompensation: "May compensate if claim is approved" },
      { situation: "Delivery company loses the parcel", withProtection: "Not automatically covered", withoutProtection: "Delivery claim may still be available", deposit: "Not automatically deductible", deliveryCompensation: "May compensate if claim is approved" },
      { situation: "Normal wear and tear", withProtection: "Generally excluded", withoutProtection: "Normally no compensation required from renter", deposit: "Normally fully refundable", deliveryCompensation: "Not applicable" },
      { situation: "Pre-existing item damage", withProtection: "Not covered as new rental damage", withoutProtection: "Renter not responsible for pre-existing damage", deposit: "Not deductible from renter", deliveryCompensation: "Only if new courier damage is established" },
      { situation: "Item malfunctions without renter fault", withProtection: "Not automatically covered", withoutProtection: "Renter not responsible if no liability", deposit: "Not deductible from renter", deliveryCompensation: "Only if courier-caused" },
      { situation: "Lender damages item before dispatch", withProtection: "Not covered as renter damage", withoutProtection: "Renter not responsible", deposit: "Not deductible from renter", deliveryCompensation: "Not applicable" },
      { situation: "Late return without physical damage", withProtection: "Not assumed covered", withoutProtection: "Valid late-return charges may apply", deposit: "May address valid obligations under rental terms", deliveryCompensation: "Not applicable" },
      { situation: "Item returned on time in good condition", withProtection: "No claim needed", withoutProtection: "No compensation required", deposit: "Fully refundable", deliveryCompensation: "No claim needed" },
    ],
  },
  {
    category: "Rental Protection and Compensation Comparison",
    question: "What is Delivery Company Compensation, and how does it compare to Rental Protection?",
    answer:
      "Delivery Company Compensation refers to compensation that may be provided by a delivery or courier company when a rented item is damaged or lost during transportation. It is separate from optional Rental Protection — you do not need to purchase Rental Protection to submit an eligible delivery damage or loss claim, but delivery company compensation is not guaranteed.\n\nExample: a camera is damaged while being delivered through GrabExpress (Demo). The renter reports the incident to CurRENT and submits photographs of the damaged camera and packaging. CurRENT helps coordinate the compensation request, and the delivery company assesses the evidence and decides whether compensation is payable under its applicable terms.\n\nAll delivery arrangements and compensation processes in the current CurRENT application are simulated.\n\nExample A — renter purchased Rental Protection: verified damage RM1,000; insurance compensation approved RM800; refundable deposit held RM200; remaining verified damage RM200; possible deposit deduction if renter is liable RM200. Total lender compensation RM1,000 — duplicate compensation is not permitted.\n\nExample B — renter did not purchase Rental Protection: verified damage RM1,000; insurance compensation RM0; refundable deposit held RM200; possible deposit deduction if renter is liable RM200; potential remaining renter liability RM800, which is not automatically charged and depends on the rental terms and dispute assessment.\n\nExample C — delivery company damages the item, no Rental Protection purchased: delivery company compensation is potentially available, subject to approval; the security deposit is not automatically deducted; CurRENT coordinates the report and the applicable claim.",
  },

  // CATEGORY E. DELIVERY AND DELIVERY COMPANY COMPENSATION
  {
    category: "Delivery and Delivery Company Compensation",
    question: "How does CurRENT delivery work?",
    answer:
      "CurRENT supports two simulated delivery arrangements.\n\nLocal Delivery: eligible Klang Valley routes use GrabExpress (Demo). The platform automatically selects a suitable Motorcycle, Car or MPV according to the parcel information and delivery requirements.\n\nCross-State or Out-of-Area Delivery: eligible routes use Domestic Courier (Demo). The shipping estimate considers parcel chargeable weight, dimensions and applicable regional rates.\n\nBoth outbound and return delivery charges are calculated and paid upfront in the simulated checkout. These arrangements do not represent live courier bookings.",
  },
  {
    category: "Delivery and Delivery Company Compensation",
    question: "How are delivery fees calculated?",
    answer:
      "For eligible local delivery routes, CurRENT uses demonstration distance-based pricing and automatically selects a suitable vehicle according to the available parcel information.\n\nFor domestic courier routes, fees are estimated using parcel weight, dimensions, volumetric weight and the applicable destination region. The chargeable weight and regional rate determine the estimated courier fee.\n\nOutbound and return shipping costs are calculated separately and combined into the total two-way delivery charge. Delivery fees are separate from CurRENT's rental service fee and must not automatically be classified as platform revenue.",
  },
  {
    category: "Delivery and Delivery Company Compensation",
    question: "How do cross-state delivery and returns work?",
    answer:
      "For cross-state rentals, CurRENT recommends shipping arrangements according to the rental dates and available courier transit estimates. The lender confirms the outbound dispatch arrangement.\n\nFor returns, the renter securely packages the rented item and drops it off at an eligible courier branch by the agreed return deadline.\n\nEstimated arrival dates are provided only when suitable reference information is available. CurRENT does not guarantee exact courier arrival dates or live tracking. All shipping arrangements are simulated.",
  },
  {
    category: "Delivery and Delivery Company Compensation",
    question: "What happens if a delivery company damages or loses an item?",
    answer:
      "If an item is damaged or lost during transportation, the affected renter or lender can report the incident through CurRENT.\n\nCurRENT helps coordinate a compensation request with the relevant delivery company, such as GrabExpress or J&T Express.\n\nThe delivery company assesses the evidence and decides whether compensation is payable under its terms and applicable liability limits.\n\nCompensation may be limited and is not guaranteed to equal the item's full replacement value.\n\nRenters do not need optional Rental Protection to submit an eligible delivery-related claim.\n\nCourier-caused damage does not automatically justify deducting the renter's security deposit.\n\nCurRENT does not guarantee courier claim approval or pay courier compensation itself.\n\nThese delivery arrangements and claims processes are simulated in the current application.",
  },

  // CATEGORY F. PAYMENTS, FEES AND DISPUTES
  {
    category: "Payments, Fees and Disputes",
    question: "How much does CurRENT charge renters and lenders?",
    answer:
      "Renter Service Fee: 5% of the rental fee, subject to a minimum charge of RM5.\n\nLender Commission: 13% of the rental fee for new bookings. The lender receives the remaining 87% of the rental fee before other separately applicable adjustments. Historical bookings retain the commission rate recorded when the booking was created.\n\nRefundable security deposits, third-party insurance premiums and delivery charges must not automatically be classified as CurRENT revenue.",
  },
  {
    category: "Payments, Fees and Disputes",
    question: "Can I pay using FPX or Buy Now Pay Later (BNPL)?",
    answer:
      "You can complete your payment securely through an authorised payment provider, using FPX or Buy Now Pay Later (BNPL). In the current demo, both payment methods are simulated — no real bank transactions, financing agreements or external provider approvals occur through the demo.\n\nThe selected payment method is reflected consistently in the relevant rental and transaction history records. Actual BNPL eligibility, financing conditions and payment terms would depend on a future authorised provider.",
  },
  {
    category: "Payments, Fees and Disputes",
    question: "When will the lender receive payment?",
    answer:
      "The lender's rental earnings are recorded according to the booking completion and settlement process. For new bookings, CurRENT deducts a 13% commission from the rental fee, and the lender receives 87% of the rental fee before separately applicable adjustments.\n\nPayouts are simulated and recorded in the lender's payout and transaction history. Refundable deposits, delivery charges and proposed third-party insurance premiums are separate from the lender's rental earnings.",
  },
  {
    category: "Payments, Fees and Disputes",
    question: "What happens if a rental dispute occurs?",
    answer:
      "Either party may report an issue involving item condition, damage, loss, return obligations or other rental concerns. CurRENT coordinates the platform dispute process using the available evidence, and the simulated security deposit may remain on hold while the dispute is assessed.\n\nResponsibilities are separated as follows: CurRENT assesses platform-level renter liability and the treatment of the refundable deposit; the proposed third-party insurer would assess insurance claims and decide whether insurance compensation is payable; the delivery company would assess eligible delivery-related compensation requests under its terms.\n\nCurRENT does not act as the insurer and does not guarantee delivery company compensation. The final treatment of the deposit must consider verified liability and any compensation already received — duplicate compensation for the same loss is not permitted.",
  },
  {
    category: "Payments, Fees and Disputes",
    question: "Is CurRENT responsible for paying compensation when something goes wrong?",
    answer:
      "CurRENT acts as a marketplace intermediary and facilitates the appropriate reporting, assessment and claims processes. CurRENT does not automatically pay compensation whenever an item is damaged, lost or stolen.\n\nUnder the proposed service model: the third-party insurer would pay approved insurance compensation; the delivery company would provide any approved compensation under its applicable terms; verified renter liability may be addressed through the refundable security deposit and applicable rental obligations.\n\nCurRENT coordinates platform disputes and the simulated handling of deposits. Whether CurRENT itself has any legal responsibility in a real transaction depends on the applicable law, circumstances and contractual obligations — the demo does not claim CurRENT has no liability under all circumstances.",
  },
  {
    category: "Payments, Fees and Disputes",
    question: "Who is responsible for what — CurRENT, the insurer, the delivery company, renters and lenders?",
    answer:
      "CurRENT: marketplace administration, booking coordination, simulated escrow records, platform disputes and facilitating third-party claims.\n\nThird-Party Insurance Company: insurance coverage decisions, claim assessments and approved insurance compensation.\n\nDelivery Company: delivery operations and eligible compensation requests for shipping damage or loss under its terms.\n\nRenter: proper item use, safeguarding, timely returns and verified renter liability.\n\nLender: accurate listings, item condition evidence, delivery preparation and return inspection.\n\nAll external provider arrangements currently shown in the application are simulated.",
  },
];


const defaultPickupWindows = [
  { start: "10:00", end: "12:00" },
  { start: "14:00", end: "18:00" },
];

const defaultAvailability = [
  { start: "2026-10-01", end: "2026-12-31" },
];

// Exactly 22 Seeded Marketplace Products (Table in Section 3)
export const listings: Listing[] = [
  {
    id: "sony-a7iii",
    ownerId: "owner-aiman",
    title: "Sony A7 III Mirrorless Camera",
    category: "Electronics",
    dailyPrice: 45,
    estimatedValue: 4000,
    ownerEstimatedValue: 4500,
    location: "Petaling Jaya, Selangor",
    publicArea: "Petaling Jaya · SS2",
    privateMeetingVenue: "Block B Lobby, Jaya One, 72A Jalan Universiti, 46200 Petaling Jaya",
    pickupPostcode: "46200",
    // Packaging recorded on the historical Sony demo booking; not inferred from the item title.
    parcelWeightKg: 2,
    parcelDimensionsCm: { length: 35, width: 25, height: 20 },
    deliveryRequirement: "standard",
    rating: 5.0,
    completedRentalsCount: 1,
    verifiedOwner: true,
    imageUrl: "/products/sony-a7iii.jpg",
    images: [
      "/products/sony-a7iii.jpg",
      "/products/sony-thumb-1.jpg",
      "/products/sony-thumb-2.jpg",
      "/products/sony-thumb-3.jpg",
    ],
    description:
      "Full-frame 24.2MP mirrorless camera with 4K HDR recording. Includes 28-70mm lens, 2x batteries, high-speed 128GB SD card, dual charger and padded neck strap.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "portable-projector",
    ownerId: "owner-daniel",
    title: "Portable Projector",
    category: "Electronics",
    dailyPrice: 28,
    estimatedValue: 1200,
    ownerEstimatedValue: 1300,
    location: "Kuala Lumpur",
    publicArea: "Kuala Lumpur · Bukit Bintang",
    privateMeetingVenue: "Lot 10 Concierge, Jalan Sultan Ismail, 50250 Kuala Lumpur",
    pickupPostcode: "50250",
    parcelWeightKg: 3,
    parcelDimensionsCm: { length: 40, width: 30, height: 20 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/portable-projector.jpg",
    images: ["/products/portable-projector.jpg"],
    description:
      "Compact Full HD 1080p smart projector with built-in Harman/Kardon speaker, HDMI/Bluetooth inputs and tripod. Perfect for movie nights, gaming, and presentations.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "ps5-console",
    ownerId: "owner-sarah",
    title: "PlayStation 5 + Gamepad",
    category: "Gaming",
    dailyPrice: 35,
    estimatedValue: 2400,
    ownerEstimatedValue: 2500,
    location: "Subang Jaya, Selangor",
    publicArea: "Subang Jaya · SS15",
    privateMeetingVenue: "Courtyard by Marriott Lobby, Jalan SS 15/4G, 47500 Subang Jaya",
    pickupPostcode: "47500",
    parcelWeightKg: 6,
    parcelDimensionsCm: { length: 50, width: 40, height: 20 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/ps5-console.jpg",
    images: ["/products/ps5-console.jpg"],
    description:
      "PlayStation 5 disc edition console with two DualSense wireless controllers, HDMI 2.1 cable, power cord and 3 pre-installed games. Ideal for weekend gatherings.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "monitor-27",
    ownerId: "owner-daniel",
    title: "27\" Computer Monitor",
    category: "Work & Office",
    dailyPrice: 18,
    estimatedValue: 900,
    ownerEstimatedValue: 1000,
    location: "Kuala Lumpur",
    publicArea: "Kuala Lumpur · Bangsar South",
    privateMeetingVenue: "The Sphere Main Entrance, Jalan Kerinchi, 59200 Kuala Lumpur",
    pickupPostcode: "59200",
    parcelWeightKg: 8,
    parcelDimensionsCm: { length: 75, width: 48, height: 18 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/monitor-27.jpg",
    images: ["/products/monitor-27.jpg"],
    description:
      "27-inch 4K IPS productivity monitor with USB-C 65W power delivery, HDMI and DisplayPort. Ergonomic height-adjustable stand.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "office-chair",
    ownerId: "demo-renter",
    title: "Ergonomic Office Chair",
    category: "Work & Office",
    dailyPrice: 15,
    estimatedValue: 850,
    ownerEstimatedValue: 950,
    location: "Petaling Jaya, Selangor",
    publicArea: "Petaling Jaya · Damansara Uptown",
    privateMeetingVenue: "Starling Mall South Entrance, Jalan SS 21/37, 47400 Petaling Jaya",
    pickupPostcode: "47400",
    parcelWeightKg: 18,
    parcelDimensionsCm: { length: 70, width: 65, height: 50 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/office-chair.jpg",
    images: ["/products/office-chair.jpg"],
    description:
      "High-grade breathable mesh ergonomic desk chair with 3D armrests, dynamic lumbar support and smooth-glide casters.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "pressure-washer",
    ownerId: "owner-aiman",
    title: "Pressure Washer",
    category: "Tools",
    dailyPrice: 35,
    estimatedValue: 1100,
    ownerEstimatedValue: 1200,
    location: "Kuantan, Pahang",
    publicArea: "Kuantan · East Coast Mall",
    privateMeetingVenue: "East Coast Mall Concierge, Kuantan, 25000 Kuantan",
    pickupPostcode: "25000",
    parcelWeightKg: 11,
    parcelDimensionsCm: { length: 55, width: 45, height: 40 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/pressure-washer.jpg",
    images: ["/products/pressure-washer.jpg"],
    description:
      "High-pressure electric washer (140 bar) with 8m hose, foam lance attachment, and adjustable fan nozzle. Perfect for patios and car wash.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "gopro-camera",
    ownerId: "owner-aiman",
    title: "GoPro-style Action Camera",
    category: "Electronics",
    dailyPrice: 30,
    estimatedValue: 1500,
    ownerEstimatedValue: 1600,
    location: "George Town, Pulau Pinang",
    publicArea: "George Town · Gurney Drive",
    privateMeetingVenue: "Gurney Plaza Concierge, George Town, 10000 George Town",
    pickupPostcode: "10000",
    parcelWeightKg: 1,
    parcelDimensionsCm: { length: 22, width: 18, height: 12 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/gopro-camera.jpg",
    images: ["/products/gopro-camera.jpg"],
    description:
      "Waterproof 4K action camera with HyperSmooth stabilization, floating hand grip, chest mount, 2 extra batteries and protective casing.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "party-speaker",
    ownerId: "demo-renter",
    title: "Portable Party Speaker",
    category: "Electronics",
    dailyPrice: 40,
    estimatedValue: 1000,
    ownerEstimatedValue: 1100,
    location: "Mont Kiara, Kuala Lumpur",
    publicArea: "Mont Kiara · Solaris",
    privateMeetingVenue: "1 Mont Kiara Main Foyer, 1 Jalan Kiara, 50480 Kuala Lumpur",
    pickupPostcode: "50480",
    parcelWeightKg: 9,
    parcelDimensionsCm: { length: 45, width: 35, height: 35 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/party-speaker.jpg",
    images: ["/products/party-speaker.jpg"],
    description:
      "100W wireless outdoor party speaker with dynamic LED lights, bass boost, IPX4 splashproof rating and up to 12 hours playtime.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    featuredUntil: "2026-11-01T00:00:00Z",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "drone",
    ownerId: "owner-aiman",
    title: "Drone",
    category: "Electronics",
    dailyPrice: 80,
    estimatedValue: 3500,
    ownerEstimatedValue: 3800,
    location: "Kuala Lumpur",
    publicArea: "Kuala Lumpur · TTDI",
    privateMeetingVenue: "Menara Ken TTDI Lobby, 37 Jalan Burhanuddin Helmi, 60000 Kuala Lumpur",
    pickupPostcode: "60000",
    parcelWeightKg: 3,
    parcelDimensionsCm: { length: 42, width: 32, height: 22 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/drone.jpg",
    images: ["/products/drone.jpg"],
    description:
      "Foldable 4K HDR camera drone with 3-axis gimbal, 31-min flight time, obstacle sensing, remote controller and 2 intelligent flight batteries.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "luxury-handbag",
    ownerId: "owner-sarah",
    title: "Designer Luxury Handbag",
    category: "Luxury",
    dailyPrice: 120,
    estimatedValue: 5000,
    ownerEstimatedValue: 5500,
    location: "Petaling Jaya, Selangor",
    publicArea: "Petaling Jaya · Bandar Utama",
    privateMeetingVenue: "1 Utama Old Wing Concierge, 1 Lebuh Bandar Utama, 47800 Petaling Jaya",
    pickupPostcode: "47800",
    parcelWeightKg: 2,
    parcelDimensionsCm: { length: 45, width: 35, height: 20 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/luxury-handbag.jpg",
    images: ["/products/luxury-handbag.jpg"],
    description:
      "Authentic quilted caviar leather handbag with gold-tone metal hardware, chain strap and certificate of authenticity card.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "luxury-watch",
    ownerId: "owner-daniel",
    title: "Luxury Watch",
    category: "Luxury",
    dailyPrice: 100,
    estimatedValue: 6000,
    ownerEstimatedValue: 6500,
    location: "Mont Kiara, Kuala Lumpur",
    publicArea: "Mont Kiara · Publika",
    privateMeetingVenue: "Publika Mall West Gate, 1 Jalan Dutamas 1, 50480 Kuala Lumpur",
    pickupPostcode: "50480",
    parcelWeightKg: 0.7,
    parcelDimensionsCm: { length: 25, width: 20, height: 15 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/luxury-watch.jpg",
    images: ["/products/luxury-watch.jpg"],
    description:
      "Swiss-made automatic chronograph with stainless steel oyster bracelet, black ceramic bezel, sapphire crystal and presentation box.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "luxury-necklace",
    ownerId: "owner-sarah",
    title: "Designer Luxury Necklace",
    category: "Luxury",
    dailyPrice: 90,
    estimatedValue: 4500,
    ownerEstimatedValue: 4800,
    location: "Petaling Jaya, Selangor",
    publicArea: "Petaling Jaya · Sunway Giza",
    privateMeetingVenue: "Sunway Giza Mall Center Court, Jalan PJU 5/14, 47810 Petaling Jaya",
    pickupPostcode: "47810",
    parcelWeightKg: 0.5,
    parcelDimensionsCm: { length: 22, width: 16, height: 10 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/luxury-necklace.jpg",
    images: ["/products/luxury-necklace.jpg"],
    description:
      "18K gold pendant necklace with brilliant-cut diamond accents, adjustable delicate cable chain and velvet travel pouch.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "standing-air-cooler",
    ownerId: "owner-daniel",
    title: "Standing Air Cooler",
    category: "Household",
    dailyPrice: 45,
    estimatedValue: 800,
    ownerEstimatedValue: 900,
    location: "Seremban, Negeri Sembilan",
    publicArea: "Seremban · Terminal One",
    privateMeetingVenue: "Terminal One Seremban Concierge, Seremban, 70000 Seremban",
    pickupPostcode: "70000",
    parcelWeightKg: 12,
    parcelDimensionsCm: { length: 55, width: 40, height: 95 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/standing-air-cooler.jpg",
    images: ["/products/standing-air-cooler.jpg"],
    description:
      "Heavy-duty 45L evaporative air cooler with 3 fan speeds, auto oscillation, ice compartment and 4 smooth rolling wheels.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "microwave",
    ownerId: "owner-sarah",
    title: "Microwave",
    category: "Household",
    dailyPrice: 12,
    estimatedValue: 400,
    ownerEstimatedValue: 450,
    location: "Bandar Sunway, Selangor",
    publicArea: "Bandar Sunway · PJS 9",
    privateMeetingVenue: "Sunway Geo Avenue Lobby, Jalan Lagoon Selatan, 47500 Subang Jaya",
    pickupPostcode: "47500",
    parcelWeightKg: 14,
    parcelDimensionsCm: { length: 60, width: 48, height: 40 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/microwave.jpg",
    images: ["/products/microwave.jpg"],
    description:
      "23L countertop solo microwave oven with quick defrost function, ceramic enamel interior, and LED touch controls.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "tabletop-oven",
    ownerId: "owner-aiman",
    title: "Tabletop Oven",
    category: "Household",
    dailyPrice: 15,
    estimatedValue: 500,
    ownerEstimatedValue: 550,
    location: "Kuching, Sarawak",
    publicArea: "Kuching · The Spring",
    privateMeetingVenue: "The Spring Kuching Concierge, Kuching, 93000 Kuching",
    pickupPostcode: "93000",
    parcelWeightKg: 12,
    parcelDimensionsCm: { length: 55, width: 48, height: 38 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/tabletop-oven.jpg",
    images: ["/products/tabletop-oven.jpg"],
    description:
      "38L convection toaster oven with rotisserie spit, baking tray, wire rack, crumb tray and 6 heating mode dials.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "fishing-rod-set",
    ownerId: "owner-aiman",
    title: "Fishing Rod Set",
    category: "Outdoors",
    dailyPrice: 20,
    estimatedValue: 600,
    ownerEstimatedValue: 650,
    location: "Johor Bahru, Johor",
    publicArea: "Johor Bahru · KSL City",
    privateMeetingVenue: "KSL City Mall Concierge, Johor Bahru, 80000 Johor Bahru",
    pickupPostcode: "80000",
    parcelWeightKg: 4,
    parcelDimensionsCm: { length: 130, width: 20, height: 18 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/fishing-rod-set.jpg",
    images: ["/products/fishing-rod-set.jpg"],
    description:
      "2-piece carbon fiber spinning rod with smooth reel, braided line, tackle box with hooks and lures, and carry rod bag.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "camping-tent",
    ownerId: "demo-renter",
    title: "Camping Tent",
    category: "Outdoors",
    dailyPrice: 35,
    estimatedValue: 1200,
    ownerEstimatedValue: 1300,
    location: "Johor Bahru, Johor",
    publicArea: "Johor Bahru · Taman Pelangi",
    privateMeetingVenue: "Paradigm Mall JB Concierge, Johor Bahru, 80000 Johor Bahru",
    pickupPostcode: "80000",
    parcelWeightKg: 6,
    parcelDimensionsCm: { length: 70, width: 28, height: 28 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/camping-tent.jpg",
    images: ["/products/camping-tent.jpg"],
    description:
      "Spacious 4-person waterproof dome tent with double rainfly, ground sheet, peg set, and 2 folding camp chairs. Quick 10-minute setup.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "power-station",
    ownerId: "owner-daniel",
    title: "Portable Power Station",
    category: "Outdoors",
    dailyPrice: 50,
    estimatedValue: 2200,
    ownerEstimatedValue: 2400,
    location: "Kota Kinabalu, Sabah",
    publicArea: "Kota Kinabalu · Imago",
    privateMeetingVenue: "Imago Shopping Mall Concierge, Kota Kinabalu, 88000 Kota Kinabalu",
    pickupPostcode: "88000",
    parcelWeightKg: 10,
    parcelDimensionsCm: { length: 45, width: 35, height: 30 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/power-station.jpg",
    images: ["/products/power-station.jpg"],
    description:
      "512Wh LiFePO4 portable battery power station with 500W pure sine wave AC outlets, 65W USB-C PD, and car charging cable.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "led-lighting-kit",
    ownerId: "owner-sarah",
    title: "LED Event Lighting Kit",
    category: "Event Gear",
    dailyPrice: 45,
    estimatedValue: 1500,
    ownerEstimatedValue: 1700,
    location: "Melaka, Melaka",
    publicArea: "Melaka · Dataran Pahlawan",
    privateMeetingVenue: "Dataran Pahlawan Melaka Mega Mall Concierge, Melaka, 75000 Melaka",
    pickupPostcode: "75000",
    parcelWeightKg: 15,
    parcelDimensionsCm: { length: 65, width: 45, height: 35 },
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/led-lighting-kit.jpg",
    images: ["/products/led-lighting-kit.jpg"],
    description:
      "Set of 4 RGB wireless uplights with infrared remote, DMX cables, battery-powered and adjustable color temperatures for weddings and gigs.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
  {
    id: "photo-booth",
    ownerId: "owner-daniel",
    title: "Photo Booth Setup",
    category: "Event Gear",
    dailyPrice: 100,
    estimatedValue: 4000,
    ownerEstimatedValue: 4400,
    location: "Ipoh, Perak",
    publicArea: "Ipoh · Greentown",
    privateMeetingVenue: "Ipoh Parade Concierge, Ipoh, 30000 Ipoh",
    pickupPostcode: "30000",
    // Ships as two separate packages; each priced independently by the courier quote and combined.
    parcelPackages: [
      { weightKg: 20, dimensionsCm: { length: 85, width: 50, height: 40 } },
      { weightKg: 15, dimensionsCm: { length: 65, width: 50, height: 35 } },
    ],
    rating: 0,
    completedRentalsCount: 0,
    verifiedOwner: true,
    imageUrl: "/products/photo-booth.jpg",
    images: ["/products/photo-booth.jpg"],
    description:
      "Ring light tablet booth stand with adjustable height, wireless dye-sublimation mini printer, fun party prop set and tension fabric backdrop.",
    collectionMethods: ["Delivery Only"],
    status: "published",
    availabilityPeriods: defaultAvailability,
    pickupTimeWindows: defaultPickupWindows,
  },
];

export const rentals: Rental[] = [
  {
    id: "rental-1001",
    listingId: "sony-a7iii",
    listingTitle: "Sony A7 III Mirrorless Camera",
    startDate: "2026-10-12",
    endDate: "2026-10-14",
    status: "active",
    amount: 95.0,
  },
  {
    id: "rental-1002",
    listingId: "ps5-console",
    listingTitle: "PlayStation 5 + Gamepad",
    startDate: "2026-10-25",
    endDate: "2026-10-27",
    status: "upcoming",
    amount: 75.0,
  },
];
