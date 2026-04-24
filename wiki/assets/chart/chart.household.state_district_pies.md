# chart.household.state_district_pies

> **⚠️ Plugin currently disabled pending Cartodiagram spike — see log 2026-04-22**
>
> This chart asset has been deleted. The `state_district_pies` custom dynamic
> plugin is not being built (plugin-builder disabled).
>
> **Update 2026-04-22**: The three separate state Cartodiagrams that temporarily
> replaced this plugin have been consolidated into a single unified chart
> (`chart.household.district_pie_unified`) controlled by the dashboard State filter.
> See [chart.household.district_pie_unified](chart.household.district_pie_unified.md).

## Purpose

India state choropleth with a small proportional pie overlaid at every
district's geographic centroid. The pie wedges encode the LCA segment mix
(R1–R4 rural, U1–U3 urban) and the pie radius encodes the total household
weight in that district.

This chart reproduces the reference screenshot used for the Household
Survey dashboard redesign. No built-in Superset viz can render the two
layers together — a custom dynamic plugin was built for this purpose.

## Source of truth

- File: `assets/charts/household_state_district_pies.yaml`
- Kind: `Chart`
- Runtime name: `State + District Segment Pies`
- `vizType`: `state_district_pies` (custom, provided by `plugin.chart.state_district_pies`)

## Upstream dependencies

- `dataset.household.state_district_segment` — long-form
  `(state_iso_code, state_label, district_code, segment, hh_weight)` view.
- `plugin.chart.state_district_pies` — dynamic plugin that supplies the
  `state_district_pies` viz type.

## Configuration highlights

### Query binding
- **State column**: `state_iso_code` (ISO 3166-2:IN — joins to the state geojson's `ISO` property).
- **District column**: `district_code` (joins to the district geojson's `censuscode` property).
- **Category column**: `segment` (one wedge per distinct value: R1–R4, U1–U3).
- **Metric**: `SUM(hh_weight)`.

### Map sources
- **State geojson URL**: `/static/assets/geojson/india.geojson` (the same file
  Superset's bundled Country Map plugin uses — already served from the
  container).
- **District geojson URL**: `/static/assets/geojson/india-districts.geojson`.
  This file is **not bundled with Superset**; it must be published to the
  container's static volume before the chart can render correctly.

### Customize
- `color_scheme: supersetDefault` — overridden per-category by the palette
  in `src/constants.ts` so R1/R2/R3/R4 and U1/U2/U3 share the same colors as
  the Handlebars-based district pie charts elsewhere on the dashboard.
- `min_pie_radius: 5`, `max_pie_radius: 20` — radii are scaled by
  `√ hh_weight` so a district with 4× the households gets a 2× radius pie,
  matching the perceptual cues `country_map` already uses for color ramps.
- `show_legend: true`, `show_tooltip: true`.

## Cross-filter behavior

Clicking a district pie fires `setDataMask` with `IN` filters on both the
state and district columns:

| Action | Effect |
|--------|--------|
| Click a pie | Applies `state_iso_code IN [X]` + `district_code IN [Y]` cross-filter |
| Click again | Clears the filter |
| Click a second district | Replaces the previous selection |

## Failure modes

| Symptom | Cause | Fix |
|--------|-------|-----|
| Chart shows "GeoJSON fetch failed" | Either URL is 404 or CORS-blocked | Publish geojson at the configured URL; confirm it resolves via curl on the container |
| Base map renders, no pies | District geojson loaded but no `censuscode` matches data | Confirm `district_feature_key_prop` matches the property name in the geojson; confirm codes in data and geojson use the same encoding (e.g. both census 2011) |
| "Unknown viz type" placeholder | Dynamic plugin bundle not registered | Confirm `plugin-builder` exited 0 (`docker compose logs plugin-builder`) and `/plugin-dist/bundle-url.txt` is populated; the `reconciler_entrypoint.sh` wrapper exports `STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL` from that file. For CDN-hosted bundles, set the env var explicitly before `docker compose up`. |
| Pies clipping at state borders | Centroid fell near a coastline or disputed region | Use a higher-fidelity geojson — the default 5% simplification places a few centroids poorly |

## Related files

- `assets/charts/household_state_district_pies.yaml`
- `assets/datasets/lca_state_district_segment.yaml`
- `assets/plugins/state_district_pies.yaml`
- `seed/pg/003_lca_segment_views.sql` (view `vw_state_district_segment`)
- `superset-plugins/plugin-chart-state-district-pies/`

## Related pages

- [plugin.chart.state_district_pies](../plugin/plugin.chart.state_district_pies.md)
- [chart.household.district_pie_unified](chart.household.district_pie_unified.md) — Current unified Cartodiagram approach
- [dataset.household.hh_master](dataset.household.hh_master.md)
