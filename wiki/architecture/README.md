# Architecture

_Last reviewed: 2026-04-24_

## Runtime topology

Core services are defined in `docker-compose.yml`:

- `superset`, `superset-worker`, `superset-beat`, `superset-init`
- `metadata-db` (Superset metadata Postgres)
- `analytics-db` (business/sample analytics Postgres)
- `redis`
- `keycloak`, `keycloak-db`, `keycloak-nginx`, `keycloak-bootstrap`
- one-shot builders: `plugin-builder`, `extension-builder`
- reconciler runtime service: `superset-runtime-seed`

## Declarative asset flow

Source of truth lives in `assets/` and is applied roughly in this order:

1. Database assets
2. Dataset assets
3. Chart assets
4. Dashboard assets
5. Optional plugin/extension assets (subject to feature flags and runtime support)

## Active chart strategy

The project currently relies on built-in Superset visualizations for dashboard-critical rendering (notably `cartodiagram` for district pies). A custom dynamic plugin exists in the repo for advanced map/pie rendering, but is optional and currently not required by the active dashboard config.

## Extension strategy

The dashboard chatbot extension build pipeline is present (`superset-extensions/dashboard-chatbot` plus `extension-builder` service), and bundles are staged into `extensions/bundles/` for runtime discovery.

## Security and auth model

- Superset auth can be federated through Keycloak (OIDC)
- Role claim mapping is managed through env/config settings
- Secrets and credentials are injected through environment variables, not committed in declarative assets

## References

- Root architecture/operations: `README.md`
- Runtime seeding details: `wiki/runtime/database-seeding.md`
- Plugin and extension research notes:
  - `wiki/research/plugins-vs-extensions.md`
  - `wiki/research/state_district_pies-plugin.md`
  - `wiki/research/dashboard-chatbot-extension.md`
