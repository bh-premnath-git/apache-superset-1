import type { QueryFormData } from '@superset-ui/core';

/** Raw query row from Superset's chart-data API response. */
export interface QueryRow {
  state_label: string;
  segment: string;
  seg_weight: number;
}

/** A single slice (pie) or segment (bar). */
export interface Wedge {
  segment: string;
  value: number;
  percentage: number;
  color: string;
}

/** One segment within a stacked bar. */
export interface StackSegment {
  segment: string;
  value: number;
  percentage: number;
  /** Bottom of this segment in 0-100 space. */
  y0: number;
  /** Top of this segment in 0-100 space. */
  y1: number;
  color: string;
}

/** Per-state bar data. */
export interface StateStack {
  state: string;
  total: number;
  segments: StackSegment[];
}

/** Props passed to the root React component. */
export interface ThreeStateComparisonProps {
  width: number;
  height: number;

  // Data
  aggregateWedges: Wedge[];
  aggregateTotal: number;
  stateStacks: StateStack[];

  // Configuration
  segmentColors: Record<string, string>;
  stateOrder: string[];
  segmentOrder: string[];
  metricLabel: string;

  // Display options
  showLegend: boolean;
  showPercentages: boolean;
  legendPosition: 'bottom' | 'right';
  percentDecimals: number;
  labelThreshold: number;

  // Interactivity
  onSegmentClick?: (segment: string) => void;
  emitCrossFilters?: boolean;
}

/** FormData produced by the control panel. */
export interface ThreeStateComparisonFormData extends QueryFormData {
  state_column: string;
  segment_column: string;
  metric: unknown;

  state_order?: string;
  segment_order?: string;

  show_legend?: boolean;
  show_percentages?: boolean;
  legend_position?: 'bottom' | 'right';
  percent_decimals?: number;
  label_threshold?: number;

  color_scheme?: string;
}
