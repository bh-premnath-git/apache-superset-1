import type { MetricDefinition } from '../constants';

export interface MetricsQueryArgs {
  datasourceId: number;
  stateColumn: string;
  districtColumn: string;
  segmentColumn: string;
  state: string;
  district: string;
  definitions: MetricDefinition[];
  rowLimit?: number;
}

/**
 * Adhoc metric shape that Superset's chart-data API accepts. Kept narrow
 * so the test snapshot stays meaningful.
 */
export interface AdhocMetric {
  expressionType: 'SQL';
  hasCustomLabel: true;
  label: string;
  sqlExpression: string;
  optionName: string;
}

export interface ChartDataRequestBody {
  datasource: { id: number; type: 'table' };
  result_format: 'json';
  result_type: 'full';
  queries: Array<{
    columns: string[];
    groupby: string[];
    metrics: AdhocMetric[];
    filters: Array<{ col: string; op: string; val: string }>;
    row_limit: number;
    orderby: Array<[string, boolean]>;
  }>;
}

/**
 * Build the request body for the `/api/v1/chart/data` POST that the detail
 * page issues per (state, district). Pure — kept in `src/data/` so it can
 * be unit-tested without `SupersetClient`.
 *
 * The metric `optionName` is derived from the label so the response carries
 * stable, human-readable column keys we can join to `definitions[]` on the
 * client.
 */
export function buildMetricsRequestBody(
  args: MetricsQueryArgs,
): ChartDataRequestBody {
  const {
    datasourceId,
    stateColumn,
    districtColumn,
    segmentColumn,
    state,
    district,
    definitions,
    rowLimit = 50,
  } = args;

  const metrics: AdhocMetric[] = definitions.map((d, i) => ({
    expressionType: 'SQL',
    hasCustomLabel: true,
    label: metricKeyFor(d.label, i),
    sqlExpression: d.sql,
    optionName: `am_sdp_${slug(d.label) || i}`,
  }));

  return {
    datasource: { id: datasourceId, type: 'table' },
    result_format: 'json',
    result_type: 'full',
    queries: [
      {
        columns: [segmentColumn],
        groupby: [segmentColumn],
        metrics,
        filters: [
          { col: stateColumn, op: '==', val: state },
          { col: districtColumn, op: '==', val: district },
        ],
        row_limit: rowLimit,
        orderby: [[segmentColumn, true]],
      },
    ],
  };
}

/**
 * Stable column key for the response row. `slug(label)` keeps it readable
 * (`food_spend_50_`) while the index suffix guarantees uniqueness if two
 * labels collapse to the same slug.
 */
export function metricKeyFor(label: string, index: number): string {
  const base = slug(label);
  return base ? `m_${base}` : `m_${index}`;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
