import { SegmentReadinessRow } from './api';

export type InsightDimension =
  | 'economic'
  | 'welfare'
  | 'digital'
  | 'vulnerability';

export const PROFILE_DIMENSION_METRICS: Record<InsightDimension, string[]> = {
  economic: ['food_spend_high_hh', 'education_spend_any_hh', 'asset_ownership_strong_hh'],
  welfare: [
    'ration_priority_card_hh',
    'ayushman_beneficiary_hh',
    'pmgky_benefit_hh',
    'jan_dhan_proxy_hh',
  ],
  digital: ['any_internet', 'possess_mobile', 'online_groceries', 'online_mobile'],
  vulnerability: ['health_expenditure_stress_hh', 'female_headed_hh', 'scst_head_hh', 'casual_labour_hh'],
};

export const COMPARISON_METRICS = [
  ...PROFILE_DIMENSION_METRICS.economic,
  ...PROFILE_DIMENSION_METRICS.welfare,
  ...PROFILE_DIMENSION_METRICS.digital,
  ...PROFILE_DIMENSION_METRICS.vulnerability,
];

type InsightPack = {
  overview: string;
  productHeadline: string;
  productBody: string;
  channelHeadline: string;
  channelBody: string;
  channelLadder: string[];
};

const SEGMENT_OVERVIEW_PREFIX: Record<string, string> = {
  R1: 'This segment shows strong structural readiness and typically responds to lighter-touch acquisition.',
  R2: 'This segment is digitally reachable but still benefits from assisted trust-building journeys.',
  R3: 'This segment has visible service gaps and requires system-linkage before advanced products.',
  R4: 'This segment is highly constrained and often needs protection-first sequencing.',
  U1: 'This urban segment has the strongest formal access signals and can absorb product depth quickly.',
  U2: 'This urban segment is digitally active but selective; conversion improves with contextual nudges.',
  U3: 'This urban segment is constrained and requires high-contact onboarding and welfare-linked entry.',
};

const CHANNEL_LADDERS: Record<string, string[]> = {
  R1: ['Digital ad', 'Agent follow-up', 'App KYC', 'Credit/insurance cross-sell'],
  R2: ['BC/Sakhi outreach', 'FPS/SHG trust point', 'Assisted onboarding', 'Repeat product nudges'],
  R3: ['ASHA', 'FPS', 'CSC', 'BC Sakhi', 'Protection products'],
  R4: ['PDS touchpoint', 'Health/welfare camp', 'BC doorstep', 'Savings protection bundle'],
  U1: ['Partner POS', 'App onboarding', 'Card/EMI upsell', 'Insurance attach'],
  U2: ['Retail POS', 'Telecom journey', 'Wallet-to-formal bridge', 'Credit activation'],
  U3: ['Community worker', 'Cash-in agent', 'Simple savings rail', 'Protection-led follow-up'],
};

export function readinessBySegment(
  rows: SegmentReadinessRow[] | undefined,
): Record<string, SegmentReadinessRow> {
  const out: Record<string, SegmentReadinessRow> = {};
  for (const row of rows ?? []) out[row.segment] = row;
  return out;
}

function ratingVerb(rating: 'High' | 'Medium' | 'Low', high: string, med: string, low: string): string {
  if (rating === 'High') return high;
  if (rating === 'Medium') return med;
  return low;
}

export function buildInsightPack(
  segment: string,
  readiness: SegmentReadinessRow | undefined,
): InsightPack {
  const need = readiness?.need.rating ?? 'Medium';
  const access = readiness?.access.rating ?? 'Medium';
  const slack = readiness?.slack.rating ?? 'Medium';

  const overview = [
    SEGMENT_OVERVIEW_PREFIX[segment] ?? 'This segment has mixed readiness and requires calibrated sequencing.',
    `Need is ${need.toLowerCase()}, suggesting ${ratingVerb(
      need,
      'strong demand for resilience and essential services',
      'targeted use-case-led demand',
      'selective demand pockets that need sharper qualification',
    )}.`,
    `Access is ${access.toLowerCase()}, indicating ${ratingVerb(
      access,
      'channels can scale with lower assisted effort',
      'assisted-to-digital progression is feasible',
      'high-touch, local channel support is essential',
    )}.`,
    `Slack is ${slack.toLowerCase()}, so ${ratingVerb(
      slack,
      'larger-ticket pathways can be tested after activation',
      'small-to-mid ticket products should be sequenced carefully',
      'protection and low-volatility products should lead',
    )}.`,
  ].join(' ');

  const productHeadline =
    need === 'High'
      ? 'Protection-first product stack'
      : access === 'High'
        ? 'Digital-first growth stack'
        : 'Assisted bridge product stack';
  const productBody = `Prioritize ${ratingVerb(
    need,
    'health protection, emergency liquidity, and welfare-linked rails',
    'a balanced bundle of savings, protection, and credit-ready nudges',
    'selective low-risk products with clear use-case messaging',
  )}; sequence expansion based on observed repayment and repeat usage signals.`;

  const channelHeadline =
    access === 'High'
      ? 'Light-assist channel activation'
      : access === 'Medium'
        ? 'Hybrid assisted-to-digital activation'
        : 'Field-assisted activation';
  const channelBody = `Use ${ratingVerb(
    access,
    'digital nudges and partner channels as primary acquisition levers',
    'community anchors for onboarding and digital for retention',
    'trusted local intermediaries as primary entry points before digital migration',
  )}.`;

  return {
    overview,
    productHeadline,
    productBody,
    channelHeadline,
    channelBody,
    channelLadder: CHANNEL_LADDERS[segment] ?? ['Community outreach', 'Assisted onboarding', 'Retention follow-up'],
  };
}
