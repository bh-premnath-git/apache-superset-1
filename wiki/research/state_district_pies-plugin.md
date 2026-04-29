# Research: `state_district_pies` Plugin

## Objective

Provide a single interactive chart experience for:

- India / state / district geospatial navigation
- District pie overlays by category
- In-plugin per-district detail page with rural vs urban breakdown
- On-demand rich per-segment metrics scoped to the selected district
- Operator-supplied segment descriptions accessible from the detail page

## Current UX pattern

- Drill levels: `india -> state -> district -> detail`
- Breadcrumb-based navigation
- Detail page is a vertically stacked layout:
  1. Rural segment comparison table (intra-section share, % of district, mini-bar)
  2. Urban segment comparison table (same shape)
  3. Rich grouped per-segment metrics tables (Rural / Urban) — opt-in via `metrics_datasource`
- Clicking a segment label opens the segment description modal.

## Technical shape

- Layout shell: `src/components/StateDistrictPies.tsx`
- Detail page: `src/components/DistrictDetailView.tsx`
- Section table: `src/components/SegmentComparisonTable.tsx`
- Rich metrics table: `src/components/DetailMetricsTable.tsx`
- Segment modal: `src/components/SegmentModal.tsx`
- Pie renderer: `src/components/DistrictPie.tsx`
- Pure helpers: `src/data/normalize.ts`, `src/data/splitWedges.ts`, `src/data/buildMetricsQuery.ts`, `src/data/segmentDescriptions.ts`, `src/format.ts`
- Hooks: `src/hooks/useDrillDown.ts`, `src/hooks/useResolvedFeatureProps.ts`, `src/hooks/useGeoJson.ts`, `src/hooks/useDetailMetrics.ts`
- Geo utilities: `src/geo/projection.ts`, `src/geo/centroids.ts`
- Data transform: `src/plugin/transformProps.ts`

## Architecture principles applied

- **Pure data helpers, no React** under `src/data/` so they're unit-testable in `node` jest env.
- **Drill state lives in a hook** (`useDrillDown`) so the orchestrator stays focused on layout.
- **Feature-prop auto-detection** lives in `useResolvedFeatureProps`; supports geo files with `NAME_1` / `ST_NM` / `STATE` / `name` and `NAME_2` / `DISTRICT` / `district` / etc.
- **Schema-agnostic segment groups.** Rural/urban category codes come from the control panel rather than being hard-coded regex.
- **Schema-agnostic detail metrics.** The rich per-segment metrics table is driven by an operator-supplied JSON array of `{label, sql, format, group}` entries. Default vocabulary mirrors the deleted `rural_segment_comparison.yaml` SQL so the existing dashboard works out of the box.
- **Schema-agnostic segment descriptions.** Modal copy comes from operator-supplied JSON; missing codes still render with a stub note.
- **Two-query data path.** The chart's primary query stays groupby (state, district, category). The detail page issues a *second* request through `SupersetClient.post('/api/v1/chart/data')` only when a district is selected, so it can scope filters at click time. Module-scoped LRU cache keyed on (datasource, state, district, defs hash).

## Key integration decisions

- Plugin is statically bundled into Superset frontend (no dynamic plugin runtime fetch).
- GeoJSON is fetched from same-origin static path (`/static/assets/india-districts.geojson`) and cached at module scope.
- Drill-down behaviour is kept local in chart UI to avoid dashboard refresh resetting state.
- Modal is a plain overlay rather than antd / Superset modal — keeps the federated bundle small and avoids host CSS leaks.

## Status of follow-ups from prior research

- ~~**Option B (deferred):**~~ **Implemented.** Detail page now fetches the rich per-segment metrics on demand via `SupersetClient`. Dataset, columns, and metric SQL are all operator-controlled.
- ~~Sibling `Urban Segments Comparison` handlebars chart~~ — superseded; the rich detail page renders both rural and urban tables inside the plugin.

## Open follow-ups

- Screenshot examples for each drill level.
- Optionally allow per-metric label overrides via i18n.
- Consider exposing the segment description JSON as a separate Superset dataset for centralised editing rather than per-chart copy.
