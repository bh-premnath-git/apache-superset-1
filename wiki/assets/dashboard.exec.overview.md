# dashboard.exec.overview

## Purpose

Sample executive dashboard built on the sales dataset.

## Source of truth
- File: `assets/dashboards/executive_overview.yaml`
- Kind: `Dashboard`
- Runtime name: `Executive Overview`
- slug: `executive-overview`

## Current chart refs
- `chart.sales.monthly_revenue`
- `chart.sales.revenue_by_country`
- `chart.sales.order_count_trend`

## Operational role

This dashboard is the baseline demo asset set in the repo. It is useful as a reference path for confirming that the reconciler, analytics DB connection, and Superset API are functioning normally.

## Related files
- `assets/dashboards/executive_overview.yaml`
- `assets/charts/monthly_revenue.yaml`
- `assets/charts/revenue_by_country.yaml`
- `assets/charts/order_count_trend.yaml`

## Related pages
- [dataset.sales.orders](dataset.sales.orders.md)
- [Chart Visibility in UI](../troubleshooting/chart-visibility-in-ui.md)
