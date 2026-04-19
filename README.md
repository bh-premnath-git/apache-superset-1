# Superset Control Plane

> **A GitOps-native, declarative orchestration engine for Apache Superset.**  
> Treats analytics assets like Kubernetes treats workloads: declared in Git, continuously reconciled, drift-detected, and self-healing.

---

## Quick Start (Docker Compose)

This repository ships a working Docker Compose stack with Apache Superset,
PostgreSQL (metadata + sample analytics), Redis, Celery worker/beat, Keycloak
(OIDC), and a runtime seeder that creates a sample
database/dataset/chart/dashboard via the Superset REST API.

### Prerequisites

- Docker Engine 24+ and Docker Compose v2
- ~4 GB free RAM

### Steps

```bash
# 1. Copy and edit environment defaults
cp .env.example .env
# At a minimum, replace SUPERSET_SECRET_KEY with a random 32+ character string:
#   python -c "import secrets; print(secrets.token_hex(32))"

# 2. Build and start the stack
docker compose up -d --build

# 3. Watch init/seed progress (wait for superset-runtime-seed to exit)
docker compose logs -f superset-init superset-runtime-seed
```

Once the `superset-runtime-seed` container exits successfully:

- Superset UI: <http://localhost:8088>
- Default admin login: the `SUPERSET_ADMIN_USERNAME` / `SUPERSET_ADMIN_PASSWORD`
  from `.env` (defaults `admin` / `admin123`)
- Keycloak admin console: <http://localhost:8080> with
  `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD`

The seeded dashboard is titled **Executive Overview** (slug `executive-overview`)
and contains a **Monthly Revenue** chart on top of the `mart_sales.orders`
sample dataset.

### OIDC Client Secret Setup

The Keycloak bootstrap creates a confidential client (`bighammer-admin`) and prints
the generated secret to logs. To enable SSO:

```bash
# 1. Retrieve the client secret from bootstrap logs
docker compose logs --no-color keycloak-bootstrap | grep "CLIENT SECRET"
```

You will see output like:

```
============================================================
CLIENT ID: bighammer-admin
CLIENT SECRET: a1b2c3d4e5f6...
============================================================
```

Copy the secret into your `.env` file:

```bash
# 2. Edit .env and set the client secret
KEYCLOAK_CLIENT_SECRET=a1b2c3d4e5f6...
```

Then restart Superset to pick up the new secret:

```bash
# 3. Restart Superset to apply the secret
docker compose restart superset
```

SSO via Keycloak will now be active at <http://localhost:8088>.

### Common operations

```bash
# Tail Superset logs
docker compose logs -f superset

# Re-run seeding (safe to repeat, idempotent)
docker compose run --rm superset-runtime-seed

# Stop everything (preserve volumes)
docker compose down

# Stop and wipe state (destructive)
docker compose down -v
```

---

## Table of Contents

1. [Why This Exists](#1-why-this-exists)
2. [Design Philosophy](#2-design-philosophy)
3. [System Architecture](#3-system-architecture)
4. [Core Engine Design](#4-core-engine-design)
   - 4.1 [Asset Loader](#41-asset-loader)
   - 4.2 [Schema Validator and Versioning](#42-schema-validator-and-versioning)
   - 4.3 [Dependency Graph](#43-dependency-graph)
   - 4.4 [State Store](#44-state-store)
   - 4.5 [Reconciler Loop](#45-reconciler-loop)
   - 4.6 [Diff Engine](#46-diff-engine)
   - 4.7 [Partial Failure and Retry](#47-partial-failure-and-retry)
5. [Superset Integration Layer](#5-superset-integration-layer)
   - 5.1 [Authentication Strategy](#51-authentication-strategy)
   - 5.2 [Import/Export API Usage](#52-importexport-api-usage)
   - 5.3 [REST API Client](#53-rest-api-client)
6. [MCP Layer](#6-mcp-layer)
   - 6.1 [Architecture](#61-architecture)
   - 6.2 [Transport and Protocol](#62-transport-and-protocol)
   - 6.3 [Tool Catalog](#63-tool-catalog)
   - 6.4 [Authentication Flow](#64-authentication-flow)
7. [Identity and Auth Layer](#7-identity-and-auth-layer)
8. [Asset Model](#8-asset-model)
9. [Runtime Modes](#9-runtime-modes)
10. [Serve Mode and Watcher](#10-serve-mode-and-watcher)
11. [Secrets Management](#11-secrets-management)
12. [Branding and White-Labeling](#12-branding-and-white-labeling)
13. [Environment Overlays](#13-environment-overlays)
14. [Observability](#14-observability)
15. [Security Model](#15-security-model)
16. [CI/CD Integration](#16-cicd-integration)
17. [Repository Structure](#17-repository-structure)
18. [Configuration Reference](#18-configuration-reference)
19. [Deployment Targets](#19-deployment-targets)
20. [Versioning and Release Strategy](#20-versioning-and-release-strategy)
21. [License](#license)

---

## 1. Why This Exists

Apache Superset is powerful, but once you have multiple environments, multiple teams, row-level security rules, custom roles, white-label branding, and promotion flows across environments, managing everything manually in the UI becomes difficult to govern and almost impossible to standardize.

Common pain points include:

- Dashboard IDs are environment-specific and not portable.
- There is no built-in drift detection when someone edits assets directly in the UI.
- Bootstrap is manual and repetitive.
- Promotion from dev to staging to production is fragile.
- There is no clean Git-based source of truth for analytics assets.

This project solves that by treating Superset the same way GitOps platforms treat infrastructure: **Git is the source of truth, and the engine continuously reconciles desired state into the runtime system.**

---

## 2. Design Philosophy

### 2.1 Non-Negotiable Principles

| Principle | Meaning |
|---|---|
| Declarative over imperative | Assets are defined in YAML. The engine decides how to apply them. |
| Idempotent by construction | Running reconcile many times must produce the same result. |
| No hardcoded Superset IDs | Runtime IDs are discovered and stored, not authored. |
| Dependency-aware ordering | Database → Dataset → Chart → Dashboard, always. |
| Platform-agnostic core | The core knows nothing about Docker, Kubernetes, ECS, or any single target. |
| Fail loudly, recover safely | Partial failures are tracked clearly and retried safely. |
| Security first | RBAC, RLS, secret injection, and auditability are first-class. |
| Extensible by default | Branding, plugins, extensions, and MCP are built into the design. |

### 2.2 Non-Goals

This project does **not** aim to:

- Replace Superset internals
- Store secrets in YAML
- Be Kubernetes-only or cloud-only
- Manage Superset metadata DB schema itself
- Make UI-exported assets the only source of truth

---

## 3. System Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        Git Repository                               │
│   assets/  config/  env/  branding/  plugins/                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Control Plane Engine                              │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │  Loader  │→ │Validator │→ │ Dep. Graph   │→ │   Reconciler  │   │
│  └──────────┘  └──────────┘  └──────────────┘  └───────┬───────┘   │
│                                                          │           │
│  ┌──────────────────────────┐   ┌──────────────────┐    │           │
│  │      State Store         │◄──│    Diff Engine   │◄───┘           │
│  │  (SQLite / PostgreSQL)   │   │  (checksum+spec) │                │
│  └──────────────────────────┘   └──────────────────┘                │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ REST API calls / import APIs
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Superset Runtime                               │
│                                                                     │
│  ┌──────────┐  ┌─────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │ Web/API  │  │ Celery  │  │ Celery Beat│  │   PostgreSQL     │   │
│  │ :8088    │  │ Worker  │  │            │  │   (metadata DB)  │   │
│  └──────────┘  └─────────┘  └────────────┘  └──────────────────┘   │
│                                                                     │
│  ┌──────────┐  ┌──────────────────────────────────────────────┐    │
│  │  Redis   │  │         MCP Service / AI Access              │    │
│  │  :6379   │  │   (Superset MCP + control-plane tools)       │    │
│  └──────────┘  └──────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
              ┌─────────────┴──────────────┐
              ▼                            ▼
┌─────────────────────┐      ┌─────────────────────────┐
│  Keycloak           │      │   Connected Data Sources │
│  OIDC / SSO         │      │   Postgres, Snowflake,   │
│                     │      │   ClickHouse, BigQuery   │
└─────────────────────┘      └─────────────────────────┘
```

### 3.1 Reconcile Data Flow

```text
Git change detected
      ↓
Load YAML assets
      ↓
Validate schemas + references
      ↓
Build dependency graph
      ↓
Resolve logical refs
      ↓
Compare desired state vs stored state vs live Superset state
      ↓
Create / update / skip / retry
      ↓
Emit reconcile report + audit events
```

---

## 4. Core Engine Design

### 4.1 Asset Loader

The asset loader scans the `assets/` tree, loads YAML, optionally renders Jinja templates, and builds typed models.

Responsibilities:

- Load all YAML files from the repository
- Support environment-specific rendering
- Normalize raw YAML into internal asset models
- Preserve logical asset keys for reconciliation

### 4.2 Schema Validator and Versioning

Each asset contains an `apiVersion` and `kind`.

Example:

```yaml
apiVersion: analytics/v1
kind: Chart
```

Rules:

- New optional fields can be added safely
- Breaking changes require a new version
- Version converters should normalize older asset versions into the latest internal shape

### 4.3 Dependency Graph

The resolver builds a directed acyclic graph from references such as:

- `databaseRef`
- `datasetRef`
- `chartRefs`
- `filterRefs`

Creation order is always enforced as:

```text
Database → Dataset → Chart → Dashboard
```

Cycles are validation errors and must fail before any mutation happens.

### 4.4 State Store

The state store is the engine’s memory. It tracks:

- logical key
- kind
- runtime Superset ID
- checksum of last applied spec
- sync status
- last reconcile timestamp
- drift events
- retry metadata

Recommended backends:

- SQLite for local or single-node development
- PostgreSQL for shared or production deployments

### 4.5 Reconciler Loop

For each asset in dependency order, the reconciler should:

1. Compute canonical checksum of the rendered spec
2. Load prior state from the state store
3. Decide whether to create, update, skip, or mark drift
4. Apply changes through Superset APIs
5. Persist the new runtime mapping and checksum
6. Emit logs, metrics, and audit records

### 4.6 Diff Engine

Two layers of diffing are recommended:

**Spec diff**
- Compare YAML-derived checksum vs stored checksum

**Live diff**
- Compare live Superset representation vs stored live hash
- Detects UI edits and drift

Possible outcomes:

- no change
- spec changed
- drift detected
- asset missing

### 4.7 Partial Failure and Retry

Partial failure must not corrupt the whole run.

Example:

```text
Database   → success
Dataset    → success
Chart A    → failed
Chart B    → success
Dashboard  → skipped (because it depends on Chart A)
```

Retry strategy:

- persist failures
- exponential backoff
- resume on next reconcile
- clearly distinguish failed vs skipped vs pending

---

## 5. Superset Integration Layer

### 5.1 Authentication Strategy

The control plane should authenticate to Superset through a dedicated service account or a controlled token flow.

Recommendations:

- do not use human admin credentials as the automation identity
- keep API auth separate from interactive user login
- store tokens securely
- support token refresh and CSRF handling where needed

### 5.2 Import/Export API Usage

The control plane should support both:

- direct REST operations for granular assets
- asset bundle import/export for bulk workflows

Recommended model:

```text
Custom YAML model
    ↓ compiler
Superset-compatible asset structure
    ↓ packager
ZIP bundle or REST payload
    ↓
Superset import or create/update APIs
```

Use cases:

- first-run bootstrap
- migration from golden environment
- backup/export of live state
- drift comparison

### 5.3 REST API Client

The Superset API client is responsible for:

- authentication
- CSRF token handling where required
- create/update/read operations
- bulk asset import/export
- role, user, alert, and RLS synchronization
- retries and structured errors

---

## 6. MCP Layer

### 6.1 Architecture

MCP provides AI-facing access to governed Superset capabilities.

Use cases:

- list dashboards
- inspect datasets
- run SQL
- create charts
- create dashboards
- check control-plane status

Recommended split:

- **Superset MCP tools** for analytics interactions
- **Control Plane MCP tools** for reconcile, drift, and asset-state inspection

### 6.2 Transport and Protocol

Support common MCP transports such as:

- SSE / streamable HTTP for remote agents
- stdio for local integrations

### 6.3 Tool Catalog

Suggested control-plane MCP tools:

- `control_plane.reconcile_status`
- `control_plane.asset_status`
- `control_plane.trigger_sync`
- `control_plane.drift_report`
- `control_plane.list_managed_assets`

### 6.4 Authentication Flow

MCP should use governed identity:

- Keycloak-issued JWTs for service or agent access
- Superset RBAC remains the source of authorization
- MCP must not bypass dashboard, dataset, or RLS controls

---

## 7. Identity and Auth Layer

### 7.1 Browser SSO

Interactive users should log in through Keycloak using OIDC redirect-based SSO.

Flow:

```text
User → Superset → Redirect to Keycloak → Authenticate → Return to Superset → Session created
```

### 7.2 Role Mapping

Keycloak groups or claims should map into Superset roles.

Examples:

- `superset_admin` → `Admin`
- `superset_analyst` → `Alpha`
- `superset_viewer` → `Gamma`
- custom business groups → custom managed roles

### 7.3 Service Accounts

The control plane itself should use a dedicated machine identity, separate from browser login users.

### 7.4 Direct Token Sign-In

Direct “raw Keycloak token → browser session in Superset” should be treated as an optional custom extension, not a baseline assumption.

---

## 8. Asset Model

### 8.1 Supported Asset Types

- Database
- Dataset
- Chart
- Dashboard
- DashboardFilter
- Role
- User
- RLS
- Theme
- Branding
- Alert
- Report
- Embedding
- Plugin
- Extension

### 8.2 Example Assets

**Database**
```yaml
apiVersion: analytics/v1
kind: Database
metadata:
  key: db.analytics
  name: Analytics Warehouse
spec:
  engine: postgresql
  sqlalchemyUriFromEnv: ANALYTICS_DB_URI
```

**Dataset**
```yaml
apiVersion: analytics/v1
kind: Dataset
metadata:
  key: dataset.sales.orders
  name: sales_orders
spec:
  databaseRef: db.analytics
  schema: mart_sales
  table: orders
  timeColumn: order_date
```

**Chart**
```yaml
apiVersion: analytics/v1
kind: Chart
metadata:
  key: chart.sales.monthly_revenue
  name: Monthly Revenue
spec:
  datasetRef: dataset.sales.orders
  vizType: echarts_timeseries_bar
  params:
    metrics:
      - sum_revenue
    x_axis: order_date
```

**Dashboard**
```yaml
apiVersion: analytics/v1
kind: Dashboard
metadata:
  key: dashboard.exec.overview
  name: Executive Overview
spec:
  slug: executive-overview
  chartRefs:
    - chart.sales.monthly_revenue
```

**RLS**
```yaml
apiVersion: analytics/v1
kind: RLS
metadata:
  key: rls.sales.country_restriction
spec:
  datasetRefs:
    - dataset.sales.orders
  clause: "country = '{{ current_user.country }}'"
  roles:
    - role.regional_viewer
```

---

## 9. Runtime Modes

### 9.1 Bootstrap

Used for first-run setup.

```bash
control-plane bootstrap --env dev
```

Responsibilities:

- verify Superset health
- verify metadata DB readiness
- validate assets
- build initial state
- create all missing resources

### 9.2 Reconcile

Used for CI/CD, manual syncs, or scheduled syncs.

```bash
control-plane reconcile --env prod
```

Responsibilities:

- detect changes
- apply only required updates
- report drift and failures
- keep runtime aligned with Git

### 9.3 Serve

Used for always-on operator behavior.

```bash
control-plane serve --env prod
```

Responsibilities:

- host webhook endpoints
- expose health/metrics/status
- run drift scans
- trigger reconcile on changes

---

## 10. Serve Mode and Watcher

Recommended design:

- **webhook-first**
- **polling as fallback**

Typical flow:

```text
Git push
  → webhook received
  → signature verified
  → changed files inspected
  → reconcile triggered only when relevant paths changed
```

Suggested watched paths:

- `assets/`
- `config/`
- `env/<current-env>/`

---

## 11. Secrets Management

Hard rules:

- secrets never live in YAML
- YAML stores only references
- control plane must not log secret values

Supported secret providers:

- environment variables
- HashiCorp Vault
- AWS Secrets Manager
- GCP Secret Manager
- Azure Key Vault
- mounted files

Example:

```yaml
spec:
  sqlalchemyUriFromEnv: ANALYTICS_DB_URI
```

---

## 12. Branding and White-Labeling

Branding should be declarative and environment-aware.

Supported items:

- application name
- logo
- favicon
- loader SVG
- color palette
- font family
- tenant-specific branding overlays

Example:

```yaml
apiVersion: analytics/v1
kind: Branding
metadata:
  key: branding.default
spec:
  appName: "Acme Analytics"
  logoPath: branding/logos/acme-logo.png
  faviconPath: branding/favicons/acme.ico
  loaderSvgPath: branding/loaders/spinner.svg
  theme:
    colorPrimary: "#1A3C6E"
    colorSecondary: "#E87722"
    fontFamily: "Inter, sans-serif"
```

---

## 13. Environment Overlays

Use layered configuration:

```text
config/
  base.yaml
env/
  dev.yaml
  staging.yaml
  prod.yaml
```

Base config contains shared defaults. Environment files override what differs.

Typical differences:

- database connections
- branding
- feature flags
- auth config
- drift policy
- cache settings

---

## 14. Observability

### 14.1 Metrics

Suggested metrics:

- reconcile runs total
- reconcile duration
- assets synced / skipped / failed
- drift events total
- Superset API request counts
- token refresh counts
- state counts by status

### 14.2 Structured Logging

Logs should be JSON and include:

- logical key
- asset kind
- action
- duration
- run ID
- environment

### 14.3 Audit Logging

Every state mutation should be auditable:

- create
- update
- delete
- drift remediation

### 14.4 Health Endpoints

Recommended endpoints:

- `/health/live`
- `/health/ready`
- `/metrics`
- `/status`

---

## 15. Security Model

### 15.1 Principle of Least Privilege

The control plane should use the smallest required Superset permissions.

### 15.2 Webhook Security

All webhook-triggered reconcile events must validate signatures.

### 15.3 MCP Security

MCP must inherit Superset RBAC and RLS, not bypass it.

### 15.4 RLS Enforcement

The control plane registers RLS policies. Superset enforces them at query time.

### 15.5 Supply Chain Safety

Recommendations:

- pin versions
- avoid floating `latest`
- sign commits for protected branches
- generate SBOMs for images when needed

---

## 16. CI/CD Integration

### 16.1 Typical Pipeline

1. validate YAML and schema
2. run dry-run reconcile
3. apply to dev
4. promote to staging
5. require approval for prod
6. reconcile prod

### 16.2 Rollback Model

Rollback should be Git-native:

```text
revert commit
→ pipeline runs again
→ previous desired state is reconciled back
```

For targeted rollback, allow scoping by asset key and revision.

---

## 17. Repository Structure

```text
superset-control-plane/
├── README.md
├── assets/
│   ├── databases/
│   ├── datasets/
│   ├── charts/
│   ├── dashboards/
│   ├── dashboard-filters/
│   ├── roles/
│   ├── users/
│   ├── rls/
│   ├── themes/
│   ├── branding/
│   ├── alerts/
│   ├── reports/
│   ├── embedding/
│   ├── plugins/
│   └── extensions/
├── config/
│   ├── base.yaml
│   ├── feature_flags.yaml
│   ├── security.yaml
│   ├── cache.yaml
│   └── auth.yaml
├── env/
│   ├── dev.yaml
│   ├── staging.yaml
│   └── prod.yaml
├── core/
│   ├── models/
│   ├── schemas/
│   ├── loader/
│   ├── resolver/
│   ├── compiler/
│   ├── diff/
│   ├── reconciler/
│   └── state/
├── integrations/
│   ├── superset/
│   ├── keycloak/
│   ├── mcp/
│   ├── secrets/
│   ├── branding/
│   └── plugins/
├── runtime/
│   ├── cli/
│   ├── server/
│   └── jobs/
├── deployments/
│   ├── docker/
│   ├── kubernetes/
│   ├── nomad/
│   └── vm/
└── tests/
```

---

## 18. Configuration Reference

### 18.1 Required

```env
SUPERSET_URL=http://superset:8088
SUPERSET_SERVICE_ACCOUNT_USER=control-plane
SUPERSET_SERVICE_ACCOUNT_SECRET=change-me
SECRET_KEY=change-me
ASSETS_PATH=/app/assets
ENV=prod
```

### 18.2 State Store

```env
STATE_BACKEND=postgresql
STATE_DB_URL=postgresql://cp:pass@state-db:5432/control_plane
```

### 18.3 Keycloak

```env
KEYCLOAK_URL=https://auth.example.com
KEYCLOAK_REALM=analytics
KEYCLOAK_CLIENT_ID=superset-control-plane
KEYCLOAK_CLIENT_SECRET=change-me
```

### 18.4 Redis and Celery

```env
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2
```

### 18.5 Serve Mode

```env
SERVE_PORT=9000
WEBHOOK_SECRET=change-me
DRIFT_SCAN_INTERVAL=300
POLL_INTERVAL=300
```

---

## 19. Deployment Targets

The core engine remains platform agnostic. Deployment targets are packaging adapters only.

Supported packaging targets can include:

- Docker Compose
- Kubernetes
- Nomad
- VM / systemd
- other container or scheduler platforms

### 19.1 Docker Compose

Good for:

- local development
- demos
- single-node integration testing

Runtime bootstrap in this repository follows the design principle of runtime reconciliation: a dedicated `superset-runtime-seed` service performs sample resource creation through Superset REST APIs after the web service starts.

### 19.2 Kubernetes

Good for:

- production clusters
- CronJob-based reconcile
- GitOps sidecars / synced config
- managed secrets injection

### 19.3 VM / systemd

Good for:

- simple installations
- air-gapped environments
- controlled internal hosting

---

## 20. Versioning and Release Strategy

### 20.1 Superset Version

Pin Superset to an exact tested version.

Recommended baseline:

- Superset `6.0.0`

### 20.2 Control Plane Versioning

Use semantic versioning:

- **MAJOR** for breaking schema or runtime changes
- **MINOR** for new features and asset types
- **PATCH** for fixes

### 20.3 Schema Versioning

Schema version should be independent from app version.

Example:

- app version: `1.4.2`
- schema version: `analytics/v1`

### 20.4 Pinned Baseline

Suggested baseline:

| Component | Version |
|---|---|
| Superset | 6.0.0 |
| Keycloak | 26.6.1 |
| Redis | 8.x |
| PostgreSQL | 18.x |
| Python | 3.12 |

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


## Reference docs

- [Superset Docker Compose setup](https://superset.apache.org/docs/installation/docker-compose)
- [Superset configuration guide](https://superset.apache.org/docs/configuration/configuring-superset)
- [Superset 6.0.0 database connections](https://superset.apache.org/user-docs/6.0.0/configuration/databases/)
- [SQLAlchemy database URLs](https://docs.sqlalchemy.org/en/20/core/engines.html#database-urls)

---

## License

Apache-2.0
