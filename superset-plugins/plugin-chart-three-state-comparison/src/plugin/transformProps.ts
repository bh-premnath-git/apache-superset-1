import type { ChartProps, DataRecord } from '@superset-ui/core';

import type { ThreeStateComparisonProps, ThreeStateComparisonFormData } from '../types';
import { transformData } from '../data/transformData';
import {
  SEGMENT_COLORS,
  DEFAULT_STATE_ORDER,
  DEFAULT_SEGMENT_ORDER,
  DEFAULT_SHOW_LEGEND,
  DEFAULT_SHOW_PERCENTAGES,
  DEFAULT_LEGEND_POSITION,
  DEFAULT_PERCENT_DECIMALS,
  DEFAULT_LABEL_THRESHOLD,
} from '../constants';

/** Split a comma-separated string into trimmed tokens; fall back to defaults. */
function parseCsvList(raw: string | undefined, fallback: string[]): string[] {
  if (!raw || !raw.trim()) return fallback;
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Transform Superset's ChartProps into the props our root React component
 * expects.
 */
export default function transformProps(
  chartProps: ChartProps,
): ThreeStateComparisonProps {
  const { width, height, queriesData, hooks } = chartProps;
  const fd = (
    (chartProps as Record<string, unknown>).rawFormData ?? chartProps.formData
  ) as ThreeStateComparisonFormData;

  const rows = (queriesData?.[0]?.data ?? []) as DataRecord[];

  // Detect the metric column name — it's whatever column is not state or segment.
  const stateCol = fd.state_column;
  const segCol = fd.segment_column;

  const queryRows = rows.map(row => {
    const metricKey = Object.keys(row).find(
      k => k !== stateCol && k !== segCol,
    );
    return {
      state_label: String(row[stateCol] ?? ''),
      segment: String(row[segCol] ?? ''),
      seg_weight: Number(metricKey ? row[metricKey] : 0) || 0,
    };
  });

  const stateOrder = parseCsvList(fd.state_order, DEFAULT_STATE_ORDER);
  const segmentOrder = parseCsvList(fd.segment_order, DEFAULT_SEGMENT_ORDER);

  const { aggregateWedges, aggregateTotal, stateStacks } = transformData(
    queryRows,
    stateOrder,
    segmentOrder,
    SEGMENT_COLORS,
  );

  // Derive metric label from formData
  const metricLabel =
    typeof fd.metric === 'object' && fd.metric !== null && 'label' in fd.metric
      ? String((fd.metric as Record<string, unknown>).label)
      : 'Count';

  // Cross-filter callback
  const onSegmentClick =
    hooks?.setDataMask && fd.emit_filter
      ? (segment: string) => {
          hooks.setDataMask!({
            extraFormData: {
              filters: [{ col: segCol, op: 'IN', val: [segment] }],
            },
            filterState: { value: [segment] },
          });
        }
      : undefined;

  return {
    width,
    height,
    aggregateWedges,
    aggregateTotal,
    stateStacks,
    segmentColors: SEGMENT_COLORS,
    stateOrder,
    segmentOrder,
    metricLabel,
    showLegend: fd.show_legend !== false ? (fd.show_legend ?? DEFAULT_SHOW_LEGEND) : false,
    showPercentages: fd.show_percentages !== false ? (fd.show_percentages ?? DEFAULT_SHOW_PERCENTAGES) : false,
    legendPosition: fd.legend_position || DEFAULT_LEGEND_POSITION,
    percentDecimals: Number(fd.percent_decimals ?? DEFAULT_PERCENT_DECIMALS),
    labelThreshold: Number(fd.label_threshold ?? DEFAULT_LABEL_THRESHOLD),
    onSegmentClick,
    emitCrossFilters: Boolean(fd.emit_filter),
  };
}
