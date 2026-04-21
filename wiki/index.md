# Project Knowledge Base Index

## Overview
- [Project Overview](overview.md) — What this repository is, how it runs, and what is authoritative.

## Architecture
- [Reconciler Engine](architecture/reconciler-engine.md) — How `docker/scripts/seed_dashboard.py` discovers, orders, and applies assets.

## Runtime
- [Database Seeding](runtime/database-seeding.md) — How `seed/pg` files reach Postgres and why new SQL files do not auto-apply to existing volumes.

## Assets
- [db.analytics](assets/db.analytics.md) — Declarative analytics database connection used by datasets.
- [dataset.household.hh_master](assets/dataset.household.hh_master.md) — Household survey dataset over `household.hh_master`.
- [dataset.sales.orders](assets/dataset.sales.orders.md) — Sample sales dataset over `mart_sales.orders`.
- [chart.household.state_map](assets/chart.household.state_map.md) — Interactive India map (Country Map viz) showing households by state.
- [chart.household.rural_segment_comparison](assets/chart.household.rural_segment_comparison.md) — Handlebars-based rural segment comparison table.
- [dashboard.household.survey](assets/dashboard.household.survey.md) — Household dashboard with India state map and rural comparison table, supports cross-filtering.
- [dashboard.exec.overview](assets/dashboard.exec.overview.md) — Sample executive dashboard for sales analytics.

## Troubleshooting
- [Chart Visibility in UI](troubleshooting/chart-visibility-in-ui.md) — Root causes and checks when datasets/charts/dashboards do not appear.

## Research
- [Plugins vs Extensions](research/plugins-vs-extensions.md) — Current maturity and operational difference between dynamic plugins and the extension framework.

## Conventions
- Prefer reading the smallest relevant page first.
- Treat linked repo files as authoritative when this wiki and code diverge.
- Update this index when new durable pages are added.
