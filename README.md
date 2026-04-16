# Apache Superset — Local Starter (BigHammer)

A Docker Compose setup for running Apache Superset locally with pre-seeded sample databases,
auto-imported datasets, and a config-driven dashboard seeder.

- **Superset 6.0.0** — custom image with extra DB drivers + custom branding
- **PostgreSQL 16** — Superset metadata DB
- **Redis 7** — cache + Celery broker/backend
- **Celery worker + beat** — async queries and scheduled alerts/reports
- **MySQL 8** — sample `sales` database (seeded on first start)
- **PostgreSQL 16** — sample `analytics` database (seeded on first start)

---

## Quick start

```bash
# 1. Copy the env template and fill in your secret key
cp .env.example .env
# Edit .env: set SUPERSET_SECRET_KEY to a random 32-char string

# 2. Build and start all services
docker compose up -d --build

# 3. Watch init progress (migrations, admin creation, dashboard seeding)
docker compose logs -f superset-init
```

Open **http://localhost:8088** and log in with the credentials in `.env`
(default: `admin` / `admin123`).

---

## Service summary

| Service          | Container name            | Port  | Purpose                        |
|------------------|---------------------------|-------|--------------------------------|
| `superset`       | superset-app              | 8088  | Superset web UI                |
| `superset-init`  | superset-init             | —     | One-time migrations + seeding  |
| `celery-worker`  | superset-celery-worker    | —     | Async query execution          |
| `celery-beat`    | superset-celery-beat      | —     | Scheduled alerts/reports       |
| `metadata-db`    | superset-metadata-db      | —     | Superset internal metadata     |
| `redis`          | superset-redis            | —     | Cache + Celery broker/backend  |
| `mysql-db`       | superset-mysql-db         | —     | Sample sales data              |
| `analytics-db`   | superset-analytics-db     | —     | Sample analytics + household   |

---

## What gets auto-seeded on first start

`superset-init` runs once and sets up everything automatically:

1. **DB migrations** (`superset db upgrade`)
2. **Admin user** creation
3. **Datasource import** from `seed/import_datasources.yaml` — registers both sample DBs and all tables in the Superset UI
4. **MySQL URI reconciliation** — ensures `sales` DB uses the Superset 6.0.0 recommended `mysql://` / `mysqlclient` driver
5. **Dashboard seeding** from `seed/chart_config.yaml` — creates the Starter Seed Dashboard

### Seeded databases, tables and views

| Database       | Engine        | Object                              | Kind  | Rows    |
|----------------|---------------|-------------------------------------|-------|---------|
| `sales`        | MySQL 8       | `products`, `customers`, `orders` | table | ~35     |
| `analytics`    | Postgres      | `events`, `daily_active_users`      | table | ~28     |
| `analytics`    | Postgres      | `household`                         | table | 200 000 |
| `analytics`    | Postgres      | `segment_summary`                   | view  | 4       |
| `analytics`    | Postgres      | `state_summary`                     | view  | 5       |
| `analytics`    | Postgres      | `income_distribution`               | view  | 6       |
| `analytics`    | Postgres      | `district_segment_summary`          | view  | ~1 000  |
| `analytics`    | Postgres      | `household_monthly_trend`           | view  | 12      |
| `analytics`    | Postgres      | `household_headlines`               | view  | 1       |
| `analytics`    | Postgres      | `household_size_distribution`       | view  | ~7      |
| `analytics`    | Postgres      | `household_joint_distribution`      | view  | ~42     |
| `analytics`    | Postgres      | `household_segment_monthly_trend`   | view  | ~48     |
| `analytics`    | Postgres      | `household_geo_points`              | view  | 200 000 |
| `analytics`    | Postgres      | `household_path_summary`            | view  | ~250    |
| `analytics`    | Postgres      | `eth_txn`                           | table | ~3 900  |

### Starter Seed Dashboard (18 charts)

| Chart                             | Type              | Source                                |
|-----------------------------------|-------------------|---------------------------------------|
| Sales Amount by Day               | Timeseries bar    | sales.orders                          |
| Products by Category              | Pie               | sales.products                        |
| Customers by Country              | World map         | sales.customers                       |
| Daily Active Users                | Timeseries line   | analytics.daily_active_users          |
| Households by Social Category     | Pie               | analytics.household                   |
| Income Distribution               | Categorical bar   | analytics.income_distribution         |
| Household Size Distribution       | Categorical bar   | analytics.household_size_distribution |
| Households by Segment             | Categorical bar   | analytics.segment_summary             |
| Weighted Income by Segment        | Categorical bar   | analytics.segment_summary             |
| Internet Penetration by Segment   | Categorical bar   | analytics.segment_summary             |
| Households by State               | Categorical bar   | analytics.state_summary               |
| Weighted Income by State          | Categorical bar   | analytics.state_summary               |
| Monthly Household Creation        | Timeseries line   | analytics.household_monthly_trend     |
| Monthly Avg Income Trend          | Timeseries line   | analytics.household_monthly_trend     |
| Segment Household Creation Trend  | Timeseries line   | analytics.household_segment_monthly_trend |
| ETH Transaction Value Over Time | Timeseries line   | analytics.eth_txn                     |
| ETH Transaction Volume          | Big number        | analytics.eth_txn                     |
| ETH Daily Transactions          | Timeseries bar    | analytics.eth_txn                     |

In the current image build, `chart_config.yaml` can use the verified
`visualization_type` labels wired into the Python seeder, including
`Bar Chart`, `Line Chart`, `Pie Chart`, `World Map`, `Big Number`,
`Big Number with Trendline`, `Histogram`, `Heatmap`, `Treemap`, `Sunburst`,
`Sankey`, `MapBox`, `Scatter Plot`, `deck.gl Scatterplot`,
`deck.gl Heatmap`, and `deck.gl Polygon`.
The Python seeder maps those labels to the internal Superset `viz_type` keys
required by the API.
For categorical comparisons such as segment/state bars, this repo intentionally
uses the `Bar Chart` visualization type with a categorical `x_axis`, because that is the
registered bar-capable plugin available in the running Superset build.

---

## Analytical layering — raw tables vs. views

This repo follows a simple two-layer model:

```
  Raw layer                         Analytical layer (views)
  ─────────                         ────────────────────────
  household        ──────►          segment_summary           ◄── weighted KPIs per segment
  (200K atomic                      state_summary             ◄── geo rollup (lat/lon, state_code)
   survey rows)                     income_distribution       ◄── fixed-width buckets
                                    household_size_distribution ◄── household-size frequency bins
                                    household_headlines       ◄── single-row KPI headline metrics
                                    household_joint_distribution ◄── income × hh_size joint matrix
                                    district_segment_summary  ◄── state → district → segment hierarchy
                                    household_monthly_trend   ◄── time-series (created_at)
                                    household_segment_monthly_trend ◄── segment trends over time
                                    household_geo_points      ◄── point-level geo coordinates
                                    household_path_summary    ◄── source → target flow edges
```

**Why views:** business semantics — survey-weighting, bucket edges, geo rollup —
live in one place (SQL), so every chart that uses a concept gets the same
numbers. Charts stay thin (just `x_axis` / `metric`) and Python stays dumb
(the seeder only wires metadata).

**Rules of thumb:**

| Concern                                          | Belongs in           |
|--------------------------------------------------|----------------------|
| Weighted aggregates (e.g. `SUM(income*multiplier)/SUM(multiplier)`) | SQL view             |
| Bucketing / binning / `CASE WHEN`                | SQL view             |
| Geography rollups, centroids, codes              | SQL view             |
| Chart title, viz type, x/y, metric, groupby      | `chart_config.yaml`  |
| Registering a table / view as a Superset dataset | `import_datasources.yaml` |
| Validation, upsert, dashboard layout             | `seed_dashboard.py`  |

### Household visualization pattern coverage

The household seed now models the following visualization families at the SQL
view layer:

| Pattern family | Seeded dataset(s) | Notes |
|---|---|---|
| Headlines | `household_headlines` | Ready for big-number style cards when that plugin is enabled |
| Distributions | `income_distribution`, `household_size_distribution` | Works today with bar charts; ready for histogram-like visuals |
| Comparisons | `segment_summary`, `state_summary` | Works today with bar charts |
| Trends / time series | `household_monthly_trend`, `household_segment_monthly_trend` | Works today with line charts |
| Joint distributions | `household_joint_distribution` | Ready for heatmap / bubble / scatter style plugins |
| Hierarchical maps | `district_segment_summary` | Ready for treemap / sunburst style plugins |
| Path maps | `household_path_summary` | Ready for sankey / path-style plugins |
| Geo point maps | `household_geo_points`, `state_summary` | Ready for Mapbox / deck.gl style plugins |

The current image build still renders only the verified plugin subset described
below, so some of these datasets are modeled now for future chart expansion.

---

## Adding new seed data — no code changes needed

The seeding pipeline is fully config-driven. The workflow differs slightly
depending on whether you're adding a raw fact table or a curated analytical
view.

### Adding a new raw table

**Step 1 — Drop a SQL seed file**

```
seed/mysql/NN_name.sql    ← auto-loaded by MySQL on fresh volume
seed/pg/NN_name.sql       ← auto-loaded by Postgres on fresh volume
```

Files are executed alphabetically, so prefix with `01_`, `02_`, etc. For
time-series- or geo-aware tables, include `created_at TIMESTAMPTZ` and
`lat` / `lon` / `state_code` up-front — it is much cheaper to add them now
than to backfill later.

**Step 2 — Register the table in `seed/import_datasources.yaml`**

```yaml
- database_name: analytics
  ...
  tables:
    - table_name: my_new_table   # ← add this line
```

### Adding a new analytical view (recommended for charts)

Views own the business semantics — put weighting, bucketing and rollups here,
not in YAML and not in Python.

**Step 1 — Define the view in the same SQL seed file as its source table**

```sql
CREATE OR REPLACE VIEW my_new_table_summary AS
SELECT
    category,
    COUNT(*)                                                                  AS rows,
    ROUND((SUM(value * weight) / NULLIF(SUM(weight), 0))::numeric, 2)         AS weighted_value
FROM my_new_table
GROUP BY category;
```

**Step 2 — Register the view alongside the table**

```yaml
- database_name: analytics
  tables:
    - table_name: my_new_table           # raw
    - table_name: my_new_table_summary   # view
```

Superset treats views exactly like tables — no special flag needed.

### Adding a chart

Point it at the view, not the raw table, whenever a business rule applies.

```yaml
- database: analytics
  table: my_new_table_summary
  name: "Weighted Value by Category"
  visualization_type: Bar Chart     # see chart_config.yaml header for all types
  required_columns: [category, weighted_value]
  x_axis: category
  metrics:
    - {column: weighted_value, aggregate: SUM}
  groupby: []
```

Then rebuild and wipe volumes to re-run init:

```bash
docker compose down -v
docker compose up -d --build
```

### Supported `visualization_type` values

These are the human-facing visualization labels used in `chart_config.yaml`.
The Python seeder maps them to the internal keys required by the Superset API.

| `visualization_type`        | Mapped internal key         | Key fields |
|-----------------------------|-----------------------------|------------|
| `Bar Chart`                 | `echarts_timeseries_bar`    | `x_axis`, `metrics[]`, `groupby` (`time_grain` optional) |
| `Line Chart`                | `echarts_timeseries_line`   | `x_axis`, `time_grain`, `metrics[]`, `groupby`  |
| `Pie Chart`                 | `pie`                       | `groupby[]`, `metric{}` |
| `World Map`                 | `world_map`                 | `entity`, `country_fieldtype`, `metric{}` |
| `Big Number`                | `big_number_total`          | `metric{}` or `metrics[]` |
| `Big Number with Trendline` | `big_number`                | `metric{}` or `metrics[]` |
| `Histogram`                 | `histogram_v2`              | `groupby[]` / `columns[]` / `x_axis` + `metric{}` or `metrics[]` |
| `Heatmap`                   | `heatmap_v2`                | `groupby[]` / `columns[]` / `x_axis` + `metric{}` or `metrics[]` |
| `Treemap`                   | `treemap_v2`                | `groupby[]` / `columns[]` / `x_axis` + `metric{}` or `metrics[]` |
| `Sunburst`                  | `sunburst_v2`               | `groupby[]` / `columns[]` / `x_axis` + `metric{}` or `metrics[]` |
| `Sankey`                    | `sankey_v2`                 | `source`, `target`, `metric{}` or `metrics[]` |
| `MapBox`                    | `mapbox`                    | `longitude`, `latitude`, optional map params, `MAPBOX_API_KEY` |
| `Scatter Plot`              | `deck_scatter`              | `longitude`, `latitude`, optional metrics, `MAPBOX_API_KEY` |
| `deck.gl Scatterplot`       | `deck_scatter`              | `longitude`, `latitude`, optional metrics, `MAPBOX_API_KEY` |
| `deck.gl Heatmap`           | `deck_heatmap`              | `longitude`, `latitude`, optional metrics, `MAPBOX_API_KEY` |
| `deck.gl Polygon`           | `deck_polygon`              | polygon/geojson columns, optional metrics, `MAPBOX_API_KEY` |

The Python seeder validates chart configs against this supported set and also
accepts legacy `viz_type` aliases `dist_bar` and `echarts_bar`, mapping both
to the internal bar plugin for backward compatibility.

Mapbox and deck.gl charts require a valid public `MAPBOX_API_KEY` in your
environment and Docker Compose config.

---

## Project layout

```
.
├── docker-compose.yml              # all services + volume mounts
├── Dockerfile                      # custom Superset image (drivers + branding)
├── superset_config.py              # Superset config (mounted read-only)
├── .env                            # local secrets — git-ignored
├── .env.example                    # committed template
├── docker/
│   ├── assets/
│   │   └── logo.svg                # custom branding icon
│   └── scripts/
│       ├── bootstrap.sh            # gunicorn entrypoint (web + workers)
│       ├── init.sh                 # one-time init: migrate, seed, dashboard
│       └── seed_dashboard.py       # config-driven chart/dashboard creator
└── seed/
    ├── import_datasources.yaml     # DB connections + table registrations
    ├── chart_config.yaml           # dashboard + chart definitions (YAML-only)
    ├── mysql/
    │   └── 01_sales.sql            # sales schema + seed rows
    └── pg/
        ├── 01_analytics.sql        # events + daily_active_users
        └── 02_household.sql        # household survey 200K rows +
                                    # segment_summary, state_summary,
                                    # income_distribution,
                                    # district_segment_summary,
                                    # household_monthly_trend (views)
```

---

## Branding

Custom logo and favicon are baked into the image at build time:

```
docker/assets/logo.svg  →  /app/superset/static/assets/images/logo.svg
                        →  /app/superset/static/assets/images/favicon.png
```

Override the app name or icon paths at runtime via `.env`:

```bash
SUPERSET_APP_NAME=MyPlatform
SUPERSET_APP_ICON=/static/assets/images/logo.svg
SUPERSET_APP_FAVICON=/static/assets/images/logo.svg
```

---

## Connection URIs (manual setup)

All containers share the `superset-net` bridge network — use the container name as the hostname.

**MySQL — sales**
```
mysql://sample_user:sample_pass@mysql-db:3306/sales
```

**PostgreSQL — analytics**
```
postgresql+psycopg2://sample_user:sample_pass@analytics-db:5432/analytics
```

---

## Superset 6.0.0 database connectivity reference

Superset does not bundle all database drivers. Per the official Superset 6.0.0
database documentation, each external database needs a compatible SQLAlchemy
dialect and Python driver installed in the image.

### Common supported databases and drivers

| Database | PyPI package | SQLAlchemy URI example |
|----------|--------------|------------------------|
| MySQL | `mysqlclient` | `mysql://<User>:<Pass>@<Host>/<DB>` |
| PostgreSQL | `psycopg2` | `postgresql://<User>:<Pass>@<Host>/<DB>` |
| SQLite | Included in Python | `sqlite://path/to/file.db?check_same_thread=false` |
| Snowflake | `snowflake-sqlalchemy` | `snowflake://{user}:{password}@{account}.{region}/{database}?role={role}&warehouse={warehouse}` |
| BigQuery | `sqlalchemy-bigquery` | `bigquery://{project_id}` |
| Oracle | `cx_Oracle` | `oracle://<username>:<password>@<hostname>:<port>` |
| SQL Server | `pymssql` | `mssql+pymssql://<Username>:<Password>@<Host>:1433/<Database Name>` |
| Redshift | `sqlalchemy-redshift` | `redshift+psycopg2://<userName>:<DBPassword>@<AWS End Point>:5439/<Database Name>` |
| Athena | `pyathena[pandas]` | `awsathena+rest://{access_key_id}:{access_key}@athena.{region}.amazonaws.com/{schema}?s3_staging_dir={s3_staging_dir}&...` |
| Trino | `trino` | `trino://{username}:{password}@{hostname}:{port}/{catalog}` |
| Presto | `pyhive` | `presto://{username}:{password}@{hostname}:{port}/{database}` |
| Hive | `pyhive` | `hive://hive@{hostname}:{port}/{database}` |
| Spark SQL | `pyhive` | `hive://hive@{hostname}:{port}/{database}` |
| Impala | `impyla` | `impala://{hostname}:{port}/{database}` |
| ClickHouse | `clickhouse-connect` | `clickhousedb://{username}:{password}@{hostname}:{port}/{database}` |
| Druid | `pydruid` | `druid://<User>:<password>@<Host>:9088/druid/v2/sql` |
| Elasticsearch | `elasticsearch-dbapi` | `elasticsearch+http://{user}:{password}@{host}:9200/` |
| TimescaleDB | `psycopg2` | `postgresql://<UserName>:<DBPassword>@<Database Host>:<Port>/<Database Name>` |
| DynamoDB | `pydynamodb` | `dynamodb://{access_key_id}:{secret_access_key}@dynamodb.{region_name}.amazonaws.com?connector=superset` |
| Couchbase | `couchbase-sqlalchemy` | `couchbase://{username}:{password}@{hostname}:{port}?truststorepath={ssl certificate path}` |
| TDengine | `taospy` or `taos-ws-py` | `taosws://<user>:<password>@<host>:<port>` |
| **CSV Files** | **`shillelagh`** | **`shillelagh://`** (query with `SELECT * FROM "/path/to/file.csv"`) |
| Google Sheets | `shillelagh[gsheetsapi]` | `gsheets://` |

### CSV files as seeded tables

CSV-sourced datasets are loaded into the analytics Postgres DB at init time,
not queried in-place by shillelagh. The `./seed/pg` directory is mounted into
the `analytics-db` container at `/docker-entrypoint-initdb.d`, so any CSV
placed there is visible to server-side `COPY ... FROM`.

**To add a new CSV dataset:**
1. Drop the CSV into `seed/pg/` (alongside the SQL loaders).
2. Add a numbered SQL file in `seed/pg/` that `CREATE TABLE`s the target and
   `COPY`s the CSV into a staging table (see `seed/pg/03_eth_txn.sql` for a
   worked example that also parses an M/D/YYYY date column).
3. Register the new table in `seed/import_datasources.yaml` under the
   `analytics` database.
4. Add chart entries in `seed/chart_config.yaml` pointing at the new table.

The `shillelagh` driver is still installed and usable for ad-hoc SQL Lab
queries against external sources such as Google Sheets, but the seed pipeline
no longer points charts at CSV paths through it — doing so failed at chart
render time because (a) shillelagh's CSV adapter is disabled under its default
safe mode, and (b) `./seed` is only mounted into the one-shot init container,
not into the long-running `superset` / `celery-worker` services.

### Notes for document and non-SQL databases

- **MongoDB**
  - MongoDB is **not listed as a direct built-in Superset 6.0.0 connector** in the official docs.
  - To use it with Superset, you typically need a **SQL interface**, a compatible
    SQLAlchemy dialect, or an intermediate engine such as Trino.

- **Document, time-series, and search engines**
  - Superset can work with non-traditional backends when they expose a stable SQL
    interface and Python driver.
  - Examples in the official docs include **Druid**, **Elasticsearch**,
    **ClickHouse**, **DynamoDB**, **Couchbase**, and **TDengine**.

- **General rule**
  - If your source is not on the official list, the main requirement is the
    existence of a functional SQLAlchemy dialect and Python driver.

---

## Common commands

```bash
# Stop everything (volumes preserved)
docker compose down

# Wipe all data and re-seed from scratch
docker compose down -v && docker compose up -d --build

# Rebuild only the Superset image (e.g. after Dockerfile change)
docker compose build --no-cache

# Follow all logs
docker compose logs -f

# Follow only the init logs
docker compose logs -f superset-init

# Open a shell inside the running Superset container
docker compose exec superset bash

# Re-import datasources manually
docker compose exec superset \
  superset import_datasources -p /app/seed/import_datasources.yaml -u admin

# Re-run dashboard seeding manually
docker compose exec superset python /app/docker/scripts/seed_dashboard.py
```

---

## Customising the image

Add extra Python packages (DB drivers, extensions) in `Dockerfile`:

```dockerfile
RUN UV_CACHE_DIR=/tmp/uv-cache uv pip install --python /app/.venv/bin/python \
    trino \
    sqlalchemy-bigquery
```

Then rebuild: `docker compose build --no-cache`.

---

## Troubleshooting

### `No module named 'MySQLdb'` on MySQL charts

`mysql://...` URIs default to SQLAlchemy's `MySQLdb` / `mysqlclient` driver,
which is not in the upstream Superset image by default. This project fixes it by
installing `mysqlclient` in the custom Docker image and reconciling the seeded
`sales` connection to the recommended `mysql://` URI during init.

1. **`Dockerfile`** installs `mysqlclient` into Superset's application virtualenv.
2. **`docker/scripts/init.sh`** reconciles the stored `sales` URI to `mysql://`
   via `Database.set_sqlalchemy_uri()` and smoke-tests the connection during init,
   so errors surface early rather than at first chart render.

To verify:

```bash
docker compose exec superset python - <<'PY'
from superset.app import create_app
from superset.extensions import db
from superset.models.core import Database

app = create_app()
with app.app_context():
    row = db.session.query(Database).filter(Database.database_name == "sales").one()
    print("stored   :", row.sqlalchemy_uri)
    print("decrypted:", row.sqlalchemy_uri_decrypted)
PY
```

Expected — both lines start with `mysql://`:
```
stored   : mysql://sample_user:XXXXXXXXXX@mysql-db:3306/sales
decrypted: mysql://sample_user:sample_pass@mysql-db:3306/sales
```

### Charts missing after adding a new seed

`docker-entrypoint-initdb.d` only runs on a **fresh volume**. If you add a new
seed file to an existing setup, wipe volumes and rebuild:

```bash
docker compose down -v
docker compose up -d --build
```

---

## Reference docs

- [Superset Docker Compose setup](https://superset.apache.org/docs/installation/docker-compose)
- [Superset configuration guide](https://superset.apache.org/docs/configuration/configuring-superset)
- [Superset 6.0.0 database connections](https://superset.apache.org/user-docs/6.0.0/configuration/databases/)
- [SQLAlchemy database URLs](https://docs.sqlalchemy.org/en/20/core/engines.html#database-urls)

---

## Production checklist

- [ ] Set `SUPERSET_SECRET_KEY` to a strong random value (32+ chars)
- [ ] Set `SESSION_COOKIE_SECURE = True` and `TALISMAN_ENABLED = True` behind HTTPS
- [ ] Use a managed Postgres and Redis — not the Compose services
- [ ] Configure SMTP in `superset_config.py` for alert/report emails
- [ ] Change `SUPERSET_ADMIN_PASSWORD` from the default
- [ ] Pin image tags for `metadata-db`, `redis`, `mysql-db`, and `analytics-db`
- [ ] Remove or restrict the `analytics-db` and `mysql-db` sample services
