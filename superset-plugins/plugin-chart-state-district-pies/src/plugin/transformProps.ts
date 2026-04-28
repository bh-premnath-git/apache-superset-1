import type { ChartProps, DataRecord } from '@superset-ui/core';

import {
  DEFAULT_GEOJSON_URL,
  DEFAULT_MAX_PIE_RADIUS,
  DEFAULT_MIN_PIE_RADIUS,
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
  }

  const districts = Array.from(byDistrict.values());
  const stateTotals: StateAggregate[] = Array.from(byState.entries()).map(
    ([stateKey, totalWeight]) => ({ stateKey, totalWeight }),
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

export function wedgesForLegend(districts: DistrictRow[]): Wedge[] {
  const seen = new Map<string, number>();
  for (const d of districts) {
    for (const w of d.wedges) {
      seen.set(w.category, (seen.get(w.category) ?? 0) + w.value);
    }
  }
  return Array.from(seen.entries()).map(([category, value]) => ({ category, value }));
}
