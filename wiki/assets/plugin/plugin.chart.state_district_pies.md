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

## Detail page

### Layout

Top-to-bottom inside the detail panel:

1. Header — district name, state, total households, rural %, urban %.
2. **Rural Segments** — comparison table (count, % within section, % of district, proportional bar).
3. **Urban Segments** — comparison table (same shape).
4. **Rich per-segment metrics** — wide grouped table with all per-segment metrics, fetched on demand. Opt-in.
5. Optional "other" footer note when the configured rural/urban groups don't account for every category.

The basic Rural / Urban tables use only data already in the chart's primary query; they always render. The rich metrics table is only rendered when `metrics_datasource` is configured.

### Segment groups (control-panel)

The per-district detail page uses two control-panel fields to bucket wedges into rural and urban sections:

- `rural_categories` (default: `R1,R2,R3,R4`)
- `urban_categories` (default: `U1,U2,U3`)

Both accept comma-separated category codes. Anything outside both lists is summed into an "other" footer note so unexpected codes are still surfaced.

### Rich per-segment metrics (opt-in)

When `metrics_datasource` is configured the detail page issues a runtime `POST /api/v1/chart/data` call (via `SupersetClient`) scoped to the selected (state, district), then renders a wide grouped table — visually consistent with the previously-deleted `rural_segment_comparison.yaml` handlebars dashboard tile but driven entirely by config.

| Field                      | Default        | Notes |
|----------------------------|----------------|-------|
| `metrics_datasource`       | *(empty)*      | Numeric Superset dataset id queried per district. Empty = disabled, basic tables still render. |
| `metrics_state_column`     | `State_label`  | Column on the metrics dataset used to filter by state. |
| `metrics_district_column`  | `District`     | Column on the metrics dataset used to filter by district. |
| `metrics_segment_column`   | `segment`      | Group-by column on the metrics dataset that returns segment codes. |
| `metrics_definitions`      | 13 LCA defaults | JSON array of `{label, sql, format, group}`. |

`format` is one of `percent` / `rupee` / `number`. `group` is one of `size` / `econ` / `digi` / `cap` / `wel`, driving the coloured column-band header that mirrors the original handlebars template.

Cache key: (datasource, state, district, defs hash). Module-scoped, so multi-chart dashboards do not refetch.

### Segment description modal

Clicking any segment label (`R1`, `R2`, `U1`, …) on the basic comparison or rich metrics tables opens a plain overlay modal carrying operator-supplied copy. Source: the `segment_descriptions` JSON control:

```json
{
  "R1": {
    "title": "Rural — Tier 1",
    "summary": "Connected, asset-rich rural households.",
    "criteria": ["Asset score ≥ 2", "Digital score ≥ 2"],
    "interventions": ["Premium digital products", "Up-skilling"]
  }
}
```

Codes missing from the JSON still open the modal — they show a stub note pointing at the control-panel field.

## UX contract

- Drill path: `India -> State -> District -> Details`
- Breadcrumb-based navigation, implemented as `useDrillDown()` hook.
- Pie clicks stay local to the chart and never trigger dashboard cross-filter refresh.

## Module layout

| File | Purpose |
|------|---------|
| `src/components/StateDistrictPies.tsx` | Layout shell |
| `src/components/DistrictDetailView.tsx` | Detail page (composes basic + rich + modal) |
| `src/components/SegmentComparisonTable.tsx` | Per-section breakdown |
| `src/components/DetailMetricsTable.tsx` | Wide per-segment metrics table |
| `src/components/SegmentModal.tsx` | Segment description modal |
| `src/data/normalize.ts` | Canonical key normalisation + alias map |
| `src/data/splitWedges.ts` | Wedge bucketing |
| `src/data/buildMetricsQuery.ts` | `/api/v1/chart/data` body builder |
| `src/data/segmentDescriptions.ts` | Segment-code → description lookup |
| `src/hooks/useDrillDown.ts` | Drill-state machine |
| `src/hooks/useResolvedFeatureProps.ts` | Join-prop auto-detection |
| `src/hooks/useGeoJson.ts` | Async fetch + module cache |
| `src/hooks/useDetailMetrics.ts` | Per-district metrics fetch + cache |
| `src/plugin/transformProps.ts` | Long-form → wedge folding + JSON parsing |
| `src/plugin/controlPanel.ts` | Editor controls |

## Important implementation notes

- District pie clicks deliberately do **not** emit dashboard filter events. Dashboard refresh would reset local drill state. Cross-filter is still wired for callers that bypass the local drill UI.
- `data/normalize.ts` is the single source of truth for state/district alias reconciliation (e.g. "Orissa" ↔ "Odisha"). All components route lookups through it.
- The runtime `POST /api/v1/chart/data` path uses host-supplied `SupersetClient`, so CSRF / auth headers are handled automatically.
- Both the metric definitions and segment descriptions parsers fall back to the bundled defaults on malformed JSON, so an admin pasting bad JSON cannot brick the chart.
- Pure helpers in `src/data/` and `src/format.ts` are unit-tested without React (see `test/normalize.test.ts`, `test/splitWedges.test.ts`, `test/buildMetricsQuery.test.ts`, `test/segmentDescriptions.test.ts`).
