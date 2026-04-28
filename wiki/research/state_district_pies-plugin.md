# Research: `state_district_pies` Plugin

## Objective

Provide a single interactive chart experience for:

- India / state / district geospatial navigation
- District pie overlays by category
- In-plugin per-district detail page with rural vs urban breakdown

## Current UX pattern

- Drill levels: `india -> state -> district -> detail`
- Breadcrumb-based navigation
- Detail page shows a Rural | Urban comparison table (count, % within section, % of district, proportional bar)
- Visually aligned with the dashboard handlebars `Rural Segments Comparison` table; limited to data already in the chart query

## Technical shape

- Layout shell: `src/components/StateDistrictPies.tsx`
- Detail page: `src/components/DistrictDetailView.tsx`
- Section table: `src/components/SegmentComparisonTable.tsx`
- Pie renderer: `src/components/DistrictPie.tsx`
- Pure helpers: `src/data/normalize.ts`, `src/data/splitWedges.ts`, `src/format.ts`
- Hooks: `src/hooks/useDrillDown.ts`, `src/hooks/useResolvedFeatureProps.ts`, `src/hooks/useGeoJson.ts`
- Geo utilities: `src/geo/projection.ts`, `src/geo/centroids.ts`
- Data transform: `src/plugin/transformProps.ts`

## Architecture principles applied

- **Pure data helpers, no React** under `src/data/` so they're unit-testable in `node` jest env.
- **Drill state lives in a hook** (`useDrillDown`) so the orchestrator stays focused on layout.
- **Feature-prop auto-detection** lives in `useResolvedFeatureProps` instead of being inlined; supports geo files with `NAME_1` / `ST_NM` / `STATE` / `name` and `NAME_2` / `DISTRICT` / `district` / etc.
- **Schema-agnostic segment groups.** Rural/urban category codes come from the control panel rather than being hard-coded regex.

## Key integration decisions

- Plugin is statically bundled into Superset frontend (no dynamic plugin runtime fetch).
- GeoJSON is fetched from same-origin static path (`/static/assets/india-districts.geojson`) and cached at module scope.
- Drill-down behaviour is kept local in chart UI to avoid dashboard refresh resetting state.

## Known follow-up opportunities

- **Option B (deferred):** Augment the detail page with the rich metrics rendered by the dashboard handlebars `Rural Segments Comparison` chart (food spend, MCPE, internet use, welfare programs). Requires either a second `buildQuery` path or a follow-up Superset chart-data fetch on detail-page open.
- Add screenshot examples for each drill level.
- Consider a sibling `Urban Segments Comparison` handlebars chart paralleling the rural one.
