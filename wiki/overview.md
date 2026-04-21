# Project Overview

## What this repository is

This repository is a **Superset control-plane style project** built around declarative analytics assets and an always-on runtime reconciler.

The working implementation today is not a separate compiled control-plane binary. Instead, the operational control plane is primarily implemented by:

- `docker-compose.yml`
- `docker/scripts/seed_dashboard.py`
- `assets/**/*.yaml`
- `superset_config.py`

## What the system does

The repository runs a local analytics platform stack containing:

- Superset web app
- PostgreSQL metadata DB
- PostgreSQL analytics DB
- Redis
- Celery worker / beat
- Keycloak and bootstrap automation
- MCP server
- runtime asset reconciler

The reconciler continuously watches YAML assets and applies them to Superset through the REST API.

## Authoritative files

### Runtime orchestration
- `docker-compose.yml`

### Superset configuration
- `superset_config.py`
- `custom_sso_security_manager.py`

### Control-plane runtime
- `docker/scripts/seed_dashboard.py`

### Declarative assets
- `assets/databases/*.yaml`
- `assets/datasets/*.yaml`
- `assets/charts/*.yaml`
- `assets/dashboards/*.yaml`
- `assets/plugins/*.yaml`
- `assets/extensions/*.yaml`

### Database seed inputs
- `seed/pg/*.sql`
- `seed/pg/HH.master.csv`

## Current key runtime truths

- `superset-runtime-seed` is a **long-lived reconciler**, not just a one-shot seed step.
- Asset `kind:` in YAML is authoritative; directory layout is informational.
- The analytics Postgres init scripts in `seed/pg` auto-run only when the DB volume is initialized for the first time.
- Dynamic plugins are supported conditionally.
- Extensions are scaffolded in this repo but are not operationally mature in released Superset 6.0/6.1 builds.
- **Handlebars charts require special configuration:**
  - `TALISMAN_CONFIG` with `'unsafe-eval'` in `script-src` (for template compilation)
  - `ESCAPE_MARKDOWN_HTML: False` (to prevent HTML escaping)
  - `HTML_SANITIZATION: True` with schema extensions allowing `<style>` tags and `style`/`class` attributes
- **API CSRF:** For programmatic API access, `WTF_CSRF_CHECK_DEFAULT = False` is configured (JWT Bearer auth is sufficient)
- **Dashboard chart height:** Dashboard YAML supports `chartHeight` field to control vertical space for charts
- **Dashboard chart layout:** Dashboard YAML supports `chartsPerRow` field (default: all charts in one row); set to `1` to stack charts vertically

## Current important assets

### Database
- `db.analytics` → `Analytics Warehouse`

### Datasets
- `dataset.household.hh_master`
- `dataset.sales.orders`

### Dashboards
- `dashboard.household.survey`
- `dashboard.exec.overview`

### Notable chart
- `chart.household.rural_segment_comparison` uses `vizType: handlebars`

## Related pages
- [Reconciler Engine](architecture/reconciler-engine.md)
- [Database Seeding](runtime/database-seeding.md)
- [Chart Visibility in UI](troubleshooting/chart-visibility-in-ui.md)
