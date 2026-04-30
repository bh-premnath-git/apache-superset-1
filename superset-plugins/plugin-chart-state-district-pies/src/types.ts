import type { QueryFormData } from '@superset-ui/core';

import type { MetricDefinition, SegmentDescription } from './constants';

/**
 * Raw row from the Superset query — one per district.
 *
 * The column names are runtime-configurable via the control panel, so this
 * type describes the *logical* shape produced by `transformProps`, not the
 * physical shape of the query response.
 */
export interface DistrictRow {
  stateKey: string;
  districtKey: string;
  wedges: Wedge[];
  totalWeight: number;
  /** Rural-bucket wedges, derived from `rural_categories` form-data field. */
  ruralWedges?: Wedge[];
  /** Urban-bucket wedges, derived from `urban_categories` form-data field. */
  urbanWedges?: Wedge[];
}

export interface Wedge {
  category: string;
  value: number;
}

export interface StateAggregate {
  stateKey: string;
  totalWeight: number;
  /**
   * Optional per-state segment breakdown. When present, the India-level
   * view renders one donut per state using these wedges. Absent when only
   * total weights are available (e.g. legacy callers).
   */
  wedges?: Wedge[];
}

/** Props accepted by the React chart component. Produced by `transformProps`. */
export interface StateDistrictPiesProps {
  width: number;
  height: number;

  districts: DistrictRow[];
  stateTotals: StateAggregate[];

  stateGeoJsonUrl: string;
  districtGeoJsonUrl: string;
  stateFeatureKeyProp: string;
  districtFeatureKeyProp: string;

  colorScheme?: string;
  minPieRadius: number;
  maxPieRadius: number;
  showLegend: boolean;
  showTooltip: boolean;

  /** Category codes that compose the "rural" group on the detail page. */
  ruralCategories: string[];
  /** Category codes that compose the "urban" group on the detail page. */
  urbanCategories: string[];

  /**
   * Optional Superset dataset id used by the detail page to fetch rich
   * per-segment metrics. When undefined the rich detail metrics table is
   * skipped silently.
   */
  metricsDatasourceId?: number;
  /** Column on the metrics dataset to filter by selected state. */
  metricsStateColumn: string;
  /** Column on the metrics dataset to filter by selected district. */
  metricsDistrictColumn: string;
  /** Group-by column on the metrics dataset (segment code). */
  metricsSegmentColumn: string;
  /** Per-metric SQL definitions that drive the rich detail table. */
  metricsDefinitions: MetricDefinition[];
  /** Per-segment description copy shown in the segment-click modal. */
  segmentDescriptions: Record<string, SegmentDescription>;

  onDistrictClick?: (row: DistrictRow) => void;
  emitCrossFilters?: boolean;
  formData: StateDistrictPiesFormData;
}

export interface StateDistrictPiesFormData extends QueryFormData {
  state_column: string;
  district_column: string;
  category_column: string;
  metric: unknown;

  state_geojson_url: string;
  district_geojson_url: string;
  state_feature_key_prop?: string;
  district_feature_key_prop?: string;

  color_scheme?: string;
  min_pie_radius?: number;
  max_pie_radius?: number;
  show_legend?: boolean;
  show_tooltip?: boolean;
  emit_filter?: boolean;

  /** Comma-separated category codes to bucket as "rural" on the detail view. */
  rural_categories?: string;
  /** Comma-separated category codes to bucket as "urban" on the detail view. */
  urban_categories?: string;

  /** Numeric Superset dataset id queried for rich detail-page metrics. */
  metrics_datasource?: string | number;
  metrics_state_column?: string;
  metrics_district_column?: string;
  metrics_segment_column?: string;
  /** JSON array of `{label, sql, format, group}` overrides. */
  metrics_definitions?: string;
  /** JSON object keyed by segment code → `{title, summary, criteria, interventions}`. */
  segment_descriptions?: string;
}

/** GeoJSON FeatureCollection shape we rely on (narrowed — no external types). */
export interface GeoFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: unknown;
  };
}

export interface GeoFeatureCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}
