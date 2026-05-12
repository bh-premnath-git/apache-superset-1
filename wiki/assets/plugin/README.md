# Plugins

Source: `superset-plugins/*`. Plugins are **statically compiled** into the Superset SPA bundle at image build time — there is no runtime plugin loader.

## Current plugins

| Folder | Notes |
|---|---|
| `plugin-chart-state-district-pies` | India state choropleth + per-district pies; used by `chart.household.district_pie_unified` |
| `plugin-chart-three-state-comparison` | Three-state comparison view; used by `chart.household.three_state_comparison` |

## Build pipeline

The `frontend-builder` Docker stage in [`Dockerfile`](../../../Dockerfile) does the following:

1. Clones the Superset frontend repo at the pinned tag.
2. Copies each `superset-plugins/<plugin>` into `superset-frontend/plugins/<plugin>`.
3. Runs `node /tmp/register-plugin.mjs` (see `docker/frontend-build/register-plugin.mjs`) to register plugins into `MainPreset.ts`.
4. Runs `npm ci && npm run build` to produce the static SPA assets, which are then copied into the runtime image.

## Why static and not dynamic

`FEATURE_FLAGS["DYNAMIC_PLUGINS"] = False` in `superset_config.py`. The runtime `/dynamic-plugins/api/read` endpoint 404s on Superset 6.0/6.1 (apache/superset#35870, closed `not planned`), and the SPA's `DynamicPluginProvider` then hangs in `loading: true` forever. Static compilation sidesteps the bug entirely.

## Adding a new plugin

1. Drop the package under `superset-plugins/<your-plugin>/`.
2. Edit `docker/frontend-build/register-plugin.mjs` to register it into `MainPreset.ts`.
3. Rebuild the Superset image: `docker compose build superset`.
4. Recreate the web service: `docker compose up -d --force-recreate superset`.
5. Reference the plugin's `viz_type` from a chart YAML under `assets/charts/`.
