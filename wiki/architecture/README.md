# Architecture

## Runtime topology

Core services (from `docker-compose.yml`):

- Superset web: `superset`
- One-shot init: `superset-init`
- Async workers: `celery-worker`, `celery-beat`
- Metadata state: `metadata-db`, `redis`
- Analytics source DB: `analytics-db` (seeded from `seed/pg/`)
- Identity path: `keycloak-db`, `keycloak`, `keycloak-nginx`, `keycloak-bootstrap`
- MCP API: `mcp`
- Reconcile loop: `superset-runtime-seed`
- Extension bundle build: `extension-builder`

## Control-plane flow

1. Build `apache-superset-1-superset:local` from `Dockerfile`.
2. Run `superset-init` (`/app/init.sh`) to migrate DB and initialize Superset.
3. Start `superset` and workers.
4. `superset-runtime-seed` runs `reconciler_entrypoint.sh` then `seed_dashboard.py`.
5. Reconciler scans `assets/**/*.yaml`, resolves dependencies, and applies idempotent API updates.

## Reconciler model

`docker/scripts/seed_dashboard.py` implements:

- Dynamic asset discovery by YAML `kind`
- Topological ordering by declared `depends_on`
- Reconciler registry:
  - `DatabaseReconciler`
  - `DatasetReconciler`
  - `ChartReconciler`
  - `DashboardReconciler`
  - `PluginReconciler`
  - `ExtensionReconciler`

## Plugin architecture (current)

- Visualization plugin source lives at `superset-plugins/plugin-chart-state-district-pies/`.
- Plugin is statically registered into Superset frontend at image build time via `docker/frontend-build/register-plugin.mjs`.
- `FEATURE_FLAGS["DYNAMIC_PLUGINS"]` is intentionally `False`.
- Internal module split:
  - `src/components/` — React UI (orchestrator + leaf components + detail page).
  - `src/data/` — pure helpers (key normalisation, wedge bucketing) tested without React.
  - `src/hooks/` — drill state (`useDrillDown`), feature-prop resolution (`useResolvedFeatureProps`), GeoJSON fetch (`useGeoJson`).
  - `src/plugin/` — Superset glue (`buildQuery`, `controlPanel`, `transformProps`).
  - `src/geo/`, `src/format.ts`, `src/constants.ts`, `src/types.ts`.
- Detail page rural/urban grouping is **not** hard-coded — controlled via `rural_categories` / `urban_categories` fields on the chart control panel (defaults: LCA codes `R1–R4` / `U1–U3`).

## Extension architecture (current)

- Extension source scaffold: `superset-extensions/dashboard-chatbot/`.
- Build artifact: `.supx` in `extensions/bundles/` via `extension-builder`.
- Runtime bridge: `reconciler_entrypoint.sh` auto-exports discovered `.supx` paths as env vars.
- Note: upstream extensions lifecycle is still development-stage in Superset 6.x.

## Configuration boundaries

- `superset_config.py`: feature flags, security, CSP, branding, MCP env wiring.
- `custom_sso_security_manager.py`: Keycloak userinfo mapping and role extraction.
- `.env` / `.env.example`: deployment-specific values.
