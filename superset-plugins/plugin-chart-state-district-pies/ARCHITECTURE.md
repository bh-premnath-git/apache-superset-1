# Plugin Architecture: state_district_pies

## Overview

Custom Superset visualization plugin rendering India state choropleth with district-level pie overlays showing LCA segment distribution.

## Directory Structure

```
src/
├── components/           # React UI components
│   ├── StateDistrictPies.tsx   # Main orchestrator (drill-down, layout)
│   ├── DistrictDetailView.tsx  # Rural/urban segment detail page
│   ├── DistrictPie.tsx         # Individual district pie renderer
│   ├── StateLayer.tsx          # Choropleth base map
│   ├── Legend.tsx              # Category color legend
│   ├── Tooltip.tsx             # Hover detail panel
│   └── Breadcrumb.tsx          # Navigation breadcrumbs
├── plugin/               # Superset integration
│   ├── index.ts          # ChartPlugin registration
│   ├── buildQuery.ts     # FormData → query context
│   ├── controlPanel.ts   # Control panel configuration
│   └── transformProps.ts # Query response → ChartProps
├── geo/                  # Geographic utilities
│   ├── centroids.ts      # Feature centroid computation
│   └── projection.ts     # D3-geo Mercator fitting
├── hooks/                # React hooks
│   └── useGeoJson.ts     # GeoJSON fetch with caching
├── constants.ts          # Default values (colors, radii)
├── types.ts              # TypeScript interfaces
└── index.ts              # Package entry point
```

## Component Hierarchy

```
StateDistrictPies (orchestrator)
├── StateLayer (choropleth)
├── DistrictPie[] (pie overlays)
│   └── Slices (D3 arcs)
├── Legend
├── Tooltip (conditional)
└── DistrictDetailView (conditional, drill level 4)
    ├── Rural stacked bar
    └── Urban stacked bar
```

## Drill-down State Machine

```
india (level 0)
  → click state → state (level 1)
    → click district → district (level 2)
      → click pie → detail (level 3)
        → back → district → state → india
```

Breadcrumb: `India > State > District > Details`

## Data Flow

1. **buildQuery**: `formData` → `QueryContext` (groupby: state, district, category)
2. **Transform**: Query rows → `DistrictRow[]` with wedge computation
3. **Render**: Props → SVG with D3 projection

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Static bundling | Avoids `DYNAMIC_PLUGINS` 404 bug in Superset 6.x |
| Same-origin GeoJSON | CSP compliance, no CORS issues |
| Local drill-down | Prevents dashboard filter reset |
| D3-geo projection | Pixel-perfect alignment of pies to districts |

## Files Reference

- Main: `src/components/StateDistrictPies.tsx`
- Types: `src/types.ts`
- Plugin entry: `src/plugin/index.ts`
- Build: `webpack.config.js`

## External Dependencies

- D3 (geo, shape, selection)
- Superset `@superset-ui/core`, `@superset-ui/chart-controls`
- React 18
