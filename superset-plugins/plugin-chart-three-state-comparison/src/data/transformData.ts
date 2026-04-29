import type { Wedge, StackSegment, StateStack } from '../types';
import { SEGMENT_COLORS } from '../constants';

export interface TransformResult {
  aggregateWedges: Wedge[];
  aggregateTotal: number;
  stateStacks: StateStack[];
}

/**
 * Pivot long-form query rows into aggregate pie wedges and per-state
 * stacked bar data.
 */
export function transformData(
  rows: Array<{ state_label: string; segment: string; seg_weight: number }>,
  stateOrder: string[],
  segmentOrder: string[],
  colors: Record<string, string> = SEGMENT_COLORS,
): TransformResult {
  // Group: segment → total, state×segment → total
  const segmentTotals = new Map<string, number>();
  const stateSegmentMap = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const state = row.state_label;
    const seg = row.segment;
    const val = Number(row.seg_weight) || 0;

    segmentTotals.set(seg, (segmentTotals.get(seg) || 0) + val);

    if (!stateSegmentMap.has(state)) {
      stateSegmentMap.set(state, new Map());
    }
    stateSegmentMap.get(state)!.set(seg, (stateSegmentMap.get(state)!.get(seg) || 0) + val);
  }

  // Aggregate wedges (pie)
  const aggregateTotal = Array.from(segmentTotals.values()).reduce((a, b) => a + b, 0);
  const aggregateWedges: Wedge[] = segmentOrder
    .filter(seg => segmentTotals.has(seg))
    .map(segment => {
      const value = segmentTotals.get(segment) || 0;
      return {
        segment,
        value,
        percentage: aggregateTotal > 0 ? (value / aggregateTotal) * 100 : 0,
        color: colors[segment] || '#999',
      };
    });

  // Per-state stacks (bars)
  const stateStacks: StateStack[] = stateOrder
    .filter(state => stateSegmentMap.has(state))
    .map(state => {
      const stateMap = stateSegmentMap.get(state)!;
      const stateTotal = Array.from(stateMap.values()).reduce((a, b) => a + b, 0);

      let cumulativePct = 0;
      const segments: StackSegment[] = segmentOrder
        .filter(seg => stateMap.has(seg))
        .map(segment => {
          const value = stateMap.get(segment) || 0;
          const percentage = stateTotal > 0 ? (value / stateTotal) * 100 : 0;
          const y0 = cumulativePct;
          cumulativePct += percentage;
          return {
            segment,
            value,
            percentage,
            y0,
            y1: cumulativePct,
            color: colors[segment] || '#999',
          };
        });

      return { state, total: stateTotal, segments };
    });

  return { aggregateWedges, aggregateTotal, stateStacks };
}
