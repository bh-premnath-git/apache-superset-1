# Apache Superset — Local Starter (BigHammer)

A Docker Compose setup for running Apache Superset locally with pre-seeded sample databases,
auto-imported datasets, and a config-driven dashboard seeder.

- **Superset 5.0.0** — custom image with extra DB drivers + custom branding
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
4. **MySQL URI reconciliation** — ensures `sales` DB uses `mysql+pymysql://` driver
5. **Dashboard seeding** from `seed/chart_config.yaml` — creates the Starter Seed Dashboard

### Seeded databases and tables

| Database    | Engine     | Tables                                          | Rows    |
|-------------|------------|-------------------------------------------------|---------|
| `sales`     | MySQL 8    | `products`, `customers`, `orders`               | ~35     |
| `analytics` | Postgres   | `events`, `daily_active_users`                  | ~28     |
| `analytics` | Postgres   | `household`                                     | 200 000 |

### Starter Seed Dashboard (7 charts)

| Chart                             | Type              | Source              |
|-----------------------------------|-------------------|---------------------|
| Sales Amount by Day               | Timeseries bar    | sales.orders        |
| Products by Category              | Pie               | sales.products      |
| Customers by Country              | World map         | sales.customers     |
| Daily Active Users                | Timeseries line   | analytics.daily_active_users |
| Households by Segment             | Categorical bar   | analytics.household |
| Households by Social Category     | Pie               | analytics.household |
| Households by State               | Categorical bar   | analytics.household |

---

## Adding new seed data — no code changes needed

The seeding pipeline is fully config-driven. To add a new table + charts:

**Step 1 — Drop a SQL seed file**

```
seed/mysql/NN_name.sql    ← auto-loaded by MySQL on fresh volume
seed/pg/NN_name.sql       ← auto-loaded by Postgres on fresh volume
```

Files are executed alphabetically, so prefix with `01_`, `02_`, etc.

**Step 2 — Register the table in `seed/import_datasources.yaml`**

```yaml
- database_name: analytics
  ...
  tables:
    - table_name: my_new_table   # ← add this line
```

**Step 3 — Add charts to `seed/chart_config.yaml`**

```yaml
- database: analytics
  table: my_new_table
  name: "My Chart Title"
  viz_type: echarts_timeseries_bar  # see chart_config.yaml header for all types
  required_columns: [col_a]
  x_axis: col_a
  metrics:
    - {column: col_b, aggregate: SUM}
  groupby: []
```

Then rebuild and wipe volumes to re-run init:

```bash
docker compose down -v
docker compose up -d --build
```

### Supported `viz_type` values

| `viz_type`                  | Key fields                                      |
|-----------------------------|-------------------------------------------------|
| `echarts_timeseries_bar`    | `x_axis`, `metrics[]`, `groupby` (`time_grain` optional) |
| `echarts_timeseries_line`   | `x_axis`, `time_grain`, `metrics[]`, `groupby`  |
| `pie`                       | `groupby[]`, `metric{}`                         |
| `world_map`                 | `entity`, `country_fieldtype`, `metric{}`       |

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
        └── 02_household.sql        # household survey 200K rows
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
mysql+pymysql://sample_user:sample_pass@mysql-db:3306/sales
```

**PostgreSQL — analytics**
```
postgresql+psycopg2://sample_user:sample_pass@analytics-db:5432/analytics
```

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
    pybigquery
```

Then rebuild: `docker compose build --no-cache`.

---

## Troubleshooting

### `No module named 'MySQLdb'` on MySQL charts

`mysql://...` URIs default to SQLAlchemy's `MySQLdb` / `mysqlclient` driver,
which is not in the upstream Superset image. This project fixes it on two layers:

1. **`superset_config.py`** calls `pymysql.install_as_MySQLdb()` at startup —
   aliases `pymysql` as `MySQLdb` in `sys.modules` so both `mysql://` and
   `mysql+pymysql://` URIs resolve correctly.
2. **`docker/scripts/init.sh`** reconciles the stored `sales` URI to
   `mysql+pymysql://` via `Database.set_sqlalchemy_uri()` and smoke-tests the
   connection during init, so errors surface early rather than at first chart render.

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

Expected — both lines start with `mysql+pymysql://`:
```
stored   : mysql+pymysql://sample_user:XXXXXXXXXX@mysql-db:3306/sales
decrypted: mysql+pymysql://sample_user:sample_pass@mysql-db:3306/sales
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
