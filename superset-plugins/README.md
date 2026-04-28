# Superset Plugins

This directory contains custom visualization plugins for Apache Superset.

## Current Plugin

### `plugin-chart-state-district-pies/`

India state choropleth with district-level pie overlays showing LCA segment distribution.

**Key files**:
- `ARCHITECTURE.md` — Component structure and design decisions
- `README.md` — Usage and build instructions
- `src/components/StateDistrictPies.tsx` — Main orchestrator

**Wiki documentation**:
- `wiki/research/plugin-development-guide.md`
- `wiki/research/state_district_pies-plugin.md`
- `wiki/assets/plugin/plugin.chart.state_district_pies.md`

## Adding a New Plugin

1. Create directory: `superset-plugins/plugin-chart-<name>/`
2. Copy structure from existing plugin
3. Update `docker/frontend-build/register-plugin.mjs` to register
4. Rebuild: `docker compose build superset`

## Build System

Plugins are statically bundled into Superset SPA at Docker image build time (not runtime).

See `Dockerfile` frontend-builder stage.
