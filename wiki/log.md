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
- Household and sales charts reconciled successfully.
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
