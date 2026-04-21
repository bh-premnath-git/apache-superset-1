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

Once the `superset-runtime-seed` container logs `Reconcile complete`:

- Superset UI: <http://localhost:8088>
- Default admin login: the `SUPERSET_ADMIN_USERNAME` / `SUPERSET_ADMIN_PASSWORD`
  from `.env` (defaults `admin` / `admin123`)
- Keycloak admin console: <http://localhost:8080> with
  `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD`

The seeded dashboard is titled **Executive Overview** (slug `executive-overview`)
and contains three charts — **Monthly Revenue**, **Revenue by Country**, and
**Order Count Trend** — on top of the `mart_sales.orders` sample dataset.

The dataset's metrics (`count`, `sum__revenue`) are declared in
`assets/datasets/sales_orders.yaml` and are reconciled declaratively via
Superset's `PUT /api/v1/dataset/{id}` API — the chart specs reference those
metric names, not any hardcoded ID.

### Household Survey Dashboard (Indian NSS Data)

This repository also includes **Indian National Sample Survey (NSS)** household
data — the official household survey system from India's Ministry of Statistics.

**Dataset:** `household.hh_master` (261,953 rows)
- Geographic coverage: All Indian states and union territories
- Key metrics: Household size, education, welfare scheme participation, consumption
- Indian classifications: Social groups (SC/ST/OBC), religion, land ownership, PDS ration cards
- Welfare schemes: PMGKY, Ayushman Bharat, Ujjwala LPG, free electricity, school benefits

**Dashboard:** `household-survey`
- **Rural Segments Comparison** — Handlebars-based table comparing rural household segments
- **State Map** — Interactive India map showing state-level metrics (uses built-in Country Map)
- **Cross-filtering enabled** — Click any state on the map to filter the entire dashboard

The State Map uses Superset's built-in **Country Map** visualization (India) with
no external mapping service required.

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
   - 6.5 [Verifying the Service](#65-verifying-the-service)
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
21. [Visualization Plugins](#21-visualization-plugins)
    - 21.1 [Plugin Architecture](#211-plugin-architecture)
    - 21.2 [Built-in Chart Types](#212-built-in-chart-types)
    - 21.3 [Creating a Custom Visualization Plugin](#213-creating-a-custom-visualization-plugin)
    - 21.4 [Plugin Registration and Deployment](#214-plugin-registration-and-deployment)
    - 21.5 [In-Repo Plugin: `state_district_pies`](#215-in-repo-plugin-state_district_pies)
22. [Extensions Framework](#22-extensions-framework)
    - 22.1 [What Are Superset Extensions?](#221-what-are-superset-extensions)
    - 22.2 [Extension Architecture](#222-extension-architecture)
    - 22.3 [Frontend Contribution Types](#223-frontend-contribution-types)
    - 22.4 [Backend Contribution Types](#224-backend-contribution-types)
    - 22.5 [Building an Extension (Quick Start)](#225-building-an-extension-quick-start)
    - 22.6 [Packaging and Deployment](#226-packaging-and-deployment)
    - 22.7 [Extension Security](#227-extension-security)
23. [License](#license)

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
│  │  Redis   │  │   MCP Server (`superset mcp run`, :5008)     │    │
│  │  :6379   │  │   streamable-HTTP, JWT/dev-impersonation     │    │
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

The reconciler framework (`docker/scripts/seed_dashboard.py`) uses a class-per-kind
design.  Each reconciler declares its `kind` and `depends_on` tuple; the engine
topologically sorts them to determine execution order.

Currently implemented reconcilers:

| Kind | Reconciler Class | `depends_on` | Superset API | Feature Flag Lifecycle |
|---|---|---|---|---|
| `Database` | `DatabaseReconciler` | *(none)* | `POST/GET /api/v1/database/` | *(core — always available)* |
| `Dataset` | `DatasetReconciler` | `Database` | `POST/PUT/GET /api/v1/dataset/` | *(core)* |
| `Chart` | `ChartReconciler` | `Dataset` | `POST/PUT/GET /api/v1/chart/` | *(core)* |
| `Dashboard` | `DashboardReconciler` | `Chart` | `POST/PUT/GET /api/v1/dashboard/` | *(core)* |
| `Plugin` | `PluginReconciler` | *(none)* | `POST/GET /api/v1/dynamic_plugins/` | `DYNAMIC_PLUGINS` — **testing** |
| `Extension` | `ExtensionReconciler` | *(none)* | `POST/GET /api/v1/extensions/` | `ENABLE_EXTENSIONS` — **development** ⚠️ |

Planned reconcilers (not yet implemented):

| Kind | `depends_on` | Superset API |
|---|---|---|
| `Role` | *(none)* | `/api/v1/security/role/` |
| `User` | `Role` | `/api/v1/security/user/` |
| `RLS` | `Dataset`, `Role` | `/api/v1/rls/` |
| `DashboardFilter` | `Dashboard`, `Dataset` | `/api/v1/dashboard/{id}` (embedded in position JSON) |
| `Theme` | *(none)* | `superset_config.py` injection |
| `Alert` | `Database` | `/api/v1/report/` (type=Alert) |
| `Report` | `Dashboard` | `/api/v1/report/` (type=Report) |
| `Embedding` | `Dashboard` | `/api/v1/embedded_dashboard/` |
| `Branding` | *(none)* | `superset_config.py` + static asset injection |

Adding a new kind is a matter of subclassing `Reconciler`, setting `kind` and
`depends_on`, and appending the instance to `RECONCILERS` — no hardcoded
kind/path tables.

### 8.5 Available Chart Types

Superset provides a wide range of built-in visualization types. Use these `vizType`
values in Chart YAML assets:

**Basic Charts**
| Type | Description |
|---|---|
| `pie` | Pie chart for proportional data |
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

Example Chart YAML with Handlebars:
```yaml
apiVersion: analytics/v1
kind: Chart
metadata:
  key: chart.exec.kpi_card
  name: Executive KPI Card
spec:
  datasetRef: dataset.household.hh_master
  vizType: handlebars
  params:
    header: "Household Survey Summary"
    # Handlebars template with HTML/CSS
    template: |
      <div style="font-family: Arial; padding: 20px;">
        <h2>{{header}}</h2>
        <div style="display: flex; gap: 20px;">
          <div class="kpi" style="background: #f0f0f0; padding: 15px; border-radius: 8px;">
            <div style="font-size: 32px; font-weight: bold; color: #2d5aac;">
              {{data.0.count}}
            </div>
            <div style="color: #666;">Total Households</div>
          </div>
          <div class="kpi" style="background: #f0f0f0; padding: 15px; border-radius: 8px;">
            <div style="font-size: 32px; font-weight: bold; color: #2d5aac;">
              {{data.0.avg_hh_size}}
            </div>
            <div style="color: #666;">Avg Household Size</div>
          </div>
        </div>
      </div>
    # CSS styles
    css: |
      .kpi { box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .kpi:hover { transform: translateY(-2px); transition: 0.2s; }
```

Handlebars syntax reference:
- `{{field}}` — output escaped value
- `{{{field}}}` — output raw HTML
- `{{#each data}}...{{/each}}` — iterate rows
- `{{#if condition}}...{{/if}}` — conditional
- `{{formatNumber value "0.00"}}` — format numbers
- `{{formatDate date "YYYY-MM-DD"}}` — format dates

**Extensions**
- **Dynamic Plugins**: Custom viz types via `DYNAMIC_PLUGINS` feature flag
- **Custom Plugins**: Upload self-built plugin bundles via API

See [§21 Visualization Plugins](#21-visualization-plugins) for plugin development.

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

### 17.1 Current Layout (this repository)

```text
apache-superset-1/
├── README.md
├── Dockerfile                          # Custom Superset image (drivers, fastmcp)
├── docker-compose.yml                  # Full stack: Superset, PG, Redis, Celery, Keycloak, MCP, Seeder
├── .env / .env.example                 # Environment variables
├── superset_config.py                  # Superset configuration (auth, MCP, themes, Celery)
├── custom_sso_security_manager.py      # Keycloak OIDC integration
├── assets/                             # Declarative YAML manifests (source of truth)
│   ├── databases/
│   │   └── analytics.yaml              # kind: Database
│   ├── datasets/
│   │   └── sales_orders.yaml           # kind: Dataset (metrics, timeColumn)
│   ├── charts/
│   │   ├── monthly_revenue.yaml        # kind: Chart (echarts_timeseries_bar)
│   │   ├── revenue_by_country.yaml     # kind: Chart (pie)
│   │   └── order_count_trend.yaml      # kind: Chart (echarts_timeseries_line)
│   ├── dashboards/
│   │   └── executive_overview.yaml     # kind: Dashboard (chartRefs)
│   ├── plugins/
│   │   ├── custom_waterfall.yaml       # kind: Plugin (third-party demo bundle)
│   │   └── state_district_pies.yaml    # kind: Plugin (in-repo custom viz; see superset-plugins/)
│   └── extensions/
│       └── query_optimizer.yaml        # kind: Extension (.supx package)
├── superset-plugins/                   # In-repo dynamic plugin source trees (React/TS)
│   └── plugin-chart-state-district-pies/  # India map + per-district pies (§21.5)
├── config/
│   └── base.yaml                       # Control plane config (state backend, drift policy)
├── env/
│   ├── dev.yaml                        # Environment overlay — dev
│   ├── staging.yaml                    # Environment overlay — staging
│   └── prod.yaml                       # Environment overlay — prod
├── seed/
│   └── pg/
│       └── 001_schema.sql              # Sample analytics data (mart_sales.orders)
└── docker/
    ├── assets/
    │   └── logo.svg                    # Custom branding logo
    ├── scripts/
    │   ├── init.sh                     # Superset DB init + admin user creation
    │   ├── bootstrap.sh                # Gunicorn launch wrapper
    │   ├── seed_dashboard.py           # Reconciler engine (asset loader, topo sort, REST sync)
    │   └── bootstrap_keycloak.py       # Keycloak realm/client/user bootstrap
    └── keycloak-nginx/
        ├── Dockerfile
        ├── nginx.conf
        └── entrypoint.sh
```

### 17.2 Target Layout (full control plane)

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

Runtime bootstrap in this repository follows the design principle of runtime
reconciliation: a dedicated `superset-runtime-seed` service performs resource
creation through Superset REST APIs after the web service starts.

The reconciler (`docker/scripts/seed_dashboard.py`) implements a small,
fully-dynamic control plane:

- Every `*.yaml` under `assets/` is discovered recursively — directory layout
  is informational only; the authoritative `kind` comes from the document.
- Reconcilers are registered as classes (`DatabaseReconciler`,
  `DatasetReconciler`, `ChartReconciler`, `DashboardReconciler`).  Adding a
  new asset type is a matter of appending one class to `RECONCILERS` — no
  hardcoded kind/path tables.
- Execution order is derived from each reconciler's declared `depends_on`
  via a topological sort, so the rule *Database → Dataset → Chart →
  Dashboard* is enforced by the graph rather than by the order of function
  calls.
- Cross-asset references (`databaseRef`, `datasetRef`, `chartRefs`) are
  resolved through a shared `ReconcileContext` keyed on `metadata.key`,
  never on Superset's runtime numeric IDs.
- Dataset metrics declared under `spec.metrics` (e.g. `sum__revenue`) are
  synced with an upsert-by-name PUT so existing metric IDs are preserved.

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

| Component | Version | Notes |
|---|---|---|
| Superset | `6.1.0rc2` | Default base image. Ships the built-in `superset mcp run` CLI (see §6). Override via `SUPERSET_BASE_IMAGE`. |
| Keycloak | `26.6.1` | |
| Redis | `8.x` | |
| PostgreSQL | `18.x` | |
| Python | `3.12` | |

---

## 21. Visualization Plugins

Superset ships with 40+ pre-installed visualization types and a **plugin-based
architecture** that makes it straightforward for developers to add custom chart
types without modifying the core codebase. Every chart in Superset — including
the built-in ones — is a plugin.

### 21.1 Plugin Architecture

Visualization plugins are npm packages built with React and TypeScript that
conform to the `@superset-ui` plugin interface. Each plugin is a self-contained
module that declares:

| Concern | What the plugin provides |
|---|---|
| **Metadata** | Unique key (`vizType`), name, thumbnail, description |
| **Control panel** | Which query controls the user sees (metrics, dimensions, filters, time grain, etc.) |
| **Transform** | A `transformProps` function that maps the Superset query response into the props the chart component expects |
| **Chart component** | A React component (or ECharts/D3 wrapper) that renders the visualization |

The plugin contract is defined by the `@superset-ui/core` package:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Superset Frontend                            │
│                                                                 │
│  ┌──────────────┐   ┌────────────────┐   ┌──────────────────┐  │
│  │  Plugin       │   │  Control Panel │   │  Chart Component │  │
│  │  Registry     │──▶│  Config        │──▶│  (React)         │  │
│  │  (MainPreset) │   │  (sections,    │   │                  │  │
│  │               │   │   controls)    │   │  transformProps() │  │
│  └──────────────┘   └────────────────┘   └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

Key packages in the `@superset-ui` ecosystem:

| Package | Purpose |
|---|---|
| `@superset-ui/core` | Shared types, color schemes, number/time formatters, query object builders |
| `@superset-ui/chart-controls` | Reusable control panel sections and individual controls |
| `@superset-ui/plugin-chart-echarts` | All ECharts-based chart plugins (bar, line, pie, treemap, gauge, etc.) |
| `@superset-ui/plugin-chart-table` | Table / Pivot Table plugin |
| `@superset-ui/plugin-chart-word-cloud` | Word Cloud plugin |
| `@superset-ui/legacy-*` | Older NVD3/D3v3-based chart plugins preserved for backward compatibility |

### 21.2 Built-in Chart Types

Superset's built-in plugins cover the most common analytics visualizations:

| Category | Chart Types |
|---|---|
| **Time-series** | Line, Bar, Area, Scatter, Smooth Line, Step Line |
| **Categorical** | Pie, Donut, Sunburst, Treemap, Bar Chart |
| **Statistical** | Box Plot, Histogram, Bubble Chart |
| **Geospatial** | World Map, Country Map, deck.gl (Scatter, Arc, Hex, Grid, Path, Polygon, Heatmap, GeoJSON) |
| **Tables** | Table, Pivot Table |
| **Part-to-whole** | Treemap, Sunburst, Partition |
| **Flow** | Sankey, Chord Diagram |
| **KPI** | Big Number, Big Number with Trendline |
| **Text** | Handlebars, Markdown |
| **Other** | Word Cloud, Calendar Heatmap, Funnel, Gauge, Radar, Mixed Timeseries, Graph (Force-directed) |

When the `DYNAMIC_PLUGINS` feature flag is enabled, operators can also register
external chart plugins at runtime via the Superset UI (Admin → Plugins), without
rebuilding the frontend.

### 21.3 Creating a Custom Visualization Plugin

#### Prerequisites

- Node.js 18+, npm or yarn
- Familiarity with React and TypeScript

#### Scaffold with the Yeoman generator

```bash
# Install the generator globally
npm install -g @superset-ui/generator-superset

# Create and enter the plugin directory
mkdir superset-plugin-chart-custom
cd superset-plugin-chart-custom

# Run the generator
yo @superset-ui/superset
```

The generator produces a standard structure:

```text
superset-plugin-chart-custom/
├── src/
│   ├── plugin/
│   │   ├── buildQuery.ts          # Builds the query object sent to Superset
│   │   ├── controlPanel.ts        # Control panel definition
│   │   ├── transformProps.ts      # Maps API response → chart props
│   │   └── index.ts               # Plugin metadata and registration
│   ├── CustomChart.tsx            # React chart component
│   └── index.ts                   # Package entry point
├── test/
├── package.json
├── tsconfig.json
└── README.md
```

#### Plugin entry point (`src/plugin/index.ts`)

```typescript
import { t, ChartMetadata, ChartPlugin } from '@superset-ui/core';
import buildQuery from './buildQuery';
import controlPanel from './controlPanel';
import transformProps from './transformProps';
import thumbnail from '../images/thumbnail.png';

export default class CustomChartPlugin extends ChartPlugin {
  constructor() {
    super({
      buildQuery,
      controlPanel,
      loadChart: () => import('../CustomChart'),
      metadata: new ChartMetadata({
        name: t('Custom Chart'),
        description: t('A custom visualization plugin'),
        thumbnail,
        tags: [t('Custom'), t('Example')],
      }),
    });
  }
}
```

#### Control panel (`src/plugin/controlPanel.ts`)

```typescript
import { sections, sharedControls } from '@superset-ui/chart-controls';

export default {
  controlPanelSections: [
    sections.genericTime,
    {
      label: 'Query',
      expanded: true,
      controlSetRows: [
        [sharedControls.metrics],
        [sharedControls.groupby],
        ['row_limit'],
      ],
    },
  ],
};
```

#### Chart component (`src/CustomChart.tsx`)

```tsx
import React from 'react';
import { styled } from '@superset-ui/core';

interface CustomChartProps {
  data: Record<string, any>[];
  width: number;
  height: number;
}

const Wrapper = styled.div`
  padding: 16px;
  border-radius: 4px;
  overflow: auto;
`;

export default function CustomChart({ data, width, height }: CustomChartProps) {
  return (
    <Wrapper style={{ width, height }}>
      <h3>Custom Chart</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </Wrapper>
  );
}
```

### 21.4 Plugin Registration and Deployment

#### Option A: Static registration (build-time)

Register the plugin in `superset-frontend/src/visualizations/presets/MainPreset.ts`:

```typescript
import CustomChartPlugin from 'superset-plugin-chart-custom';

export default class MainPreset extends Preset {
  constructor() {
    super({
      name: 'MainPreset',
      plugins: [
        // ... existing plugins
        new CustomChartPlugin().configure({ key: 'custom_chart' }),
      ],
    });
  }
}
```

Then rebuild the frontend:

```bash
cd superset-frontend
npm run build
```

#### Option B: Dynamic registration (runtime)

Enable the feature flag in `superset_config.py`:

```python
FEATURE_FLAGS = {
    "DYNAMIC_PLUGINS": True,
}
```

Then upload the plugin via the Superset UI at **Settings → Plugins** or via the
REST API:

```bash
# bundle_url must point to a self-hosted JS bundle you built from source.
# See https://github.com/apache-superset/dynamic-import-demo-plugin
curl -X POST http://localhost:8088/api/v1/dynamic_plugins/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom Chart",
    "key": "custom_chart",
    "bundle_url": "https://static.yourcompany.com/superset-plugins/custom-chart/main.js"
  }'
```

References:

- [Creating Visualization Plugins — Superset docs](https://superset.apache.org/developer-docs/contributing/howtos)
- [superset-ui GitHub](https://github.com/apache/superset/tree/master/superset-frontend/packages)
- [@superset-ui/generator-superset](https://www.npmjs.com/package/@superset-ui/generator-superset)

### 21.5 In-Repo Plugin: `state_district_pies`

This repository ships the **source tree** for one custom visualization
plugin under `superset-plugins/plugin-chart-state-district-pies/`. The
plugin renders an India state choropleth with a proportional pie chart
overlaid at every district's centroid — the reference layout for the
Household Survey dashboard.

#### Package layout

```text
superset-plugins/
└── plugin-chart-state-district-pies/
    ├── package.json              # build/serve/test scripts
    ├── tsconfig.json
    ├── webpack.config.js         # UMD bundle, peerDeps externalised
    ├── README.md                 # plugin-level design overview
    ├── src/
    │   ├── index.ts              # package entry
    │   ├── plugin/
    │   │   ├── index.ts          # ChartPlugin (metadata + behaviors)
    │   │   ├── buildQuery.ts     # pure: formData → query context
    │   │   ├── controlPanel.ts   # pure: editor control config
    │   │   └── transformProps.ts # pure: queryResponse → ChartProps
    │   ├── components/
    │   │   ├── StateDistrictPies.tsx  # thin orchestrator
    │   │   ├── StateLayer.tsx         # base choropleth (React.memo)
    │   │   ├── DistrictPie.tsx        # single district's pie
    │   │   ├── Legend.tsx
    │   │   └── Tooltip.tsx
    │   ├── hooks/useGeoJson.ts   # async geojson fetch + cache
    │   ├── geo/projection.ts     # d3-geo Mercator fit
    │   ├── geo/centroids.ts      # per-feature centroid + area
    │   ├── constants.ts
    │   └── types.ts
    └── test/transformProps.test.ts
```

#### Design principles

| Principle | Implementation |
|---|---|
| Pure functions separate from React | Everything under `src/plugin/` has no DOM dependency |
| Composition over a monolith | Main component is <60 lines; all visuals live in dedicated children |
| Shared projection | One `fitProjection()` call per render; state layer + pie overlay read from the same `d3.geoPath` so centroids line up exactly |
| No geometry in the bundle | District geojson is fetched at runtime from operator-provided URLs, with a module-scoped cache |
| Schema-agnostic | Column names are control-panel inputs — works for any `(state, district, category → metric)` dataset |
| Cross-filter native | `transformProps` wires `setDataMask` so clicking a pie filters the dashboard |
| Behaviors declared on metadata | `Behavior.INTERACTIVE_CHART` + `Behavior.DRILL_TO_DETAIL` |

#### Build and register

```bash
# 1. Build the UMD bundle
cd superset-plugins/plugin-chart-state-district-pies
npm install && npm run build
# emits dist/main.js

# 2. Host dist/main.js on any static origin (CDN, S3, container volume)

# 3. Point the plugin YAML at the hosted URL via env var
export STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL=https://static.example.com/superset-plugins/state-district-pies/main.js

# 4. The PluginReconciler picks it up on the next reconcile pass
```

See [`wiki/architecture/custom-viz-plugin.md`](wiki/architecture/custom-viz-plugin.md)
for the full data pipeline, geometry contract, and failure modes.

---

## 22. Extensions Framework

> **⚠️ Maturity Warning — lifecycle: IN DEVELOPMENT**
>
> The `ENABLE_EXTENSIONS` feature flag exists in Superset's `master` branch but
> is classified as **"in development"** (not "testing" or "stable"). As of
> Superset **6.0.0 GA and 6.1.0rc2**, the runtime `.supx` loading infrastructure
> is **not yet fully functional** in released builds:
>
> - The `superset extensions` CLI command is not registered
> - The `/api/v1/extensions/` endpoint may not be present
> - No UI for managing/loading extensions
>
> See [GitHub Discussion #38607](https://github.com/apache/superset/discussions/38607)
> and [SIP-177](https://github.com/apache/superset/issues/34162) for current status.
>
> The documentation, YAML schema, and reconciler below are included so the
> control plane is **ready when the feature stabilises**. The `ExtensionReconciler`
> will gracefully skip with a log message until the endpoint becomes available.
>
> **For extending Superset today**, use [Dynamic Visualization Plugins (§21)](#21-visualization-plugins)
> which are lifecycle: **testing** and functional in 6.0+.

Superset's **extension system** (introduced alongside the "lean core" initiative)
enables organizations to add custom features — UI panels, menu items, REST API
endpoints, MCP tools, custom editors — **without forking or modifying the core
codebase**. Inspired by the
[VS Code extension model](https://code.visualstudio.com/api), it replaces the
previous pattern of invasive monkey-patching or maintaining long-lived forks.

### 22.1 What Are Superset Extensions?

Extensions are self-contained **`.supx` packages** that bundle both frontend
(React/TypeScript) and backend (Python/Flask) components. They are loaded
dynamically at runtime using **Webpack Module Federation** (frontend) and
Python's auto-discovery of `entrypoint.py` (backend).

Key properties:

| Property | Detail |
|---|---|
| **Packaging** | Single `.supx` archive (zip) containing `manifest.json`, frontend dist, backend source |
| **Isolation** | Extensions use namespaced routes (`/extensions/{publisher}/{name}/`) and scoped permissions |
| **Lifecycle** | Lazy-loaded and activated on demand — no startup penalty for unused extensions |
| **Shared deps** | React, Ant Design, and `@apache-superset/core` are singletons shared with the host |
| **Versioning** | Independent semver lifecycle; core packages follow semantic versioning for safe upgrades |

### 22.2 Extension Architecture

The architecture is built around three main components:

```text
┌──────────────────────────────────────────────────────────────────┐
│                     Extension Project                            │
│                                                                  │
│  Frontend (React/TS)              Backend (Python/Flask)         │
│  ┌───────────────────┐           ┌───────────────────────┐      │
│  │  index.tsx         │           │  entrypoint.py         │      │
│  │  - registerView    │           │  - @api REST endpoints │      │
│  │  - registerCommand │           │  - @tool MCP tools     │      │
│  │  - registerMenu    │           │  - @prompt MCP prompts │      │
│  │  - registerEditor  │           │                        │      │
│  └─────────┬─────────┘           └──────────┬────────────┘      │
│            │                                │                    │
│            ▼                                ▼                    │
│  ┌───────────────────────────────────────────────────────┐      │
│  │          @apache-superset/core  (shared API)          │      │
│  │          apache-superset-core   (Python)              │      │
│  └───────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
                              │
              Webpack Module Federation
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Superset Host Application                      │
│                                                                  │
│  /api/v1/extensions ─── manages registration, metadata, storage  │
│  window.superset    ─── exposes @apache-superset/core at runtime │
│  extensions table   ─── stores extension name, version, assets   │
└──────────────────────────────────────────────────────────────────┘
```

**Architectural principles:**

1. **Lean Core** — Built-in features use the same APIs available to extensions
2. **Explicit Contribution Points** — All extension points are clearly defined and documented
3. **Versioned and Stable APIs** — Public interfaces follow semver
4. **Lazy Loading** — Extensions load only when activated
5. **Composability** — Extension points and patterns are reusable across modules
6. **Community-Driven** — New extension points emerge from real-world needs

### 22.3 Frontend Contribution Types

Frontend contributions are registered in the extension's `index.tsx` entry point
using APIs from `@apache-superset/core`.

#### Views

Add custom panels or pages to Superset's UI. Contribution areas are uniquely
identified (e.g., `sqllab.panels`).

```tsx
import React from 'react';
import { views } from '@apache-superset/core';
import MyPanel from './MyPanel';

views.registerView(
  { id: 'my-extension.main', name: 'My Panel Name' },
  'sqllab.panels',
  () => <MyPanel />,
);
```

#### Commands

Define custom actions invocable via menus, keyboard shortcuts, or other UI
elements.

```tsx
import { commands } from '@apache-superset/core';

commands.registerCommand(
  {
    id: 'my-extension.copy-query',
    title: 'Copy Query',
    icon: 'CopyOutlined',
    description: 'Copy the current query to clipboard',
  },
  () => {
    navigator.clipboard.writeText(getCurrentQuery());
  },
);
```

#### Menus

Contribute menu items to specific UI areas. Location can be `primary`,
`secondary`, or `context`.

```tsx
import { menus } from '@apache-superset/core';

menus.registerMenuItem(
  { view: 'sqllab.editor', command: 'my-extension.copy-query' },
  'sqllab.editor',
  'primary',
);
```

#### Editors

Replace Superset's default text editors (SQL Lab, CSS, Dashboard Properties)
with custom implementations (Monaco, CodeMirror, etc.).

```tsx
import { editors } from '@apache-superset/core';
import MonacoSQLEditor from './MonacoSQLEditor';

editors.registerEditor(
  {
    id: 'my-extension.monaco-sql',
    name: 'Monaco SQL Editor',
    languages: ['sql'],
  },
  MonacoSQLEditor,
);
```

### 22.4 Backend Contribution Types

Backend contributions are registered at startup via classes and functions
imported from the auto-discovered `entrypoint.py`.

#### REST API Endpoints

Custom endpoints live under the `/extensions/{publisher}/{name}/` namespace,
preventing conflicts with built-in routes.

```python
from flask import Response
from flask_appbuilder.api import expose, permission_name, protect, safe
from superset_core.rest_api.api import RestApi
from superset_core.rest_api.decorators import api

@api(
    id="my_extension_api",
    name="My Extension API",
    description="Custom API endpoints for my extension",
)
class MyExtensionAPI(RestApi):
    openapi_spec_tag = "My Extension"
    class_permission_name = "my_extension_api"

    @expose("/hello", methods=("GET",))
    @protect()
    @safe
    @permission_name("read")
    def hello(self) -> Response:
        return self.response(200, result={"message": "Hello from extension!"})
```

The `@api` decorator auto-detects context:
- **Extension context:** `/extensions/{publisher}/{name}/` with ID prefixed as
  `extensions.{publisher}.{name}.{id}`
- **Host context:** `/api/v1/` with original ID

Register in `entrypoint.py`:

```python
from .api import MyExtensionAPI  # noqa: F401
```

#### MCP Tools

Extensions can register Python functions as MCP tools discoverable by AI agents:

```python
from superset_core.mcp.decorators import tool

@tool(
    name="my-extension.get_summary",
    description="Get a summary of recent query activity",
    tags=["analytics", "queries"],
)
def get_summary() -> dict:
    return {"status": "success", "result": {"queries_today": 42}}
```

#### MCP Prompts

Extensions can provide interactive guidance for AI agents:

```python
from superset_core.mcp.decorators import prompt
from fastmcp import Context

@prompt(
    "my-extension.analysis_guide",
    title="Analysis Guide",
    description="Step-by-step guidance for data analysis workflows",
)
async def analysis_guide(ctx: Context) -> str:
    return """
    # Data Analysis Guide
    1. **Explore your data** — Review available datasets and schema
    2. **Build your query** — Use SQL Lab to craft and test queries
    3. **Visualize results** — Choose the right chart type for your data
    """
```

### 22.5 Building an Extension (Quick Start)

#### 1. Install the CLI

```bash
pip install apache-superset-extensions-cli
```

#### 2. Scaffold

```bash
superset-extensions init
```

The CLI prompts for publisher namespace, extension name, and whether to include
frontend/backend components, then generates:

```text
hello-world/
├── extension.json              # Metadata (publisher, name, version, permissions)
├── backend/
│   ├── src/
│   │   └── my_org/
│   │       └── hello_world/
│   │           └── entrypoint.py
│   └── pyproject.toml
└── frontend/
    ├── src/
    │   └── index.tsx            # Frontend entry point
    ├── package.json
    ├── tsconfig.json
    └── webpack.config.js
```

#### 3. Develop

- **Backend:** Add Flask API classes and MCP tools in the `backend/` tree
- **Frontend:** Register views, commands, menus in `frontend/src/index.tsx`
- **Shared API:** Import from `@apache-superset/core` (frontend) or
  `superset_core` (backend)

#### 4. Build and test locally

```bash
cd frontend && npm install && npm run dev
```

### 22.6 Packaging and Deployment

#### Package as `.supx`

```bash
superset-extensions bundle
```

This produces `{publisher}.{name}-{version}.supx` containing:
- `manifest.json` — build metadata and asset references
- `frontend/dist/` — built JS assets (`remoteEntry.js`, chunks)
- `backend/` — Python source files

#### Deploy to Superset

1. Enable extensions in `superset_config.py`:

```python
FEATURE_FLAGS = {
    "ENABLE_EXTENSIONS": True,
}

EXTENSIONS_PATH = "/app/extensions"
```

2. Copy the `.supx` bundle:

```bash
cp my-org.hello-world-0.1.0.supx /app/extensions/
```

3. Restart Superset. The host will extract, validate, and register the
extension automatically.

#### Manage via REST API

```bash
# List installed extensions
curl http://localhost:8088/api/v1/extensions/ \
  -H "Authorization: Bearer $TOKEN"

# Extension endpoints are accessible at:
# /extensions/{publisher}/{name}/{endpoint}
```

### 22.7 Extension Security

- Extensions declare required **permissions** in `extension.json`
  (e.g., `["can_read"]`)
- Backend endpoints use Flask-AppBuilder's `@protect()` decorator for RBAC
- Frontend API calls must include a CSRF token via
  `authentication.getCSRFToken()` from `@apache-superset/core`
- Each extension is namespace-isolated to prevent route and permission collisions
- The host validates extension metadata and integrity on load

References:

- [Extensions Overview — Superset docs](https://superset.apache.org/developer-docs/extensions/overview/)
- [Extension Architecture](https://superset.apache.org/developer-docs/extensions/architecture)
- [Contribution Types](https://superset.apache.org/developer-docs/extensions/contribution-types)
- [Quick Start](https://superset.apache.org/developer-docs/extensions/quick-start)
- [Extension Deployment](https://superset.apache.org/developer-docs/extensions/deployment)
- [MCP Integration for Extensions](https://superset.apache.org/developer-docs/extensions/mcp)
- [Community Extensions Registry](https://superset.apache.org/developer-docs/extensions/registry)

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
