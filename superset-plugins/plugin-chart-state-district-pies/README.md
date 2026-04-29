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

Pure data + Superset glue modules sit behind the plugin class. React
components stay focused on rendering; cross-cutting state lives in hooks.

```
src/
├── index.ts                          # package entry
├── plugin/
│   ├── index.ts                      # ChartPlugin (metadata + behaviors)
│   ├── buildQuery.ts                 # pure: formData → query context
│   ├── controlPanel.ts               # pure: editor control config
│   └── transformProps.ts             # pure: queryResponse → ChartProps
├── components/
│   ├── StateDistrictPies.tsx         # layout shell (composition + hover)
│   ├── DistrictDetailView.tsx        # detail page (rural/urban + rich)
│   ├── SegmentComparisonTable.tsx    # one section's breakdown table
│   ├── DetailMetricsTable.tsx        # rich per-segment metrics table
│   ├── SegmentModal.tsx              # segment description modal
│   ├── StateLayer.tsx                # base choropleth
│   ├── DistrictPie.tsx               # single district's pie
│   ├── Legend.tsx                    # category legend
│   ├── Tooltip.tsx                   # hover detail panel
│   └── Breadcrumb.tsx                # drill navigation
├── data/
│   ├── normalize.ts                  # canonical key + alias map (pure)
│   ├── splitWedges.ts                # rural/urban/other bucketing (pure)
│   ├── buildMetricsQuery.ts          # /api/v1/chart/data body builder (pure)
│   └── segmentDescriptions.ts        # segment description lookup (pure)
├── hooks/
│   ├── useGeoJson.ts                 # async geojson fetch + module cache
│   ├── useDrillDown.ts               # 4-level drill-down state machine
│   ├── useResolvedFeatureProps.ts    # join-prop auto-detection
│   └── useDetailMetrics.ts           # per-district metrics fetch + cache
├── geo/projection.ts                 # d3-geo Mercator fit
├── geo/centroids.ts                  # per-feature centroid + area
├── format.ts                         # shared number / percent formatting
├── constants.ts                      # palette, radii, default segment groups
└── types.ts                          # shared TypeScript contracts
```

### Design choices

- **Separation of concerns.** Pure helpers live under `data/` and
  `format.ts`; React state machinery lives under `hooks/`; the
  orchestrator only does layout + composition. Tests exercise pure
  helpers without mounting React.
- **Shared projection.** `StateLayer` and `DistrictPie` read positions
  from the same `fitProjection` result so every district pie lines up
  pixel-perfectly with the polygon it sits inside.
- **GeoJSON lives outside the bundle.** District-level India geometry is
  ~10–30MB. The plugin fetches the two FeatureCollections from URLs the
  operator provides and de-duplicates fetches across charts via a
  module-scoped cache.
- **Cross-filter native.** `transformProps` builds a `setDataMask` hook
  exposing `state` + `district` filters. The drill-down click is local,
  so opening the detail page does not trigger a dashboard refresh.
- **Schema-agnostic.** Rural and urban category lists come from the
  control panel (`Detail page segments` section). LCA codes (R1–R4 /
  U1–U3) are defaults, not hard-coded.
- **Accessibility.** SVG carries `role="img"` + `aria-label`; pies are
  focusable `role="button"`; the segment comparison table uses semantic
  `<table>` markup with `<caption>` and scoped `<th>`s; mini-bars carry
  `role="progressbar"`.

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

### Detail page segment groups

Two extra control-panel fields drive the rural/urban comparison on the
per-district detail page:

| Field              | Default                  | Notes                                          |
|--------------------|--------------------------|------------------------------------------------|
| `rural_categories` | `R1,R2,R3,R4`            | Comma-separated; matched against `category_column`. |
| `urban_categories` | `U1,U2,U3`               | Comma-separated; matched against `category_column`. |

Wedges that fall outside both groups are kept in the chart but surfaced
as an "other" total in the detail page footer rather than silently
dropped.

### Rich per-segment metrics (opt-in)

When the operator points the chart at a separate dataset that has all the
underlying columns (e.g. `dataset.household.hh_master`), the detail page
issues a runtime `POST /api/v1/chart/data` request scoped to the
selected (state, district) and renders a wide grouped table with per-
segment values. Disabled silently when `metrics_datasource` is blank.

| Field                      | Default          | Notes                                                                  |
|----------------------------|------------------|------------------------------------------------------------------------|
| `metrics_datasource`       | *(empty)*        | Numeric Superset dataset id. Leave blank to disable the rich table.    |
| `metrics_state_column`     | `State_label`    | Column on the metrics dataset used to filter by state.                 |
| `metrics_district_column`  | `District`       | Column on the metrics dataset used to filter by district.              |
| `metrics_segment_column`   | `segment`        | Group-by column on the metrics dataset that returns segment codes.    |
| `metrics_definitions`      | 13 LCA defaults  | JSON array of `{label, sql, format, group}` objects.                   |

`format` is one of `percent` / `rupee` / `number`. `group` is one of
`size` / `econ` / `digi` / `cap` / `wel` and drives the coloured column
header band that mirrors the original handlebars template.

Responses are cached per (datasource, state, district, definitions) at
module scope so flipping between districts does not refetch.

### Segment descriptions modal

Clicking any segment label (`R1`, `R2`, `U1`, …) on either detail table
opens a modal with operator-supplied description copy. The text is taken
from the JSON object in the `segment_descriptions` control:

```json
{
  "R1": {
    "title": "Rural — Tier 1",
    "summary": "Connected, asset-rich rural households.",
    "criteria": ["Asset score ≥ 2", "Digital score ≥ 2"],
    "interventions": ["Premium digital products", "Up-skilling"]
  }
}
```

Missing codes still open the modal — they show a stub note pointing at
the control-panel field, so the system never breaks if descriptions are
incomplete.

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

The default flow builds this plugin inside the Compose stack via the
`plugin-builder` service (`node:lts-alpine3.22`), which emits a
content-hashed UMD bundle (`dist/main.<hash>.js`) plus `dist/bundle-url.txt`
into a named volume consumed by both `superset` (for serving) and
`superset-runtime-seed` (for registration). No host-side Node toolchain is
required.

```bash
# From the repo root
docker compose up -d --build
# ...or rebuild just the plugin after editing source:
docker compose up -d --force-recreate plugin-builder superset-runtime-seed
```

For out-of-stack iteration, the direct npm commands still work:

```bash
npm install
npm run build            # emits dist/main.<hash>.js (UMD) + dist/bundle-url.txt
npm run serve            # dev server on http://localhost:8080
```

## Register with Superset

Via `assets/plugins/state_district_pies.yaml` in this repo — see
[`wiki/assets/plugin/plugin.chart.state_district_pies.md`](../../wiki/assets/plugin/plugin.chart.state_district_pies.md).

## Test

```bash
npm test
```
