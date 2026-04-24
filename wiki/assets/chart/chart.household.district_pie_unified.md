# chart.household.district_pie_unified

## Purpose

District-level segment mix rendered as a **Cartodiagram**: one pie per district
centroid, filtered by the dashboard's **State** native filter.

## Source of truth

- File: `assets/charts/district_pie_unified.yaml`
- Kind: `Chart`
- Runtime name: `District Segments by State`
- `vizType`: `cartodiagram`
- Sub-chart reference: `chart.household.district_pie_subchart`

## Related chart

- `assets/charts/_district_pie_subchart.yaml` (`vizType: pie`) defines the pie
  slices (`groupby: segment`, metric `SUM(hh_weight)`) used at each district
  point.

## Notes for Superset 6.1.0 RC

- Cartodiagram + pie failed in earlier 6.0 workstreams (tracked as upstream
  issue #34247).
- The issue is now closed upstream (closed on **October 7, 2025**), and this
  chart has been restored to Cartodiagram for the intended state/district map
  experience.
- To keep the map readable when many districts are shown, per-pie labels and
  per-pie legends are disabled in the pie sub-chart; tooltips still show values
  on hover.

## Map view configuration

`map_view.mode` accepts exactly two literal values in
`plugin-chart-cartodiagram` (see
`superset-frontend/plugins/plugin-chart-cartodiagram/src/types.ts` on
`apache/superset` master):

| Value | Behavior |
| --- | --- |
| `FIT_DATA` | Auto-fits the OpenLayers view to the extent of the loaded geometries. If the query returns no rows or the first render happens before data arrives, `OlChartMap` early-returns without touching the view, and the map stays at OpenLayers' default (zoom 0 = world). |
| `CUSTOM` | Always applies `fixedZoom` / `fixedLatitude` / `fixedLongitude` to the view on load. |

This chart uses `CUSTOM` centred on India (23.0, 82.0, zoom 5). `FIT_DATA`
looked attractive because the dashboard's State filter narrows the data to
one state at a time, but the empty-extent edge case made the map render
as a world view on first load. `CUSTOM` guarantees an India-scoped basemap
regardless of query state; the district pies then overlay on top once
the query returns.

Note: the field is `CUSTOM`, not `FIXED`. `chart_size.type: FIXED` is a
separate, unrelated setting on the same chart.

## Right-click menu (Drill to detail / Drill by)

The upstream `plugin-chart-cartodiagram/src/plugin/index.ts` constructs
its `ChartMetadata` without a `behaviors` entry, so this chart registers
neither `Behavior.DRILL_TO_DETAIL` nor `Behavior.DRILL_BY`. The
`FEATURE_FLAGS["DRILL_BY"]` / `FEATURE_FLAGS["DRILL_TO_DETAIL"]` flags in
`superset_config.py` enable the feature at the app level, but each
chart's `behaviors` list is what gates whether the menu item actually
shows up — so right-clicking this cartodiagram surfaces neither item.

Use `chart.household.district_segment_distribution_bar` on the same
dashboard when you need drill-by from district → segment → any other
dimension: it is a companion echarts bar over the same
`state_district_segment_geo` dataset, filtered by the same State native
filter, and it does register `Behavior.DRILL_BY`.

## Dataset dependency

- `dataset.household.state_district_segment_geo`
- Required columns:
  - `geometry` (GeoJSON point for `geom_column`)
  - `state_label`, `district_name`, `segment`, `hh_weight`

## Related files

- `assets/charts/district_pie_unified.yaml`
- `assets/charts/_district_pie_subchart.yaml`
- `assets/charts/district_segment_distribution_bar.yaml` (drill-by companion)
- `assets/datasets/lca_state_district_segment_geo.yaml`
- `seed/pg/003_district_centroids.sql`
