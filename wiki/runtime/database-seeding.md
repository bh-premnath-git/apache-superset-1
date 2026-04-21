# Database Seeding

## Purpose

This page explains how analytics data gets into the `analytics-db` Postgres container and why adding a new SQL file does not always change the running database.

## Authoritative runtime wiring

From `docker-compose.yml`:

- service: `analytics-db`
- mount: `./seed/pg:/docker-entrypoint-initdb.d:ro`
- volume: `analytics-db-data:/var/lib/postgresql/data`

That means seed SQL and CSV files are exposed to Postgres at container startup.

## Critical operational rule

Files under `/docker-entrypoint-initdb.d` are processed automatically by the Postgres image **only on first initialization of the data directory**.

Implication:
- adding a new SQL file later does not automatically apply it to an existing DB volume
- restarting the container is not enough
- rebuilding the image is not enough

To apply new SQL after the DB already exists, you must either:
- run the SQL manually with `psql`, or
- recreate the Postgres volume and let initialization run again

## Repo-specific example: household import

The household survey data required a new seed file:
- `seed/pg/002_household_hh_master.sql`

It creates:
- schema `household`
- table `household.hh_master`
- `COPY` from `HH.master.csv`

### Important import lessons
The CSV was not loadable with the original inferred schema. The following fixes were necessary:

- decimal-bearing columns changed from `int4` to `float4`
- many label fields widened to avoid `varchar(50)` truncation
- `COPY ... NULL 'NA'` added to treat `NA` as null
- `Multiplier` changed to `float4` to support scientific notation like `1e+05`

Final successful load result:
- `COPY 261953`

## Why this matters to Superset

If the analytics table is not actually present in Postgres, the dataset asset can fail even when the YAML is correct.

That was the root cause of the earlier `hh_master` dataset failures.

## Recommended debugging order

1. Confirm schema exists in Postgres
2. Confirm table exists
3. Confirm row count is non-zero when expected
4. Confirm dataset asset references the correct database/schema/table
5. Only then debug Superset API failures

## Related files
- `docker-compose.yml`
- `seed/pg/001_schema.sql`
- `seed/pg/002_household_hh_master.sql`
- `seed/pg/HH.master.csv`

## Related pages
- [Project Overview](../overview.md)
- [dataset.household.hh_master](../assets/dataset.household.hh_master.md)
- [Chart Visibility in UI](../troubleshooting/chart-visibility-in-ui.md)
