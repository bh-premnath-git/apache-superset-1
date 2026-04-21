# dataset.sales.orders

## Purpose

Sample sales dataset over `mart_sales.orders` used by the demo dashboard and charts.

## Source of truth
- File: `assets/datasets/sales_orders.yaml`
- Kind: `Dataset`
- Runtime name: `sales_orders`

## Dependencies
- `db.analytics`

## Physical table
- schema: `mart_sales`
- table: `orders`
- time column: `order_date`

## Declared metrics
- `count`
- `sum__revenue`

## Operational importance

This dataset is the main sample/demo dataset in the repo and is useful as a control case when debugging household-specific issues.

When the household dataset was failing earlier, this dataset helped reveal that the failure should not block unrelated chart reconciliation.

## Current downstream consumers
- `dashboard.exec.overview`
- sample sales charts under `assets/charts/`

## Related files
- `assets/datasets/sales_orders.yaml`
- `seed/pg/001_schema.sql`

## Related pages
- [db.analytics](db.analytics.md)
- [dashboard.exec.overview](dashboard.exec.overview.md)
