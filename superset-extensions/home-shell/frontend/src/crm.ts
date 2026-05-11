// CRM (Customer Readiness Metric) content layer.
//
// The underlying segmentation is the same Living Conditions Approach (LCA)
// classification served by the backend (R1–R4 / U1–U3). On top of that we
// overlay the FSP-facing CRM framing used by SBC Labs / Swadhaar:
//
//   • Readiness tiers   — group segments by FSP entry strategy
//   • Readiness pillars — Need / Access / Slack ratings per segment
//   • Product hypothesis — lead product per segment
//   • Channel ladder    — sequenced channel activation for each segment
//
// All copy here is presentational. The backend continues to expose neutral
// LCA data; the labels and groupings here translate that into CRM language
// when shown to FSP users.

import { SegmentCode } from './nav';

export type Tier = 1 | 2 | 3 | 4;

export interface TierMeta {
  tier: Tier;
  label: string;
  tagline: string;
  members: SegmentCode[];
  badgeColor: string;
  badgeBg: string;
  chip: string;
}

export const TIER_META: Record<Tier, TierMeta> = {
  1: {
    tier: 1,
    label: 'Tier 1 · Direct FSP uptake',
    tagline: 'Ready for direct sale of credit, savings and discretionary insurance.',
    members: ['R1', 'U3'],
    badgeColor: '#065f46',
    badgeBg: '#d1fae5',
    chip: '#10b981',
  },
  2: {
    tier: 2,
    label: 'Tier 2 · Welfare bridge',
    tagline: 'Activate via SHG / welfare ecosystem — JLG, micro-savings, embedded insurance.',
    members: ['R2', 'U2'],
    badgeColor: '#1e3a8a',
    badgeBg: '#dbeafe',
    chip: '#3b82f6',
  },
  3: {
    tier: 3,
    label: 'Tier 3 · Protection entry',
    tagline: 'Lead with protection (PMJJBY / PMSBY / Ayushman top-up) before credit.',
    members: ['R4', 'U1'],
    badgeColor: '#92400e',
    badgeBg: '#fef3c7',
    chip: '#f59e0b',
  },
  4: {
    tier: 4,
    label: 'Tier 4 · System linkage precondition',
    tagline: 'Public-system linkage required before any FSP product can land.',
    members: ['R3'],
    badgeColor: '#9d174d',
    badgeBg: '#fce7f3',
    chip: '#ec4899',
  },
};

export type Rating = 'High' | 'Med' | 'Low';

export interface ReadinessPillar {
  rating: Rating;
  note: string;
}

export interface SegmentBrief {
  code: SegmentCode;
  name: string;          // FSP-facing segment name
  persona: string;       // 1-line persona description
  overview: string;      // 3–5 sentence narrative for the profile hero
  tier: Tier;
  // Three-pillar readiness profile.
  readiness: { need: ReadinessPillar; access: ReadinessPillar; slack: ReadinessPillar };
  product: { headline: string; body: string };
  channel: { headline: string; body: string };
  // Sequenced channel activation ladder. Steps are short labels rendered as
  // a horizontal stepper on the segment profile. Names are SRLM ecosystem
  // and FSP touchpoints (ASHA, FPS, CSC, BC Sakhi, SHG, JLG, PMJJBY, etc.).
  channelLadder: string[];
}

export const SEGMENT_BRIEF: Record<SegmentCode, SegmentBrief> = {
  R1: {
    code: 'R1',
    name: 'Connected, asset-rich rural',
    persona: 'Diversified-income rural households with smartphone, regular bank use, owned assets.',
    overview:
      'R1 households sit at the top of the rural readiness ladder in Bihar, MP and Jharkhand. They typically have a regular bank account, an active smartphone, and at least one durable asset (car, two-wheeler or pucca dwelling). Discretionary consumption is observable in their basket. They are the most direct FSP target in rural geographies — credit, savings and discretionary insurance can be sold to them without a welfare intermediary.',
    tier: 1,
    readiness: {
      need: { rating: 'Med', note: 'Existing bank linkages; demand is for product depth, not access.' },
      access: { rating: 'High', note: 'Internet, mobile, bank — all infrastructure present.' },
      slack: { rating: 'High', note: 'Discretionary spend room visible in MPCE.' },
    },
    product: {
      headline: 'Lead with credit and discretionary insurance',
      body: 'Personal loans, two-wheeler / consumer durable EMI, term life and motor insurance can be sold direct. Cross-sell mutual fund SIPs through digital onboarding.',
    },
    channel: {
      headline: 'Direct digital + agent network',
      body: 'BC Sakhi for cash-in / cash-out support, app-based onboarding for credit and insurance. Branch visits used for high-ticket products only.',
    },
    channelLadder: ['Digital app', 'BC Sakhi', 'Branch (high-ticket)', 'Bancassurance'],
  },
  R2: {
    code: 'R2',
    name: 'Digitally engaged rural',
    persona: 'Mobile-active rural households with bank linkage but limited asset depth.',
    overview:
      'R2 households are present on digital channels and have ration card / Jan Dhan linkages, but lack the asset depth of R1. They are typical SHG and JLG members. The right approach is to ride existing welfare infrastructure: extend SHG-linked credit, layer micro-savings and embedded micro-insurance, and use the SRLM ecosystem to activate.',
    tier: 2,
    readiness: {
      need: { rating: 'High', note: 'Working-capital gaps for petty trade and agri inputs.' },
      access: { rating: 'Med', note: 'Mobile present; intermittent connectivity; SHG linkage in place.' },
      slack: { rating: 'Med', note: 'Some surplus visible after food and fuel.' },
    },
    product: {
      headline: 'JLG credit + embedded micro-insurance',
      body: 'Group-liability working-capital loans through the SRLM ecosystem; bundle PMJJBY / PMSBY at disbursement. Offer recurring deposits via BC Sakhi.',
    },
    channel: {
      headline: 'SHG → SRLM → BC Sakhi',
      body: 'Activate at the SHG meeting; route applications via SRLM block coordinator; cash-in / cash-out via BC Sakhi.',
    },
    channelLadder: ['SHG meeting', 'SRLM block', 'BC Sakhi', 'JLG loan', 'PMJJBY add-on'],
  },
  R3: {
    code: 'R3',
    name: 'Low-connectivity rural — system linkage precondition',
    persona: 'Off-grid rural households without internet, often without complete welfare linkage.',
    overview:
      'R3 households lack reliable connectivity and digital footprint. Many do not yet have full welfare linkage (Aadhaar seeding, Jan Dhan, Ayushman). Direct FSP products will not land. Treat this segment as a system-linkage precondition: partner with ASHA, FPS and CSC to first complete welfare onboarding, then layer protection products through BC Sakhi.',
    tier: 4,
    readiness: {
      need: { rating: 'High', note: 'Highest exposure to health and crop shocks; lowest cushion.' },
      access: { rating: 'Low', note: 'No internet; intermittent feature-phone access only.' },
      slack: { rating: 'Low', note: 'Subsistence consumption; no observable surplus.' },
    },
    product: {
      headline: 'Protection only — after welfare linkage',
      body: 'Once Aadhaar / Jan Dhan / Ayushman are in place, lead with PMJJBY, PMSBY and Ayushman top-up. Defer credit until R3 → R2 transition.',
    },
    channel: {
      headline: 'Public ecosystem first, FSP second',
      body: 'Use ASHA worker for outreach, Fair Price Shop (FPS) as anchor location, Common Service Centre (CSC) for digitisation, then BC Sakhi for product activation.',
    },
    channelLadder: ['ASHA', 'FPS', 'CSC', 'BC Sakhi', 'PMJJBY / PMSBY'],
  },
  R4: {
    code: 'R4',
    name: 'Most constrained rural — protection entry',
    persona: 'Largest rural segment; minimal digital, asset-poor, dependent on welfare.',
    overview:
      'R4 is the largest rural segment in the focus states. Households are asset-poor, have limited digital activity, and rely heavily on PDS and welfare transfers. They are typically banked (Jan Dhan) but have shallow product use. Lead with protection — accident, life and health micro-insurance — before any credit.',
    tier: 3,
    readiness: {
      need: { rating: 'High', note: 'High health-expenditure stress; high female-headed share.' },
      access: { rating: 'Med', note: 'Jan Dhan present; limited mobile internet.' },
      slack: { rating: 'Low', note: 'No discretionary surplus.' },
    },
    product: {
      headline: 'Protection-first, then nano-savings',
      body: 'Bundle PMJJBY + PMSBY at the BC Sakhi touchpoint. Layer recurring micro-savings via Jan Dhan. Defer credit until protection adoption is established.',
    },
    channel: {
      headline: 'BC Sakhi led, FPS / SHG anchored',
      body: 'BC Sakhi as primary FSP face; Fair Price Shop as anchor location; SHG meeting for trust-building. Ayushman card as service hook.',
    },
    channelLadder: ['FPS', 'SHG', 'BC Sakhi', 'PMJJBY / PMSBY', 'Jan Dhan RD'],
  },
  U1: {
    code: 'U1',
    name: 'Most constrained urban — protection entry',
    persona: 'Urban informal-sector households; casual labour, low asset base, mobile-present.',
    overview:
      'U1 households are urban informal-sector workers — daily wage, casual labour, street vending. They are mobile-present but asset-poor and exposed to income volatility. They are reachable through CSCs and BC outlets in basti areas, and through the urban PDS shop. Lead with protection and short-cycle savings before credit.',
    tier: 3,
    readiness: {
      need: { rating: 'High', note: 'Income volatility; no formal social security.' },
      access: { rating: 'Med', note: 'Mobile present; bank account often dormant.' },
      slack: { rating: 'Low', note: 'Low margin between income and consumption.' },
    },
    product: {
      headline: 'Micro-insurance + flexible savings',
      body: 'PMJJBY / PMSBY at point of bank reactivation. Flexible-deposit products for income-smoothing. Micro-credit only after savings track record.',
    },
    channel: {
      headline: 'Urban CSC + BC outlet',
      body: 'Common Service Centre (CSC) for onboarding, BC outlet in basti for daily transactions, urban PDS shop as awareness anchor.',
    },
    channelLadder: ['Urban PDS', 'CSC', 'BC outlet', 'PMJJBY / PMSBY', 'Flexible RD'],
  },
  U2: {
    code: 'U2',
    name: 'Digitally engaged urban',
    persona: 'Urban semi-formal households with smartphone, partial bank use, growing asset base.',
    overview:
      'U2 households are urban semi-formal — small shopkeepers, salaried-but-informal workers, gig economy. They have smartphones and bank accounts in active use. They are reachable through digital channels and through MFI / SFB branches. Lead with working-capital credit and bundled health insurance.',
    tier: 2,
    readiness: {
      need: { rating: 'High', note: 'Working-capital and health protection gaps.' },
      access: { rating: 'High', note: 'Smartphone, bank, UPI in regular use.' },
      slack: { rating: 'Med', note: 'Surplus visible but volatile.' },
    },
    product: {
      headline: 'Working-capital credit + health cover',
      body: 'Small-ticket business loans via MFI / SFB; bundled hospi-cash and Ayushman top-up; UPI-linked savings for liquidity.',
    },
    channel: {
      headline: 'MFI / SFB branch + app',
      body: 'MFI loan officer for first contact; app for repeat servicing; bancassurance partner for health cover.',
    },
    channelLadder: ['MFI loan officer', 'SFB branch', 'App', 'Bancassurance', 'UPI savings'],
  },
  U3: {
    code: 'U3',
    name: 'Connected, asset-rich urban — direct FSP uptake',
    persona: 'Urban formal / semi-formal households with smartphone, bank, owned assets.',
    overview:
      'U3 households in this CRM mapping are the most-ready urban segment for direct FSP uptake — they have a consistent banking relationship, a smartphone, and observable discretionary consumption. They are reachable directly through digital channels and bancassurance, with branch visits reserved for high-ticket products.',
    tier: 1,
    readiness: {
      need: { rating: 'Med', note: 'Demand is for product breadth (credit + investment + insurance).' },
      access: { rating: 'High', note: 'Full digital + bank stack.' },
      slack: { rating: 'High', note: 'Discretionary spend visible.' },
    },
    product: {
      headline: 'Cross-sell: credit + insurance + investment',
      body: 'Personal loan, credit card, term life, motor insurance, and SIP — all sold direct.',
    },
    channel: {
      headline: 'Digital direct + bancassurance',
      body: 'App-based onboarding for most products; branch for high-ticket; bancassurance partner for insurance bundle.',
    },
    channelLadder: ['App', 'Bancassurance', 'Branch (high-ticket)', 'Credit card cross-sell'],
  },
};

// Helper: order segments by their tier (then by code) for the overview page.
export const TIER_ORDER: Tier[] = [1, 2, 3, 4];

export function tierOf(code: SegmentCode): Tier {
  return SEGMENT_BRIEF[code].tier;
}

// Standard bucket descriptions of the 4 data dimensions used on the segment
// profile. The dashboard renders each dimension as a panel populated with
// metrics from the backend catalog.
export const DATA_DIMENSIONS = [
  {
    key: 'economic',
    label: 'Economic',
    blurb: 'MPCE, food share, asset ownership.',
    metrics: ['possess_car', 'dwelling_type', 'cooking_energy'],
  },
  {
    key: 'welfare',
    label: 'Welfare',
    blurb: 'Ration card, school meals, government scheme uptake.',
    metrics: ['ration_card', 'ration_any', 'meal_from_school'],
  },
  {
    key: 'digital',
    label: 'Digital',
    blurb: 'Internet, mobile, online purchase activity.',
    metrics: ['any_internet', 'possess_mobile', 'online_groceries', 'online_mobile'],
  },
  {
    key: 'vulnerability',
    label: 'Vulnerability',
    blurb: 'Social group, demographic exposure, education stock.',
    metrics: ['social_group', 'any_elderly', 'any_child', 'any_secondary'],
  },
] as const;

// Pillar visual styling.
export const RATING_STYLE: Record<Rating, { bg: string; fg: string }> = {
  High: { bg: '#dcfce7', fg: '#166534' },
  Med: { bg: '#fef3c7', fg: '#92400e' },
  Low: { bg: '#fee2e2', fg: '#991b1b' },
};
