/**
 * Mitti2Market — Official Terms & Conditions and Platform Governance
 * Defines role-specific legal, compliance, operational, and privacy guidelines
 * for Farmers and Businesses participating in the agricultural marketplace.
 */

export const TERMS_LAST_UPDATED = 'September 2026';
export const TERMS_VERSION = 'v2.4';

export const FARMER_TERMS = {
  role: 'farmer',
  title: 'Terms & Conditions and Code of Conduct',
  subtitle: 'Direct Agricultural Trade, Identity Verification, and Platform Security',
  summaryBadges: [
    { label: 'Direct Fair Trade', icon: '🌾' },
    { label: 'Govt. KYC Verification', icon: '🛡️' },
    { label: 'Guaranteed Escrow Payout', icon: '💰' },
    { label: 'Data Privacy Protected', icon: '🔒' },
  ],
  summaryPoints: [
    {
      category: '1. Rules & Fair Trading',
      detail: 'Direct farmer-to-buyer transactions with transparent price discovery and zero middlemen exploitation. Collusion, artificial price rigging, or off-platform deal side-stepping is strictly prohibited.',
    },
    {
      category: '2. Farmer Responsibilities',
      detail: 'Accurate produce grading, transparent harvest quantity, honest moisture/quality disclosures, and timely handover for logistics pickup as agreed in Deal Locks.',
    },
    {
      category: '3. Mandatory Document Verification',
      detail: 'Submission of valid government-issued Aadhaar, land cultivation proof (or Kisan ID), and verified bank passbook for direct bank transfer (DBT). Forged documents result in immediate permanent banning and legal referral.',
    },
    {
      category: '4. Privacy & Data Protection',
      detail: 'In strict compliance with the Digital Personal Data Protection (DPDP) Act. All documents and identity numbers are encrypted, never sold to third parties, and GPS coordinates are used strictly for logistics distance calculation.',
    },
    {
      category: '5. Platform Usage & Escrow',
      detail: 'Buyer funds are secured in escrow before dispatch. Payout is released directly to your verified bank account upon delivery confirmation. Fair platform dispute arbitration protects both parties.',
    },
  ],
  sections: [
    {
      id: 'rules',
      title: '1. Platform Rules & Code of Conduct',
      clauses: [
        {
          heading: '1.1 Direct Producer Engagement',
          body: 'Mitti2Market operates as an open, direct marketplace connecting genuine cultivators, farmers, and Farmer Producer Organizations (FPOs) with commercial buyers. Users must participate under their genuine identity without proxy brokers or unauthorized middlemen.',
        },
        {
          heading: '1.2 Fair Pricing and Anti-Collusion',
          body: 'All produce pricing and offer acceptances must reflect fair market intentions. Artificial price rigging, coordinated bid suppression, or deceptive price negotiation violates platform rules and will result in transaction cancellation and profile suspension.',
        },
        {
          heading: '1.3 Non-Circumvention',
          body: 'Deals initiated, negotiated, or matched via the Mitti2Market platform must be concluded and settled through the platform escrow mechanism. Circumventing the platform to avoid escrow protections deprives both parties of dispute resolution and default indemnity.',
        },
      ],
    },
    {
      id: 'responsibilities',
      title: '2. Farmer Responsibilities & Quality Commitments',
      clauses: [
        {
          heading: '2.1 Produce Representation & Grading',
          body: 'Farmers are responsible for the truthful representation of produce listings, including crop variety, grade (Grade A, B, C), moisture content, harvest date, and packaging condition. Sample photos uploaded must represent the actual lot.',
        },
        {
          heading: '2.2 Fulfillment & Timely Handover',
          body: 'Upon accepting a Deal Lock or Purchase Order, the farmer must prepare, pack, and make the lot available for inspection/dispatch within the agreed fulfillment schedule.',
        },
        {
          heading: '2.3 Lawful Ownership',
          body: 'The farmer warrants that they hold lawful agricultural cultivation rights or harvest ownership for all commodities offered on the marketplace, free from third-party liens or encumbrances.',
        },
      ],
    },
    {
      id: 'verification',
      title: '3. Document Verification & KYC Compliance',
      clauses: [
        {
          heading: '3.1 Mandatory Verification Documents',
          body: 'To safeguard the agricultural network against fraudulent operators, every farmer must provide: (a) Government-issued Aadhaar number and clear document photo, (b) Land record proof (7/12 extract, Khasra/Khatauni, Patta, or Kisan Credit Card), and (c) Bank passbook or cancelled cheque with valid IFSC for direct payouts.',
        },
        {
          heading: '3.2 Administrative Review Protocol',
          body: 'Submitted documents undergo rigorous administrative review within 24 to 48 hours. If an uploaded document is blurry, incomplete, or expired, an administrator will issue a re-upload request with specific guidance.',
        },
        {
          heading: '3.3 Zero-Tolerance Policy on Falsification',
          body: 'Any submission of altered, counterfeit, or forged identity documents, land records, or bank details constitutes a criminal offence. Such accounts will be instantly terminated, blacklisted across the platform, and reported to relevant agricultural regulatory and cyber law enforcement authorities.',
        },
      ],
    },
    {
      id: 'privacy',
      title: '4. Privacy, Security & Data Protection',
      clauses: [
        {
          heading: '4.1 DPDP Act & Data Minimization',
          body: 'Mitti2Market strictly adheres to the Digital Personal Data Protection (DPDP) Act and Indian IT regulations. Personal information, Aadhaar numbers, and financial details are collected exclusively for mandatory KYC validation, legal compliance, and payout execution.',
        },
        {
          heading: '4.2 Encryption & Access Control',
          body: 'All supporting documents uploaded to Cloudinary/local storage are secured with encrypted transmission (TLS/HTTPS) and restricted-access storage. Only authorized KYC review officers have permission to view your documents.',
        },
        {
          heading: '4.3 Geolocation & Device Data',
          body: 'Farm GPS coordinates captured during registration are strictly utilized for logistics route optimization, transport cost estimation, and nearby Mandi distance intelligence. Geolocation is never monetized or shared with third-party advertisers.',
        },
      ],
    },
    {
      id: 'usage',
      title: '5. Platform Usage, Escrow Payouts & Dispute Arbitration',
      clauses: [
        {
          heading: '5.1 Escrow Payout Guarantee',
          body: 'Mitti2Market protects farmers by requiring buyers to lock 100% of order funds in escrow prior to dispatch. Once produce is delivered and passes the standard arrival inspection window (maximum 24 hours), payout is automatically transferred to the verified bank account.',
        },
        {
          heading: '5.2 Cancellation & Penalty Clauses',
          body: 'Unilateral cancellation of an active deal after dispatch without legitimate agricultural force majeure causes operational losses and will incur platform demerit points and potential suspension.',
        },
        {
          heading: '5.3 Dispute Resolution',
          body: 'In the event of a quality or weight discrepancy upon delivery, the platform facilitates an impartial dispute resolution protocol supported by uploaded photographic evidence and weighing slips.',
        },
      ],
    },
  ],
};

export const BUSINESS_TERMS = {
  role: 'business',
  title: 'Terms & Conditions and Governance for Commercial Buyers',
  subtitle: 'Commercial Sourcing, Verification Standards, Escrow Compliance, and Fair Settlement',
  summaryBadges: [
    { label: 'Verified Sourcing', icon: '🏢' },
    { label: 'GSTIN & PAN Validated', icon: '📋' },
    { label: '100% Escrow Protection', icon: '🛡️' },
    { label: 'Commercial Transparency', icon: '⚖️' },
  ],
  summaryPoints: [
    {
      category: '1. Commercial Procurement Rules',
      detail: 'Institutional buyers, food processors, retail chains, and exporters must conduct commercial trades in good faith. False purchase orders or bad-faith bidding will lead to account cancellation and forfeiture of trade deposits.',
    },
    {
      category: '2. Buyer Responsibilities',
      detail: 'Timely fund locking in escrow, transparent lot inspection upon arrival (completed within 24 hours of delivery), and prompt approval of payment release to the cultivator.',
    },
    {
      category: '3. Mandatory Enterprise Verification',
      detail: 'Submission of valid 15-digit GSTIN, Business PAN Card, and proof of commercial incorporation (CIN/Trade License). All accounts must have an authorized contact person.',
    },
    {
      category: '4. Trade Privacy & Commercial Confidentiality',
      detail: 'Proprietary procurement volumes, pricing contracts, and banking information are encrypted and protected under commercial non-disclosure and DPDP standards.',
    },
    {
      category: '5. Platform Usage & Settlement Governance',
      detail: 'Legally binding deal commitments, mandatory escrow funding, objective grading inspection standards, and platform-mediated dispute arbitration.',
    },
  ],
  sections: [
    {
      id: 'rules',
      title: '1. Commercial Procurement Code & Rules',
      clauses: [
        {
          heading: '1.1 Authorized Commercial Participation',
          body: 'Only verified enterprises, agricultural processors, wholesale distributors, retailers, and exporters registered under applicable Indian commercial laws may operate as Business accounts on Mitti2Market.',
        },
        {
          heading: '1.2 Good-Faith Contracting',
          body: 'Every purchase requirement, negotiation offer, and deal lock entered on the platform represents a legally binding commercial commitment. Speculative bids or unbacked offers intended to manipulate pricing are strictly forbidden.',
        },
        {
          heading: '1.3 Non-Circumvention of Farmers',
          body: 'Business buyers agreed not to solicit, divert, or engage in off-platform direct transactions with farmers first introduced via the Mitti2Market platform for a period of 12 months following deal inception, preserving the network integrity.',
        },
      ],
    },
    {
      id: 'responsibilities',
      title: '2. Buyer Responsibilities & Inspection Standards',
      clauses: [
        {
          heading: '2.1 Escrow Deposit & Payment Commitment',
          body: 'Before lot dispatch, the buyer must ensure full deal consideration is deposited into the secured platform escrow holding. Dispatch cannot occur without active escrow confirmation.',
        },
        {
          heading: '2.2 Arrival Lot Inspection Window',
          body: 'The buyer is entitled and obligated to inspect the delivered produce within twenty-four (24) hours of arrival at the designated delivery depot. If no formal dispute is logged within 24 hours with photographic evidence, acceptance is deemed complete and escrow funds are disbursed to the farmer.',
        },
        {
          heading: '2.3 Objective Quality Verification',
          body: 'Any quality dispute must reference the original agreed lot specifications (grade, moisture, physical damage). Unsubstantiated price renegotiations after dispatch are grounds for buyer rating downgrade and escrow enforcement.',
        },
      ],
    },
    {
      id: 'verification',
      title: '3. Business Verification & Statutory Compliance',
      clauses: [
        {
          heading: '3.1 Mandatory Enterprise Documentation',
          body: 'Businesses must furnish: (a) Valid 15-character GSTIN registration certificate, (b) Entity PAN card, (c) Certificate of Incorporation, MSME certificate, or FSSAI license (for food processors), and (d) Identity credential of the authorized procurement signatory.',
        },
        {
          heading: '3.2 Statutory Tax & Invoicing Compliance',
          body: 'All purchases must adhere to applicable GST, Mandi tax/cess, and agricultural marketing committee regulations. Automated tax invoices and delivery challans generated on the platform reflect legal trade compliance.',
        },
        {
          heading: '3.3 Liability for Commercial Default',
          body: 'Providing falsified GSTIN credentials, dormant business registrations, or fictitious trading entities incurs civil liability and criminal prosecution under fraud and tax evasion provisions.',
        },
      ],
    },
    {
      id: 'privacy',
      title: '4. Privacy, Confidentiality & Trade Security',
      clauses: [
        {
          heading: '4.1 Commercial Confidentiality',
          body: 'Enterprise procurement volumes, customized pricing terms, and corporate financial details are treated as confidential trade secrets and will not be disclosed to market competitors.',
        },
        {
          heading: '4.2 Enterprise Data Protection',
          body: 'All business entity documentation and transaction logs are encrypted in transit and at rest, complying with standard data security protocols and Indian IT security rules.',
        },
        {
          heading: '4.3 Location & Logistics Tracking',
          body: 'Warehouse addresses and unloading hub GPS coordinates are used exclusively for multimodal freight routing, turn-around scheduling, and transit safety.',
        },
      ],
    },
    {
      id: 'usage',
      title: '5. Platform Usage, Escrow Settlement & Dispute Resolution',
      clauses: [
        {
          heading: '5.1 Escrow Release Protocol',
          body: 'Platform escrow is released to the seller upon: (a) explicit delivery sign-off by buyer, or (b) expiry of the 24-hour inspection window without active dispute. Funds cannot be unilaterally withheld by the buyer once inspection criteria are met.',
        },
        {
          heading: '5.2 Arbitration & Return Logistics',
          body: 'If lot rejection is substantiated by platform arbitration (e.g. major moisture damage or wrong variety), the seller is liable for return logistics and buyer escrow is returned within 48 banking hours.',
        },
        {
          heading: '5.3 Account Sanctions & Termination',
          body: 'Unreasonable order rejections, non-responsive inspection periods, or payment fraud will result in immediate buyer suspension, security deposit forfeiture, and reporting to trade credit agencies.',
        },
      ],
    },
  ],
};
