# Plugin Architecture: three_state_comparison

## Overview

**Purpose:** Side-by-side comparison visualization for 3 states showing segment distribution via pie chart (aggregate) and stacked bar chart (per-state breakdown).

**Visual Design (from screenshot):**
- **Left:** Proportional pie chart showing overall segment distribution across all 3 states combined
- **Right:** Stacked vertical bar chart showing segment distribution within each individual state
- **Legend:** Segment codes (R1-R4, U1-U3) with color swatches
- **Data labels:** Percentage values displayed on chart segments

**Use Case:** High-level executive dashboard view for comparing LCA segment penetration across Bihar, Madhya Pradesh, and Jharkhand.

**Dashboard placement:** This plugin is planned as an additional chart under `Household Survey Overview` (dashboard id `1`) alongside the current `state_district_pies` chart.

---

## Data Requirements

### Source View (verified from running containers)

```sql
-- Existing view (already present in analytics DB):
-- household.vw_state_segment_distribution
-- Columns:
--   state_label  (varchar)
--   sector_label (varchar)
--   segment      (text)
--   seg_weight   (real)

SELECT state_label, segment, seg_weight
FROM household.vw_state_segment_distribution
WHERE state_label IN ('Bihar', 'Jharkhand', 'Madhya Pradesh');
```

### Expected Query Result Shape

| state_label | segment | seg_weight |
|-------------|---------|------------|
| Bihar | R1 | 11453600 |
| Bihar | R2 | 153110000 |
| ... | ... | ... |

### Environment & data verification snapshot

Verified against live `docker compose` services:

- `analytics-db` healthy and reachable as `sample_user@analytics`
- `metadata-db` healthy and reachable as `superset@superset`
- Superset DB has dataset `vw_state_segment_distribution` with dataset id `9`
- Three target states exist in the source view:
  - Bihar: total `2231850000` (`SUM(seg_weight)`)
  - Jharkhand: total `732518000`
  - Madhya Pradesh: total `1575060000`

---

## Component Architecture

```
src/
├── components/
│   ├── ThreeStateComparison.tsx      # Main orchestrator (pie + bars layout)
│   ├── AggregatePie.tsx               # Left: Overall distribution pie
│   ├── StateStackedBars.tsx           # Right: Per-state stacked bars
│   ├── ChartLegend.tsx                # Segment color legend
│   ├── PercentLabel.tsx               # Smart percentage labels
│   └── SegmentHoverCard.tsx           # Tooltip with segment details
├── data/
│   ├── transformData.ts               # Pivot query rows → chart data
│   ├── computePercentages.ts          # Calculate display percentages
│   └── segmentColors.ts               # Color mapping for R1-R4, U1-U3
├── plugin/
│   ├── index.ts                       # ChartPlugin registration
│   ├── buildQuery.ts                  # FormData → QueryContext
│   ├── controlPanel.ts                # Editor controls
│   └── transformProps.ts              # Query response → ChartProps
├── types.ts                           # TypeScript contracts
├── constants.ts                       # Defaults (colors, segment order)
└── index.ts                           # Package entry
```

---

## Component Hierarchy

```
ThreeStateComparison
├── AggregatePie (left 40% width)
│   ├── Pie arcs (d3-shape)
│   └── PercentLabel[] (smart positioned)
├── StateStackedBars (right 60% width)
│   ├── Y-axis (percentage scale 0-100%)
│   ├── X-axis (Bihar, Madhya Pradesh, Jharkhand)
│   ├── Stacked bars (d3-scale + d3-shape)
│   └── PercentLabel[] (segment-aware positioning)
├── ChartLegend (bottom, horizontal)
│   └── Segment swatches (R1-R4, U1-U3)
└── SegmentHoverCard (conditional, follows mouse)
    └── Segment code + percentage + count
```

---

## Data Flow

### 1. Query Construction (buildQuery.ts)

```typescript
// Group by: state_label, segment
// Metric: SUM(seg_weight)
// Filters: state IN (Bihar, Madhya Pradesh, Jharkhand) via adhoc_filters
```

### 2. Transform Props (transformProps.ts)

```typescript
Input: Query rows [{ state_label, segment, seg_weight }]
      ↓
Step 1: Validate all 3 states present (warn if missing)
Step 2: Normalize state names (handle spelling variants)
Step 3: Pivot to:
  - aggregateWedges: { segment, value, percentage }[]  // For pie
  - stateStacks: { 
      state: string, 
      segments: { segment, value, percentage, y0, y1 }[] 
    }[]  // For bars
      ↓
Output: ThreeStateComparisonProps
```

### 3. Render Data Structure

```typescript
interface ThreeStateComparisonProps {
  width: number;
  height: number;
  
  // Pie data (left)
  aggregateWedges: Wedge[];
  aggregateTotal: number;
  
  // Bar data (right)
  stateStacks: StateStack[];
  stateOrder: string[]; // ["Bihar", "Madhya Pradesh", "Jharkhand"]
  
  // Configuration
  segmentColors: Record<string, string>; // R1→color, R2→color, etc.
  metricLabel: string; // "Households" or "Weighted Count"
  
  // Control panel toggles
  showLegend: boolean;
  showPercentages: boolean;
  legendPosition: 'bottom' | 'right';
}
```

---

## Visual Specifications

### Layout (from screenshot analysis)

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────────────┐    ┌──────────────────────────┐  │
│  │                  │    │      Bihar    MP    JH   │  │
│  │     PIE          │    │     ┌─────┐ ┌─────┐      │  │
│  │   CHART          │    │ 100%│█████│ │█████│      │  │
│  │   (40%)          │    │     │█████│ │█████│      │  │
│  │                  │    │  50%│█████│ │█████│      │  │
│  │                  │    │     │█████│ │█████│      │  │
│  │                  │    │   0%└─────┘ └─────┘      │  │
│  │                  │    │      (60%)               │  │
│  └──────────────────┘    └──────────────────────────┘  │
│                                                         │
│  [R1] [R2] [R3] [R4] [U1] [U2] [U3]  ← Legend          │
└─────────────────────────────────────────────────────────┘
```

### Dimensions

| Element | Specification |
|---------|---------------|
| Pie chart | 40% width, max 320px diameter |
| Pie inner radius | 0 (solid pie, no donut) |
| Pie label threshold | >5% to show percent label |
| Bar chart | 60% width, full height |
| Bar width | ~60-80px per state |
| Bar segment padding | 1px stroke white (crisp edges) |
| Y-axis | 0-100% with 25% ticks |
| Legend | Horizontal, bottom, 7 items |
| Colors | Match existing LCA palette |

---

## Color Palette (from screenshot)

| Segment | Color | Hex Approx |
|---------|-------|------------|
| R1 | Light cream | `#f5e6d3` |
| R2 | Light orange | `#f4c794` |
| R3 | Medium orange | `#e89c5a` |
| R4 | Dark brown | `#8b5a2b` |
| U1 | Light blue | `#a8c5e9` |
| U2 | Medium blue | `#6b9bd1` |
| U3 | Purple-grey | `#9aa3b8` |

---

## Control Panel Configuration

### Sections

| Section | Controls |
|---------|----------|
| **Query** | State column, Segment column, Metric (weight/count), adhoc_filters |
| **Data** | State order (text: "Bihar, Madhya Pradesh, Jharkhand"), Segment order |
| **Display** | Show legend, Show percentages, Legend position, Color scheme |
| **Labels** | Percent format (0% vs 0.0%), Label cutoff threshold |

### Key FormData Fields

```typescript
interface ThreeStateComparisonFormData {
  // Query
  state_column: string;        // e.g., "state_label"
  segment_column: string;      // e.g., "segment"
  metric: AdhocMetric;        // SUM(seg_weight)
  
  // Data customization
  state_order?: string;      // "Bihar, Madhya Pradesh, Jharkhand"
  segment_order?: string;    // "R1,R2,R3,R4,U1,U2,U3"
  
  // Display
  show_legend: boolean;
  show_percentages: boolean;
  legend_position: 'bottom' | 'right';
  percent_decimals: number;  // 0 or 1
  label_threshold: number;   // Min % to show label (default: 5)
  
  // Styling
  color_scheme?: string;     // Reference to Superset color scheme
}
```

---

## Plugin Registration

```typescript
// src/plugin/index.ts
export default class ThreeStateComparisonChartPlugin extends ChartPlugin<ThreeStateComparisonFormData> {
  constructor() {
    const metadata = new ChartMetadata({
      name: t('Three-State Comparison'),
      description: t(
        'Side-by-side pie and stacked bar visualization for comparing ' +
        'segment distribution across three states. Designed for LCA dashboards.'
      ),
      thumbnail: '',
      tags: [t('Comparison'), t('Stacked Bar'), t('Pie'), t('Custom')],
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

## Implementation Steps

### Phase 1: Scaffold (No Code)

1. **Create directory structure**
   ```
   superset-plugins/plugin-chart-three-state-comparison/
   ├── src/
   │   ├── components/
   │   ├── data/
   │   ├── plugin/
   │   ├── types.ts
   │   ├── constants.ts
   │   └── index.ts
   ├── package.json
   ├── tsconfig.json
   └── webpack.config.js
   ```

2. **Copy build infrastructure** from `plugin-chart-state-district-pies`
   - `package.json` (update name, description)
   - `tsconfig.json`
   - `webpack.config.js`
   - `jest.config.js`

3. **Register in Superset**
   - Update `docker/frontend-build/register-plugin.mjs` to include new plugin
   - Rebuild Docker image

### Phase 2: Core Types & Constants

1. **`types.ts`** — Define `ThreeStateComparisonProps`, `ThreeStateComparisonFormData`
2. **`constants.ts`** — Segment colors, default state order, default segment order

### Phase 3: Data Layer

1. **`transformData.ts`** — Pivot query rows to pie wedges and bar stacks
2. **`computePercentages.ts`** — Calculate percentages with rounding handling
3. **`segmentColors.ts`** — Color mapper with fallbacks

### Phase 4: Plugin Integration

1. **`buildQuery.ts`** — Build QueryContext with groupby [state, segment]
2. **`transformProps.ts`** — Transform Superset response to component props
3. **`controlPanel.ts`** — Editor controls following pattern from state_district_pies

### Phase 5: Visualization Components

1. **`PercentLabel.tsx`** — Smart label positioning (avoid overlap)
2. **`AggregatePie.tsx`** — D3 pie with arc generation
3. **`StateStackedBars.tsx`** — D3 stacked bar with scales
4. **`ChartLegend.tsx`** — Horizontal legend with swatches
5. **`SegmentHoverCard.tsx`** — Tooltip component
6. **`ThreeStateComparison.tsx`** — Main layout orchestrator

### Phase 6: Integration & Test

1. Register in Superset MainPreset.ts
2. Build and test with real data
3. Tune label positioning, colors, spacing

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Static bundling** | Same as state_district_pies — avoids DYNAMIC_PLUGINS issues |
| **D3 for rendering** | Precise control over pie arcs and bar stacking; consistent with existing plugin |
| **No drill-down** | Unlike state_district_pies, this is a flat comparison view |
| **Configurable state order** | Operators may want different state ordering |
| **Fixed 3-state design** | Plugin is purpose-built for 3-state comparison; generic N-state would add complexity |
| **Percentage labels** | Data-dense visualization needs on-chart labels, not just tooltips |
| **Shared color palette** | Must match state_district_pies for dashboard consistency |

---

## Cross-Filter Behavior

**Enable:** Clicking a segment in either chart emits cross-filter:

```typescript
setDataMask({
  extraFormData: {
    filters: [{
      col: segment_column,
      op: 'IN',
      val: [clickedSegment]
    }]
  }
});
```

**Visual feedback:** Highlight selected segment across both charts.

---

## Schema Reference

### Database View Required

```sql
-- Preferred: reuse existing household.vw_state_segment_distribution
SELECT state_label, segment, seg_weight
FROM household.vw_state_segment_distribution
WHERE state_label IN ('Bihar', 'Madhya Pradesh', 'Jharkhand');
```

### Superset Dataset Asset

```yaml
# assets/datasets/three_state_comparison.yaml
table_name: vw_state_segment_distribution
columns:
  - column_name: state_label
    type: STRING
  - column_name: sector_label
    type: STRING
  - column_name: segment
    type: STRING
  - column_name: seg_weight
    type: NUMERIC
```

---

## Files Reference

| File | Responsibility |
|------|----------------|
| `ThreeStateComparison.tsx` | Layout, responsive sizing, composition |
| `AggregatePie.tsx` | Pie rendering with d3-shape pie/arc |
| `StateStackedBars.tsx` | Stacked bar rendering with d3-scale band/linear |
| `transformData.ts` | Data pivot: long → wide for bars |
| `computePercentages.ts` | Percent calc with 100% total enforcement |
| `transformProps.ts` | Superset integration, normalization |
| `controlPanel.ts` | Chart editor UI |

---

## External Dependencies

- **D3:** `d3-shape` (pie, arcs, stacks), `d3-scale` (band, linear), `d3-selection`
- **Superset:** `@superset-ui/core`, `@superset-ui/chart-controls` (peer)
- **React:** 18 (peer)

---

## Design Pattern Alignment

This plugin follows the **exact same patterns** as `plugin-chart-state-district-pies`:

| Pattern | state_district_pies | three_state_comparison |
|---------|---------------------|------------------------|
| Plugin class extends ChartPlugin | ✓ | ✓ |
| buildQuery → transformProps → Component | ✓ | ✓ |
| D3 for SVG rendering | ✓ | ✓ |
| Configurable via controlPanel.ts | ✓ | ✓ |
| JSON config for colors/order | ✓ | ✓ |
| Static bundling via Dockerfile | ✓ | ✓ |
| Pure data helpers in src/data/ | ✓ | ✓ |
| Module-scoped caches | GeoJSON, metrics | (none needed) |
