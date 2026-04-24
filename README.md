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

# 3. Watch init/seed progress — superset-runtime-seed is a long-lived
#    reconciler: it performs the first sync then keeps watching `assets/`
#    for YAML changes and re-syncs automatically.
docker compose logs -f superset-init superset-runtime-seed
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

## Documentation Status (Updated 2026-04-24)

Project runbooks and asset references are maintained under [`wiki/`](wiki/index.md).

- Wiki home: [`wiki/index.md`](wiki/index.md)
- System overview: [`wiki/overview.md`](wiki/overview.md)
- Architecture summary: [`wiki/architecture/README.md`](wiki/architecture/README.md)
- Runtime seeding runbook: [`wiki/runtime/database-seeding.md`](wiki/runtime/database-seeding.md)
- Troubleshooting (chart visibility): [`wiki/troubleshooting/chart-visibility-in-ui.md`](wiki/troubleshooting/chart-visibility-in-ui.md)
- Full asset catalog (all databases/datasets/charts/dashboard docs): [`wiki/index.md`](wiki/index.md)
- Documentation cross-reference (all README/wiki files in this repo): [`wiki/reference/docs-cross-reference.md`](wiki/reference/docs-cross-reference.md)

This section exists to keep operational docs discoverable while the longer design document below remains available for deep reference.

## Architecture & Design Pattern Highlights

At a glance, this project follows a **GitOps + reconcile loop** design pattern for analytics assets:

- **Declarative desired state** in `assets/` (database → dataset → chart → dashboard).
- **Dependency-aware reconciliation** so resources apply in stable order and can be retried safely.
- **Idempotent operations** so repeated runs converge to the same runtime state.
- **Separation of concerns** between platform/runtime orchestration (Compose/services), data seeding (`seed/pg/`), and asset declarations (`assets/`).
- **Extension points** for custom visual plugins and Superset extensions without coupling core asset flows.

For deeper details:
- Architecture narrative in this README: [System Architecture](#3-system-architecture) and [Core Engine Design](#4-core-engine-design).
- Wiki architecture companion: [`wiki/architecture/README.md`](wiki/architecture/README.md).

## Table of Contents

- [Quick Start](#quick-start-docker-compose)
- [Documentation](#documentation-status)
- [Architecture Highlights](#architecture--design-pattern-highlights)
- [Why This Exists](#1-why-this-exists)
- [Design Philosophy](#2-design-philosophy)
- [System Architecture](#3-system-architecture)
- [Core Engine Design](#4-core-engine-design)
- [Superset Integration](#5-superset-integration-layer)
- [MCP Layer](#6-mcp-layer)
- [Identity and Auth](#7-identity-and-auth-layer)
- [Asset Model](#8-asset-model)
- [Runtime Modes](#9-runtime-modes)
- [Reference](#reference-docs)
- [Documentation Cross-Reference](#documentation-cross-reference)
- [License](#license)

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
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Git Repository                                      │
│  assets/  config/  env/  seed/  wiki/  docker/  extensions/  superset-plugins/ │
└─────────────────────────────┬─────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Build Phase (One-shot)                               │
│  ┌──────────────┐  ┌────────────────┐                                       │
│  │plugin-builder│  │extension-builder│ → /extensions/bundles/              │
│  └──────────────┘  └────────────────┘                                       │
│         │                                                                     │
│         ▼                                                                     │
│  /plugin-dist/<name>/ (volume)                                                │
└─────────────────────────────┬─────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Control Plane Engine (Runtime)                        │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌─────────────────┐           │
│  │  Loader  │→ │Validator │→ │  Dep. Graph  │→ │   Reconciler    │           │
│  └──────────┘  └──────────┘  └──────────────┘  └────────┬────────┘           │
│                                                         │                     │
│  ┌────────────────────────┐   ┌──────────────────┐     │                     │
│  │      State Store       │◄──│    Diff Engine   │◄────┘                     │
│  │  (SQLite / PostgreSQL) │   │  (checksum+spec) │                         │
│  └────────────────────────┘   └──────────────────┘                         │
└─────────────────────────────┬─────────────────────────────────────────────────┘
                              │ REST API calls
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Superset Runtime                                     │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────────┐           │
│  │  superset│  │  celery  │  │celery-beat │  │   metadata-db    │           │
│  │  :8088   │  │  worker  │  │            │  │   (PostgreSQL)   │           │
│  └──────────┘  └──────────┘  └────────────┘  └──────────────────┘           │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────────────────┐   │
│  │  redis   │  │    mcp   │  │  superset-runtime-seed (reconciler)      │   │
│  │  :6379   │  │  :5008   │  │  Long-lived watcher, auto-syncs assets  │   │
│  └──────────┘  └──────────┘  └──────────────────────────────────────────┘   │
└─────────────────────────────┬─────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Keycloak     │  │   analytics-db  │  │  Connected Data │
│  OIDC / SSO     │  │  (PostgreSQL)   │  │    Sources      │
│  :8080          │  │  Seed: CSV/SQL  │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
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

The control plane integrates with Superset via:

- **REST API** — for asset CRUD operations (dashboards, charts, datasets, databases)
- **Import/Export APIs** — for bulk bundle operations where available
- **Database connections** — via SQLAlchemy URIs injected from environment variables

### 5.1 Authentication

The reconciler (`superset-runtime-seed` service) uses a service account with Admin privileges. Credentials are configured via environment variables:

```bash
SUPERSET_ADMIN_USERNAME=admin
SUPERSET_ADMIN_PASSWORD=admin
```

### 5.2 Asset Sync Flow

1. `seed_dashboard.py` loads YAML assets from `/app/assets`
2. Validates cross-references (`databaseRef`, `datasetRef`, `chartRefs`)
3. Resolves logical keys to runtime IDs via the reconciler state store
4. Calls Superset REST APIs to create/update resources
5. Persists runtime mappings for idempotent re-runs

### 5.3 Custom Plugin Registration

Dynamic plugins are auto-discovered from `/plugin-dist/*/dist/bundle-url.txt` and registered via the custom plugins API. Note: `DYNAMIC_PLUGINS` feature flag is currently disabled pending upstream fixes (see `assets/plugins/state_district_pies.yaml`).

---

## 6. MCP Layer

Apache Superset exposes a built-in Model Context Protocol server through the
`superset mcp run` CLI, available in the Superset 6.1 line (currently
`6.1.0rc2` — see the [Superset releases page](https://github.com/apache/superset/releases)
and the [6.1 MCP docker discussion](https://github.com/apache/superset/discussions/38703)).
This repository pins `apache/superset:6.1.0rc2` as the default base image so
the `mcp` subcommand is present out of the box, and wires a dedicated `mcp`
service into `docker-compose.yml` that starts automatically with the rest of
the stack.  Everything — image tag, port, auth mode, credentials — is driven
by environment variables; nothing is hardcoded in compose or config.

### 6.1 Architecture

```text
┌──────────────┐  JWT / dev-impersonation   ┌──────────────┐
│ MCP Clients  │ ─────────────────────────▶ │   mcp:5008   │
│ (Claude,     │    streamable HTTP         │ (Superset    │
│  Cursor,     │ ◀───────────────────────── │  mcp CLI)    │
│  Agents SDK) │                            └──────┬───────┘
└──────────────┘                                   │ in-process
                                                   │ Flask app ctx
                                                   ▼
                                         ┌────────────────────┐
                                         │  Superset RBAC /   │
                                         │  metadata DB /     │
                                         │  query engine      │
                                         └────────────────────┘
```

Design principles this layout enforces:

| Principle | How it's realised |
|---|---|
| **Single responsibility** | The `mcp` container only runs `superset mcp run`; web/API traffic remains on `superset:8088`. |
| **Shared source of truth** | Both containers mount the same `superset_config.py`, so feature flags, DB URIs, and Keycloak settings cannot drift. |
| **Configuration over code** | All tunables (image tag, port, auth mode, JWT issuer) are injected via env — no conditional Python branches. |
| **Least privilege** | MCP inherits Superset's RBAC/RLS; JWT-mode resolves a Superset user and Superset enforces authorization. |
| **Composability** | Health-checked service with `depends_on: superset (service_healthy)` so the start-up graph is deterministic. |

### 6.2 Transport and Protocol

The upstream `superset mcp run` CLI exposes MCP over **streamable HTTP**,
compatible with Claude Desktop, Cursor, Windsurf, and the OpenAI Agents SDK.
The host port is controlled by `MCP_PORT` (default `5008`).

### 6.3 Tool Catalog

The server surfaces Superset's own capabilities as MCP tools — dashboards,
charts, datasets, SQL Lab — discovered dynamically from the running Superset
instance.  The exact catalog is owned upstream; see
[Apache Superset — MCP Integration](https://superset.apache.org/developer-docs/extensions/mcp/)
for the version-specific list.

Control-plane-specific MCP tools (reconcile status, drift report, etc.) are a
future addition on top of the upstream server.

### 6.4 Authentication Flow

Two modes, both env-driven (see `superset_config.py` and `.env.example`).

**Development — impersonation (no token validation).** Use only on trusted
networks; every MCP request runs as the configured user:

```bash
# .env — defaults suitable for the Docker Compose stack
MCP_AUTH_ENABLED=False
MCP_DEV_USERNAME=admin   # must exist in the Superset user database
```

**Production — JWT validation (e.g. Keycloak).** The MCP server validates the
incoming `Authorization: Bearer <jwt>` header against the configured
issuer/audience and JWKS, then resolves the Superset user from the token's
`sub` / `email` / `preferred_username` claim:

```bash
# .env
MCP_AUTH_ENABLED=True
MCP_JWT_ALGORITHM=RS256
MCP_JWT_ISSUER=http://keycloak:8080/realms/master
MCP_JWT_AUDIENCE=bighammer-admin
MCP_JWKS_URI=http://keycloak:8080/realms/master/protocol/openid-connect/certs
```

Because Keycloak is already part of the stack, reusing its issuer and JWKS
URL keeps the MCP identity model aligned with browser SSO.

### 6.5 Verifying the Service

```bash
docker compose ps mcp                       # STATE should be "healthy"
docker compose logs -f mcp                  # watch MCP requests
curl -s http://localhost:${MCP_PORT:-5008}/ # transport handshake
```

References:

- [MCP Server Deployment & Authentication — Superset docs](https://superset.apache.org/admin-docs/configuration/mcp-server/)
- [MCP Integration — Superset developer docs](https://superset.apache.org/developer-docs/extensions/mcp/)
- [Using AI with Superset](https://superset.apache.org/user-docs/using-superset/using-ai-with-superset/)

---

## 7. Identity and Auth Layer

### 7.1 Browser SSO

Interactive users should log in through Keycloak using OIDC redirect-based SSO.

Flow:

```text
User → Superset → Redirect to Keycloak → Authenticate → Return to Superset → Session created
```

### 7.2 Role Mapping

Keycloak roles are mapped to Superset roles via `custom_sso_security_manager.py`:

- Keycloak `superset_admin` → Superset `Admin` role
- Keycloak `superset_alpha` → Superset `Alpha` role  
- Keycloak `superset_gamma` → Superset `Gamma` role
- Keycloak `superset_public` → Superset `Public` role

Role claim is extracted from the JWT token's `role_keys` claim (configurable via `KEYCLOAK_ROLE_CLAIM`).

### 7.3 Service Accounts

The reconciler (`superset-runtime-seed`) uses a dedicated service account:

```bash
SUPERSET_ADMIN_USERNAME=admin
SUPERSET_ADMIN_PASSWORD=admin
```

This account is created during `superset-init` and used for all REST API operations. Browser users authenticate via Keycloak OIDC.

### 7.4 Direct Token Sign-In

Direct "raw Keycloak token → browser session in Superset" is implemented via `custom_sso_security_manager.py` using `CustomSsoSecurityManager`. The `/login/keycloak` endpoint accepts a Keycloak JWT and establishes a Superset session. Useful for embedding scenarios.

---

## 8. Asset Model

### 8.1 Supported Asset Types

Currently implemented reconcilers (from `@/bhprojects/apache-superset-1/docker/scripts/seed_dashboard.py`):

| Kind | Dependencies | Description |
|------|--------------|-------------|
| `Database` | — | Connection to a SQL database |
| `Dataset` | `Database` | Virtual dataset (table/view) |
| `Chart` | `Dataset` | Visualization with params and viz type |
| `Dashboard` | `Chart` | Dashboard with layout, filters, and charts |
| `Plugin` | — | Dynamic visualization plugin (requires `DYNAMIC_PLUGINS` flag) |
| `Extension` | — | `.supx` extension bundles |

Future kinds (schema defined, reconciler pending): `DashboardFilter`, `Role`, `User`, `RLS`, `Theme`, `Branding`, `Alert`, `Report`, `Embedding`

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

**DashboardFilter**
```yaml
apiVersion: analytics/v1
kind: DashboardFilter
metadata:
  key: filter.sales.country_selector
  name: Country Selector
spec:
  dashboardRef: dashboard.exec.overview
  filterType: filter_select
  targets:
    - datasetRef: dataset.sales.orders
      column: country
  defaultValue: []
  isInstant: true
  sortAscending: true
```

**Role**
```yaml
apiVersion: analytics/v1
kind: Role
metadata:
  key: role.regional_viewer
  name: Regional Viewer
spec:
  permissions:
    - "[can_read].[Dashboard]"
    - "[can_read].[Chart]"
    - "[datasource_access].[Analytics Warehouse].[mart_sales.orders]"
  copyFrom: Gamma                # optional: inherit from a built-in role
```

**User**
```yaml
apiVersion: analytics/v1
kind: User
metadata:
  key: user.svc.control_plane
  name: control-plane
spec:
  firstName: Control
  lastName: Plane
  email: control-plane@example.com
  roles:
    - role.admin
  passwordFromEnv: CP_SVC_PASSWORD     # never stored in YAML
  active: true
```

**Theme**
```yaml
apiVersion: analytics/v1
kind: Theme
metadata:
  key: theme.corporate
  name: Corporate Theme
spec:
  algorithm: light                      # light | dark
  token:
    colorPrimary: "#1A3C6E"
    colorSecondary: "#E87722"
    fontFamily: "Inter, sans-serif"
    borderRadius: 6
    brandLogoUrl: /static/assets/images/logo.svg
    brandLogoHref: /
```

**Alert**
```yaml
apiVersion: analytics/v1
kind: Alert
metadata:
  key: alert.sales.revenue_drop
  name: Revenue Drop Alert
spec:
  type: Alert
  databaseRef: db.analytics
  sql: |
    SELECT CASE WHEN SUM(revenue) < 1000 THEN 1 ELSE 0 END AS alert
    FROM mart_sales.orders
    WHERE order_date = CURRENT_DATE - INTERVAL '1 day'
  validator:
    type: operator
    operator: "=="
    threshold: 1
  schedule:
    crontab: "0 8 * * *"
    timezone: UTC
  recipients:
    - type: Email
      value: alerts@example.com
  owners:
    - user.svc.control_plane
  active: true
```

**Report**
```yaml
apiVersion: analytics/v1
kind: Report
metadata:
  key: report.exec.weekly_overview
  name: Weekly Executive Overview
spec:
  type: Report
  dashboardRef: dashboard.exec.overview
  schedule:
    crontab: "0 7 * * 1"
    timezone: UTC
  reportFormat: PNG                     # PNG | CSV
  recipients:
    - type: Email
      value: executives@example.com
  owners:
    - user.svc.control_plane
  active: true
```

**Embedding**
```yaml
apiVersion: analytics/v1
kind: Embedding
metadata:
  key: embed.exec.overview
  name: Executive Overview Embed
spec:
  dashboardRef: dashboard.exec.overview
  allowedDomains:
    - "https://app.example.com"
    - "https://internal.example.com"
```

**Plugin**
```yaml
apiVersion: analytics/v1
kind: Plugin
metadata:
  key: plugin.chart.custom_waterfall
  name: Custom Waterfall Chart
spec:
  vizType: custom_waterfall
  # Bundle URL injected from environment — dynamic plugin bundles must be
  # built from source and self-hosted (CDN, S3, static server).
  # See: https://github.com/apache-superset/dynamic-import-demo-plugin
  #
  # Workflow:
  #   1. Fork the demo plugin repo or scaffold with @superset-ui/generator-superset
  #   2. npm install && npm run build-prod
  #   3. Host /dist/main.js on your infrastructure
  #   4. Set WATERFALL_PLUGIN_BUNDLE_URL=https://your-cdn.example.com/.../main.js
  bundleUrlFromEnv: WATERFALL_PLUGIN_BUNDLE_URL
  description: "Waterfall chart with positive/negative deltas and subtotals"
  featureFlag: DYNAMIC_PLUGINS          # required feature flag
```

**Extension**
```yaml
apiVersion: analytics/v1
kind: Extension
metadata:
  key: ext.my_org.query_optimizer
  name: Query Optimizer
spec:
  publisher: my-org
  extensionName: query-optimizer
  version: "1.2.0"
  # .supx bundle path injected from environment — build with:
  #   pip install apache-superset-extensions-cli
  #   superset-extensions init && superset-extensions bundle
  # Then set QUERY_OPTIMIZER_SUPX_PATH=/app/extensions/my-org.query-optimizer-1.2.0.supx
  #
  # OR use supxUrlFromEnv: QUERY_OPTIMIZER_SUPX_URL for remote registry pull
  supxPathFromEnv: QUERY_OPTIMIZER_SUPX_PATH
  featureFlag: ENABLE_EXTENSIONS        # required feature flag
  permissions:
    - can_read
    - can_write
```

### 8.3 Asset YAML Schema Reference

Every asset manifest follows a consistent envelope:

```yaml
apiVersion: analytics/v1       # schema version — allows safe evolution
kind: <AssetType>              # determines which reconciler handles it
metadata:
  key: <kind>.<logical.key>    # globally unique, stable, human-readable
  name: <Display Name>         # used as the resource name in Superset
spec:
  # kind-specific fields
  # references use *Ref suffix: databaseRef, datasetRef, chartRefs, etc.
  # secrets use *FromEnv suffix: sqlalchemyUriFromEnv, passwordFromEnv, etc.
```

| Convention | Rule |
|---|---|
| **`key`** | Dot-separated, globally unique. Format: `kind.namespace.name` (e.g., `chart.sales.monthly_revenue`) |
| **`*Ref` fields** | Cross-asset references by key, never by runtime ID. Resolved via `ReconcileContext` |
| **`*FromEnv` fields** | Secret values injected from environment variables at reconcile time |
| **`apiVersion`** | Semantic — new optional fields are safe; breaking changes require a version bump |
| **Directory layout** | Informational only. The authoritative kind comes from the `kind:` field |

### 8.4 Reconciler Registry

The reconciler registry (`RECONCILERS` in `seed_dashboard.py`) maps each `kind` to its implementation:

```python
RECONCILERS = (
    DatabaseReconciler(),      # kind: Database
    DatasetReconciler(),       # kind: Dataset, depends_on: Database
    ChartReconciler(),         # kind: Chart, depends_on: Dataset
    DashboardReconciler(),     # kind: Dashboard, depends_on: Chart
    PluginReconciler(),        # kind: Plugin (dynamic viz)
    ExtensionReconciler(),     # kind: Extension (.supx bundles)
)
```

**Adding a new kind:**
1. Subclass `Reconciler` with `kind` and optional `depends_on`
2. Implement `apply(client, asset, ctx) -> runtime_id`
3. Add instance to `RECONCILERS` tuple
4. The engine auto-orders by dependency graph

### 8.5 Available Chart Types

This project uses these viz types (from `@/bhprojects/apache-superset-1/assets/charts/`):

| Type | Used In | Description |
|---|---|---|
| `cartodiagram` | `district_pie_unified.yaml` | Map with proportional pie overlays (Superset 6.1+ built-in). Upstream `ChartMetadata` does **not** register `Behavior.DRILL_BY` or `Behavior.DRILL_TO_DETAIL`, so the right-click menu is empty on this viz regardless of the feature flags — use the sibling `district_segment_distribution_bar` for drill-by on the same dataset. |
| `handlebars` | `rural_segment_comparison.yaml` | Custom HTML/template-based table. Does not expose the right-click context menu. |
| `echarts_timeseries_bar` | `state_segment_distribution_bar.yaml`, `household_minor_structure.yaml`, `district_segment_distribution_bar.yaml` | ECharts bar chart. Registers `Behavior.DRILL_BY` and `Behavior.DRILL_TO_DETAIL`. |
| `echarts_timeseries_line` | `mpce_by_segment.yaml` | ECharts line chart. Registers `Behavior.DRILL_BY` and `Behavior.DRILL_TO_DETAIL`. |
| `pie` | `segment_distribution_pie.yaml`, `_district_pie_subchart.yaml` | Simple pie chart. Registers `Behavior.DRILL_BY` and `Behavior.DRILL_TO_DETAIL`. |

**Drill by lives on the right-click context menu on a data element**
(a pie slice, a bar, a line point, a table cell) — **not** on the
three-dot chart-header menu. The header menu shows
`Force refresh / Enter fullscreen / Edit chart / View query / View
as table / Drill to detail / Share / Download` and never exposes
Drill by. To use Drill by, right-click directly on a chart element.

**Drill by requires three conditions to all hold** — Superset's
`FEATURE_FLAGS["DRILL_BY"]` alone is not sufficient:

1. The viz plugin's upstream `ChartMetadata.behaviors` must include
   `Behavior.DRILL_BY` (all echarts plugins do; `cartodiagram` and
   `handlebars` do not).
2. The chart's dataset must expose at least one dimension that the
   chart is **not** already using as `x_axis` or `groupby`. Superset
   populates the drill-by submenu from "dataset dimensions minus
   chart dimensions"; if the set is empty the menu item is hidden.
   Pre-aggregated SQL views that were defined at the exact grain a
   single chart consumes will silently disable drill-by on every
   chart that reads them — grain the view one level finer and carry
   the extra dimensions on the Dataset YAML so drill-by has pivot
   targets.
3. Superset's cached column list for the dataset must be current.
   Superset introspects columns at dataset-creation time and never
   re-introspects unless asked, so a view that gained columns after
   the dataset was created will appear in Postgres but not in
   Superset's chart explorer until the dataset is refreshed. The
   reconciler (`docker/scripts/seed_dashboard.py::DatasetReconciler._refresh_columns_if_view_changed`)
   detects this case by comparing declared `dimensions:` against the
   dataset's cached columns and calls `PUT /api/v1/dataset/{id}/refresh`
   when any are missing. Manual equivalent: Data → Datasets → edit
   → Columns tab → **Sync columns from source**.

**Additional Superset Built-in Types**

| Type | Description |
|---|---|
| `bar` | Vertical bar chart |
| `line` | Line chart for trends |
| `area` | Stacked area chart |
| `scatter` | Scatter plot (x/y correlation) |
| `bubble` | Bubble chart (x/y/size) |
| `histogram` | Distribution histogram |
| `heatmap` | Heatmap matrix |
| `table` | Data table with aggregations |

**Big Number / KPI**
| Type | Description |
|---|---|
| `big_number` | Single metric display |
| `big_number_total` | Big number with trendline |

**Advanced / Specialized**
| Type | Description |
|---|---|
| `box_plot` | Statistical box plot |
| `bullet` | Bullet chart for targets |
| `calendar_heatmap` | Calendar-based heatmap |
| `chord` | Chord diagram (relationships) |
| `country_map` | Choropleth country map |
| `deck_arc` / `deck_grid` / `deck_heatmap` / `deck_hex` / `deck_path` / `deck_polygon` / `deck_scatter` | deck.gl geospatial layers |
| `funnel` | Funnel chart (conversion) |
| `gauge` | Gauge/meter chart |
| `graph` | Network graph visualization |
| `gantt` | Gantt chart (timelines) |
| `horizon` | Horizon chart (dense time series) |
| `mapbox` | MapBox map visualization |
| `mixed_timeseries` | Mixed line/bar chart |
| `nightingale_rose` | Nightingale rose chart |
| `parallel_coordinates` | Parallel coordinates plot |
| `partition` | Sunburst partition |
| `pivot_table` | Pivot table with heatmap |
| `radar` | Radar/spider chart |
| `rose` | Rose area chart |
| `sankey` | Sankey diagram (flows) |
| `smooth_line` | Smooth line chart |
| `stepped_line` | Step line chart |
| `sunburst` | Sunburst hierarchy |
| `treemap` | Treemap (nested rectangles) |
| `tree` | Tree hierarchy |
| `waterfall` | Waterfall chart (cascading) |
| `word_cloud` | Word cloud |
| `world_map` | World choropleth map |

**Time-Series Specific**
| Type | Description |
|---|---|
| `time_series_line` | Time-series line |
| `time_series_bar` | Time-series bar |
| `time_series_area` | Time-series area |
| `time_series_table` | Time-series data table |
| `time_series_pivot` | Period pivot table |
| `time_series_percent_change` | Percent change over time |

**Handlebars (Custom HTML Templates)**

The `handlebars` viz type enables fully custom visualizations using Handlebars
syntax with HTML/CSS/JS. Useful for:
- Custom KPI cards with rich styling
- Branded executive reports
- Data-driven infographics
- Embedded widget exports

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

## 10. Project Structure Reference

```
/bhprojects/apache-superset-1/
├── assets/                    # Declarative analytics assets (YAML)
│   ├── charts/               # 7 charts (household survey, LCA segments)
│   ├── dashboards/           # 1 dashboard (household survey)
│   ├── databases/            # 1 database (analytics warehouse)
│   ├── datasets/             # 8 datasets (hh_master + LCA views)
│   ├── extensions/           # Extension declarations
│   └── plugins/              # Plugin declarations (state-district-pies)
├── config/
│   └── base.yaml             # Base configuration
├── docker/
│   ├── assets/               # Static assets (logo)
│   ├── keycloak-nginx/       # Keycloak proxy config
│   └── scripts/              # Bootstrap, seed, reconciler scripts
├── env/
│   ├── dev.yaml              # Dev environment config
│   ├── prod.yaml             # Prod environment config
│   └── staging.yaml          # Staging environment config
├── extensions/
│   └── bundles/              # Built .supx extension packages
├── seed/
│   └── pg/                   # Postgres seed SQL + CSV data
├── superset-extensions/
│   └── dashboard-chatbot/    # Custom extension source
├── superset-plugins/
│   └── plugin-chart-state-district-pies/  # Custom viz plugin
├── wiki/                     # Documentation
│   ├── architecture/         # System architecture docs
│   ├── assets/               # Per-asset documentation
│   ├── research/             # Research notes
│   ├── runtime/              # Runtime runbooks
│   └── troubleshooting/      # Troubleshooting guides
├── docker-compose.yml        # Full stack definition
├── Dockerfile                # Superset image builder
├── superset_config.py        # Superset configuration
└── custom_sso_security_manager.py  # Keycloak SSO integration
```

---

## Reference docs

- [Superset Docker Compose setup](https://superset.apache.org/docs/installation/docker-compose)
- [Superset configuration guide](https://superset.apache.org/docs/configuration/configuring-superset)
- [Superset 6.1 database connections](https://superset.apache.org/docs/configuration/databases/)
- [SQLAlchemy database URLs](https://docs.sqlalchemy.org/en/20/core/engines.html#database-urls)

---

## Documentation Cross-Reference

For a repo-wide list of every `README.md` and every file under `wiki/` (including subfolders), plus where each file is linked from, see:

- [`wiki/reference/docs-cross-reference.md`](wiki/reference/docs-cross-reference.md)

This page is maintained specifically to keep documentation synchronized with the actual project tree.

---

## License

Apache-2.0
