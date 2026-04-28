# Asset: `db.analytics`

- Kind: `Database`
- Source: `assets/databases/analytics.yaml`
- Name in Superset: `Analytics Warehouse`

## Spec

- Engine: `postgresql`
- SQLAlchemy URI source: `ANALYTICS_DB_URI` (`spec.sqlalchemyUriFromEnv`)

## Runtime mapping

- Container endpoint defaults to `analytics-db:5432`
- Compose host port mapping: `5433 -> 5432`
- Seed SQL and CSV load from `seed/pg/`

## Dependencies

- Referenced by dataset assets through `databaseRef: db.analytics`
