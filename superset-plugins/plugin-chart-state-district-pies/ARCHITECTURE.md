# Plugin Architecture: state_district_pies

## Overview

Custom Superset visualization plugin rendering an India state choropleth with district-level pie overlays. Clicking a district pie opens an in-plugin detail page that compares rural vs urban segment composition for the selected district.

## Directory Structure

```
src/
├── components/                    # React UI
│   ├── StateDistrictPies.tsx       # Layout shell (composition + hover)
│   ├── DistrictDetailView.tsx      # Detail page (rural/urban comparison)
│   ├── SegmentComparisonTable.tsx  # Per-section breakdown table
│   ├── DistrictPie.tsx             # Single district's pie overlay
│   ├── StateLayer.tsx              # Choropleth base
│   ├── Legend.tsx                  # Category color legend
│   ├── Tooltip.tsx                 # Hover detail panel
│   └── Breadcrumb.tsx              # Drill navigation
├── data/                          # Pure data helpers (no React)
│   ├── normalize.ts                # Canonical key normalisation + alias map
│   └── splitWedges.ts              # Bucket wedges into rural/urban/other
├── hooks/                         # React hooks
│   ├── useGeoJson.ts               # Async GeoJSON fetch with module cache
│   ├── useDrillDown.ts             # 4-level drill state machine
│   └── useResolvedFeatureProps.ts  # Feature-prop auto-detection + dissolved outline
├── plugin/                        # Superset integration (pure)
│   ├── index.ts                    # ChartPlugin registration
│   ├── buildQuery.ts               # FormData → query context
│   ├── controlPanel.ts             # Editor controls
│   └── transformProps.ts           # Query response → ChartProps
├── geo/                           # Geographic utilities
│   ├── centroids.ts                # Feature centroid computation
│   └── projection.ts               # D3-geo Mercator fitting
├── format.ts                      # Number / percent formatting helpers
├── constants.ts                   # Defaults (colors, radii, segment groups)
├── types.ts                       # TypeScript contracts
└── index.ts                       # Package entry
```

## Component Hierarchy

```
StateDistrictPies                        (orchestrator, ~290 lines)
├── Breadcrumb
├── StateLayer                            (choropleth)
├── DistrictPie[]                         (centroid pies)
│   └── d3 arcs
├── Legend                                (conditional)
├── Tooltip                               (conditional)
└── DistrictDetailView                    (drill level "detail")
    ├── SegmentComparisonTable [Rural]    (table: count, % section, % district, bar)
    └── SegmentComparisonTable [Urban]    (same)
```

## Drill-down State Machine

Implemented as `useDrillDown()` hook (`src/hooks/useDrillDown.ts`).

```
india (level 0)
  → click state → state (level 1)
    → click district → district (level 2)
      → click pie → detail (level 3)
        → ← back → district → state → india
```

Breadcrumb labels: `India > State > District > Details`.

District pie clicks deliberately do **not** emit cross-filter events — that would refresh the dashboard and reset local drill state. Cross-filter is still wired through `transformProps` for callers that build their own click handler.

## Data Flow

1. **`buildQuery`** — `formData` → `QueryContext` (groupby: state, district, category).
2. **`transformProps`** — long-form rows → `DistrictRow[]` with wedges, plus precomputed `ruralWedges` / `urbanWedges` based on the configured category lists.
3. **`useResolvedFeatureProps`** — autodetects best join properties on the GeoJSON when the operator's hint doesn't match (e.g. `NAME_1` vs `ST_NM`). Also produces a **dissolved state outline** geometry so the India-zoom layer doesn't show 594 internal district borders.
4. **`splitWedges`** — used by the detail page to render rural / urban side-by-side. Leaves anything outside both groups in an "other" total surfaced as a footer note.
5. **Render** — `StateDistrictPies` composes children using a single shared D3 projection so pies sit pixel-perfectly on districts.

## Configurable segment groups

The plugin ships with LCA defaults (`R1–R4`, `U1–U3`) but is **schema-agnostic**: the `Detail page segments` control panel exposes `Rural categories` and `Urban categories` as comma-separated lists. `transformProps` parses them via `parseCategoryList` so dashboards on different category vocabularies work without code changes.

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Static bundling | Avoids `DYNAMIC_PLUGINS` 404 in Superset 6.x |
| Same-origin GeoJSON | CSP compliance, no CORS issues |
| Local drill-down | Prevents dashboard filter reset |
| Shared D3 projection | Pixel-perfect pie / district alignment |
| Pure data helpers in `src/data/` | Unit-testable without React renderer |
| Config-driven segment grouping | No hard-coded LCA codes; reusable for other surveys |

## Files Reference

- Orchestrator: `src/components/StateDistrictPies.tsx`
- Detail page: `src/components/DistrictDetailView.tsx`
- Section table: `src/components/SegmentComparisonTable.tsx`
- Plugin registration: `src/plugin/index.ts`
- Types: `src/types.ts`
- Build: `webpack.config.js`

## External Dependencies

- D3 (geo, shape, scale, scale-chromatic, selection)
- Superset `@superset-ui/core`, `@superset-ui/chart-controls` (peer)
- React 18 (peer)
