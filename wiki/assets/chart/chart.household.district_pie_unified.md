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

## Dataset dependency

- `dataset.household.state_district_segment_geo`
- Required columns:
  - `geometry` (GeoJSON point for `geom_column`)
  - `state_label`, `district_name`, `segment`, `hh_weight`

## Related files

- `assets/charts/district_pie_unified.yaml`
- `assets/charts/_district_pie_subchart.yaml`
- `assets/datasets/lca_state_district_segment_geo.yaml`
- `seed/pg/003_district_centroids.sql`
