# Runtime: Database Seeding

## What seeds the analytics DB

`analytics-db` mounts `seed/pg/` into `/docker-entrypoint-initdb.d`.

On first initialization, Postgres executes:

- `001_household_hh_master.sql`
- `002_lca_segment_views.sql`
- `003_district_centroids.sql`
- `005_mpce_by_segment.sql`

and consumes `HH.master.csv` via SQL scripts.

## Health and readiness behavior

- `analytics-db` healthcheck uses `pg_isready`.
- `start_period` is intentionally long (`120s`) to allow large CSV load.

## Common operations

```bash
# View analytics DB logs
docker compose logs analytics-db --tail 200

# Recreate only analytics DB volume (destructive to seeded runtime data)
docker compose stop analytics-db
docker volume rm apache-superset-1_analytics-db-data
docker compose up -d analytics-db
```

## Troubleshooting hints

- If seed appears incomplete, confirm Git LFS pulled `seed/pg/HH.master.csv`.
- If `superset-init` waits on `analytics-db`, inspect healthcheck and seed logs first.
