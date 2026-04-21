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
