import type { ChartProps, DataRecord } from '@superset-ui/core';

import {
  DEFAULT_GEOJSON_URL,
  DEFAULT_MAX_PIE_RADIUS,
  DEFAULT_METRIC_DEFINITIONS,
  DEFAULT_MIN_PIE_RADIUS,
  DEFAULT_RURAL_CATEGORIES,
  DEFAULT_SEGMENT_DESCRIPTIONS,
  DEFAULT_URBAN_CATEGORIES,
  type MetricDefinition,
  type SegmentDescription,
} from '../constants';
import type {
  DistrictRow,
  StateAggregate,
  StateDistrictPiesFormData,
  StateDistrictPiesProps,
  Wedge,
} from '../types';

/**
 * Reshape the Superset query response into the props the chart component
 * expects. The response is one row per (state, district, category) tuple;
 * we fold it into one row per district carrying its wedge array plus
 * state-level totals for the base choropleth.
 *
 * This is a pure function — deliberate, because `transformProps` is called
 * on every render and must not allocate any side-effectful state.
 */
export default function transformProps(
  chartProps: ChartProps,
): StateDistrictPiesProps {
  const { width, height, queriesData, hooks } = chartProps;
  // ChartProps.formData is camelCase-converted; rawFormData keeps original snake_case keys
  const fd = ((chartProps as any).rawFormData ?? chartProps.formData) as StateDistrictPiesFormData;
  const rows = (queriesData?.[0]?.data ?? []) as DataRecord[];

  const metricKey = pickMetricKey(rows, fd);

  const byDistrict = new Map<string, DistrictRow>();
  const byState = new Map<string, number>();
  // Per-state segment breakdown, keyed by stateKey -> category -> summed value.
  // Drives the donut-per-state rendering on the India zoom level.
  const byStateWedges = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const stateKey = asString(row[fd.state_column]);
    const districtKey = asString(row[fd.district_column]);
    if (!stateKey || !districtKey) continue;
    const category = asString(row[fd.category_column]);
    const value = asNumber(row[metricKey]);

    const compoundKey = `${stateKey}|${districtKey}`;
    let district = byDistrict.get(compoundKey);
    if (!district) {
      district = {
        stateKey,
        districtKey,
        wedges: [],
        totalWeight: 0,
      };
      byDistrict.set(compoundKey, district);
    }
    district.wedges.push({ category, value });
    district.totalWeight += value;

    byState.set(stateKey, (byState.get(stateKey) ?? 0) + value);

    let stateWedges = byStateWedges.get(stateKey);
    if (!stateWedges) {
      stateWedges = new Map<string, number>();
      byStateWedges.set(stateKey, stateWedges);
    }
    stateWedges.set(category, (stateWedges.get(category) ?? 0) + value);
  }

  const ruralCategories = parseCategoryList(
    fd.rural_categories,
    DEFAULT_RURAL_CATEGORIES,
  );
  const urbanCategories = parseCategoryList(
    fd.urban_categories,
    DEFAULT_URBAN_CATEGORIES,
  );
  const ruralSet = new Set(ruralCategories);
  const urbanSet = new Set(urbanCategories);

  for (const d of byDistrict.values()) {
    d.ruralWedges = d.wedges.filter(w => ruralSet.has(w.category));
    d.urbanWedges = d.wedges.filter(w => urbanSet.has(w.category));
  }

  const districts = Array.from(byDistrict.values());
  const stateTotals: StateAggregate[] = Array.from(byState.entries()).map(
    ([stateKey, totalWeight]) => {
      const wedgesMap = byStateWedges.get(stateKey);
      const wedges: Wedge[] | undefined = wedgesMap
        ? Array.from(wedgesMap.entries()).map(([category, value]) => ({
            category,
            value,
          }))
        : undefined;
      return { stateKey, totalWeight, wedges };
    },
  );

  return {
    width,
    height,
    districts,
    stateTotals,
    stateGeoJsonUrl: fd.state_geojson_url || DEFAULT_GEOJSON_URL,
    districtGeoJsonUrl: fd.district_geojson_url || DEFAULT_GEOJSON_URL,
    stateFeatureKeyProp: fd.state_feature_key_prop ?? 'ISO',
    districtFeatureKeyProp: fd.district_feature_key_prop ?? 'censuscode',
    colorScheme: fd.color_scheme,
    minPieRadius: numberOr(fd.min_pie_radius, DEFAULT_MIN_PIE_RADIUS),
    maxPieRadius: numberOr(fd.max_pie_radius, DEFAULT_MAX_PIE_RADIUS),
    showLegend: fd.show_legend !== false,
    showTooltip: fd.show_tooltip !== false,
    ruralCategories,
    urbanCategories,
    metricsDatasourceId: parseDatasourceId(fd.metrics_datasource),
    metricsStateColumn: nonEmptyString(fd.metrics_state_column, 'State_label'),
    metricsDistrictColumn: nonEmptyString(fd.metrics_district_column, 'District'),
    metricsSegmentColumn: nonEmptyString(fd.metrics_segment_column, 'segment'),
    metricsDefinitions: parseMetricDefinitions(fd.metrics_definitions),
    segmentDescriptions: parseSegmentDescriptions(fd.segment_descriptions),
    emitCrossFilters: Boolean(fd.emit_filter),
    onDistrictClick: hooks?.setDataMask ? buildCrossFilterHook(chartProps) : undefined,
    formData: fd,
  };
}

function buildCrossFilterHook(
  chartProps: ChartProps,
): StateDistrictPiesProps['onDistrictClick'] {
  const { hooks } = chartProps;
  const fd = ((chartProps as any).rawFormData ?? chartProps.formData) as StateDistrictPiesFormData;
  const setDataMask = hooks?.setDataMask;
  if (!setDataMask) return undefined;
  return (row: DistrictRow) => {
    setDataMask({
      extraFormData: {
        filters: [
          {
            col: fd.state_column,
            op: 'IN',
            val: [row.stateKey],
          },
          {
            col: fd.district_column,
            op: 'IN',
            val: [row.districtKey],
          },
        ],
      },
      filterState: {
        value: [row.stateKey, row.districtKey],
      },
    });
  };
}

function pickMetricKey(
  rows: DataRecord[],
  fd: StateDistrictPiesFormData,
): string {
  if (!rows.length) return 'value';
  const known = new Set([fd.state_column, fd.district_column, fd.category_column]);
  const first = rows[0];
  for (const key of Object.keys(first)) {
    if (!known.has(key)) return key;
  }
  return Object.keys(first)[0] ?? 'value';
}

function asString(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function asNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function numberOr(v: unknown, fallback: number): number {
  const n = asNumber(v);
  return n > 0 ? n : fallback;
}

export function parseCategoryList(
  raw: unknown,
  fallback: readonly string[],
): string[] {
  if (Array.isArray(raw)) {
    const cleaned = raw.map(v => String(v).trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : [...fallback];
  }
  if (typeof raw === 'string' && raw.trim()) {
    const cleaned = raw
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
    return cleaned.length > 0 ? cleaned : [...fallback];
  }
  return [...fallback];
}

function nonEmptyString(v: unknown, fallback: string): string {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return fallback;
}

export function parseDatasourceId(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.trunc(v);
  if (v && typeof v === 'object') {
    const id = (v as { id?: unknown }).id;
    if (typeof id === 'number' && Number.isFinite(id) && id > 0) {
      return Math.trunc(id);
    }
    if (typeof id === 'string' && id.trim()) {
      const n = Number(id.trim());
      if (Number.isFinite(n) && n > 0) return Math.trunc(n);
    }
  }
  if (typeof v === 'string' && v.trim()) {
    const raw = v.trim();
    const m = raw.match(/^(\d+)(?:__\w+)?$/);
    const n = Number(m ? m[1] : raw);
    if (Number.isFinite(n) && n > 0) return Math.trunc(n);
  }
  return undefined;
}

const VALID_GROUPS = new Set<MetricDefinition['group']>([
  'size',
  'econ',
  'digi',
  'cap',
  'wel',
]);
const VALID_FORMATS = new Set<MetricDefinition['format']>([
  'percent',
  'rupee',
  'number',
]);

/**
 * Parse the operator-supplied JSON for `metrics_definitions`. Falls back to
 * the bundled defaults on any malformed entry so the chart never breaks
 * outright when an admin pastes invalid JSON.
 */
export function parseMetricDefinitions(raw: unknown): MetricDefinition[] {
  if (raw == null || raw === '') return DEFAULT_METRIC_DEFINITIONS;
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return DEFAULT_METRIC_DEFINITIONS;
    }
  }
  if (!Array.isArray(value)) return DEFAULT_METRIC_DEFINITIONS;
  const cleaned = value
    .map(entry => coerceMetricDefinition(entry))
    .filter((m): m is MetricDefinition => m !== null);
  return cleaned.length > 0 ? cleaned : DEFAULT_METRIC_DEFINITIONS;
}

function coerceMetricDefinition(raw: unknown): MetricDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const label = typeof r.label === 'string' ? r.label.trim() : '';
  const sql = typeof r.sql === 'string' ? r.sql.trim() : '';
  const group = typeof r.group === 'string' ? r.group : '';
  const format = typeof r.format === 'string' ? r.format : '';
  if (!label || !sql) return null;
  return {
    label,
    sql,
    group: VALID_GROUPS.has(group as MetricDefinition['group'])
      ? (group as MetricDefinition['group'])
      : 'size',
    format: VALID_FORMATS.has(format as MetricDefinition['format'])
      ? (format as MetricDefinition['format'])
      : 'number',
  };
}

/**
 * Parse the operator-supplied JSON for `segment_descriptions`. Returns the
 * bundled defaults on parse failure or empty input.
 */
export function parseSegmentDescriptions(
  raw: unknown,
): Record<string, SegmentDescription> {
  if (raw == null || raw === '') return DEFAULT_SEGMENT_DESCRIPTIONS;
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return DEFAULT_SEGMENT_DESCRIPTIONS;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_SEGMENT_DESCRIPTIONS;
  }
  const out: Record<string, SegmentDescription> = {};
  for (const [code, entry] of Object.entries(value as Record<string, unknown>)) {
    const desc = coerceSegmentDescription(entry);
    if (desc) out[code] = desc;
  }
  return Object.keys(out).length > 0 ? out : DEFAULT_SEGMENT_DESCRIPTIONS;
}

function coerceSegmentDescription(raw: unknown): SegmentDescription | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === 'string' ? r.title.trim() : '';
  if (!title) return null;

  const cardsRaw = r.cards;
  let cards: SegmentDescription['cards'];
  if (cardsRaw && typeof cardsRaw === 'object' && !Array.isArray(cardsRaw)) {
    const src = cardsRaw as Record<string, unknown>;
    const out: NonNullable<SegmentDescription['cards']> = {};
    for (const key of ['economic', 'welfare', 'digital', 'vulnerability'] as const) {
      const val = src[key];
      if (!val || typeof val !== 'object' || Array.isArray(val)) continue;
      const card = val as Record<string, unknown>;
      const cTitle = typeof card.title === 'string' ? card.title.trim() : '';
      const cBody = typeof card.body === 'string' ? card.body.trim() : '';
      if (!cTitle || !cBody) continue;
      out[key] = { title: cTitle, body: cBody };
    }
    if (Object.keys(out).length > 0) cards = out;
  }

  return {
    title,
    subtitle: typeof r.subtitle === 'string' ? r.subtitle : undefined,
    headerTagline: typeof r.headerTagline === 'string' ? r.headerTagline : undefined,
    prevalenceOverall:
      typeof r.prevalenceOverall === 'string' ? r.prevalenceOverall : undefined,
    prevalenceRegional:
      typeof r.prevalenceRegional === 'string' ? r.prevalenceRegional : undefined,
    readiness: typeof r.readiness === 'string' ? r.readiness : undefined,
    overview: typeof r.overview === 'string' ? r.overview : undefined,
    cards,
    summary: typeof r.summary === 'string' ? r.summary : undefined,
    criteria: Array.isArray(r.criteria)
      ? r.criteria.filter((s): s is string => typeof s === 'string')
      : undefined,
    interventions: Array.isArray(r.interventions)
      ? r.interventions.filter((s): s is string => typeof s === 'string')
      : undefined,
  };
}

export function wedgesForLegend(districts: DistrictRow[]): Wedge[] {
  const seen = new Map<string, number>();
  for (const d of districts) {
    for (const w of d.wedges) {
      seen.set(w.category, (seen.get(w.category) ?? 0) + w.value);
    }
  }
  return Array.from(seen.entries()).map(([category, value]) => ({ category, value }));
}
