# Superset Control Plane

> **A GitOps-native, declarative orchestration engine for Apache Superset.**  
> Treats analytics assets like Kubernetes treats workloads: declared in Git, continuously reconciled, drift-detected, and self-healing.

---

## Quick Start (Docker Compose)



### Prerequisites


### Steps

### Common operations


## Documentation Status (Updated 2026-04-28)


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


### 3.1 Reconcile Data Flow


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


### 4.5 Reconciler Loop


### 4.6 Diff Engine


### 4.7 Partial Failure and Retry


## 5. Superset Integration Layer

### 5.1 Authentication


### 5.2 Asset Sync Flow

### 5.3 Custom Plugin Registration


## 6. MCP Layer

### 6.1 Architecture


### 6.2 Transport and Protocol


### 6.3 Tool Catalog


### 6.4 Authentication Flow


### 6.5 Verifying the Service


## 7. Identity and Auth Layer

### 7.1 Browser SSO

### 7.2 Role Mapping


### 7.3 Service Accounts


### 7.4 Direct Token Sign-In


## 8. Asset Model

### 8.1 Supported Asset Types


### 8.3 Asset YAML Schema Reference

### 8.4 Reconciler Registry

### 8.5 Available Chart Types


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


### 9.2 Reconcile


### 9.3 Serve


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
