/** CRM product copy and release labelling (not from warehouse SQL). */

/** Geographic scope for CRM explorer metrics (matches backend `FOCUS_STATES`). */
export const CRM_FOCUS_STATES = ['Bihar', 'Jharkhand', 'Madhya Pradesh'] as const;

export const CRM_DATA_VERSION_LABEL =
  'CRM M1 — Structural Segmentation — HCES 2023-24';

/** When non-null, show an informational banner on the dashboard home. */
export const CRM_M2_BANNER: string | null = null;

export const LS = {
  savedSegments: 'crm_saved_segments',
  lastDistrict: 'crm_last_district',
  comparisonDraft: 'crm_comparison_segments',
  onboardingDismissed: 'crm_onboarding_dismissed',
} as const;
