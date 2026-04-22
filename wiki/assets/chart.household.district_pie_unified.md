# chart.household.district_pie_unified

## Purpose

Unified Cartodiagram map showing per-district segment pies for the household survey dashboard. Replaces the previous three separate state charts (Bihar, Jharkhand, Madhya Pradesh) with a single filterable visualization.

## Source of truth
- File: `assets/charts/district_pie_unified.yaml`
- Kind: `Chart`
- Runtime name: `District Segments by State`
- `vizType`: `cartodiagram`
- `selectedChartRef`: `chart.household.district_pie_subchart`

## Upstream dependency
- `dataset.household.state_district_segment_geo` — Long-form dataset with (state, district, segment, hh_weight, geometry)

## How it works

The Cartodiagram visualization renders a mini pie chart at each district centroid:

1. **Base layer**: OpenStreetMap tiles
2. **Data layer**: GeoJSON Points from `geometry` column (district centroids)
3. **Sub-chart**: Pie chart showing segment distribution (R1-R4, U1-U3) per district
4. **Size**: Fixed 140×140 pixels per pie

The sub-chart (`_district_pie_subchart.yaml`) defines:
- `groupby: [segment]` — pie slices by segment
- `metric: SUM(hh_weight)` — weighted household count
- `viz_type: pie` with legend and percentage labels

## State filtering

Unlike the previous three separate charts, this unified chart responds to the dashboard's **State** filter:

| Filter state | Behavior |
|-------------|----------|
| No selection | Shows all 112 districts (Bihar: 38, Jharkhand: 24, MP: 50) |
| "Bihar" selected | Shows only Bihar's 38 districts, map zooms to Bihar |
| "Jharkhand" selected | Shows only Jharkhand's 24 districts |
| "Madhya Pradesh" selected | Shows only MP's 50 districts |

The filter works because the dashboard's `nativeFilters` configuration targets both:
- `dataset.household.hh_master` (for other charts)
- `dataset.household.state_district_segment_geo` (for this chart)

## Map configuration

Default view (when unfiltered):
- Center: 24.0°N, 82.0°E
- Zoom: 5

This positions the map to show all three states (Bihar, Jharkhand, MP) simultaneously.

## Related files
- `assets/charts/district_pie_unified.yaml`
- `assets/charts/_district_pie_subchart.yaml`
- `assets/datasets/lca_state_district_segment_geo.yaml`
- `seed/pg/004_district_centroids.sql` — District centroid coordinates

## Related pages
- [dashboard.household.survey](dashboard.household.survey.md)
- [dataset.household.state_district_segment_geo](dataset.household.state_district_segment_geo.md)
- [chart.household.state_district_pies](chart.household.state_district_pies.md) — Historical custom plugin approach

## History

- **2026-04-22**: Replaced three separate state charts (`district_pie_bihar`, `district_pie_jharkhand`, `district_pie_madhya_pradesh`) with unified chart controlled by State filter.
