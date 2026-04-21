import transformProps, {
  wedgesForLegend,
} from '../src/plugin/transformProps';

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
