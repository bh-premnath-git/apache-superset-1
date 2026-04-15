# Apache Superset — Local Starter

A Docker Compose setup for running Apache Superset locally with:

- **Superset 5.0.0** (custom image with extra DB drivers)
- **PostgreSQL 16** — Superset metadata DB
- **Redis 7** — cache + Celery broker
- **Celery worker + beat** — async queries and scheduled tasks
- **MySQL 8** — sample `sales` database (seeded)
- **PostgreSQL 16** — sample `analytics` database (seeded)

---

## Quick start

```bash
# 1. Copy the env template and set your own secret key
cp .env.example .env
# Edit .env: set SUPERSET_SECRET_KEY to a random 32-char string

# 2. Build the custom image and start all services
docker compose up -d --build

# 3. Watch the bootstrap output (migrations + admin user creation)
docker compose logs -f superset
```

Open **http://localhost:8088** and log in with the credentials in `.env`
(default: `admin` / `admin123`).

---

## Service summary

| Service          | Container name            | Port  | Purpose                        |
|------------------|---------------------------|-------|--------------------------------|
| superset         | superset-app              | 8088  | Superset web UI                |
| celery-worker    | superset-celery-worker    | —     | Async query execution          |
| celery-beat      | superset-celery-beat      | —     | Scheduled alerts/reports       |
| metadata-db      | superset-metadata-db      | —     | Superset internal metadata     |
| redis            | superset-redis            | —     | Cache + Celery broker/backend  |
| mysql-db         | superset-mysql-db         | —     | Sample sales data              |
| analytics-db     | superset-analytics-db     | —     | Sample analytics data          |

---

## Seed connections and datasets (auto-imported)

On first startup, `superset-init` now imports `/app/seed/import_datasources.yaml`,
so both sample databases and their tables are available in the UI without any
manual connection setup:

- `sales` (MySQL): `customers`, `orders`, `products`
- `analytics` (Postgres): `events`, `daily_active_users`
- `Starter Seed Dashboard` with 4 charts created automatically:
  - Sales Amount by Day (bar)
  - Daily Active Users (line)
  - Products by Category (pie)
  - Customers by Country (geo map)

If you want to re-import manually, run:

```bash
docker compose exec superset \
  superset import_datasources -p /app/seed/import_datasources.yaml -u admin
```

If you prefer to create them manually, use these URIs:

**MySQL — sales**
```
mysql+pymysql://sample_user:sample_pass@mysql-db:3306/sales
```

**PostgreSQL — analytics**
```
postgresql+psycopg2://sample_user:sample_pass@analytics-db:5432/analytics
```

> Tip: all containers share the `superset-net` bridge network, so you can
> reach each service by its container name as the hostname.

---

## Seed data

| Database   | Tables                               | Rows |
|------------|--------------------------------------|------|
| sales      | `products`, `customers`, `orders`    | ~35  |
| analytics  | `events`, `daily_active_users`       | ~28  |

---

## Project layout

```
.
├── docker-compose.yml
├── Dockerfile
├── superset_config.py       # mounted into the container
├── .env                     # local secrets (git-ignored)
├── .env.example             # committed template
├── docker/
│   └── scripts/
│       └── bootstrap.sh     # DB migrate + admin create + gunicorn
└── seed/
    ├── import_datasources.yaml
    ├── mysql_sales.sql
    └── pg_analytics.sql
```

---


## Why this is workable (and what was fixed)

- The image installs **pure-Python DB drivers** (`pymysql`, `psycopg2-binary`) so local builds are less likely to fail due to missing compiler/system packages.
- Bootstrap now waits for the metadata DB with a Python TCP check, avoiding reliance on `pg_isready` being present inside the Superset image.
- `docker-compose.yml` uses project-root build context so `docker/scripts/bootstrap.sh` is available during image build.

---

## Reference docs

- Superset Docker Compose setup: https://superset.apache.org/docs/installation/docker-compose
- Superset configuration guide: https://superset.apache.org/docs/configuration/configuring-superset
- SQLAlchemy database URLs: https://docs.sqlalchemy.org/en/20/core/engines.html#database-urls

## Common commands

```bash
# Stop everything
docker compose down

# Remove volumes (wipes all data)
docker compose down -v

# Rebuild the Superset image after changing Dockerfile or bootstrap.sh
docker compose build superset

# Tail all logs
docker compose logs -f

# Open a Superset shell
docker compose exec superset bash

# Run an arbitrary Superset CLI command
docker compose exec superset superset <command>
```

---

## Customising the Superset image

Add extra Python packages (drivers, extensions) in `Dockerfile`:

```dockerfile
RUN pip install --no-cache-dir \
    trino \
    pybigquery
```

Then rebuild: `docker compose build superset`.

---

## Troubleshooting

### `No module named 'MySQLdb'` on MySQL charts

`mysql://...` URLs default to SQLAlchemy's `MySQLdb` / `mysqlclient` driver,
which is not shipped in the upstream Superset image. This project addresses
the issue on two layers:

1. **`superset_config.py` calls `pymysql.install_as_MySQLdb()` at startup**,
   which aliases the pure-Python `pymysql` driver as `MySQLdb` in
   `sys.modules`. Any `import MySQLdb` performed by SQLAlchemy therefore
   resolves to `pymysql`, so both `mysql://` and `mysql+pymysql://` URIs work.
   See [PyMySQL docs](https://pymysql.readthedocs.io/en/latest/modules/index.html).
2. **`docker/scripts/init.sh` reconciles the stored `sales` DB URI** to
   `mysql+pymysql://...` using `Database.set_sqlalchemy_uri()` (the official
   setter that also stores the password in the encrypted `password` column),
   and smoke-tests the connection during init so driver problems surface
   early instead of at first chart render.

If you still see the error (for example, on an old volume created before this
fix shipped), rebuild and wipe the Superset metadata volume so init re-runs
against a clean slate:

```bash
docker compose down -v
docker compose up -d --build
```

To verify the stored URI inside Superset metadata:

```bash
docker compose exec superset python - <<'PY'
from superset.app import create_app
from superset.extensions import db
from superset.models.core import Database

app = create_app()
with app.app_context():
    row = db.session.query(Database).filter(Database.database_name == "sales").one()
    print("stored   :", row.sqlalchemy_uri)            # password is masked
    print("decrypted:", row.sqlalchemy_uri_decrypted)  # real URI used at query time
PY
```

Expected output — both lines should start with `mysql+pymysql://`:

```
stored   : mysql+pymysql://sample_user:XXXXXXXXXX@mysql-db:3306/sales
decrypted: mysql+pymysql://sample_user:sample_pass@mysql-db:3306/sales
```

---

## Production checklist

- [ ] Set `SUPERSET_SECRET_KEY` to a strong random value
- [ ] Set `SESSION_COOKIE_SECURE = True` and `TALISMAN_ENABLED = True` behind HTTPS
- [ ] Use a managed Postgres and Redis (not the Compose services)
- [ ] Configure SMTP in `superset_config.py` for alert/report emails
- [ ] Restrict `SUPERSET_ADMIN_PASSWORD`
- [ ] Pin image tags for `metadata-db`, `redis`, `mysql-db`, and `analytics-db`
