## [2026-04-22] fix | Restore District Segments by State to Cartodiagram (Superset 6.1.0 RC)

- Restored `chart.household.district_pie_unified` from `echarts_timeseries_bar`
  back to built-in `cartodiagram` so the panel is a true map with per-district
  pies.
- Re-added `assets/charts/_district_pie_subchart.yaml` and wired it through
  `selectedChartRef: chart.household.district_pie_subchart`.
- Kept readability safeguards from earlier tuning:
  - CARTO Voyager base tiles for clear boundaries
  - linear `chart_size` scaling
  - hidden per-pie labels/legend to avoid tiled label clutter
- Added explicit `chart_size.values` and switched to OpenStreetMap base tiles
  to prevent Explore `ZoomConfigControl` null-object errors and keep a light
  (white) map/background style.
- Updated dashboard/docs text to describe pie-click interaction and the restored
  map behavior.

# Project Knowledge Base Log

## [2026-04-21] bootstrap | initial wiki seed
- Created the first project knowledge base pages under `karpathy/wiki/`.
- Captured the current authoritative architecture around Docker Compose, Superset runtime seeding, dataset/chart/dashboard assets, and plugin/extension maturity.
- Recorded recent operational learnings:
  - `household.hh_master` required SQL import fixes before the dataset became usable.
  - the reconciler was hardened to fail per asset instead of blocking all charts by kind.
  - `dashboard.household.survey` now references `chart.household.rural_segment_comparison`.

## [2026-04-21] runtime | household import and chart creation
- `household.hh_master` was loaded successfully into Postgres with 261953 rows.
- `hh_master` dataset was created in Superset.
- Household charts reconciled successfully.
- Plugin and extension assets were skipped as expected due to missing bundle configuration / immature upstream support.

## [2026-04-21] fix | Handlebars chart configuration
- Added `TALISMAN_CONFIG` with `'unsafe-eval'` in `script-src` to allow Handlebars template compilation.
- Added `ESCAPE_MARKDOWN_HTML: False` and `HTML_SANITIZATION: True` with schema extensions.
- Added `HTML_SANITIZATION_SCHEMA_EXTENSIONS` to whitelist `<style>` tags and `style`/`class` attributes.
- These changes fix both the CSP error and the CSS-rendering-as-plain-text issue for the Rural Segments Comparison chart.
- See apache/superset#25205 and apache/superset#30381.

## [2026-04-21] fix | API CSRF and chart height
- Added `WTF_CSRF_CHECK_DEFAULT = False` to allow programmatic API access via JWT Bearer tokens.
- Added `chartHeight` field support to Dashboard YAML spec (defaults to 50, uses 100 for Household Survey).
- Added `Referer` header to SupersetClient requests for CSRF compliance.
- Full stack reset (`docker compose down -v && up`) completed successfully.
- All 11 assets reconciled with 0 failures:
  - Database, 2 Datasets, 4 Charts, 2 Dashboards
  - 2 assets skipped (Plugin/Extension, expected)

## [2026-04-21] feature | Indian state map and cross-filtering
- Documented NSS (National Sample Survey) data context in wiki and README.
- Added `chart.household.state_map` — Country Map visualization of India with household counts by state.
- Added state map to `dashboard.household.survey` alongside rural segments table.
- Dashboard supports cross-filtering: clicking a state on the map filters the table.
- Uses built-in Country Map (no Mapbox key required), INDIA geoJSON with all 28 states + 8 UTs.

## [2026-04-21] feature | LCA segment charts on Household Survey dashboard
- Added four SQL views in `seed/pg/003_lca_segment_views.sql`, scoped to
  Bihar / Jharkhand / Madhya Pradesh:
  - `household.vw_hh_segments` — per-HH R1-R4 / U1-U3 classification + U15
    minor bucket.
  - `household.vw_district_segment_pie` — weighted per-district segment
    percentages plus cumulative endpoints for CSS conic-gradient pies.
  - `household.vw_segment_minor_bucket` — weighted %-of-HH by U15 bucket
    within each segment (100% per segment).
  - `household.vw_segment_distribution` — weighted segment shares across
    the 3 states (for the pie).
  - `household.vw_state_segment_distribution` — weighted segment shares
    within each state (for the 3-bar stacked bar).
- Added four datasets wrapping the new views and six new chart assets:
  - `chart.household.district_pie_{bihar,jharkhand,madhya_pradesh}` —
    Handlebars grid rendering a CSS conic-gradient pie per district.
  - `chart.household.minor_structure` — echarts stacked bar reproducing the
    "Household Structure — Proportion of Minor (< 15 yrs) (Weighted)" chart.
  - `chart.household.segment_distribution_pie` — overall segment pie.
  - `chart.household.state_segment_distribution_bar` — per-state segment
    stacked bar.
- Extended dashboard auto-layout with `fullWidthFirst` on top of
  `chartsPerRow`: the first N chart refs get their own full-width row and
  the rest pair up by `chartsPerRow`. Household Survey dashboard now uses
  `fullWidthFirst: 2, chartsPerRow: 2` so the Rural Segments table and the
  India state map keep full width while the 6 new LCA charts line up in
  three two-column rows.
- **Operational note:** the new `003_lca_segment_views.sql` only auto-runs
  when the analytics-db volume is initialized for the first time
  (`docker-entrypoint-initdb.d` semantics — see `wiki/runtime/database-seeding.md`).
  Apply it manually with `psql` or recreate the volume
  (`docker compose down -v && docker compose up`) to install the views on
  an existing deployment.

## [2026-04-21] fix | Country Map "Must specify a country" and per-row layout
- Country Map chart failed with `Data error — Must specify a country`.
  Root cause: `household_state_map.yaml` set `country: INDIA` and `iso_code: IND`,
  but the Superset Country Map plugin reads the control `select_country` with a
  lowercase slug (e.g. `india`). Verified against
  `apache/superset` `legacy-plugin-chart-country-map/src/controlPanel.ts` and
  `countries.ts`. Fix: replaced with `select_country: india`.
- Household Survey dashboard rendered the map and the rural segments table
  side-by-side in a single 2-column row because `_auto_grid_layout` always
  emitted a single `ROW-1` with `width = 12 // N`.
- Added per-dashboard `chartsPerRow` spec field (scoped — default preserves
  current single-row behavior). `assets/dashboards/household_survey.yaml` now
  sets `chartsPerRow: 1` so each chart stacks on its own full-width row.
- `DashboardReconciler._sync_layout` now compares the desired layout against
  the existing `position_json` and rewrites it on difference, so layout spec
  changes take effect on re-reconcile without needing to drop the dashboard.

## [2026-04-22] feature | Compose-native plugin build for state_district_pies
- Replaced the "build on host, publish to CDN" flow for the
  `state_district_pies` dynamic plugin with a one-shot `plugin-builder`
  service (`node:lts-alpine3.22`) in `docker-compose.yml`. Builds the UMD
  bundle inside the Compose stack; no host-side Node toolchain needed.
- New named volumes `plugin-dist` and `plugin-node-modules`. `plugin-dist`
  is mounted read-only into `superset` at
  `/app/superset/static/assets/plugins/state-district-pies/` so Superset
  serves the bundle same-origin, and read-only into `superset-runtime-seed`
  at `/plugin-dist/` so the reconciler can resolve the URL.
- Webpack now emits `main.<contenthash>.js` plus `dist/bundle-url.txt`
  (`/static/assets/plugins/state-district-pies/main.<hash>.js`). Content
  hash busts Superset's URL-keyed dynamic-plugin cache on every rebuild.
- New `docker/scripts/reconciler_entrypoint.sh` wraps
  `seed_dashboard.py`: reads `bundle-url.txt` and exports
  `STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL`, but honors an already-set value
  so external-CDN deployments keep working.
- `superset` and `superset-runtime-seed` both `depends_on: plugin-builder`
  with `condition: service_completed_successfully` — reconciler waits for
  a successful build before registering the plugin.
- Rebuild loop:
  `docker compose up -d --force-recreate plugin-builder superset-runtime-seed`
  after editing plugin source.

## [2026-04-21] fix | Household Survey polish — duplicate titles, state-map visibility, cross-filters
- Each district pie chart rendered its title **twice**: once as the Superset
  chart header (from `metadata.name`) and again as an inline
  `<div class="dp-title">` inside the Handlebars template. Removed the inline
  `<div class="dp-title">` and the matching `.dp-title` CSS rule from all
  three district pie charts (`district_pie_{bihar,jharkhand,madhya_pradesh}.yaml`)
  so only the chart header remains.
- The India Country Map ("Households by State") was clipped because every
  chart on the dashboard shared a single `chartHeight`. Added per-chart
  height override support via a new `chartHeights` map on the Dashboard spec
  (keyed by chart ref). Household Survey now sets
  `chartHeights: { chart.household.state_map: 130 }` while keeping the
  default `chartHeight: 100` for the rest.
- Reordered the layout so the India state map sits as its own full-width
  row above the three district pie charts (pies in a single 3-column row
  directly under the map). Used `fullWidthFirst: 2, chartsPerRow: 3` so the
  Rural Segments table and state map stay full width and the remaining six
  charts form two 3-column rows (3 district pies, then 3 summary charts).
- Added **native cross-filtering** support: new `crossFiltersEnabled: true`
  spec field is propagated into the dashboard `json_metadata`
  (`cross_filters_enabled: true`). Clicking a state on the Country Map now
  filters the Rural Segments table and other compatible charts via Superset's
  built-in cross-filter plumbing rather than a dashboard filter-box.
- Reconciler change: `_sync_layout` now also re-applies `json_metadata` when
  `cross_filters_enabled` differs from the existing metadata, preserving any
  other keys that are already present.

## [2026-04-22] refactor | disable plugin-builder, migrate to Cartodiagram
- Disabled the `plugin-builder` service in `docker-compose.yml` (commented out).
  Evaluating Superset 5.0+'s built-in Cartodiagram viz as a zero-code replacement
  for the custom `state_district_pies` dynamic plugin.
- Deleted `assets/charts/household_state_district_pies.yaml` — this chart referenced
  `viz_type: state_district_pies` which is only available via the now-disabled
  custom plugin. The reconciler skips it cleanly; other assets are unaffected.
- Migrated district pie charts to Cartodiagram: `chart.household.district_pie_{bihar,jharkhand,madhya_pradesh}`
  now use `viz_type: cartodiagram` with per-district pie sub-charts plotted at
  district centroids (via `selectedChartRef: chart.household.district_pie_subchart`).
  This replaces the previous Handlebars CSS conic-gradient approach.
- Plugin source under `superset-plugins/plugin-chart-state-district-pies/` is
  preserved for reference but not built or registered.

## [2026-04-22] fix | District Segments by State readability + exploration story
- **Symptom**: The unified Cartodiagram chart rendered an unreadable mat of
  overlapping pie chrome — `All`, `Inv`, `1/2`, `1/3` legend pagination
  buttons appearing on every one of ~112 mini-pies at zoom 5, plus
  `key_percent` labels around every slice. No state/district outlines were
  visible under the clutter.
- **Root cause (sub-chart)**: `show_legend: true` + `legendType: scroll`
  on `_district_pie_subchart.yaml` caused each mini-pie to render its own
  scroll-legend with pagination controls. ECharts legend buttons are not
  configurable via Superset form data, so the only remedy is to hide the
  legend entirely on sub-charts.
- **Root cause (main chart)**: `chart_size.type: FIXED 140×140` across all
  50 zoom levels + OpenStreetMap base tiles. 140 px pies overlap 2–3
  neighbors at zoom 5 when all 112 districts render, and stock OSM tiles
  don't emphasize admin boundaries.
- **Root cause (dashboard)**: State filter had `defaultToFirstItem: false`,
  so the Cartodiagram loaded with all three states' districts piled on top
  of each other.
- **Fix**:
  - `_district_pie_subchart.yaml`: `show_legend: false`, `show_labels: false`,
    `label_type: key`. Segment colors stay consistent via `supersetColors`,
    and the separate **Segment Distribution** pie acts as the shared
    legend.
  - `district_pie_unified.yaml`: switched to `chart_size.type: LINEAR` at
    55×55 px / zoom 6, slope 18 — pies grow smoothly when the reader
    zooms in. Base tile layer swapped to CARTO Voyager (same OSM data,
    clearer admin boundaries for the "state outline / district outline"
    backdrop).
  - `household_survey.yaml`: State filter now `defaultToFirstItem: true`
    so the dashboard loads with Bihar pinned (38 pies, readable).
- **Exploration story documentation**: wrote a new "Data exploration
  story" section in `wiki/assets/dashboard.household.survey.md` covering
  all four narrowing mechanisms (native filters, cross-filters,
  drill-to-detail, drill-by — the latter two are Superset 5.x built-ins
  and need no per-chart config).
- **Filter coverage gap documented**: Sector + Social Group filters
  target only `hh_master` today; the four pre-aggregated LCA views
  (`segment_distribution`, `segment_minor_bucket`,
  `state_segment_distribution`, `mpce_by_segment`) are aggregated by
  segment only. Closing this gap requires rebuilding those views — out
  of scope for this pass.
- **Future path (not activated)**: `india-districts.geojson` plus the
  preserved `superset-plugins/plugin-chart-state-district-pies/` source
  could give us explicit state choropleth + district pie layers. Blocked
  on (a) re-enabling the `plugin-builder` Compose service and (b)
  generating a state-level GeoJSON by dissolving district polygons on
  `NAME_1`. Documented the switch-over steps in the chart wiki.

## [2026-04-22] refactor | unified district pie chart with State filter
- Removed `chart.household.state_map` (Households by State Country Map) from the
  Household Survey dashboard.
- Replaced three separate state Cartodiagrams (`district_pie_bihar`,
  `district_pie_jharkhand`, `district_pie_madhya_pradesh`) with a single
  `chart.household.district_pie_unified` controlled by the dashboard State filter.
- Created `assets/charts/district_pie_unified.yaml` — Cartodiagram showing all
  districts from Bihar/Jharkhand/MP, filterable by state. Defaults to showing
  all three states when unfiltered.
- Updated `dashboard.household.survey` layout: `fullWidthFirst: 2` for rural
  segments table and unified map, `chartsPerRow: 2` for remaining charts.
- Updated State native filter to target both `dataset.household.hh_master` and
  `dataset.household.state_district_segment_geo` so it controls both the table
  and the map visualization.
- Deleted old chart files: `household_state_map.yaml`, `district_pie_bihar.yaml`,
  `district_pie_jharkhand.yaml`, `district_pie_madhya_pradesh.yaml`.

## [2026-04-22] fix | district segments chart rendered blank + drill-by everywhere
- **Symptom**: `District Segments by State` rendered an empty panel. The
  underlying chart was `cartodiagram` with a `pie` sub-chart, which in
  Superset 6.0 fails to mount at each centroid (upstream bug
  https://github.com/apache/superset/issues/34247 — the pie plugin
  throws when instantiated without the full explore-page Redux store
  that the Cartodiagram wrapper stubs only partially).
- **Fix**: Replaced the Cartodiagram viz with an echarts 100% stacked
  bar (`echarts_timeseries_bar`) that renders reliably and shows the
  same `(district, segment, hh_weight)` slice. 45° x-axis label
  rotation keeps ~38 Bihar district names legible; `supersetColors`
  keeps segment colours in sync with every other chart on the
  dashboard.
- **Drill by everywhere**: set `FEATURE_FLAGS["DRILL_BY"] = True` and
  `FEATURE_FLAGS["DRILL_TO_DETAIL"] = True` explicitly in
  `superset_config.py`. Both are upstream-default `True` since Superset
  4.x (PR #26637) but making them explicit locks the dashboard's
  context-menu contract against future default changes. The flags
  expose Drill by / Drill to detail on every echarts, Table, Pivot
  Table and World Map chart — the entire dashboard today except the
  Handlebars Rural Segments table (documented upstream exception).
- **Cleanup**: removed `assets/charts/_district_pie_subchart.yaml` (no
  longer referenced), adjusted `dashboard.household.survey` chart
  heights so the new bar gets enough vertical room (80 instead of the
  compact 55), refreshed the chart + dashboard wiki pages.
- Updated wiki documentation: new page for unified chart, updated dashboard page,
  updated reconciler-engine example, updated index.
