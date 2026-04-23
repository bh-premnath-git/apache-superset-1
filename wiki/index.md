# Project Knowledge Base Index

## Overview
- [Project Overview](overview.md) — What this repository is, how it runs, and what is authoritative.

## Architecture
- [Reconciler Engine](architecture/reconciler-engine.md) — How `docker/scripts/seed_dashboard.py` discovers, orders, and applies assets.
- [Custom Viz Plugin](architecture/custom-viz-plugin.md) — Source layout, data pipeline, and deployment flow for the `state_district_pies` dynamic plugin.

## Runtime
- [Database Seeding](runtime/database-seeding.md) — How `seed/pg` files reach Postgres and why new SQL files do not auto-apply to existing volumes.

## Assets
- [db.analytics](assets/db.analytics.md) — Declarative analytics database connection used by datasets.
- [dataset.household.hh_master](assets/dataset.household.hh_master.md) — Household survey dataset over `household.hh_master`.
- [dataset.household.state_district_segment_geo](assets/dataset.household.state_district_segment_geo.md) — LCA segment dataset with district centroids used by the district Cartodiagram.
- [chart.household.rural_segment_comparison](assets/chart.household.rural_segment_comparison.md) — Handlebars-based rural segment comparison table.
- [chart.household.district_pie_unified](assets/chart.household.district_pie_unified.md) — Cartodiagram map with district pies (state-filterable), powered by `geometry` centroids and a pie sub-chart.
- `chart.household.minor_structure` — 100%-stacked bar of U15 minor buckets by LCA segment.
- `chart.household.segment_distribution_pie` — weighted overall segment mix across the three states.
- `chart.household.state_segment_distribution_bar` — weighted segment mix within each state (3 bars).
- [dashboard.household.survey](assets/dashboard.household.survey.md) — Household dashboard with rural comparison table and state-filterable district-segment map.

### Historical/deprecated
- [chart.household.state_map](assets/chart.household.state_map.md) — **Removed** (was Country Map viz showing households by state).
- [chart.household.state_district_pies](assets/chart.household.state_district_pies.md) — Custom dynamic plugin (disabled, see log 2026-04-22).

## Troubleshooting
- [Chart Visibility in UI](troubleshooting/chart-visibility-in-ui.md) — Root causes and checks when datasets/charts/dashboards do not appear.

## Research
- [Plugins vs Extensions](research/plugins-vs-extensions.md) — Current maturity and operational difference between dynamic plugins and the extension framework.

## Conventions
- Prefer reading the smallest relevant page first.
- Treat linked repo files as authoritative when this wiki and code diverge.
- Update this index when new durable pages are added.
