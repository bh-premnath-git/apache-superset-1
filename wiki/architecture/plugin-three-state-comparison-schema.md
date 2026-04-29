# Three-State Comparison Plugin: Schema & Data Flow

## Database Schema

## Runtime Verification (docker compose)

Verified from running containers:

- `analytics-db` is healthy and queryable (`sample_user` on `analytics`)
- `metadata-db` is healthy and queryable (`superset` on `superset`)
- Superset metadata has dataset `household.vw_state_segment_distribution` as table id `9`
- Dashboard `Household Survey Overview` exists (id `1`) and currently contains chart `District Segments by State` (`state_district_pies`)

Verified target-state availability in `household.vw_state_segment_distribution`:

- Bihar
- Jharkhand
- Madhya Pradesh

### Source View used by plugin: `household.vw_state_segment_distribution`

Actual columns (from `information_schema.columns`):

- `state_label` (character varying)
- `sector_label` (character varying)
- `segment` (text)
- `seg_weight` (real)

### Upstream base table: `household.hh_master`

```
┌─────────────────┬──────────────┬─────────────┐
│ HHID (PK)       │ State_label  │  ... household columns ...        │
├─────────────────┼──────────────┼─────────────┤
│ HH001           │ Bihar        │  R1         │  1.2        │
│ HH002           │ Bihar        │  R2         │  1.5        │
│ HH003           │ Jharkhand    │  U1         │  0.9        │
│ ...             │ ...          │  ...        │  ...        │
└─────────────────┴──────────────┴─────────────┘
```

### Query shape for the new plugin

```sql
SELECT state_label, segment, seg_weight
FROM household.vw_state_segment_distribution
WHERE state_label IN ('Bihar', 'Jharkhand', 'Madhya Pradesh');
```

**Query Output:**

| state_label      | segment | seg_weight |
|------------------|---------|--------------|
| Bihar            | R1      | 1,234,567    |
| Bihar            | R2      | 2,345,678    |
| ...              | ...     | ...          |
| Madhya Pradesh   | R1      | 987,654      |
| ...              | ...     | ...          |
| Jharkhand        | R1      | 456,789      |
| ...              | ...     | ...          |

---

## Data Transformation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. QUERY RESULT (Superset API)                                              │
│    [{state_label, segment, seg_weight}, ...]                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. NORMALIZE STATE NAMES                                                  │
│    "BIHAR" → "Bihar", "Madhya pradesh" → "Madhya Pradesh"                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. PIVOT & TRANSFORM (transformData.ts)                                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ AGGREGATE (for Pie)                                                 │   │
│  │ {                                                                   │   │
│  │   aggregateWedges: [                                                │   │
│  │     {segment: "R1", value: 2679010, pct: 35.2},  ← sum across states │   │
│  │     {segment: "R2", value: 1892345, pct: 24.8},                     │   │
│  │     ...                                                             │   │
│  │   ],                                                                │   │
│  │   aggregateTotal: 7612345                                          │   │
│  │ }                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PER-STATE STACKS (for Bars)                                         │   │
│  │ {                                                                   │   │
│  │   stateStacks: [                                                    │   │
│  │     {                                                               │   │
│  │       state: "Bihar",                                               │   │
│  │       total: 8901234,                                               │   │
│  │       segments: [                                                   │   │
│  │         {segment: "R1", value: 1234567, pct: 13.9, y0: 0, y1: 13.9} │   │
│  │         {segment: "R2", value: 2345678, pct: 26.3, y0: 13.9, y1:40.2}│   │
│  │         ...                                                         │   │
│  │       ]                                                             │   │
│  │     },                                                              │   │
│  │     {state: "Madhya Pradesh", ...},                                 │   │
│  │     {state: "Jharkhand", ...}                                       │   │
│  │   ]                                                                 │   │
│  │ }                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. COMPONENT PROPS (ThreeStateComparisonProps)                              │
│                                                                             │
│ {                                                                           │
│   aggregateWedges: Wedge[],                                                 │
│   stateStacks: StateStack[],                                                │
│   segmentColors: {R1: "#f5e6d3", R2: "#f4c794", ...},                      │
│   ...                                                                       │
│ }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Data Structures

### Types (types.ts)

```typescript
// Raw query row from Superset
interface QueryRow {
  state_label: string;
  segment: string;
  seg_weight: number;
}

// Pie chart data
interface Wedge {
  segment: string;
  value: number;     // Raw metric value
  percentage: number; // 0-100
}

// Stacked bar segment
interface StackSegment {
  segment: string;
  value: number;
  percentage: number;
  y0: number;  // Bottom position (0-100)
  y1: number;  // Top position (0-100)
}

// Per-state bar data
interface StateStack {
  state: string;
  total: number;
  segments: StackSegment[];
}

// Main props
interface ThreeStateComparisonProps {
  width: number;
  height: number;
  
  // Data
  aggregateWedges: Wedge[];
  aggregateTotal: number;
  stateStacks: StateStack[];
  
  // Config
  segmentColors: Record<string, string>;
  stateOrder: string[];
  segmentOrder: string[];
  
  // Display options
  showLegend: boolean;
  showPercentages: boolean;
  percentDecimals: number;
  labelThreshold: number; // Min % to show label
}
```

---

## Stacked Bar Calculation

For each state, segments stack from bottom (0%) to top (100%):

```
State: Bihar (Total: 10,000)
├─ R1: 1,500 → 15% → y0=0,   y1=15
├─ R2: 2,500 → 25% → y0=15,  y1=40
├─ R3: 3,000 → 30% → y0=40,  y1=70
├─ R4: 1,000 → 10% → y0=70,  y1=80
├─ U1: 500   → 5%  → y0=80,  y1=85
├─ U2: 1,000 → 10% → y0=85,  y1=95
└─ U3: 500   → 5%  → y0=95,  y1=100

Visual:
100% ┤                                          ╭────╮
 95% ┤                                    ╭────╯ U3 │
 90% ┤                              ╭────╯          │
 85% ┤                        ╭────╯     U2         │
 80% ┤                  ╭────╯                      │
 75% ┤            ╭────╯                            │
 70% ┤      ╭────╯                                  │
 60% ┤ ╭────╯ R4                                    │
 50% ┤╯                                              │
 40% ┤ ╭────────────────────────────────────────╮    │
 30% ┤╯ R3                                     │    │
 20% ┤ ╭──────────────────╮                   │    │
 10% ┤╯ R2                 │                   │    │
  0% ┼─────────────────────┴───────────────────┴────┤
         Bihar        Madhya Pradesh      Jharkhand
```

---

## Color Schema

### Segment Color Mapping (constants.ts)

```typescript
const SEGMENT_COLORS: Record<string, string> = {
  // Rural segments (warm tones)
  R1: '#f5e6d3',  // Light cream
  R2: '#f4c794',  // Light orange
  R3: '#e89c5a',  // Medium orange
  R4: '#8b5a2b',  // Dark brown
  
  // Urban segments (cool tones)
  U1: '#a8c5e9',  // Light blue
  U2: '#6b9bd1',  // Medium blue
  U3: '#9aa3b8',  // Purple-grey
};
```

### Color Consistency

Both charts use the **same color mapping** for segments:
- Pie chart: Colors map by segment code
- Bar chart: Each segment in stack uses same color
- Legend: Shows all 7 segments with swatches

---

## Responsive Layout Math

```typescript
// Container dimensions
const containerWidth = props.width;
const containerHeight = props.height;
const padding = 16;

// Layout split: 40% pie, 60% bars
const pieWidth = containerWidth * 0.4;
const barWidth = containerWidth * 0.6;

// Legend height (if bottom)
const legendHeight = showLegend ? 40 : 0;

// Chart heights
const chartHeight = containerHeight - legendHeight - (padding * 2);

// Pie dimensions
const pieDiameter = Math.min(pieWidth, chartHeight) - 32;
const pieRadius = pieDiameter / 2;

// Bar dimensions
const barChartInnerWidth = barWidth - 80; // Margin for Y-axis
const barWidthPerState = barChartInnerWidth / 3 - 20; // 3 states, gap
```

---

## Percentage Label Positioning

### Pie Chart Labels

```typescript
// Label shows if segment > threshold (default 5%)
if (wedge.percentage >= labelThreshold) {
  // Position at arc centroid, pushed outward
  const angle = (wedge.startAngle + wedge.endAngle) / 2;
  const labelRadius = pieRadius * 0.75; // 75% from center
  const x = Math.cos(angle) * labelRadius;
  const y = Math.sin(angle) * labelRadius;
  
  // Format: "35%" or "35.2%" based on decimals setting
  const text = `${wedge.percentage.toFixed(percentDecimals)}%`;
}
```

### Bar Chart Labels

```typescript
// Label shows inside bar segment if tall enough
for (const seg of stateStack.segments) {
  if (seg.percentage >= labelThreshold) {
    // Center of segment
    const x = stateX + barWidth / 2;
    const y = yScale(seg.y0 + (seg.percentage / 2)); // Midpoint
    
    // Text color: dark on light backgrounds, light on dark
    const textColor = isDarkBackground(seg.segment) ? '#fff' : '#333';
  }
}
```

---

## Cross-Filter Schema

When user clicks a segment wedge/bar:

```typescript
// Filter payload
{
  extraFormData: {
    filters: [
      {
        col: segment_column,  // e.g., "segment"
        op: 'IN',
        val: ['R1']  // Clicked segment
      }
    ]
  },
  filterState: {
    value: ['R1']
  }
}

// Visual feedback
// - Pie: Highlight R1 wedge (opacity 1, others 0.6)
// - Bars: Highlight R1 segments across all states
```

---

## FormData to Query Mapping

| Control | FormData Key | Query Effect |
|---------|--------------|--------------|
| State column | `state_column` | GROUP BY field |
| Segment column | `segment_column` | GROUP BY field |
| Metric | `metric` | Aggregate metric |
| Filters | `adhoc_filters` | WHERE clause |
| State order | `state_order` | Post-sort only |
| Segment order | `segment_order` | Legend + stack order |

---

## Default Configuration

```typescript
// constants.ts
export const DEFAULT_STATE_ORDER = [
  'Bihar',
  'Madhya Pradesh',
  'Jharkhand'
];

export const DEFAULT_SEGMENT_ORDER = [
  'R1', 'R2', 'R3', 'R4',  // Rural first
  'U1', 'U2', 'U3'         // Urban second
];

export const DEFAULT_COLORS: Record<string, string> = {
  R1: '#f5e6d3',
  R2: '#f4c794',
  R3: '#e89c5a',
  R4: '#8b5a2b',
  U1: '#a8c5e9',
  U2: '#6b9bd1',
  U3: '#9aa3b8'
};

export const DEFAULT_CONFIG = {
  showLegend: true,
  showPercentages: true,
  legendPosition: 'bottom',
  percentDecimals: 0,
  labelThreshold: 5  // Don't show labels for segments < 5%
};
```
