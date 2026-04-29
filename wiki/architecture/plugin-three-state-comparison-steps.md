# Three-State Comparison Plugin: Implementation Steps

## Overview

**Goal:** Create a Superset visualization plugin showing side-by-side pie chart (aggregate) and stacked bar chart (per-state) for comparing segment distribution across Bihar, Madhya Pradesh, and Jharkhand.

**Target dashboard:** `Household Survey Overview` (id `1`), as an additional chart beside the existing `District Segments by State` chart.

**Reference:** `plugin-chart-state-district-pies` serves as the architectural template.

---

## Preflight Verification (must run first)

1. Confirm services are healthy:
   - `docker compose ps`
   - Ensure `analytics-db`, `metadata-db`, `superset` are `Up` and healthy.
2. Confirm analytics source view exists and has correct columns:
   - `household.vw_state_segment_distribution`
   - columns: `state_label`, `sector_label`, `segment`, `seg_weight`.
3. Confirm target states exist in source view:
   - `Bihar`, `Jharkhand`, `Madhya Pradesh`.
4. Confirm Superset metadata has dataset registration:
   - table `vw_state_segment_distribution` present (currently id `9`).
5. Confirm dashboard placement target exists:
   - dashboard title `Household Survey Overview` (currently id `1`).

Suggested verification commands:

```bash
# 1) Service health
docker compose ps

# 2) Source view + columns in analytics DB
docker compose exec -T analytics-db psql -U sample_user -d analytics -c "\
SELECT column_name, data_type \
FROM information_schema.columns \
WHERE table_schema='household' AND table_name='vw_state_segment_distribution' \
ORDER BY ordinal_position;"

# 3) Confirm Bihar/Jharkhand/Madhya Pradesh rows exist
docker compose exec -T analytics-db psql -U sample_user -d analytics -c "\
SELECT state_label, ROUND(SUM(seg_weight)::numeric,0) AS weighted_total \
FROM household.vw_state_segment_distribution \
WHERE state_label IN ('Bihar','Jharkhand','Madhya Pradesh') \
GROUP BY state_label ORDER BY state_label;"

# 4) Confirm dataset + dashboard in Superset metadata
docker compose exec -T metadata-db psql -U superset -d superset -c "\
SELECT id, table_name, schema FROM tables WHERE table_name='vw_state_segment_distribution'; \
SELECT id, dashboard_title FROM dashboards WHERE dashboard_title='Household Survey Overview';"
```

---

## Phase 1: Scaffold & Infrastructure

### Step 1.1: Create Directory Structure

```bash
mkdir -p superset-plugins/plugin-chart-three-state-comparison/src/{components,data,plugin}
touch superset-plugins/plugin-chart-three-state-comparison/src/{types,constants,index}.ts
touch superset-plugins/plugin-chart-three-state-comparison/src/plugin/{index,buildQuery,controlPanel,transformProps}.ts
touch superset-plugins/plugin-chart-three-state-comparison/src/components/{ThreeStateComparison,AggregatePie,StateStackedBars,ChartLegend,PercentLabel,SegmentHoverCard}.tsx
touch superset-plugins/plugin-chart-three-state-comparison/src/data/{transformData,computePercentages,segmentColors}.ts
```

### Step 1.2: Copy Build Configuration

From `plugin-chart-state-district-pies`, copy and modify:

| Source | Destination | Changes |
|--------|-------------|---------|
| `package.json` | `package.json` | Update `name` to `@bh-premnath/plugin-chart-three-state-comparison` |
| `tsconfig.json` | `tsconfig.json` | No changes |
| `webpack.config.js` | `webpack.config.js` | No changes |
| `jest.config.js` | `jest.config.js` | No changes |

### Step 1.3: Update Package.json

```json
{
  "name": "@bh-premnath/plugin-chart-three-state-comparison",
  "version": "0.1.0",
  "description": "Superset viz plugin: Three-state segment comparison with pie and stacked bar charts",
  "main": "lib/index.js",
  "module": "esm/index.js",
  "types": "esm/index.d.ts",
  "scripts": {
    "build": "webpack --mode production",
    "build:dev": "webpack --mode development",
    "serve": "webpack serve --mode development --port 8080",
    "test": "jest"
  },
  "peerDependencies": {
    "@apache-superset/core": "*",
    "@superset-ui/chart-controls": "^0.18.0 || ^2.0.0",
    "@superset-ui/core": "^0.18.0 || ^2.0.0",
    "react": "^16.14.0 || ^17.0.0 || ^18.0.0",
    "react-dom": "^16.14.0 || ^17.0.0 || ^18.0.0"
  },
  "dependencies": {
    "d3-array": "^3.2.0",
    "d3-scale": "^4.0.2",
    "d3-selection": "^3.0.0",
    "d3-shape": "^3.2.0"
  }
}
```

---

## Phase 2: Core Types & Constants

### Step 2.1: Types (types.ts)

```typescript
import type { QueryFormData } from '@superset-ui/core';

// Query row from database
export interface QueryRow {
  state: string;
  segment: string;
  seg_weight: number;
}

// Pie wedge data
export interface Wedge {
  segment: string;
  value: number;
  percentage: number;
  color: string;
}

// Stacked bar segment
export interface StackSegment {
  segment: string;
  value: number;
  percentage: number;
  y0: number;  // Bottom (0-100)
  y1: number;  // Top (0-100)
  color: string;
}

// Per-state bar data
export interface StateStack {
  state: string;
  total: number;
  segments: StackSegment[];
}

// Main component props
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

// FormData from control panel
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
```

### Step 2.2: Constants (constants.ts)

```typescript
// Segment colors matching state_district_pies palette
export const SEGMENT_COLORS: Record<string, string> = {
  R1: '#f5e6d3',  // Light cream
  R2: '#f4c794',  // Light orange
  R3: '#e89c5a',  // Medium orange
  R4: '#8b5a2b',  // Dark brown
  U1: '#a8c5e9',  // Light blue
  U2: '#6b9bd1',  // Medium blue
  U3: '#9aa3b8',  // Purple-grey
};

export const DEFAULT_STATE_ORDER = ['Bihar', 'Madhya Pradesh', 'Jharkhand'];
export const DEFAULT_SEGMENT_ORDER = ['R1', 'R2', 'R3', 'R4', 'U1', 'U2', 'U3'];

export const DEFAULT_SHOW_LEGEND = true;
export const DEFAULT_SHOW_PERCENTAGES = true;
export const DEFAULT_LEGEND_POSITION = 'bottom';
export const DEFAULT_PERCENT_DECIMALS = 0;
export const DEFAULT_LABEL_THRESHOLD = 5; // Min % to show label
```

---

## Phase 3: Data Transformation Layer

### Step 3.1: Transform Data (data/transformData.ts)

```typescript
import type { QueryRow, Wedge, StateStack, StackSegment } from '../types';
import { SEGMENT_COLORS, DEFAULT_STATE_ORDER, DEFAULT_SEGMENT_ORDER } from '../constants';

interface TransformResult {
  aggregateWedges: Wedge[];
  aggregateTotal: number;
  stateStacks: StateStack[];
}

export function transformData(
  rows: QueryRow[],
  stateOrder: string[] = DEFAULT_STATE_ORDER,
  segmentOrder: string[] = DEFAULT_SEGMENT_ORDER,
): TransformResult {
  // Step 1: Group by segment (for pie)
  const segmentTotals = new Map<string, number>();
  const stateSegmentMap = new Map<string, Map<string, number>>();
  
  for (const row of rows) {
    const normalizedState = normalizeState(row.state);
    
    // Aggregate for pie
    segmentTotals.set(row.segment, (segmentTotals.get(row.segment) || 0) + row.metric_value);
    
    // Per-state for bars
    if (!stateSegmentMap.has(normalizedState)) {
      stateSegmentMap.set(normalizedState, new Map());
    }
    const stateMap = stateSegmentMap.get(normalizedState)!;
    stateMap.set(row.segment, (stateMap.get(row.segment) || 0) + row.metric_value);
  }
  
  // Step 2: Build aggregate wedges
  const aggregateTotal = Array.from(segmentTotals.values()).reduce((a, b) => a + b, 0);
  const aggregateWedges: Wedge[] = segmentOrder
    .filter(seg => segmentTotals.has(seg))
    .map(segment => {
      const value = segmentTotals.get(segment) || 0;
      return {
        segment,
        value,
        percentage: (value / aggregateTotal) * 100,
        color: SEGMENT_COLORS[segment] || '#999',
      };
    });
  
  // Step 3: Build state stacks
  const stateStacks: StateStack[] = stateOrder.map(state => {
    const stateMap = stateSegmentMap.get(normalizeState(state)) || new Map();
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
          color: SEGMENT_COLORS[segment] || '#999',
        };
      });
    
    return { state, total: stateTotal, segments };
  });
  
  return { aggregateWedges, aggregateTotal, stateStacks };
}

function normalizeState(state: string): string {
  // Handle spelling variants
  const lower = state.toLowerCase().trim();
  if (lower.includes('bihar')) return 'Bihar';
  if (lower.includes('madhya') || lower.includes('pradesh')) return 'Madhya Pradesh';
  if (lower.includes('jharkhand')) return 'Jharkhand';
  return state;
}
```

### Step 3.2: Percentage Computation (data/computePercentages.ts)

```typescript
/**
 * Adjust percentages to ensure they sum to exactly 100%
 * using largest remainder method
 */
export function normalizePercentages(percentages: number[], decimals: number = 0): number[] {
  // Round to specified decimals
  let rounded = percentages.map(p => {
    const factor = Math.pow(10, decimals);
    return Math.floor(p * factor) / factor;
  });
  
  // Calculate remainder
  const sum = rounded.reduce((a, b) => a + b, 0);
  const remainder = 100 - sum;
  
  // Distribute remainder to largest fractional parts
  if (remainder > 0 && decimals === 0) {
    const fractionalParts = percentages.map((p, i) => ({
      index: i,
      fractional: p - Math.floor(p),
    }));
    fractionalParts.sort((a, b) => b.fractional - a.fractional);
    
    for (let i = 0; i < Math.round(remainder); i++) {
      rounded[fractionalParts[i % fractionalParts.length].index] += 1;
    }
  }
  
  return rounded;
}
```

---

## Phase 4: Plugin Integration

### Step 4.1: Build Query (plugin/buildQuery.ts)

```typescript
import { buildQueryContext, QueryFormData } from '@superset-ui/core';

export default function buildQuery(formData: QueryFormData) {
  return buildQueryContext(formData, {
    queryFields: {
      groupby: 'groupby',
      metric: 'metric',
    },
    queries: [
      {
        groupby: [formData.state_column, formData.segment_column],
        metrics: [formData.metric],
        filters: formData.adhoc_filters,
        row_limit: 100, // Small, aggregated result
      },
    ],
  });
}
```

### Step 4.2: Transform Props (plugin/transformProps.ts)

```typescript
import type { ChartProps, DataRecord } from '@superset-ui/core';
import type { ThreeStateComparisonProps, ThreeStateComparisonFormData, QueryRow } from '../types';
import { transformData } from '../data/transformData';
import { parseCategoryList } from './transformProps'; // Reuse from state_district_pies

export default function transformProps(
  chartProps: ChartProps,
): ThreeStateComparisonProps {
  const { width, height, queriesData, hooks } = chartProps;
  const fd = ((chartProps as any).rawFormData ?? chartProps.formData) as ThreeStateComparisonFormData;
  
  const rows = (queriesData?.[0]?.data ?? []) as DataRecord[];
  
  // Map rows to QueryRow shape
  const queryRows: QueryRow[] = rows.map(row => ({
    state: String(row[fd.state_column]),
    segment: String(row[fd.segment_column]),
    seg_weight: Number(row[Object.keys(row).find(k => 
      k !== fd.state_column && k !== fd.segment_column
    ) || '']) || 0,
  }));
  
  const stateOrder = parseCategoryList(fd.state_order, DEFAULT_STATE_ORDER);
  const segmentOrder = parseCategoryList(fd.segment_order, DEFAULT_SEGMENT_ORDER);
  
  const { aggregateWedges, aggregateTotal, stateStacks } = transformData(
    queryRows,
    stateOrder,
    segmentOrder,
  );
  
  // Extract metric label
  const metricLabel = typeof fd.metric === 'object' && fd.metric?.label 
    ? String(fd.metric.label) 
    : 'Count';
  
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
    showLegend: fd.show_legend !== false,
    showPercentages: fd.show_percentages !== false,
    legendPosition: fd.legend_position || 'bottom',
    percentDecimals: Number(fd.percent_decimals ?? 0),
    labelThreshold: Number(fd.label_threshold ?? 5),
    onSegmentClick: hooks?.setDataMask ? (segment) => {
      hooks.setDataMask!({
        extraFormData: {
          filters: [{
            col: fd.segment_column,
            op: 'IN',
            val: [segment],
          }],
        },
        filterState: { value: [segment] },
      });
    } : undefined,
    emitCrossFilters: Boolean(fd.emit_filter),
  };
}
```

### Step 4.3: Control Panel (plugin/controlPanel.ts)

```typescript
import { validateNonEmpty } from '@superset-ui/core';
import { t } from '@apache-superset/core/translation';
import {
  ControlPanelConfig,
  sharedControls,
} from '@superset-ui/chart-controls';
import {
  DEFAULT_STATE_ORDER,
  DEFAULT_SEGMENT_ORDER,
  SEGMENT_COLORS,
} from '../constants';

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'state_column',
            config: {
              ...sharedControls.entity,
              label: t('State column'),
              description: t('Column containing state names (Bihar, Madhya Pradesh, Jharkhand)'),
              validators: [validateNonEmpty],
            },
          },
        ],
        [
          {
            name: 'segment_column',
            config: {
              ...sharedControls.entity,
              label: t('Segment column'),
              description: t('Column containing segment codes (R1, R2, R3, R4, U1, U2, U3)'),
              validators: [validateNonEmpty],
            },
          },
        ],
        ['metric'],
        ['adhoc_filters'],
      ],
    },
    {
      label: t('Data Order'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'state_order',
            config: {
              type: 'TextControl',
              label: t('State display order'),
              description: t('Comma-separated state names for bar chart order'),
              default: DEFAULT_STATE_ORDER.join(','),
            },
          },
        ],
        [
          {
            name: 'segment_order',
            config: {
              type: 'TextControl',
              label: t('Segment order'),
              description: t('Comma-separated segment codes for legend/stack order'),
              default: DEFAULT_SEGMENT_ORDER.join(','),
            },
          },
        ],
      ],
    },
    {
      label: t('Display'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'show_legend',
            config: {
              type: 'CheckboxControl',
              label: t('Show legend'),
              default: true,
            },
          },
        ],
        [
          {
            name: 'show_percentages',
            config: {
              type: 'CheckboxControl',
              label: t('Show percentage labels'),
              default: true,
            },
          },
        ],
        [
          {
            name: 'legend_position',
            config: {
              type: 'SelectControl',
              label: t('Legend position'),
              choices: [
                ['bottom', 'Bottom'],
                ['right', 'Right'],
              ],
              default: 'bottom',
            },
          },
        ],
        [
          {
            name: 'percent_decimals',
            config: {
              type: 'SelectControl',
              label: t('Percentage decimals'),
              choices: [
                [0, '0%'],
                [1, '0.0%'],
              ],
              default: 0,
            },
          },
        ],
        [
          {
            name: 'label_threshold',
            config: {
              type: 'TextControl',
              label: t('Label threshold (%)'),
              description: t('Minimum percentage to show a label'),
              default: '5',
              isInt: true,
            },
          },
        ],
        ['color_scheme'],
      ],
    },
  ],
};

export default config;
```

### Step 4.4: Plugin Registration (plugin/index.ts)

```typescript
import { Behavior, ChartMetadata, ChartPlugin } from '@superset-ui/core';
import { t } from '@apache-superset/core/translation';

import buildQuery from './buildQuery';
import controlPanel from './controlPanel';
import transformProps from './transformProps';
import type { ThreeStateComparisonFormData } from '../types';

export default class ThreeStateComparisonChartPlugin extends ChartPlugin<ThreeStateComparisonFormData> {
  constructor() {
    const metadata = new ChartMetadata({
      name: t('Three-State Comparison'),
      description: t(
        'Compare segment distribution across three states. ' +
        'Shows aggregate pie chart and per-state stacked bars.'
      ),
      thumbnail: '',
      tags: [t('Comparison'), t('Pie'), t('Stacked Bar'), t('Custom')],
      category: t('Comparison'),
      behaviors: [
        Behavior.INTERACTIVE_CHART,
        Behavior.CROSS_FILTER,
      ],
    });

    super({
      buildQuery,
      controlPanel,
      loadChart: () => import('../components/ThreeStateComparison'),
      metadata,
      transformProps,
    });
  }
}
```

---

## Phase 5: Visualization Components

### Step 5.1: Percent Label (components/PercentLabel.tsx)

```typescript
import React from 'react';

interface PercentLabelProps {
  x: number;
  y: number;
  percentage: number;
  decimals: number;
  color?: string;
  fontSize?: number;
}

export const PercentLabel: React.FC<PercentLabelProps> = ({
  x,
  y,
  percentage,
  decimals,
  color = '#333',
  fontSize = 12,
}) => {
  const text = `${percentage.toFixed(decimals)}%`;
  
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={color}
      fontSize={fontSize}
      fontWeight={600}
    >
      {text}
    </text>
  );
};
```

### Step 5.2: Chart Legend (components/ChartLegend.tsx)

```typescript
import React from 'react';

interface ChartLegendProps {
  segments: string[];
  colors: Record<string, string>;
  position: 'bottom' | 'right';
}

export const ChartLegend: React.FC<ChartLegendProps> = ({
  segments,
  colors,
  position,
}) => {
  const isHorizontal = position === 'bottom';
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        gap: isHorizontal ? 16 : 8,
        justifyContent: isHorizontal ? 'center' : 'flex-start',
        padding: 12,
      }}
    >
      {segments.map(segment => (
        <div
          key={segment}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              backgroundColor: colors[segment] || '#999',
              borderRadius: 2,
              border: '1px solid rgba(0,0,0,0.1)',
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#445066' }}>
            {segment}
          </span>
        </div>
      ))}
    </div>
  );
};
```

### Step 5.3: Aggregate Pie (components/AggregatePie.tsx)

```typescript
import React, { useMemo } from 'react';
import * as d3shape from 'd3-shape';
import type { Wedge } from '../types';
import { PercentLabel } from './PercentLabel';

interface AggregatePieProps {
  width: number;
  height: number;
  wedges: Wedge[];
  showPercentages: boolean;
  percentDecimals: number;
  labelThreshold: number;
  onSegmentClick?: (segment: string) => void;
}

export const AggregatePie: React.FC<AggregatePieProps> = ({
  width,
  height,
  wedges,
  showPercentages,
  percentDecimals,
  labelThreshold,
  onSegmentClick,
}) => {
  const radius = Math.min(width, height) / 2 - 20;
  const centerX = width / 2;
  const centerY = height / 2;
  
  const pie = useMemo(() => {
    return d3shape.pie<Wedge>()
      .value(d => d.value)
      .sort(null);
  }, []);
  
  const arc = useMemo(() => {
    return d3shape.arc<d3shape.PieArcDatum<Wedge>>()
      .innerRadius(0)
      .outerRadius(radius);
  }, [radius]);
  
  const labelArc = useMemo(() => {
    return d3shape.arc<d3shape.PieArcDatum<Wedge>>()
      .innerRadius(radius * 0.75)
      .outerRadius(radius * 0.75);
  }, [radius]);
  
  const arcs = pie(wedges);
  
  return (
    <svg width={width} height={height}>
      <g transform={`translate(${centerX}, ${centerY})`}>
        {arcs.map(arcData => {
          const d = arc(arcData);
          if (!d) return null;
          
          const centroid = labelArc.centroid(arcData);
          const showLabel = showPercentages && 
            arcData.data.percentage >= labelThreshold;
          
          return (
            <g key={arcData.data.segment}>
              <path
                d={d}
                fill={arcData.data.color}
                stroke="#fff"
                strokeWidth={1}
                cursor={onSegmentClick ? 'pointer' : 'default'}
                onClick={() => onSegmentClick?.(arcData.data.segment)}
              />
              {showLabel && (
                <PercentLabel
                  x={centroid[0]}
                  y={centroid[1]}
                  percentage={arcData.data.percentage}
                  decimals={percentDecimals}
                  color={arcData.data.percentage > 10 ? '#333' : '#666'}
                  fontSize={arcData.data.percentage > 15 ? 14 : 12}
                />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
};
```

### Step 5.4: State Stacked Bars (components/StateStackedBars.tsx)

```typescript
import React, { useMemo } from 'react';
import * as d3scale from 'd3-scale';
import type { StateStack } from '../types';
import { PercentLabel } from './PercentLabel';

interface StateStackedBarsProps {
  width: number;
  height: number;
  stateStacks: StateStack[];
  showPercentages: boolean;
  percentDecimals: number;
  labelThreshold: number;
  onSegmentClick?: (segment: string) => void;
}

export const StateStackedBars: React.FC<StateStackedBarsProps> = ({
  width,
  height,
  stateStacks,
  showPercentages,
  percentDecimals,
  labelThreshold,
  onSegmentClick,
}) => {
  const margin = { top: 20, right: 20, bottom: 60, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  const xScale = useMemo(() => {
    return d3scale.scaleBand()
      .domain(stateStacks.map(s => s.state))
      .range([0, innerWidth])
      .padding(0.3);
  }, [stateStacks, innerWidth]);
  
  const yScale = useMemo(() => {
    return d3scale.scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0]);
  }, [innerHeight]);
  
  const barWidth = xScale.bandwidth();
  
  return (
    <svg width={width} height={height}>
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {/* Y-axis */}
        <g>
          {[0, 25, 50, 75, 100].map(tick => (
            <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
              <line x2={innerWidth} stroke="#e5e7eb" strokeDasharray="2,2" />
              <text
                x={-10}
                dy="0.32em"
                textAnchor="end"
                fontSize={11}
                fill="#6b7280"
              >
                {tick}%
              </text>
            </g>
          ))}
        </g>
        
        {/* Bars */}
        {stateStacks.map(stateStack => {
          const x = xScale(stateStack.state) || 0;
          
          return (
            <g key={stateStack.state}>
              {stateStack.segments.map(segment => {
                const y = yScale(segment.y1);
                const barHeight = yScale(segment.y0) - yScale(segment.y1);
                const showLabel = showPercentages && 
                  segment.percentage >= labelThreshold &&
                  barHeight > 14;
                
                return (
                  <g key={`${stateStack.state}-${segment.segment}`}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={segment.color}
                      stroke="#fff"
                      strokeWidth={1}
                      cursor={onSegmentClick ? 'pointer' : 'default'}
                      onClick={() => onSegmentClick?.(segment.segment)}
                    />
                    {showLabel && (
                      <PercentLabel
                        x={x + barWidth / 2}
                        y={y + barHeight / 2}
                        percentage={segment.percentage}
                        decimals={percentDecimals}
                        color={segment.percentage > 15 ? '#333' : '#555'}
                        fontSize={segment.percentage > 20 ? 12 : 10}
                      />
                    )}
                  </g>
                );
              })}
              
              {/* X-axis label */}
              <text
                x={x + barWidth / 2}
                y={innerHeight + 20}
                textAnchor="middle"
                fontSize={12}
                fontWeight={500}
                fill="#374151"
              >
                {stateStack.state}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};
```

### Step 5.5: Main Component (components/ThreeStateComparison.tsx)

```typescript
import React, { useMemo } from 'react';
import type { ThreeStateComparisonProps } from '../types';
import { AggregatePie } from './AggregatePie';
import { StateStackedBars } from './StateStackedBars';
import { ChartLegend } from './ChartLegend';

export const ThreeStateComparison: React.FC<ThreeStateComparisonProps> = ({
  width,
  height,
  aggregateWedges,
  stateStacks,
  segmentOrder,
  showLegend,
  showPercentages,
  legendPosition,
  percentDecimals,
  labelThreshold,
  onSegmentClick,
}) => {
  const legendHeight = showLegend && legendPosition === 'bottom' ? 50 : 0;
  const chartHeight = height - legendHeight;
  
  const pieWidth = width * 0.4;
  const barWidth = width * 0.6;
  
  // Derive segment colors map
  const segmentColors = useMemo(() => {
    const map: Record<string, string> = {};
    aggregateWedges.forEach(w => {
      map[w.segment] = w.color;
    });
    return map;
  }, [aggregateWedges]);
  
  return (
    <div style={{ width, height, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', height: chartHeight }}>
        {/* Left: Pie Chart */}
        <div style={{ width: pieWidth, height: chartHeight }}>
          <AggregatePie
            width={pieWidth}
            height={chartHeight}
            wedges={aggregateWedges}
            showPercentages={showPercentages}
            percentDecimals={percentDecimals}
            labelThreshold={labelThreshold}
            onSegmentClick={onSegmentClick}
          />
        </div>
        
        {/* Right: Stacked Bars */}
        <div style={{ width: barWidth, height: chartHeight }}>
          <StateStackedBars
            width={barWidth}
            height={chartHeight}
            stateStacks={stateStacks}
            showPercentages={showPercentages}
            percentDecimals={percentDecimals}
            labelThreshold={labelThreshold}
            onSegmentClick={onSegmentClick}
          />
        </div>
      </div>
      
      {/* Legend */}
      {showLegend && (
        <ChartLegend
          segments={segmentOrder.filter(s => segmentColors[s])}
          colors={segmentColors}
          position={legendPosition}
        />
      )}
    </div>
  );
};

export default ThreeStateComparison;
```

---

## Phase 6: Package Entry

### Step 6.1: Index (index.ts)

```typescript
// Main export for Superset plugin registration
export { default } from './plugin';
export * from './types';
export * from './constants';
```

### Step 6.2: Plugin Export (plugin/index.ts)

Re-export the ChartPlugin class:

```typescript
export { default } from './index';
export { default as ThreeStateComparisonChartPlugin } from './index';
```

---

## Phase 7: Integration & Deployment

### Step 7.1: Register in Superset

Update `docker/frontend-build/register-plugin.mjs`:

```javascript
// Add alongside existing plugin
const PLUGINS = [
  {
    pkgName: '@bh-premnath/plugin-chart-state-district-pies',
    vizKey: 'state_district_pies',
    className: 'StateDistrictPiesChartPlugin',
    dirname: 'plugin-chart-state-district-pies',
  },
  {
    pkgName: '@bh-premnath/plugin-chart-three-state-comparison',
    vizKey: 'three_state_comparison',
    className: 'ThreeStateComparisonChartPlugin',
    dirname: 'plugin-chart-three-state-comparison',
  },
];
```

### Step 7.2: Update Dockerfile

Ensure new plugin is copied in Dockerfile:

```dockerfile
# In frontend-builder stage
COPY superset-plugins/plugin-chart-three-state-comparison \
     superset-frontend/plugins/plugin-chart-three-state-comparison
```

### Step 7.3: Rebuild & Deploy

```bash
docker compose build superset
docker compose up -d
```

### Step 7.4: Create Superset Chart

1. Navigate to Charts → + Chart
2. Select dataset: `vw_state_segment_distribution`
3. Choose visualization: **Three-State Comparison**
4. Configure:
   - State column: `state_label`
   - Segment column: `segment`
   - Metric: `SUM(seg_weight)`
5. Add filter: State IN (Bihar, Madhya Pradesh, Jharkhand)
6. Save and add to dashboard

### Step 7.5: Preflight Verification

Verify that the plugin is working as expected by checking the following:

* The chart is rendered correctly
* The data is accurate and up-to-date
* The filters are working as expected
* The chart is responsive and works well on different screen sizes

---

## Verification Checklist

| Check | Status |
|-------|--------|
| Pie shows aggregate of all 3 states | ☐ |
| Bars show each state separately | ☐ |
| Colors match segment codes consistently | ☐ |
| Legend shows R1-R4, U1-U3 | ☐ |
| Percentage labels appear on large segments | ☐ |
| Cross-filter works on segment click | ☐ |
| Responsive at different widths | ☐ |
| Zero values handled gracefully | ☐ |
| Missing states show warning/placeholder | ☐ |

---

## Post-Implementation Enhancements (Future)

1. **Hover tooltips** with exact values and counts
2. **Segment click** to open modal (reuse SegmentModal from state_district_pies)
3. **Export** PNG/SVG functionality
4. **Animation** on data update
5. **Accessibility** ARIA labels and keyboard navigation
