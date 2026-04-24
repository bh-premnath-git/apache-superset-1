# Wiki Overview

_Last reviewed: 2026-04-24_

## What this repo contains

This repository packages a working Apache Superset stack with:

- Superset web + worker + beat
- PostgreSQL metadata DB
- PostgreSQL analytics DB with seeded household data
- Redis
- Keycloak for OIDC login
- A runtime reconciler that applies declarative analytics assets in `assets/`

## Directory map

- `assets/` — declarative source-of-truth resources (database, datasets, charts, dashboard, plugin, extension)
- `seed/pg/` — SQL + CSV database seed files for analytics data and derived views
- `superset-plugins/` — custom visualization plugin source code
- `superset-extensions/` — extension source code and build assets
- `extensions/bundles/` — built `.supx` extension bundles consumed at runtime
- `wiki/` — operator/developer docs for this repo

## Current functional scope

The active analytics experience centers on the **Household Survey** dashboard (`assets/dashboards/household_survey.yaml`) with:

- a Handlebars-based rural segment comparison table,
- a unified Cartodiagram showing district-level segment pies filtered by state,
- additional summary charts for segment distribution, minor structure, state distribution, and MPCE.

## Operating model

1. Infrastructure starts with Docker Compose.
2. Seed scripts create and shape data inside analytics Postgres.
3. Runtime reconciliation applies assets in dependency order.
4. UI/dashboard behavior is mostly controlled by YAML assets and `superset_config.py` feature flags.

## Documentation conventions

- Asset docs under `wiki/assets/` should reflect the exact source YAML in `assets/`.
- Runbooks should include concrete command snippets.
- Historical notes should be marked clearly as historical to avoid confusion with current state.
## Documentation coverage

The wiki now includes per-asset pages for all declarative assets under `assets/` (database, datasets, charts, dashboard, plugin, and extension). Use `wiki/index.md` as the canonical entry point.

