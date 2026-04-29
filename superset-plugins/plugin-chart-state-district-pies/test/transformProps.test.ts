import transformProps, {
  parseCategoryList,
  parseDatasourceId,
  parseMetricDefinitions,
  parseSegmentDescriptions,
  wedgesForLegend,
} from '../src/plugin/transformProps';
import { DEFAULT_METRIC_DEFINITIONS, DEFAULT_SEGMENT_DESCRIPTIONS } from '../src/constants';

function chartProps(rows: Record<string, unknown>[], overrides: Record<string, unknown> = {}) {
  return {
    width: 600,
    height: 400,
    queriesData: [{ data: rows }],
    hooks: {},
    formData: {
      state_column: 'state_label',
      district_column: 'district_code',
      category_column: 'segment',
      metric: 'sum_wt',
      state_geojson_url: '/india-states.geojson',
      district_geojson_url: '/india-districts.geojson',
      state_feature_key_prop: 'ISO',
      district_feature_key_prop: 'censuscode',
      min_pie_radius: 6,
      max_pie_radius: 22,
      show_legend: true,
      show_tooltip: true,
      ...overrides,
    },
  } as any;
}

describe('transformProps', () => {
  it('folds long-form rows into per-district wedge arrays', () => {
    const props = transformProps(
      chartProps([
        { state_label: 'Bihar', district_code: '101', segment: 'R1', sum_wt: 10 },
        { state_label: 'Bihar', district_code: '101', segment: 'R2', sum_wt: 20 },
        { state_label: 'Bihar', district_code: '102', segment: 'R1', sum_wt: 5 },
      ]),
    );

    expect(props.districts).toHaveLength(2);
    const bihar101 = props.districts.find(d => d.districtKey === '101')!;
    expect(bihar101.wedges).toEqual([
      { category: 'R1', value: 10 },
      { category: 'R2', value: 20 },
    ]);
    expect(bihar101.totalWeight).toBe(30);
  });

  it('aggregates state totals from district rows', () => {
    const props = transformProps(
      chartProps([
        { state_label: 'Bihar', district_code: '101', segment: 'R1', sum_wt: 10 },
        { state_label: 'Bihar', district_code: '102', segment: 'R1', sum_wt: 5 },
        { state_label: 'Madhya Pradesh', district_code: '201', segment: 'R1', sum_wt: 7 },
      ]),
    );

    const totals = Object.fromEntries(props.stateTotals.map(s => [s.stateKey, s.totalWeight]));
    expect(totals).toEqual({ Bihar: 15, 'Madhya Pradesh': 7 });
  });

  it('skips rows missing state or district key', () => {
    const props = transformProps(
      chartProps([
        { state_label: '', district_code: '101', segment: 'R1', sum_wt: 10 },
        { state_label: 'Bihar', district_code: '', segment: 'R1', sum_wt: 10 },
        { state_label: 'Bihar', district_code: '101', segment: 'R1', sum_wt: 10 },
      ]),
    );
    expect(props.districts).toHaveLength(1);
  });

  it('coerces numeric strings in the metric column', () => {
    const props = transformProps(
      chartProps([
        { state_label: 'Bihar', district_code: '101', segment: 'R1', sum_wt: '12.5' },
      ]),
    );
    expect(props.districts[0]?.totalWeight).toBe(12.5);
  });

  it('buckets wedges by configured rural/urban category lists', () => {
    const props = transformProps(
      chartProps(
        [
          { state_label: 'Bihar', district_code: '101', segment: 'R1', sum_wt: 10 },
          { state_label: 'Bihar', district_code: '101', segment: 'R2', sum_wt: 20 },
          { state_label: 'Bihar', district_code: '101', segment: 'U1', sum_wt: 5 },
          { state_label: 'Bihar', district_code: '101', segment: 'U2', sum_wt: 6 },
          { state_label: 'Bihar', district_code: '101', segment: 'X1', sum_wt: 7 },
        ],
        { rural_categories: 'R1,R2', urban_categories: 'U1,U2' },
      ),
    );

    const d = props.districts[0];
    expect(d.ruralWedges?.map(w => w.category)).toEqual(['R1', 'R2']);
    expect(d.urbanWedges?.map(w => w.category)).toEqual(['U1', 'U2']);
    expect(props.ruralCategories).toEqual(['R1', 'R2']);
    expect(props.urbanCategories).toEqual(['U1', 'U2']);
  });

  it('surfaces detail-page metric/segment-description fields with safe fallbacks', () => {
    const props = transformProps(
      chartProps(
        [{ state_label: 'Bihar', district_code: '101', segment: 'R1', sum_wt: 1 }],
        {
          metrics_datasource: '99',
          metrics_state_column: 'Custom_State',
          metrics_district_column: 'Custom_District',
          metrics_segment_column: 'seg',
          metrics_definitions: 'not json',
          segment_descriptions: JSON.stringify({
            R1: { title: 'Custom R1', summary: 'overridden' },
          }),
        },
      ),
    );

    expect(props.metricsDatasourceId).toBe(99);
    expect(props.metricsStateColumn).toBe('Custom_State');
    expect(props.metricsDistrictColumn).toBe('Custom_District');
    expect(props.metricsSegmentColumn).toBe('seg');
    // metrics_definitions was malformed JSON → fall back to defaults
    expect(props.metricsDefinitions[0].label).toBe('Size (%)');
    expect(props.segmentDescriptions.R1.title).toBe('Custom R1');
  });

  it('falls back to LCA defaults when category controls are blank', () => {
    const props = transformProps(
      chartProps([
        { state_label: 'Bihar', district_code: '101', segment: 'R3', sum_wt: 4 },
        { state_label: 'Bihar', district_code: '101', segment: 'U3', sum_wt: 8 },
      ]),
    );
    expect(props.ruralCategories).toEqual(['R1', 'R2', 'R3', 'R4']);
    expect(props.urbanCategories).toEqual(['U1', 'U2', 'U3']);
    const d = props.districts[0];
    expect(d.ruralWedges?.map(w => w.category)).toEqual(['R3']);
    expect(d.urbanWedges?.map(w => w.category)).toEqual(['U3']);
  });
});

describe('parseDatasourceId', () => {
  it('accepts positive integer strings', () => {
    expect(parseDatasourceId('42')).toBe(42);
    expect(parseDatasourceId(42)).toBe(42);
    expect(parseDatasourceId(' 7 ')).toBe(7);
  });
  it('rejects empty / zero / negative / non-numeric values', () => {
    expect(parseDatasourceId('')).toBeUndefined();
    expect(parseDatasourceId(undefined)).toBeUndefined();
    expect(parseDatasourceId(0)).toBeUndefined();
    expect(parseDatasourceId(-3)).toBeUndefined();
    expect(parseDatasourceId('abc')).toBeUndefined();
  });
});

describe('parseMetricDefinitions', () => {
  it('returns defaults on empty / missing / malformed JSON', () => {
    expect(parseMetricDefinitions(undefined)).toEqual(DEFAULT_METRIC_DEFINITIONS);
    expect(parseMetricDefinitions('')).toEqual(DEFAULT_METRIC_DEFINITIONS);
    expect(parseMetricDefinitions('{not json')).toEqual(DEFAULT_METRIC_DEFINITIONS);
    expect(parseMetricDefinitions('"not an array"')).toEqual(DEFAULT_METRIC_DEFINITIONS);
  });

  it('coerces unknown groups/formats and drops entries without sql or label', () => {
    const out = parseMetricDefinitions(
      JSON.stringify([
        { label: '', sql: 'COUNT(*)' },
        { label: 'Drop me', sql: '' },
        { label: 'Keep', sql: 'COUNT(*)', group: 'unknown', format: 'rainbow' },
      ]),
    );
    expect(out).toEqual([
      { label: 'Keep', sql: 'COUNT(*)', group: 'size', format: 'number' },
    ]);
  });

  it('falls back to defaults when no usable entries remain', () => {
    expect(parseMetricDefinitions(JSON.stringify([{}, {}]))).toEqual(
      DEFAULT_METRIC_DEFINITIONS,
    );
  });
});

describe('parseSegmentDescriptions', () => {
  it('returns defaults on empty / malformed JSON', () => {
    expect(parseSegmentDescriptions(undefined)).toEqual(DEFAULT_SEGMENT_DESCRIPTIONS);
    expect(parseSegmentDescriptions('not json')).toEqual(DEFAULT_SEGMENT_DESCRIPTIONS);
    expect(parseSegmentDescriptions(JSON.stringify([1, 2]))).toEqual(
      DEFAULT_SEGMENT_DESCRIPTIONS,
    );
  });

  it('keeps only entries that have a non-empty title', () => {
    const out = parseSegmentDescriptions(
      JSON.stringify({
        Z9: { title: 'Special Tier', summary: 'hi', criteria: ['x'] },
        BAD: { summary: 'no title' },
      }),
    );
    expect(out).toEqual({
      Z9: { title: 'Special Tier', summary: 'hi', criteria: ['x'], interventions: undefined },
    });
  });
});

describe('parseCategoryList', () => {
  it('splits comma-separated strings and trims whitespace', () => {
    expect(parseCategoryList('R1, R2 ,R3', ['X'])).toEqual(['R1', 'R2', 'R3']);
  });
  it('accepts arrays directly', () => {
    expect(parseCategoryList(['A', 'B'], ['X'])).toEqual(['A', 'B']);
  });
  it('falls back when input is empty/null/undefined', () => {
    expect(parseCategoryList(undefined, ['X'])).toEqual(['X']);
    expect(parseCategoryList('', ['X'])).toEqual(['X']);
    expect(parseCategoryList('  ,  ,', ['X'])).toEqual(['X']);
    expect(parseCategoryList([], ['X'])).toEqual(['X']);
  });
});

describe('wedgesForLegend', () => {
  it('sums all wedges by category across districts', () => {
    const merged = wedgesForLegend([
      { stateKey: 'X', districtKey: 'a', totalWeight: 3, wedges: [{ category: 'R1', value: 1 }, { category: 'R2', value: 2 }] },
      { stateKey: 'X', districtKey: 'b', totalWeight: 4, wedges: [{ category: 'R1', value: 4 }] },
    ]);
    expect(merged).toEqual([
      { category: 'R1', value: 5 },
      { category: 'R2', value: 2 },
    ]);
  });
});
