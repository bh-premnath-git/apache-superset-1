export const DEFAULT_MIN_PIE_RADIUS = 6;
export const DEFAULT_MAX_PIE_RADIUS = 22;

// Path Superset's runtime image serves india-districts.geojson from
// (see Dockerfile — the file is COPYed to /app/superset/static/assets/).
// Plugin code falls back to this when formData omits the URL so the
// chart works out of the box on the bundled deployment.
export const DEFAULT_GEOJSON_URL = '/static/assets/india-districts.geojson';

/** Fallback palette matching the LCA segment colors used elsewhere in the repo. */
export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  R1: '#fde9d4',
  R2: '#f6b678',
  R3: '#e8772e',
  R4: '#8a3d0c',
  U1: '#dbe4f5',
  U2: '#7f9bdc',
  U3: '#2f4a8a',
};

export const FALLBACK_PALETTE = [
  '#5AC189',
  '#FF7F44',
  '#666666',
  '#E04355',
  '#FCC700',
  '#A868B7',
  '#3CCCCB',
];

/** Default rural/urban segment groupings for the LCA Household Survey. */
export const DEFAULT_RURAL_CATEGORIES = ['R1', 'R2', 'R3', 'R4'];
export const DEFAULT_URBAN_CATEGORIES = ['U1', 'U2', 'U3'];

/**
 * Detail-page metric definition. Operators override the whole array via the
 * `metrics_definitions` text-area control on the chart edit page.
 *
 * `sql` is the aggregate expression evaluated **per segment** by the host
 * Superset chart-data API. `format` controls client-side rendering.
 * `group` drives the colored category header on the rich detail table.
 */
export interface MetricDefinition {
  label: string;
  sql: string;
  /** Display formatter. */
  format: 'percent' | 'rupee' | 'number';
  /**
   * Logical group for the colored column-header band. Mirrors the original
   * handlebars-template colour bands (size / econ / digi / cap / wel).
   */
  group: 'size' | 'econ' | 'digi' | 'cap' | 'wel';
}

/**
 * Default metric vocabulary, lifted verbatim from the previously-deleted
 * `assets/charts/rural_segment_comparison.yaml` so the rich detail page
 * works out of the box on the existing Household Survey dashboard.
 *
 * Operators can override the array entirely from the control panel — the
 * plugin makes no assumption about either column names or business
 * meaning beyond "valid SQL aggregate expression".
 */
export const DEFAULT_METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    label: 'Size (%)',
    group: 'size',
    format: 'percent',
    sql: 'ROUND((COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0))::numeric, 1)',
  },
  {
    label: 'Food spend >50%',
    group: 'econ',
    format: 'percent',
    sql:
      'ROUND((AVG(CASE WHEN (COALESCE(cereal_val_total,0) + COALESCE(pulses_val_total,0) + ' +
      'COALESCE(dairy_val_total,0) + COALESCE(vegetables_val_total,0) + ' +
      'COALESCE(egg_fish_meat_val_total,0) + COALESCE("edible oil_val_total",0) + ' +
      'COALESCE(spices_val_total,0) + COALESCE(suger_salt_val_total,0) + ' +
      'COALESCE(beverages_val_total,0)) / NULLIF(' +
      'COALESCE(cereal_val_total,0) + COALESCE(pulses_val_total,0) + ' +
      'COALESCE(dairy_val_total,0) + COALESCE(vegetables_val_total,0) + ' +
      'COALESCE(egg_fish_meat_val_total,0) + COALESCE("edible oil_val_total",0) + ' +
      'COALESCE(spices_val_total,0) + COALESCE(suger_salt_val_total,0) + ' +
      'COALESCE(beverages_val_total,0) + COALESCE("subtotal fuel and light_val_total",0) + ' +
      'COALESCE("edu expense_val_total",0) + COALESCE(conveyance_val_total,0) + ' +
      'COALESCE(entertainment_val_total,0) + COALESCE(internet_val_total,0) + ' +
      'COALESCE(clothing_val_total,0) + COALESCE(footwear_val_total,0) + ' +
      'COALESCE("house_garage rent_val_total",0) + ' +
      'COALESCE("medical nonhospitalized_val_total",0), 0) > 0.5 ' +
      'THEN 1.0 ELSE 0.0 END) * 100)::numeric, 1)',
  },
  {
    label: 'Edu spend >5%',
    group: 'econ',
    format: 'percent',
    sql:
      'ROUND((AVG(CASE WHEN COALESCE("edu expense_val_total",0) / NULLIF(' +
      'COALESCE(cereal_val_total,0) + COALESCE(pulses_val_total,0) + ' +
      'COALESCE(dairy_val_total,0) + COALESCE(vegetables_val_total,0) + ' +
      'COALESCE(egg_fish_meat_val_total,0) + COALESCE("edible oil_val_total",0) + ' +
      'COALESCE("subtotal fuel and light_val_total",0) + COALESCE("edu expense_val_total",0) + ' +
      'COALESCE(conveyance_val_total,0) + COALESCE(entertainment_val_total,0) + ' +
      'COALESCE(internet_val_total,0) + COALESCE(clothing_val_total,0) + ' +
      'COALESCE("house_garage rent_val_total",0), 0) > 0.05 ' +
      'THEN 1.0 ELSE 0.0 END) * 100)::numeric, 1)',
  },
  {
    label: 'MCPE (INR)',
    group: 'econ',
    format: 'rupee',
    sql:
      'ROUND(AVG((COALESCE(cereal_val_total,0) + COALESCE(pulses_val_total,0) + ' +
      'COALESCE(dairy_val_total,0) + COALESCE(vegetables_val_total,0) + ' +
      'COALESCE(egg_fish_meat_val_total,0) + COALESCE("edible oil_val_total",0) + ' +
      'COALESCE(spices_val_total,0) + COALESCE(suger_salt_val_total,0) + ' +
      'COALESCE(beverages_val_total,0) + COALESCE("subtotal fuel and light_val_total",0) + ' +
      'COALESCE("edu expense_val_total",0) + COALESCE(conveyance_val_total,0) + ' +
      'COALESCE("house_garage rent_val_total",0) + ' +
      'COALESCE("medical nonhospitalized_val_total",0) + ' +
      'COALESCE(entertainment_val_total,0) + COALESCE(internet_val_total,0) + ' +
      'COALESCE(clothing_val_total,0) + COALESCE(footwear_val_total,0)) / ' +
      'NULLIF(hh_size, 0))::numeric, 0)',
  },
  {
    label: 'Family internet use',
    group: 'digi',
    format: 'percent',
    sql: 'ROUND((AVG(COALESCE(any_internet, 0)::numeric) * 100)::numeric, 1)',
  },
  {
    label: 'High online connect.',
    group: 'digi',
    format: 'percent',
    sql:
      'ROUND((AVG(CASE WHEN COALESCE(prop_internet_users, 0) >= 0.5 ' +
      'THEN 1.0 ELSE 0.0 END) * 100)::numeric, 1)',
  },
  {
    label: 'No digital purchase',
    group: 'digi',
    format: 'percent',
    sql:
      'ROUND((AVG(CASE WHEN ("Online_Groceries" IS NULL OR "Online_Groceries" IN (\'NA\',\'\')) ' +
      'AND ("Online_Milk" IS NULL OR "Online_Milk" IN (\'NA\',\'\')) ' +
      'AND ("Online_Vegetables" IS NULL OR "Online_Vegetables" IN (\'NA\',\'\')) ' +
      'AND ("Online_Fresh_Fruits" IS NULL OR "Online_Fresh_Fruits" IN (\'NA\',\'\')) ' +
      'AND ("Online_Clothing" IS NULL OR "Online_Clothing" IN (\'NA\',\'\')) ' +
      'AND ("Online_Mobile" IS NULL OR "Online_Mobile" IN (\'NA\',\'\')) ' +
      'AND ("Online_purchase_medicine" IS NULL OR "Online_purchase_medicine" IN (\'NA\',\'\')) ' +
      'THEN 1.0 ELSE 0.0 END) * 100)::numeric, 1)',
  },
  {
    label: 'SC-ST compos.',
    group: 'cap',
    format: 'percent',
    sql:
      'ROUND((AVG(CASE WHEN "Social_Group_of_HH_Head" IN (1, 2) ' +
      'THEN 1.0 ELSE 0.0 END) * 100)::numeric, 1)',
  },
  {
    label: 'UHS minors >3',
    group: 'cap',
    format: 'percent',
    sql:
      'ROUND((AVG(CASE WHEN COALESCE(n_children_u15, 0) > 3 ' +
      'THEN 1.0 ELSE 0.0 END) * 100)::numeric, 1)',
  },
  {
    label: 'HH size >6',
    group: 'cap',
    format: 'percent',
    sql:
      'ROUND((AVG(CASE WHEN COALESCE(hh_size, 0) > 6 ' +
      'THEN 1.0 ELSE 0.0 END) * 100)::numeric, 1)',
  },
  {
    label: 'Has PMGKY',
    group: 'wel',
    format: 'percent',
    sql:
      'ROUND((AVG(CASE WHEN "Benefitted_From_PMGKY" = 1 ' +
      'THEN 1.0 ELSE 0.0 END) * 100)::numeric, 1)',
  },
  {
    label: 'Ayushman card',
    group: 'wel',
    format: 'percent',
    sql:
      'ROUND((AVG(CASE WHEN "Ayushman_beneficiary" = 1 ' +
      'THEN 1.0 ELSE 0.0 END) * 100)::numeric, 1)',
  },
  {
    label: 'Ration card',
    group: 'wel',
    format: 'percent',
    sql:
      'ROUND((AVG(CASE WHEN COALESCE("Ration_Card_Type", 0) > 0 ' +
      'THEN 1.0 ELSE 0.0 END) * 100)::numeric, 1)',
  },
];

/** Header colour band per metric group, lifted from the deleted handlebars template. */
export const METRIC_GROUP_COLORS: Record<MetricDefinition['group'], string> = {
  size: '#6b6e7a',
  econ: '#1565d8',
  digi: '#1f8f5c',
  cap: '#6e3bb6',
  wel: '#9a3b1a',
};

export const METRIC_GROUP_LABELS: Record<MetricDefinition['group'], string> = {
  size: 'SIZE',
  econ: 'ECONOMIC CONDITION',
  digi: 'DIGITAL CONNECTIVITY',
  cap: 'HUMAN CAPITAL',
  wel: 'WELFARE & VULNERABILITY',
};

/** Per-segment write-up shown in the segment description modal. */
export interface SegmentDescription {
  title: string;
  summary?: string;
  criteria?: string[];
  interventions?: string[];
}

/**
 * Default modal copy for the LCA segments. Operators override this entirely
 * via the `segment_descriptions` JSON text-area on the control panel.
 */
export const DEFAULT_SEGMENT_DESCRIPTIONS: Record<string, SegmentDescription> = {
  R1: {
    title: 'Rural — Tier 1',
    summary: 'Connected, asset-rich rural households.',
    criteria: ['Asset score ≥ 2', 'Digital score ≥ 2', 'Internet access = 1'],
    interventions: ['Premium digital products', 'Up-skilling and continuing education'],
  },
  R2: {
    title: 'Rural — Tier 2',
    summary: 'Mobile-led but partially connected rural households.',
    criteria: ['Digital score ≥ 2', 'Mobile ownership = 1'],
    interventions: ['Affordable data plans', 'Targeted online services'],
  },
  R3: {
    title: 'Rural — Tier 3',
    summary: 'Limited digital access; mostly offline.',
    criteria: ['Digital score ≤ 1', 'Internet access = 0'],
    interventions: ['Connectivity programmes', 'Digital literacy outreach'],
  },
  R4: {
    title: 'Rural — Tier 4',
    summary: 'Most constrained rural households across all signals.',
    interventions: ['Welfare programme enrolment', 'Last-mile inclusion'],
  },
  U1: {
    title: 'Urban — Tier 1',
    summary: 'Highly connected, asset-rich urban households.',
    criteria: ['Asset score ≥ 2', 'Digital score ≥ 2', 'Internet access = 1'],
    interventions: ['Premium services', 'Subscription products'],
  },
  U2: {
    title: 'Urban — Tier 2',
    summary: 'Connected but lower asset profile.',
    criteria: ['Digital score ≥ 2', 'Mobile ownership = 1'],
    interventions: ['Affordable urban services'],
  },
  U3: {
    title: 'Urban — Tier 3',
    summary: 'Most constrained urban households.',
    interventions: ['Welfare programme enrolment'],
  },
};
