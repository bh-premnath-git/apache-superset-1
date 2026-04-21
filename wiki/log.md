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
