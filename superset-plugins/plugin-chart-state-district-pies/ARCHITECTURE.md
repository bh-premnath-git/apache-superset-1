# Plugin Architecture: state_district_pies

## Overview

Custom Superset visualization plugin rendering an India state choropleth with district-level pie overlays. Clicking a district pie opens an in-plugin detail page that compares rural vs urban segment composition for the selected district and (optionally) a wide per-segment metrics table fetched on demand from a configurable dataset. Clicking a segment label opens a modal with operator-supplied description copy.

## Directory Structure

```
src/
├── components/                    # React UI
│   ├── StateDistrictPies.tsx       # Layout shell (composition + hover)
│   ├── DistrictDetailView.tsx      # Detail page (rural/urban + rich)
│   ├── SegmentComparisonTable.tsx  # Per-section breakdown table
│   ├── DetailMetricsTable.tsx      # Wide per-segment metrics table
│   ├── SegmentModal.tsx            # Segment description modal
│   ├── DistrictPie.tsx             # Single district's pie overlay
│   ├── StateLayer.tsx              # Choropleth base
│   ├── Legend.tsx                  # Category color legend
│   ├── Tooltip.tsx                 # Hover detail panel
│   └── Breadcrumb.tsx              # Drill navigation
├── data/                          # Pure data helpers (no React)
│   ├── normalize.ts                # Canonical key normalisation + alias map
│   ├── splitWedges.ts              # Bucket wedges into rural/urban/other
│   ├── buildMetricsQuery.ts        # /api/v1/chart/data body builder
│   └── segmentDescriptions.ts      # Segment description lookup
├── hooks/                         # React hooks
│   ├── useGeoJson.ts               # Async GeoJSON fetch with module cache
│   ├── useDrillDown.ts             # 4-level drill state machine
│   ├── useResolvedFeatureProps.ts  # Feature-prop auto-detection + dissolved outline
│   └── useDetailMetrics.ts         # Per-district metrics fetch + module cache
├── plugin/                        # Superset integration (pure)
│   ├── index.ts                    # ChartPlugin registration
│   ├── buildQuery.ts               # FormData → query context
│   ├── controlPanel.ts             # Editor controls
│   └── transformProps.ts           # Query response → ChartProps
├── geo/                           # Geographic utilities
│   ├── centroids.ts                # Feature centroid computation
│   └── projection.ts               # D3-geo Mercator fitting
├── format.ts                      # Number / percent formatting helpers
├── constants.ts                   # Defaults (colors, radii, segment groups, metric defs, descriptions)
├── types.ts                       # TypeScript contracts
└── index.ts                       # Package entry
```

## Component Hierarchy

```
StateDistrictPies                          (orchestrator)
├── Breadcrumb
├── StateLayer                              (choropleth)
├── DistrictPie[]                           (centroid pies)
│   └── d3 arcs
├── Legend                                  (conditional)
├── Tooltip                                 (conditional)
└── DistrictDetailView                      (drill level "detail")
    ├── Header (district / state / totals)
    ├── SegmentComparisonTable [Rural]      (always; data already in props)
    ├── SegmentComparisonTable [Urban]      (always; data already in props)
    ├── DetailMetricsTable [Rural — All]    (opt-in: needs metrics_datasource)
    ├── DetailMetricsTable [Urban — All]    (opt-in)
    └── SegmentModal                        (opens on segment click)
```

## Drill-down State Machine

Implemented as `useDrillDown()` hook (`src/hooks/useDrillDown.ts`).

```
india (level 0)
  → click state → state (level 1)
    → click district → district (level 2)
      → click pie → detail (level 3)
        → ← back via breadcrumb → district → state → india
```

District pie clicks deliberately do **not** emit cross-filter events — that would refresh the dashboard and reset local drill state.

## Data Flow

1. **`buildQuery`** — `formData` → `QueryContext` (groupby: state, district, category).
2. **`transformProps`** — long-form rows → `DistrictRow[]` with wedges, plus precomputed `ruralWedges` / `urbanWedges` based on the configured category lists. Also parses `metrics_definitions` and `segment_descriptions` JSON with safe fallbacks.
3. **`useResolvedFeatureProps`** — autodetects best join properties on the GeoJSON when the operator's hint doesn't match. Also produces a **dissolved state outline** geometry so the India-zoom layer doesn't show 594 internal district borders.
4. **`splitWedges`** — used by the detail page to render rural / urban tables. Anything outside both groups goes into an "other" total surfaced as a footer note.
5. **`useDetailMetrics`** — when `metricsDatasourceId` is set, fires a runtime `POST /api/v1/chart/data` (via `SupersetClient`) scoped to the selected (state, district). Module-scoped cache keyed on (datasource, state, district, defs hash) means subsequent visits to the same district hit the cache.
6. **Render** — `StateDistrictPies` composes children using a single shared D3 projection so pies sit pixel-perfectly on districts.

## Configurable surfaces

| Control | Purpose |
|---------|---------|
| `rural_categories`, `urban_categories` | Which category codes go into each detail-page bucket. Defaults: LCA `R1–R4` / `U1–U3`. |
| `metrics_datasource` | Numeric Superset dataset id queried for the rich detail table. Empty = disabled. |
| `metrics_state_column`, `metrics_district_column`, `metrics_segment_column` | Column names on the metrics dataset. |
| `metrics_definitions` | JSON array of `{label, sql, format, group}` driving the rich table columns and their colour bands. |
| `segment_descriptions` | JSON keyed by segment code with `{title, summary, criteria, interventions}` — content of the modal opened from segment-label clicks. |

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Static bundling | Avoids `DYNAMIC_PLUGINS` 404 in Superset 6.x |
| Same-origin GeoJSON | CSP compliance, no CORS issues |
| Local drill-down | Prevents dashboard filter reset |
| Shared D3 projection | Pixel-perfect pie / district alignment |
| Pure data helpers in `src/data/` | Unit-testable without React renderer |
| Config-driven segment grouping | No hard-coded LCA codes |
| Runtime second fetch via `SupersetClient` | `buildQuery` runs once at chart load — we cannot scope a query to a district that hasn't been clicked yet |
| Plain modal overlay | Avoids dragging antd / Superset modal CSS into the federated bundle |
| Module-scoped LRU caches (geojson, metrics) | Multi-chart dashboards don't refetch the same data |

## Files Reference

- Orchestrator: `src/components/StateDistrictPies.tsx`
- Detail page: `src/components/DistrictDetailView.tsx`
- Section table: `src/components/SegmentComparisonTable.tsx`
- Rich metrics table: `src/components/DetailMetricsTable.tsx`
- Segment modal: `src/components/SegmentModal.tsx`
- Plugin registration: `src/plugin/index.ts`
- Types: `src/types.ts`
- Build: `webpack.config.js`

## External Dependencies

- D3 (geo, shape, scale, scale-chromatic, selection)
- Superset `@superset-ui/core`, `@superset-ui/chart-controls` (peer)
- React 18 (peer)
