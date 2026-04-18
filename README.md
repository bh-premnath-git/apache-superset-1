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
4. **Dashboard seeding** from `seed/chart_config.yaml` and `seed/charts/*.yaml` — creates the seeded LCA dashboards

### Seeded databases, tables and views

| Database       | Engine        | Object                              | Kind  | Rows    |
|----------------|---------------|-------------------------------------|-------|---------|
| `analytics`    | Postgres      | `hh_master`                         | table | ~261 953 |

### Seeded dashboards

| Dashboard | Slug | Notes |
|-----------|------|-------|
| `LCA Overview Dashboard` | `lca-overview-dashboard` | Country-level KPIs, India choropleth, and selected-state drill-down |
| `LCA District Drill Dashboard` | `lca-district-drill-dashboard` | District-level drill analysis with cross-filtered breakdowns |
| `LCA Household & Segment Explorer` | `lca-household-segment-explorer` | Household KPIs, heatmap, and detail table |
| `LCA Rural Segments Comparison` | `lca-rural-segments-comparison` | Handlebars comparison grid for rural segment KPIs |

In the current image build, chart YAML can use the verified
`visualization_type` labels wired into the Python seeder, including
`Bar Chart`, `Line Chart`, `Pie Chart`, `World Map`, `Country Map`,
`Big Number`, `Big Number with Trendline`, `Histogram`, `Heatmap`,
`Treemap`, `Sunburst`, `Sankey`, `MapBox`, `Scatter Plot`,
`deck.gl Scatterplot`, `deck.gl Heatmap`, and `deck.gl Polygon`.
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
seed/chart_config.yaml + seed/charts/*.yaml
        │
        ▼
docker/scripts/seed_dashboard.py
```

The SQL seed script loads the CSV into `analytics.hh_master` while preserving
the source column names from the extract, including mixed case and headers with
spaces, so the imported table mirrors the raw dataset faithfully.

`seed/chart_config.yaml` is now the shared base config, and each dashboard lives
in its own file under `seed/charts/`.

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
Add the chart under the appropriate dashboard file in `seed/charts/`.

If you are creating a brand new dashboard, add a new YAML file in `seed/charts/`
with a `dashboards:` list and keep `seed/chart_config.yaml` for shared base config
and reusable anchors only.

```yaml
dashboards:
  - title: "My Dashboard"
    slug: my-dashboard
    charts:
      - database: analytics
        table: my_new_table_summary
        name: "Weighted Value by Category"
        visualization_type: Bar Chart
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

These are the human-facing visualization labels used in the dashboard YAML files.
The Python seeder maps them to the internal keys required by the Superset API.

| `visualization_type`        | Mapped internal key         | Key fields |
|-----------------------------|-----------------------------|------------|
| `Bar Chart`                 | `echarts_timeseries_bar`    | `x_axis`, `metrics[]`, `groupby` (`time_grain` optional) |
| `Line Chart`                | `echarts_timeseries_line`   | `x_axis`, `time_grain`, `metrics[]`, `groupby`  |
| `Pie Chart`                 | `pie`                       | `groupby[]`, `metric{}` |
| `World Map`                 | `world_map`                 | `entity`, `country_fieldtype`, `metric{}` |
| `Country Map`               | `country_map`               | `entity` (ISO 3166-2 column, e.g. `IN-KL`), `select_country` (e.g. `india`), `metric{}`. Ships GeoJSON, no Mapbox key needed. |
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
│   ├── import_datasources.yaml     # DB connections + table registrations
│   ├── chart_config.yaml           # shared base config + reusable YAML anchors only
│   ├── charts/
│   │   ├── lca-overview-dashboard.yaml
│   │   ├── lca-district-drill-dashboard.yaml
│   │   ├── lca-household-segment-explorer.yaml
│   │   └── lca-rural-segments-comparison.yaml
│   └── pg/
│       ├── 01_hh_master.sql        # CSV loader + analytical views for hh_master
│       └── HH.master.csv           # source household master data
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
4. Add chart entries in the appropriate `seed/charts/*.yaml` dashboard file.

The `shillelagh` driver is still installed and usable for ad-hoc SQL Lab
queries against external sources such as Google Sheets, but the seed pipeline
no longer points charts at CSV paths through it — doing so failed at chart
render time because (a) shillelagh's CSV adapter is disabled under its default
safe mode, and (b) `./seed` is only mounted into the one-shot init container,
not into the long-running `superset` / `celery-worker` services.

### India State Choropleth Map + Selected State drill-down

The overview dashboard's `Overview India State Choropleth` chart uses Superset's built-in
`country_map` plugin. It ships an India GeoJSON inside Superset itself,
renders without Mapbox or any API key, and needs no external boundary
file or loader script.

State matching is done on ISO 3166-2 codes (`IN-KL`, `IN-MH`, …). The
single SQL function `state_to_iso(text)` in `seed/pg/01_hh_master.sql`
maps every `State_label` value (including legacy/alternate spellings
like Orissa/Pondicherry/Uttaranchal and the merged Dadra/Daman UT) to
its ISO code. Every analytical view that participates in the drill-down
exposes `iso_code` via this function so a single cross-filter column
lines up across all of them.

**Drill-down behavior.** Click any state on the choropleth and a
dedicated "Selected State Detail" block updates in place — no popups
or page navigation needed:

| Receiver chart                          | Source view              | Shows for the clicked state                |
|-----------------------------------------|--------------------------|--------------------------------------------|
| Selected State District Breakdown       | `vw_district_summary`    | Households per district                    |
| Selected State Welfare Coverage         | `vw_welfare_kpis_long`   | Ayushman / LPG / Ration / school KPIs      |
| Selected State Sector Mix               | `vw_state_sector_summary`| Rural vs Urban household share             |
| Selected State Digital Adoption         | `vw_digital_kpis_long`   | Internet + online channel adoption rates   |

The cross-filter scope is configured in the dashboard's
`chart_configuration` (built by `docker/scripts/seed_dashboard.py`
from the `cross_filter_source` / `cross_filter_target` keys in
the dashboard YAML files in `seed/charts/`) so that clicking the map only drills the
"Selected State *" charts. The country-wide KPIs and "Households by
State" bar stay at country totals, which keeps the national context
visible while exploring one state. Click an empty area of the map (or
re-click the same state) to clear the filter.

The same folder-based structure is also used by the `LCA Rural Segments Comparison`
dashboard, whose Handlebars chart spec now lives in
`seed/charts/lca-rural-segments-comparison.yaml`.

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
