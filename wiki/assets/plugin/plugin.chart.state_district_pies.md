# Plugin: `state_district_pies`

- Source package: `superset-plugins/plugin-chart-state-district-pies/`
- Runtime registration: static, via `docker/frontend-build/register-plugin.mjs`
- Runtime loading mode: bundled in SPA (not dynamic plugin API)

## Why static registration

- Avoids `DYNAMIC_PLUGINS` runtime fetch path (`/dynamic-plugins/api/read`) issues on Superset 6.0/6.1.
- Keeps plugin available at app startup without module federation runtime dependency.

## Data contract (high level)

- Grouping columns: `state_column`, `district_column`, `category_column`
- Metric: numeric aggregate (drives wedge size and pie outer radius)
- GeoJSON join properties:
  - `state_feature_key_prop` (auto-falls-back to `NAME_1` / `ST_NM` / `STATE` / `name`)
  - `district_feature_key_prop` (auto-falls-back to `NAME_2` / `DISTRICT` / `district` / `name`)

## Detail page segment groups

The per-district detail page uses two control-panel fields to bucket wedges into rural and urban sections:

- `rural_categories` (default: `R1,R2,R3,R4`)
- `urban_categories` (default: `U1,U2,U3`)

Both accept comma-separated category codes. Anything outside both lists is summed into an "other" footer note so unexpected codes are still surfaced.

## UX contract

- Drill path: `India -> State -> District -> Details`
- Breadcrumb-based navigation, implemented as `useDrillDown()` hook.
- Detail page renders **two side-by-side comparison tables** (Rural / Urban) with per-segment count, % within section, % of district, and a horizontal proportional bar — visually consistent with the dashboard handlebars `Rural Segments Comparison` chart, but limited to the data the chart already queries.
- Pie clicks stay local to the chart and never trigger dashboard cross-filter refresh.

## Module layout

| File | Purpose |
|------|---------|
| `src/components/StateDistrictPies.tsx` | Layout shell |
| `src/components/DistrictDetailView.tsx` | Detail page |
| `src/components/SegmentComparisonTable.tsx` | Per-section breakdown |
| `src/data/normalize.ts` | Canonical key normalisation + alias map |
| `src/data/splitWedges.ts` | Wedge bucketing |
| `src/hooks/useDrillDown.ts` | Drill-state machine |
| `src/hooks/useResolvedFeatureProps.ts` | Join-prop auto-detection |
| `src/hooks/useGeoJson.ts` | Async fetch + module cache |
| `src/plugin/transformProps.ts` | Long-form → wedge folding |
| `src/plugin/controlPanel.ts` | Editor controls (incl. segment groups) |

## Important implementation notes

- District pie clicks deliberately do **not** emit dashboard filter events. Dashboard refresh would reset local drill state. Cross-filter is still wired for callers that bypass the local drill UI.
- `data/normalize.ts` is the single source of truth for state/district alias reconciliation (e.g. "Orissa" ↔ "Odisha"). All components route lookups through it.
- Pure helpers in `src/data/` and `src/format.ts` are unit-tested without React (see `test/normalize.test.ts`, `test/splitWedges.test.ts`).
