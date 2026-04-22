# Custom Viz Plugin — State + District Pies

> **⚠️ Plugin currently disabled pending Cartodiagram spike — see log 2026-04-22**
>
> The `plugin-builder` service is commented out in `docker-compose.yml`.
> The district pie charts (`chart.household.district_pie_*`) now use the built-in
> Cartodiagram viz instead of this custom plugin.

## Why this exists

The reference screenshot for the Household Survey dashboard shows a state-level
India map with a small proportional pie chart overlaid at every district. No
built-in Superset viz does this: `country_map` renders a single choropleth,
and the Handlebars-based district pies (`chart.household.district_pie_*`)
render a flat grid of pies with no geographic context.

A custom visualization plugin gives us exactly the layering the screenshot
needs while staying inside Superset's supported extension surface.

## Extension pathway chosen

Three pathways were considered (see
[Plugins vs Extensions](../research/plugins-vs-extensions.md) for the
repo-level distinction):

| Pathway | Deployment | Repo fit |
|---|---|---|
| Classic (baked-in) plugin | Edit `superset-frontend/src/visualizations/presets/MainPreset.ts` and rebuild the Superset image | No — we don't fork the frontend |
| **Dynamic plugin (`DYNAMIC_PLUGINS` feature flag)** | UMD bundle built in-stack by `plugin-builder` (node:lts-alpine3.22), served by Superset at `/static/assets/plugins/state-district-pies/`; registered via `/api/v1/dynamic_plugins/` | **Yes** — the repo already has a `PluginReconciler` that writes `dynamic_plugins` rows from YAML |
| Extensions (`ENABLE_EXTENSIONS`, `.supx`) | New `superset-extensions-cli` bundle format | No — lifecycle:development upstream, not ready for production |

Dynamic plugin wins because:

- the `Plugin` asset kind and `PluginReconciler` are already wired for it;
- no frontend rebuild of Superset — deploy = rebuild the `plugin-builder` service; the content-hashed bundle URL auto-updates so Superset's cache invalidates on its own;
- bundle origin is swappable — Compose serves it same-origin by default, but pre-setting `STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL` at stack startup points at an external CDN instead.

## Source layout

```
superset-plugins/plugin-chart-state-district-pies/
├── package.json           # name, deps, scripts (build/serve/test)
├── tsconfig.json
├── webpack.config.js      # UMD, peerDeps externalised
├── README.md              # design overview
├── src/
│   ├── index.ts
│   ├── plugin/
│   │   ├── index.ts       # ChartPlugin (metadata + behaviors)
│   │   ├── buildQuery.ts
│   │   ├── controlPanel.ts
│   │   └── transformProps.ts
│   ├── components/
│   │   ├── StateDistrictPies.tsx
│   │   ├── StateLayer.tsx
│   │   ├── DistrictPie.tsx
│   │   ├── Legend.tsx
│   │   └── Tooltip.tsx
│   ├── hooks/useGeoJson.ts
│   ├── geo/projection.ts
│   ├── geo/centroids.ts
│   ├── constants.ts
│   └── types.ts
└── test/transformProps.test.ts
```

The folder lives at the **repo top level** (not inside `assets/`) because it
is *source* — it must be built into a JS bundle before Superset can load it.
YAML registration of the built bundle is at `assets/plugins/state_district_pies.yaml`.

## Design principles applied

### 1. Pure functions separate from React

Every file under `src/plugin/` is a pure function (`buildQuery`,
`controlPanel`, `transformProps`). They have no DOM / hooks dependency and
are directly unit-testable without mounting React.

### 2. Composition over a monolithic component

`StateDistrictPies.tsx` is a thin orchestrator. Each visual concern lives in
a dedicated component (`StateLayer`, `DistrictPie`, `Legend`, `Tooltip`)
wrapped in `React.memo` so hover-state changes on the overlay don't
re-render the base choropleth.

### 3. Shared projection

`fitProjection()` is called once per render at the top level; both the state
layer and the district overlay consume the same `d3.geoPath` instance. This
guarantees centroids line up with the state polygons they sit inside.

### 4. Geometry is never bundled

District-level India geojson is 10–30MB after simplification. The plugin
fetches it at runtime (`src/hooks/useGeoJson.ts`) from a URL passed through
the control panel, with a module-scoped cache so identical URLs fetch once
per page.

### 5. Data contract is schema-agnostic

The plugin groups by `(state_column, district_column, category_column)` with
a single metric. The LCA segment view is the first consumer, but any
dataset matching that tuple shape works — including future additions like
health-indicator deciles, rainfall zones, or commodity prices.

### 6. Cross-filter first-class

`transformProps` builds an `onDistrictClick` callback from the `setDataMask`
hook when available. Clicking a pie emits `IN` filters for both the state and
district columns; the chart participates in dashboard cross-filtering
automatically, using the same API that built-in viz plugins use.

### 7. Behaviors declared on metadata

`ChartMetadata.behaviors = [Behavior.INTERACTIVE_CHART, Behavior.DRILL_TO_DETAIL]`
so Superset wires the context-menu and drill-to-detail plumbing without
extra code in the plugin.

## Data pipeline

```
seed/pg/003_lca_segment_views.sql
    └─ CREATE VIEW household.vw_state_district_segment
         columns: state_iso_code, state_label, district_code, segment, hh_weight
         grain:   one row per (state, district, segment)
              │
              ▼
assets/datasets/lca_state_district_segment.yaml
    └─ dataset.household.state_district_segment (points at the view)
              │
              ▼
assets/charts/household_state_district_pies.yaml
    └─ spec.vizType: state_district_pies
    └─ spec.params.state_column, district_column, category_column, metric
              │
              ▼  (Superset runtime)
              │
plugin.buildQuery ───────────▶ SQL: GROUP BY state, district, category
                                      sum(metric)
plugin.transformProps ──────▶ districts: DistrictRow[]
                                stateTotals: StateAggregate[]
                                + geojson URLs passthrough
                                      │
                                      ▼
components.StateDistrictPies ── async fetch state + district geojson
                                fit projection, compute centroids
                                render SVG (state layer + pies)
                                hover → Tooltip; click → setDataMask
```

## Geometry sources

| Layer    | URL control                 | Key prop                       | Suggested source                              |
|----------|-----------------------------|--------------------------------|-----------------------------------------------|
| State    | `state_geojson_url`         | `state_feature_key_prop` (default `ISO`) | Same `india.geojson` used by Country Map (ISO 3166-2:IN codes) |
| District | `district_geojson_url`      | `district_feature_key_prop` (default `censuscode`) | `datameet/maps-of-india` (CC-BY-4.0), simplified with `mapshaper -simplify 5%` |

Hosting options (pick one):

- Drop the `.geojson` files into the Superset container's static volume
  (`/app/superset/static/assets/geojson/`). That matches the chart YAML's
  default URLs (`/static/assets/geojson/...`).
- Publish them on a CDN and point the URL controls at that origin. The
  plugin requests with `credentials: 'omit'` so CORS is the only constraint.

## Build & registration flow

```
docker compose up
    │
    ▼
plugin-builder (node:lts-alpine3.22, one-shot)
    └─ npm install && npm run build
       └─ webpack emits dist/main.<contenthash>.js
                        dist/bundle-url.txt  ("/static/.../main.<hash>.js")
       └─ writes to named volume: plugin-dist
    │
    ▼ (depends_on: service_completed_successfully)
    │
    ├── superset
    │   └─ mounts plugin-dist at /app/superset/static/assets/plugins/state-district-pies (ro)
    │       → bundle reachable at /static/assets/plugins/state-district-pies/main.<hash>.js
    │
    └── superset-runtime-seed
        └─ /app/docker/scripts/reconciler_entrypoint.sh
            1. If $STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL already set → keep it (CDN override).
            2. Else read /plugin-dist/bundle-url.txt → export env var.
            3. exec python -u /app/docker/scripts/seed_dashboard.py
                 └─ PluginReconciler.preflight reads $STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL.
                    If unset → SkipAsset.
                 └─ POST /api/v1/dynamic_plugins/ { name, key, bundle_url }
                 └─ Superset's DynamicPlugins loader fetches the UMD bundle
                    and registers the exported ChartPlugin under its vizType.
                 └─ ChartReconciler creates chart.household.state_district_pies.
```

If the feature flag is off or the endpoint is unavailable, the reconciler
still logs a clear skip message and continues — the rest of the dashboard
is unaffected.

## Operational notes

- **No hardcoded URLs.** The bundle URL comes from `bundleUrlFromEnv`; the
  geojson URLs come from YAML params. Rotate infrastructure without
  touching source.
- **Content-hash cache-busting.** Webpack emits `main.[contenthash].js`, so
  every rebuild yields a fresh URL and Superset's dynamic-plugin cache
  (keyed on URL) picks up the new code without manual invalidation.
- **Rebuild loop.**
  `docker compose up -d --force-recreate plugin-builder superset-runtime-seed`
  after editing plugin source; the reconciler registers the new hash.
- **External CDN override.** Set `STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL`
  before the stack starts; the wrapper honors a preset value and skips the
  `/plugin-dist/bundle-url.txt` lookup. Use for staging/prod where the
  bundle is published to S3/CloudFront.
- **First render is ~1s** while geojson fetches resolve; the loader state
  (`StatusPanel`) is rendered explicitly rather than leaving the SVG blank.
- **Accessibility.** The SVG is labelled, state paths have `<title>`, pies
  are keyboard-focusable `role="button"` elements.

## Related files

- `superset-plugins/plugin-chart-state-district-pies/` — source tree
- `superset-plugins/plugin-chart-state-district-pies/webpack.config.js` — emits `main.<contenthash>.js` + `bundle-url.txt`
- `assets/plugins/state_district_pies.yaml` — dynamic plugin registration
- `assets/datasets/lca_state_district_segment.yaml` — dataset over the view
- `assets/charts/household_state_district_pies.yaml` — chart binding
- `seed/pg/003_lca_segment_views.sql` — source view `vw_state_district_segment`
- `docker/scripts/seed_dashboard.py` — `PluginReconciler` and friends
- `docker/scripts/reconciler_entrypoint.sh` — injects `STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL` from `plugin-dist`
- `docker-compose.yml` — `plugin-builder` service + `plugin-dist` / `plugin-node-modules` named volumes

## Related pages

- [Reconciler Engine](reconciler-engine.md)
- [Plugins vs Extensions](../research/plugins-vs-extensions.md)
- [chart.household.state_district_pies](../assets/chart.household.state_district_pies.md)
