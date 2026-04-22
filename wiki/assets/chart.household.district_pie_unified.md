# chart.household.district_pie_unified

## Purpose

Per-district segment mix for the state picked in the dashboard's **State**
filter. The filter defaults to Bihar so ~38 bars render at dashboard width;
switch to Jharkhand (24 districts) or Madhya Pradesh (50 districts) from
the filter bar.

## Source of truth
- File: `assets/charts/district_pie_unified.yaml`
- Kind: `Chart`
- Runtime name: `District Segments by State`
- `vizType`: `echarts_timeseries_bar`

## Upstream dependency
- `dataset.household.state_district_segment_geo` — Long-form dataset with
  `(state_label, district_code, district_name, segment, hh_weight, geometry)`.
  The `geometry` column is retained for future map-based visualisations
  but is no longer consumed by this chart.

## What changed — 2026-04-22 (map → stacked bar)

The chart previously used the built-in `cartodiagram` plugin with a pie
sub-chart at each district centroid. In Apache Superset 6.0 that
combination does not render: the pie sub-chart throws when it is
instantiated without the full Redux store that the explore page provides.
The symptom was "District Segments by State shows nothing" — the map
panel rendered empty because the sub-chart pipeline bailed. Upstream
issue: https://github.com/apache/superset/issues/34247.

The fix is to drop the Cartodiagram wrapper entirely and render the same
data as a 100% stacked `echarts_timeseries_bar` — one bar per district,
segments stacked by colour. This also unlocks Drill By / Drill to detail
on this panel (deck.gl and Cartodiagram maps do not expose the context
menu; echarts charts do).

## Configuration summary

| Field | Value | Why |
|-------|-------|-----|
| `x_axis` | `district_name` | One bar per district, sorted A→Z. |
| `groupby` | `[segment]` | Stacks segment slices inside each district bar. |
| `metrics` | `SUM(hh_weight)` | Weighted household count. |
| `stack` | `Stack` | 100% stacked bars surface the segment mix. |
| `x_axis_label_rotation` | `45` | District names stay legible at ≥24 bars. |
| `color_scheme` | `supersetColors` | Matches other charts, so a segment's colour is the same everywhere on the dashboard. |
| `legendOrientation` | `top` | Scroll legend above the bars keeps vertical space for rotated x-labels. |

## Filtering & interactions

| Action | Result |
|--------|--------|
| State filter = Bihar/Jharkhand/MP | Chart re-queries with that state only. |
| Hover a stack segment | Rich tooltip: district, segment, weighted count. |
| Click a stack segment | Cross-filter: pins that `(district, segment)` across the dashboard. |
| Right-click → Drill to detail | Superset 5.x built-in. Force-enabled via `FEATURE_FLAGS.DRILL_TO_DETAIL` in `superset_config.py`. |
| Right-click → Drill by | Pivot to another column (state → district → segment). Force-enabled via `FEATURE_FLAGS.DRILL_BY`. |

## Related files
- `assets/charts/district_pie_unified.yaml`
- `assets/datasets/lca_state_district_segment_geo.yaml`
- `seed/pg/003_district_centroids.sql` — retained for the optional
  centroid-based map if we revisit it with a chart type that does
  support Drill By and does render reliably (e.g. the repo's in-tree
  `state_district_pies` custom plugin, which is currently disabled in
  `docker-compose.yml`).

## Related pages
- [dashboard.household.survey](dashboard.household.survey.md)
- [dataset.household.state_district_segment_geo](dataset.household.state_district_segment_geo.md)

## History

- **2026-04-22 (morning)**: Replaced three per-state Cartodiagrams with a
  single filter-driven Cartodiagram.
- **2026-04-22 (afternoon)**: Readability tuning on the Cartodiagram
  (CARTO tiles, linear pie sizing, State filter default).
- **2026-04-22 (evening)**: Cartodiagram removed after confirming the
  pie sub-chart does not render under Superset 6.0. Replaced with an
  echarts 100% stacked bar so the panel (a) actually renders and (b)
  exposes Drill by / Drill to detail like every other echarts chart on
  the dashboard.
