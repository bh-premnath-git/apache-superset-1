# chart.household.district_pie_unified

## Purpose

Unified Cartodiagram map showing per-district LCA-segment pies for the
Household Survey dashboard. Responds to the dashboard **State** filter to
show one state's districts at a time (~24–50 pies) rather than all three
states' 112 districts packed on top of each other.

## Source of truth
- File: `assets/charts/district_pie_unified.yaml`
- Kind: `Chart`
- Runtime name: `District Segments by State`
- `vizType`: `cartodiagram`
- `selectedChartRef`: `chart.household.district_pie_subchart`

## Upstream dependency
- `dataset.household.state_district_segment_geo` — Long-form dataset with
  `(state, district, segment, hh_weight, geometry)` where `geometry` is a
  GeoJSON Point at the district centroid.

## How it works

The Cartodiagram visualization renders a mini pie chart at each district
centroid:

1. **Base layer**: CARTO Voyager raster tiles. Chosen over stock
   OpenStreetMap because Voyager surfaces both state and district admin
   boundaries clearly — this is what gives the reader the "state outline +
   district outline" backdrop behind the pies.
2. **Data layer**: GeoJSON Points from the `geometry` column (one point per
   district centroid).
3. **Sub-chart**: `chart.household.district_pie_subchart` — a pie chart
   showing segment distribution (R1–R4, U1–U3) per district, weighted by
   `hh_weight`.
4. **Size**: `chart_size.type: LINEAR` — pies start at 55 × 55 px at the
   single-state overview (zoom 6) and grow ~18 px per zoom step (≈ 109 px
   at zoom 9). This keeps pies readable at every zoom level.

## Readability tuning (2026-04-22)

Earlier iterations of this chart produced an unreadable wall of overlapping
pie chrome. Two settings fix that:

| Setting (sub-chart) | Before | After | Why |
|---------------------|--------|-------|-----|
| `show_legend` | `true` | `false` | Each mini-pie was rendering its own scroll legend with `All`, `Inv`, `1/2`, `1/3` pagination buttons — tens of legends stacked on top of each other. |
| `show_labels` | implicit (labels on) | `false` | `label_type: key_percent` was drawing text like `R2 35%` outside every slice; with 24–50 pies the labels overlapped into unreadable noise. |

Segment colors come from `color_scheme: supersetColors` and are stable
across every chart on the dashboard (pie, bar, map), so the overall
**Segment Distribution** pie acts as the shared legend.

| Setting (main chart) | Before | After | Why |
|----------------------|--------|-------|-----|
| Tile layer | `tile.openstreetmap.org` | CARTO Voyager | CARTO Voyager's district/state admin lines are stronger at zoom 5–8 — these are the "outlines" the reader sees beneath the pies. |
| `chart_size.type` | `FIXED 140×140` | `LINEAR zoom 6 → 55×55 slope 18` | 140 px pies at zoom 5 overlap by 2–3 neighbors across 112 districts. |
| Default zoom | 5 | 6 | Zoom 6 frames a single state (Bihar) cleanly once the State filter defaults to it. |

## State filtering

Driven by the dashboard's **State** native filter, which now defaults to
the first alphabetical option (Bihar). This matters — without a default,
the Cartodiagram loads all 112 districts at once and the pies overlap into
an illegible mat.

| Filter state | Behavior |
|--------------|----------|
| Bihar (default) | 38 Bihar districts render at zoom 6 |
| Jharkhand | 24 Jharkhand districts |
| Madhya Pradesh | 50 MP districts |
| No selection (cleared) | All 112 districts — still readable because of LINEAR sizing but best to keep a state pinned |

The filter works against both `hh_master.State_label` and
`state_district_segment_geo.state_label` so the Rural Segments table and
the map stay in sync.

## Interaction model

| User action | Result |
|-------------|--------|
| Hover a slice | Tooltip with segment name + weighted household count |
| Click a district pie | Cross-filter: pins that district across the dashboard (cross-filters enabled at dashboard level) |
| Right-click → Drill to detail | Superset 5.x built-in — shows raw `hh_master` rows that feed the aggregate |
| Right-click → Drill by | Pivot to another dimension (state → district → segment). Uses columns from the source dataset. |
| Zoom in | Pies grow smoothly (LINEAR scaling) so a single-district zoom reveals a fully-legible 100+ px pie |

## Map configuration

- Default view: 24.0°N, 82.0°E, zoom 6 (frames a single state cleanly when
  the State filter is pinned).
- `map_view.mode: FIT_DATA` — Cartodiagram recomputes the viewport to fit
  whatever districts the filter returns, so the user always lands on the
  visible data.

## Why not the custom `state_district_pies` plugin?

The custom plugin at `superset-plugins/plugin-chart-state-district-pies`
does render an explicit state choropleth + district pie layer, which is
conceptually closer to the user's mental model. It is **not currently in
use** because:

1. The `plugin-builder` Compose service is commented out (see
   `docker-compose.yml` lines 98–109) while we evaluate Cartodiagram.
2. The plugin's `StateLayer.tsx` needs a state-level GeoJSON which is not
   in the repository — it would have to be derived from
   `india-districts.geojson` by dissolving polygons on `NAME_1`.

To switch to the plugin path later: uncomment the `plugin-builder` service
and its dependencies, generate a state GeoJSON (dissolve district polygons
on `NAME_1`), and point the `state` / `district` URL controls at the
bundled static assets. Until then, Cartodiagram is the active
implementation.

## Related files
- `assets/charts/district_pie_unified.yaml`
- `assets/charts/_district_pie_subchart.yaml`
- `assets/datasets/lca_state_district_segment_geo.yaml`
- `seed/pg/003_district_centroids.sql` — District centroid coordinates
- `india-districts.geojson` — 594-feature district polygon file (reserved
  for the future custom-plugin path; not used by the current Cartodiagram)

## Related pages
- [dashboard.household.survey](dashboard.household.survey.md)
- [dataset.household.state_district_segment_geo](dataset.household.state_district_segment_geo.md)

## History

- **2026-04-22 (morning)**: Replaced three per-state Cartodiagrams with a
  single filter-driven chart.
- **2026-04-22 (afternoon)**: Readability fix — disabled per-pie legend +
  labels, switched to CARTO Voyager tiles, LINEAR size scaling, State
  filter defaulted to Bihar. Documented drill-to-detail / drill-by flow.
