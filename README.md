# Superset Control Plane

> **A GitOps-native, declarative orchestration engine for Apache Superset.**  
> Assets are defined in Git (`assets/*.yaml`), reconciled into Superset via API, and continuously re-applied for convergence.

---

## Quick Start (Docker Compose)

### Prerequisites

- Docker + Docker Compose v2
- Git LFS (for `seed/pg/HH.master.csv`)
- Open ports: `8088` (Superset), `8080/8443` (Keycloak proxy), `5008` (MCP), `5433` (analytics Postgres)

### Steps

1. Copy env file and set secrets:

```bash
cp .env.example .env
```

2. Build and start:

```bash
docker compose up --build
```

3. Open services:

- Superset: `http://localhost:8088`
- Keycloak proxy: `http://localhost:8080`
- MCP HTTP endpoint: `http://localhost:5008`

### Common operations

```bash
# Rebuild image after Dockerfile / plugin changes
docker compose build superset

# Restart reconciler only
docker compose up -d superset-runtime-seed

# Inspect init errors
docker compose logs superset-init --tail 200

# Stop stack
docker compose down
```

---

## Documentation Status (Updated 2026-04-28)

- This README reflects the **current repository state** (files/directories/services verified).
- `wiki/` is now fully populated with architecture, runtime, research, and asset documentation.
- Official documentation references included for all external data sources (see `wiki/research/geojson-sources.md`).

---

## Architecture & Design Pattern Highlights

- **Declarative desired state** in `assets/` (`Database`, `Dataset`, `Chart`, `Dashboard`, `Extension`).
- **Dependency-aware reconciliation** via registry + topological ordering in `docker/scripts/seed_dashboard.py`.
- **Idempotent updates** using find-or-create / put semantics against Superset REST APIs.
- **Separation of concerns**:
  - Runtime orchestration: `docker-compose.yml`
  - Superset image customization: `Dockerfile`
  - Reconcile logic: `docker/scripts/seed_dashboard.py`
  - Data bootstrap: `seed/pg/*.sql`
  - Asset declarations: `assets/**/*.yaml`
- **Pluggability**:
  - Viz plugin: statically compiled into SPA from `superset-plugins/`
  - Extensions: `.supx` discovery from `extensions/bundles/` (development lifecycle in upstream)

---

## Table of Contents

- [1. Why This Exists](#1-why-this-exists)
- [2. Design Philosophy](#2-design-philosophy)
- [3. System Architecture](#3-system-architecture)
- [4. Core Engine Design](#4-core-engine-design)
- [5. Superset Integration Layer](#5-superset-integration-layer)
- [6. MCP Layer](#6-mcp-layer)
- [7. Identity and Auth Layer](#7-identity-and-auth-layer)
- [8. Asset Model](#8-asset-model)
- [9. Runtime Modes](#9-runtime-modes)
- [10. Current Project Structure (Verified)](#10-current-project-structure-verified)
- [11. Reference Docs](#11-reference-docs)
- [License](#license)

---

## 1. Why This Exists

Superset is strong as an analytics UI, but operating it across teams/environments becomes hard when assets are managed manually. This project treats analytics infrastructure like GitOps:

- Git is source-of-truth
- runtime state is reconciled from declarative YAML
- drift is corrected through repeated idempotent applies

---

## 2. Design Philosophy

### 2.1 Principles

| Principle | Meaning |
|---|---|
| Declarative over imperative | Assets are authored as YAML manifests. |
| Idempotent by design | Re-running reconciliation converges safely. |
| Dependency-aware ordering | Kinds apply in deterministic order. |
| No static runtime IDs | IDs are discovered and resolved dynamically. |
| Extensible architecture | Plugins/extensions/SSO/MCP are first-class. |

### 2.2 Non-Goals

- Replacing Superset internals
- Storing secrets in source YAML
- Coupling runtime to one platform only

---

## 3. System Architecture

### 3.1 Runtime services (`docker-compose.yml`)

- `superset` (web)
- `superset-init` (one-shot DB migrate/init/admin creation)
- `celery-worker`, `celery-beat`
- `metadata-db` (Superset Postgres)
- `analytics-db` (seeded sample analytics DB)
- `redis`
- `mcp` (`superset mcp run`)
- Keycloak path: `keycloak-db`, `keycloak`, `keycloak-nginx`, `keycloak-bootstrap`
- Extension build path: `extension-builder`
- Runtime reconciliation loop: `superset-runtime-seed`

### 3.2 High-level flow

1. `superset` image builds from `Dockerfile`.
2. `superset-init` upgrades metadata DB and runs `superset init`.
3. `superset` starts and serves UI/API.
4. `superset-runtime-seed` runs reconcile loop from `assets/` into Superset API.
5. Optional extension bundles (`.supx`) are auto-discovered and exported as env vars.

---

## 4. Core Engine Design

Implemented in `docker/scripts/seed_dashboard.py`.

### 4.1 Asset loader

- Recursively scans `assets/**/*.yaml`
- Reads `apiVersion`, `kind`, `metadata.key`, `spec`

### 4.2 Reconciler registry

Current registered reconcilers:

1. `DatabaseReconciler`
2. `DatasetReconciler`
3. `ChartReconciler`
4. `DashboardReconciler`
5. `PluginReconciler`
6. `ExtensionReconciler`

Execution order is dependency-sorted (topological).

### 4.3 Runtime behavior

- Health wait + login + CSRF bootstrap
- Find-by-field matching for idempotent upserts
- Partial failure handling through `SkipAsset` vs hard fail
- Dashboard layout sync including native filters and cross-filters metadata

---

## 5. Superset Integration Layer

### 5.1 Static viz plugin integration

- Custom viz plugin source: `superset-plugins/plugin-chart-state-district-pies/`
- Plugin is **compiled into SPA** during Docker build via `docker/frontend-build/register-plugin.mjs`
- `FEATURE_FLAGS["DYNAMIC_PLUGINS"] = False` in `superset_config.py`

### 5.2 Extension integration

- Extension source: `superset-extensions/dashboard-chatbot/`
- Built bundle output: `extensions/bundles/*.supx`
- Runtime discovery bridge: `docker/scripts/reconciler_entrypoint.sh`
- Upstream extension lifecycle remains development-stage; API availability may vary.

### 5.3 Dependency compatibility

- Base image is Superset `6.1.0rc2` line.
- Runtime Python deps in Dockerfile are pinned with `sqlalchemy<2.0,>=1.4` to stay compatible with Superset imports.

---

## 6. MCP Layer

- Service: `mcp` in `docker-compose.yml`
- Command: `superset mcp run --host 0.0.0.0 --port ${MCP_PORT}`
- Config in `superset_config.py`:
  - `MCP_DEV_USERNAME`
  - `MCP_AUTH_ENABLED`
  - `MCP_JWT_*` settings

---

## 7. Identity and Auth Layer

- Optional Keycloak OAuth via `custom_sso_security_manager.py`
- Core config in `superset_config.py`:
  - `AUTH_TYPE = AUTH_OAUTH` (when Keycloak envs are set)
  - role mapping via `AUTH_ROLES_MAPPING`
  - `KEYCLOAK_ROLE_CLAIM` passthrough

---

## 8. Asset Model

### 8.1 Current declared assets

- `assets/databases/`: 1
- `assets/datasets/`: 8
- `assets/charts/`: 10
- `assets/dashboards/`: 1
- `assets/extensions/`: 1

### 8.2 Supported kinds in reconciler

- `Database`
- `Dataset`
- `Chart`
- `Dashboard`
- `Plugin` (kept in engine for optional metadata DB path)
- `Extension`

---

## 9. Runtime Modes

- **Bootstrap**: `superset-init` + `keycloak-bootstrap`
- **Serve**: `superset`, `celery-worker`, `celery-beat`, `mcp`
- **Reconcile**: `superset-runtime-seed` continuously applies YAML desired state

---

## 10. Current Project Structure (Verified)

```text
apache-superset-1/
├── assets/
│   ├── charts/
│   ├── dashboards/
│   ├── databases/
│   ├── datasets/
│   └── extensions/
├── config/
├── docker/
│   ├── assets/
│   ├── frontend-build/
│   ├── keycloak-nginx/
│   └── scripts/
├── env/
├── extensions/
│   └── bundles/
├── seed/
│   └── pg/
├── superset-extensions/
│   └── dashboard-chatbot/
│       ├── backend/
│       └── frontend/
├── superset-plugins/
│   └── plugin-chart-state-district-pies/
│       ├── src/
│       │   ├── components/
│       │   ├── geo/
│       │   ├── hooks/
│       │   └── plugin/
│       └── test/
├── wiki/
│   ├── architecture/
│   ├── assets/
│   │   ├── chart/
│   │   ├── dashboard/
│   │   ├── dataset/
│   │   ├── extension/
│   │   └── plugin/
│   ├── reference/
│   ├── research/
│   ├── runtime/
│   └── troubleshooting/
├── docker-compose.yml
├── Dockerfile
├── superset_config.py
├── custom_sso_security_manager.py
└── README.md
```

---

### 10.1 Verified inventory snapshot

#### Root files

- `.env`
- `.env.example`
- `.gitattributes`
- `.gitignore`
- `Dockerfile`
- `docker-compose.yml`
- `superset_config.py`
- `custom_sso_security_manager.py`
- `india-districts.geojson`
- `README.md`

#### Assets (`assets/`)

- `assets/databases/analytics.yaml`
- `assets/datasets/`
  - `hh_master.yaml`
  - `lca_district_segment_pie.yaml`
  - `lca_mpce_by_segment.yaml`
  - `lca_segment_distribution.yaml`
  - `lca_segment_minor_bucket.yaml`
  - `lca_state_district_segment.yaml`
  - `lca_state_district_segment_geo.yaml`
  - `lca_state_segment_distribution.yaml`
- `assets/charts/`
  - `district_helper_text.yaml`
  - `district_pie_unified.yaml`
  - `district_segment_distribution_bar.yaml`
  - `household_minor_structure.yaml`
  - `mpce_by_segment.yaml`
  - `rural_district_segments.yaml`
  - `rural_segment_comparison.yaml`
  - `segment_distribution_pie.yaml`
  - `state_segment_distribution_bar.yaml`
  - `urban_district_segments.yaml`
- `assets/dashboards/household_survey.yaml`
- `assets/extensions/chatbot_assistant.yaml`

#### Docker (`docker/`)

- `docker/assets/`
  - `loader.gif`
  - `logo.svg`
  - `service-worker.js`
- `docker/frontend-build/register-plugin.mjs`
- `docker/keycloak-nginx/`
  - `Dockerfile`
  - `entrypoint.sh`
  - `nginx.conf`
- `docker/scripts/`
  - `bootstrap.sh`
  - `bootstrap_keycloak.py`
  - `init.sh`
  - `reconciler_entrypoint.sh`
  - `scaffold_chatbot_extension.sh`
  - `seed_dashboard.py`

#### Data and env

- `seed/pg/`
  - `001_household_hh_master.sql`
  - `002_lca_segment_views.sql`
  - `003_district_centroids.sql`
  - `005_mpce_by_segment.sql`
  - `HH.master.csv`
- `config/base.yaml`
- `env/dev.yaml`, `env/staging.yaml`, `env/prod.yaml`

#### Plugin and extension source

- `superset-plugins/`
  - `README.md` — plugins directory guide
  - `plugin-chart-state-district-pies/`
    - `ARCHITECTURE.md` — component structure and design
    - `src/components/` — React components
    - `src/geo/` — Geographic utilities
    - `src/hooks/` — React hooks
    - `src/plugin/` — Superset integration
- `superset-extensions/`
  - `README.md` — extensions directory guide
  - `dashboard-chatbot/`
    - `ARCHITECTURE.md` — extension structure and build
    - `backend/` — Python backend
    - `frontend/` — React frontend
    - `extension.json` — Extension manifest
    - `Dockerfile.builder` — Build configuration

#### Wiki (`wiki/`)

- `wiki/index.md` — wiki navigation and entry point
- `wiki/overview.md` — orientation and update policy
- `wiki/log.md` — changelog template
- `wiki/architecture/README.md` — system architecture
- `wiki/assets/`
  - `README.md` — assets section index
  - `db.analytics.md`
  - `chart/chart.household.district_pie_unified.md`
  - `dashboard/dashboard.household.survey.md`
  - `dataset/dataset.household.district_segment_pie.md`
  - `extension/extension.ext.my_org.dashboard_chatbot.md`
  - `plugin/plugin.chart.state_district_pies.md`
- `wiki/reference/docs-cross-reference.md` — documentation index
- `wiki/research/`
  - `plugin-development-guide.md` — detailed plugin architecture
  - `extension-development-guide.md` — extension build workflow
  - `plugins-vs-extensions.md`
  - `state_district_pies-plugin.md`
  - `dashboard-chatbot-extension.md`
  - `geojson-sources.md` — India districts data sources with official references
- `wiki/runtime/`
  - `database-seeding.md`
  - `seed-database.md` — complete seed reference
- `wiki/troubleshooting/chart-visibility-in-ui.md`

---

## 11. Reference Docs

### Official Documentation

- [Superset Docker Compose](https://superset.apache.org/docs/installation/docker-compose)
- [Superset Configuration](https://superset.apache.org/docs/configuration/configuring-superset)
- [Superset Database Configuration](https://superset.apache.org/docs/configuration/databases/)
- [SQLAlchemy Engine URLs](https://docs.sqlalchemy.org/en/20/core/engines.html#database-urls)
- [PostgreSQL COPY](https://www.postgresql.org/docs/current/sql-copy.html)
- [Git LFS](https://git-lfs.github.com/)

### Data Sources (with official references)

- [Census of India 2011](https://censusindia.gov.in/2011census/hlo/pca/pdfs) — Official demographic data
- [Survey of India](https://www.surveyofindia.gov.in/) — National mapping agency
- [NSSO Methodology](https://mospi.gov.in/national-sample-survey-office-nsso) — Household survey standards
- [World Bank LSMS](https://www.worldbank.org/en/programs/lsms) — Living standards methodology

### Community/Research Data

- [udit-001/india-maps-data](https://github.com/udit-001/india-maps-data) — CC BY 2.5 IN
- [Datameet Maps](https://github.com/datameet/maps) — ODbL
- [geo2day.com/india](https://geo2day.com/asia/india.html) — Geographic reference

See `wiki/research/geojson-sources.md` for complete licensing and attribution details.

---

## License

Apache-2.0
