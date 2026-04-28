import type { QueryFormData } from '@superset-ui/core';

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
}

export interface Wedge {
  category: string;
  value: number;
}

export interface StateAggregate {
  stateKey: string;
  totalWeight: number;
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
