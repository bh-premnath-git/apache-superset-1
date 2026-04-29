import {
  buildMetricsRequestBody,
  metricKeyFor,
} from '../src/data/buildMetricsQuery';

const DEFS = [
  {
    label: 'Size (%)',
    sql: 'COUNT(*)',
    format: 'percent' as const,
    group: 'size' as const,
  },
  {
    label: 'MCPE (INR)',
    sql: 'AVG(mcpe)',
    format: 'rupee' as const,
    group: 'econ' as const,
  },
];

describe('buildMetricsRequestBody', () => {
  it('produces a chart-data payload scoped to (state, district) with adhoc metrics', () => {
    const body = buildMetricsRequestBody({
      datasourceId: 42,
      stateColumn: 'State_label',
      districtColumn: 'District',
      segmentColumn: 'segment',
      state: 'Bihar',
      district: '101',
      definitions: DEFS,
    });

    expect(body.datasource).toEqual({ id: 42, type: 'table' });
    expect(body.queries).toHaveLength(1);
    const q = body.queries[0];
    expect(q.columns).toEqual(['segment']);
    expect(q.groupby).toEqual(['segment']);
    expect(q.filters).toEqual([
      { col: 'State_label', op: '==', val: 'Bihar' },
      { col: 'District', op: '==', val: '101' },
    ]);
    expect(q.metrics).toHaveLength(2);
    expect(q.metrics[0]).toMatchObject({
      expressionType: 'SQL',
      hasCustomLabel: true,
      label: 'm_size',
      sqlExpression: 'COUNT(*)',
    });
    expect(q.orderby).toEqual([['segment', true]]);
    expect(q.row_limit).toBe(50);
  });

  it('uses a stable, slug-derived metric key', () => {
    expect(metricKeyFor('Size (%)', 0)).toBe('m_size');
    expect(metricKeyFor('MCPE (INR)', 1)).toBe('m_mcpe_inr');
    expect(metricKeyFor('   ', 3)).toBe('m_3');
    expect(metricKeyFor('!!!', 4)).toBe('m_4');
  });
});
