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

## Connecting sample databases in Superset

Go to **Settings → Database Connections → + Database** and use these URIs:

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
    ├── mysql_sales.sql
    └── pg_analytics.sql
```

---

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

## Production checklist

- [ ] Set `SUPERSET_SECRET_KEY` to a strong random value
- [ ] Set `SESSION_COOKIE_SECURE = True` and `TALISMAN_ENABLED = True` behind HTTPS
- [ ] Use a managed Postgres and Redis (not the Compose services)
- [ ] Configure SMTP in `superset_config.py` for alert/report emails
- [ ] Restrict `SUPERSET_ADMIN_PASSWORD`
- [ ] Pin image tags for `metadata-db`, `redis`, `mysql-db`, and `analytics-db`
