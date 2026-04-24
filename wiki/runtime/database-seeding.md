# Database Seeding Runbook

_Last reviewed: 2026-04-24_

## Seed artifacts

Seed files are in `seed/pg/`:

1. `001_household_hh_master.sql`
2. `002_lca_segment_views.sql`
3. `003_district_centroids.sql`
4. `005_mpce_by_segment.sql`
5. `HH.master.csv`

## What gets created

At a high level:

- base table: `household.hh_master` loaded from CSV
- analytical views for segment distribution and state/district rollups
- district centroid support table/views for map/cartodiagram rendering
- MPCE-by-segment summary view

## Typical execution paths

### A) Full environment boot

```bash
docker compose up -d --build
docker compose logs -f superset-init superset-runtime-seed
```

### B) Re-run reconcile/seed logic

```bash
docker compose run --rm superset-runtime-seed
```

## Verification checks

Run inside `analytics-db` container (or with your own psql client):

```sql
SELECT COUNT(*) FROM household.hh_master;
SELECT COUNT(*) FROM household.vw_state_district_segment;
SELECT COUNT(*) FROM household.vw_state_district_segment_geo;
SELECT COUNT(*) FROM household.vw_mpce_by_segment;
```

## Common problems

- **Views missing**: one or more SQL scripts did not execute or failed.
- **Chart has no rows**: underlying view exists but filter columns/values do not match chart expectations.
- **District map empty**: centroid/view join keys are mismatched.

## Recovery pattern

1. Check service/container logs (`analytics-db`, `superset-init`, `superset-runtime-seed`).
2. Validate base table row counts.
3. Validate required views exist and return data.
4. Re-run `superset-runtime-seed` after fixing data layer issues.
