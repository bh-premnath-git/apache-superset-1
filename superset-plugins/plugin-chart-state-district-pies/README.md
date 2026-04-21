# @bh-premnath/plugin-chart-state-district-pies

A Superset custom visualization plugin that renders a state-level choropleth
with a small proportional pie chart overlaid at every district's centroid.

Designed to visualise the Living Conditions Approach (LCA) segment mix per
district for the Household Survey, but the plugin is schema-agnostic — any
`(state, district, category → metric)` dataset will render.

```
┌──────────────────────────────────────────────────────────────────────┐
│                          India choropleth                            │
│    ╭──╮                                                              │
│    │  │╭──╮       ●  ← per-district pie: wedges = LCA segment mix    │
│    ╰──╯│  │   ●    (radius ∝ √ total_hh_weight)                      │
│        ╰──╯                                                          │
│                                                                      │
│  [R1] [R2] [R3] [R4] [U1] [U2] [U3]       ← legend                   │
└──────────────────────────────────────────────────────────────────────┘
```

## Architecture

Four pure modules sit behind the plugin class and one React component
composes them into a rendered SVG.

```
src/
├── index.ts                    # package entry
├── plugin/
│   ├── index.ts                # ChartPlugin (metadata + behaviors)
│   ├── buildQuery.ts           # pure: formData → query context
│   ├── controlPanel.ts         # pure: editor control config
│   └── transformProps.ts       # pure: queryResponse → ChartProps
├── components/
│   ├── StateDistrictPies.tsx   # orchestrator (layout + hover)
│   ├── StateLayer.tsx          # base choropleth
│   ├── DistrictPie.tsx         # single district's pie
│   ├── Legend.tsx              # category legend
│   └── Tooltip.tsx             # hover detail panel
├── hooks/useGeoJson.ts         # async geojson fetch + module cache
├── geo/projection.ts           # d3-geo Mercator fit
├── geo/centroids.ts            # per-feature centroid + area
├── constants.ts                # palette + pie radius defaults
└── types.ts                    # shared TypeScript contracts
```

### Design choices

- **Separation of concerns.** Every pure function is in its own file so
  unit tests can cover data reshape without mounting React, and the
  component tree stays focused on rendering.
- **Shared projection.** `StateLayer` and `DistrictPie` read positions
  from the same `fitProjection` result so the centroid of every district
  lines up pixel-perfect with the state polygon it sits inside.
- **GeoJSON lives outside the bundle.** District-level India geometry is
  ~10–30MB; bundling it would balloon the dynamic plugin and wreck first
  paint. The plugin fetches the two FeatureCollections from URLs the
  operator provides (typically a CDN or the static volume served by the
  Superset container) and keeps them in a module-scoped cache so a second
  chart of this type on the same dashboard incurs zero extra fetches.
- **Cross-filter native.** Clicking a district fires `setDataMask` with
  both `state` and `district` filters, so any compatible chart on the
  dashboard can react to the selection.
- **Accessibility.** The SVG has `role="img"` + `aria-label`, each state
  path carries a `<title>` tooltip, and each pie is a focusable `role="button"`
  so keyboard navigation works.

## Data contract

The chart runs a single aggregation query grouped by the three join columns
(defined in the control panel). The response must be **long-form** — one
row per (state, district, category) — with a single numeric metric column.

| Column             | Example                   | Notes                                          |
|--------------------|---------------------------|------------------------------------------------|
| `state_column`     | `state_iso_code: "IN-BR"` | Must match the state geojson's key prop.       |
| `district_column`  | `district_code: "101"`    | Must match the district geojson's key prop.    |
| `category_column`  | `segment: "R1"`           | Becomes one wedge per distinct value.          |
| metric             | `sum_wt: 123.4`           | Drives both wedge size and pie outer radius.   |

## Geometry contract

Two FeatureCollections, fetched at runtime from operator-supplied URLs:

| File             | Key property (control)           | Example          |
|------------------|----------------------------------|------------------|
| State geojson    | `state_feature_key_prop`         | `ISO: "IN-BR"`   |
| District geojson | `district_feature_key_prop`      | `censuscode: "101"` |

Suggested sources:
- State outlines: the same `india.geojson` bundled with Superset's
  `legacy-plugin-chart-country-map`.
- District outlines: `datameet/maps-of-india` (census 2011 district codes,
  CC-BY-4.0) simplified with `mapshaper -simplify 5%`.

## Build

```bash
npm install
npm run build            # emits dist/main.js (UMD)
npm run serve            # dev server on http://localhost:8080
```

## Register with Superset

Via `assets/plugins/state_district_pies.yaml` in this repo — see
[`wiki/architecture/custom-viz-plugin.md`](../../wiki/architecture/custom-viz-plugin.md).

## Test

```bash
npm test
```
