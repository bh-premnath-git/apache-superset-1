# Apache Superset — Local Starter (BigHammer)

A Docker Compose setup for running Apache Superset locally with a pre-seeded analytics database,
auto-imported datasets, and a config-driven dashboard seeder.

- **Superset 6.0.0** — custom image with extra DB drivers + custom branding
- **PostgreSQL 16** — Superset metadata DB
- **Redis 7** — cache + Celery broker/backend
- **Celery worker + beat** — async queries and scheduled alerts/reports
- **PostgreSQL 16** — sample `analytics` database with `hh_master` seeded on first start

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
| `analytics-db`   | superset-analytics-db     | —     | Seeded household master dataset |

---

## What gets auto-seeded on first start

`superset-init` runs once and sets up everything automatically:

1. **DB migrations** (`superset db upgrade`)
2. **Admin user** creation
3. **Datasource import** from `seed/import_datasources.yaml` — registers `analytics.hh_master` in the Superset UI
4. **Dashboard seeding** from `seed/chart_config.yaml` — creates the LCA Dashboard

### Seeded databases, tables and views

| Database       | Engine        | Object                              | Kind  | Rows    |
|----------------|---------------|-------------------------------------|-------|---------|
| `analytics`    | Postgres      | `hh_master`                         | table | ~261 953 |

### LCA Dashboard (3 charts)

| Chart                             | Type              | Source                                |
|-----------------------------------|-------------------|---------------------------------------|
| Households by State               | Bar chart         | analytics.hh_master                   |
| Households by Sector              | Pie chart         | analytics.hh_master                   |
| Total Households                  | Big number        | analytics.hh_master                   |

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

## Current seed pipeline

This repo now uses a single Postgres-backed seed flow for the household master
dataset:

```
seed/pg/HH.master.csv
        │
        ▼
seed/pg/01_hh_master.sql
        │  COPY
        ▼
analytics.hh_master
        │
        ▼
seed/import_datasources.yaml
        │
        ▼
seed/chart_config.yaml
        │
        ▼
docker/scripts/seed_dashboard.py
```

The SQL seed script loads the CSV into `analytics.hh_master` while preserving
the source column names from the extract, including mixed case and headers with
spaces, so the imported table mirrors the raw dataset faithfully.

---

## Adding new seed data — no code changes needed

The seeding pipeline is fully config-driven. The workflow differs slightly
depending on whether you're adding a raw fact table or a curated analytical
view.

### Adding a new raw table

**Step 1 — Drop a SQL seed file**

```
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

Point it at the seeded table or view you registered in `import_datasources.yaml`.

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
    └── pg/
        ├── 01_hh_master.sql        # CSV loader + views for hh_master
        ├── HH.master.csv           # source household master data
        ├── india_states.geojson    # India state boundaries for choropleth
        └── load_geojson.py         # GeoJSON loader script
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
   `COPY`s the CSV into a Postgres table (see `seed/pg/01_hh_master.sql` for a
   worked example that preserves the source headers exactly as delivered).
3. Register the new table in `seed/import_datasources.yaml` under the
   `analytics` database.
4. Add chart entries in `seed/chart_config.yaml` pointing at the new table.

The `shillelagh` driver is still installed and usable for ad-hoc SQL Lab
queries against external sources such as Google Sheets, but the seed pipeline
no longer points charts at CSV paths through it — doing so failed at chart
render time because (a) shillelagh's CSV adapter is disabled under its default
safe mode, and (b) `./seed` is only mounted into the one-shot init container,
not into the long-running `superset` / `celery-worker` services.

### India State Choropleth Map

The LCA Dashboard includes a deck.gl Polygon choropleth for state-level exploration.
To enable it, you must load the India state boundaries into Postgres after the
analytics DB is initialized.

**Step 1: Download the GeoJSON (already in repo)**
```bash
# The file is already at seed/pg/india_states.geojson
```

**Step 2: Load boundaries into Postgres** (run once after DB init):
```bash
docker compose exec analytics-db python /docker-entrypoint-initdb.d/load_geojson.py
```

Or from host with Python:
```bash
cd seed/pg
python3 load_geojson.py
```

**Step 3: Verify the choropleth view**
- The view `vw_state_choropleth` joins state boundaries with survey metrics
- Chart: "India State Choropleth" uses deck.gl Polygon visualization
- Click any state to filter other charts (cross-filter is enabled)

**Note**: The GeoJSON file uses district-level boundaries that are aggregated
to state level by the loader script. State name matching is case-insensitive.

**Mapbox API Key Alternatives**
By default, the choropleth renders colored polygons **without base tiles** (no API key needed).

To add a base map, you have two options:

1. **OpenStreetMap via CartoDB** (no API key, edit `chart_config.yaml`):
   ```yaml
   mapbox_style: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
   ```

2. **Mapbox** (requires free API key):
   ```bash
   # Add to .env
   MAPBOX_API_KEY=pk.your_token_here
   ```
   ```yaml
   mapbox_style: "mapbox://styles/mapbox/light-v9"
   ```

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
- [ ] Pin image tags for `metadata-db`, `redis`, and `analytics-db`
- [ ] Remove or restrict the `analytics-db` sample service
