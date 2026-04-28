# Plugin Development Guide

## Location

`superset-plugins/plugin-chart-state-district-pies/`

## Architecture Overview

See: `superset-plugins/plugin-chart-state-district-pies/ARCHITECTURE.md`

## Component Breakdown

### StateDistrictPies.tsx (Main Orchestrator)

**Responsibilities**:
- Drill-down state management (4 levels)
- GeoJSON loading and projection
- Breadcrumb generation
- Conditional rendering (map vs detail view)

**Key hooks**:
- `useState` for drill level, selections, hover
- `useMemo` for centroids, projection, breadcrumbs
- `useCallback` for navigation handlers

**Drill levels**:
```typescript
type DrillLevel = 'india' | 'state' | 'district' | 'detail';
```

### DistrictDetailView.tsx

**Purpose**: Rural/urban segment comparison for selected district.

**Features**:
- Stacked horizontal bar charts
- Number formatting (compact: 1K, 1M)
- Color-coded segments (R1-R4, U1-U3)
- Back navigation

### DistrictPie.tsx

**Purpose**: Single district pie rendering.

**Props**:
- `row: DistrictRow` - data
- `cx, cy` - projected centroid
- `radius` - scaled by total weight
- `isSelected` - highlight ring

### StateLayer.tsx

**Purpose**: Choropleth base map with state outlines.

**Features**:
- Dissolved state boundaries (india level)
- District boundaries (state level)
- Click handlers for drill navigation

## Data Contract

### Input (Query Response)

| Column | Purpose |
|--------|---------|
| `state_column` | Matches GeoJSON `NAME_1` |
| `district_column` | Matches GeoJSON `NAME_2` |
| `category_column` | Segment (R1, R2, R3, R4, U1, U2, U3) |
| `metric` | `SUM(hh_weight)` for wedge sizing |

### Output (DistrictRow)

```typescript
interface DistrictRow {
  stateKey: string;
  districtKey: string;
  wedges: Wedge[];  // Computed from category rows
  totalWeight: number;
}
```

## Build Integration

Plugin is built into Superset SPA via Dockerfile:

```dockerfile
# Stage 1: frontend-builder
COPY superset-plugins/plugin-chart-state-district-pies \
     /work/superset/superset-frontend/plugins/...
RUN node /tmp/register-plugin.mjs /work/superset/superset-frontend
RUN npm ci && npm run build
```

## Testing

```bash
cd superset-plugins/plugin-chart-state-district-pies
npm test
```

## Reference

- D3-geo: https://d3js.org/d3-geo
- Superset Chart API: https://github.com/apache/superset/blob/master/superset-frontend/packages/superset-ui-core/src/chart/index.ts
