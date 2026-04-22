# db.analytics

## Purpose

`db.analytics` is the declarative database asset representing the analytics warehouse connection used by repo datasets.

## Source of truth
- File: `assets/databases/analytics.yaml`
- Kind: `Database`
- Runtime name: `Analytics Warehouse`

## Spec summary
- engine: `postgresql`
- SQLAlchemy URI source: environment variable `ANALYTICS_DB_URI`

## Operational notes

This asset is the upstream dependency for:
- `dataset.household.hh_master`
- `dataset.sales.orders`

If this asset fails to reconcile, downstream datasets cannot be created.

## Environment dependency

The actual connection string is not stored in YAML. It is injected from:
- `ANALYTICS_DB_URI`

That follows the repo convention that secrets and environment-specific connection values do not live directly in asset YAML.

## Related files
- `assets/databases/analytics.yaml`
- `docker-compose.yml`
- `.env.example`

## Related pages
- [dataset.household.hh_master](dataset.household.hh_master.md)
