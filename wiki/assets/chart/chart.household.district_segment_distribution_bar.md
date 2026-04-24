# chart.household.district_segment_distribution_bar

## Purpose

District-level segment breakdown on the household dashboard, rendered as
an echarts stacked bar so the right-click **Drill by** menu actually
appears on the chart. This is the drill-by companion to
[chart.household.district_pie_unified](chart.household.district_pie_unified.md)
(the Cartodiagram map), whose upstream plugin does not register
`Behavior.DRILL_BY`.

## Source of truth

- File: `assets/charts/district_segment_distribution_bar.yaml`
- Kind: `Chart`
- Runtime name: `District Segment Breakdown (Drill-by)`
- `vizType`: `echarts_timeseries_bar`

## Why this chart exists

The sibling Cartodiagram map registers neither `Behavior.DRILL_BY` nor
`Behavior.DRILL_TO_DETAIL` in its `ChartMetadata` upstream (see
`superset-frontend/plugins/plugin-chart-cartodiagram/src/plugin/index.ts`
on `apache/superset` master), so the right-click menu on the map never
shows those items regardless of `FEATURE_FLAGS["DRILL_BY"]` /
`FEATURE_FLAGS["DRILL_TO_DETAIL"]`. `echarts_timeseries_bar` does
register both behaviors, so putting the same data on this viz gives the
dashboard a working state → district → segment drill-by path.

## Interaction with the dashboard's State filter

- Targets `dataset.household.state_district_segment_geo`, which is
  already a target of the dashboard's **State** native filter.
- Defaults pin to **Bihar** (first state alphabetically), so the bar
  collapses to Bihar's districts on first load. Switching the State
  filter repaints the bar against the new state's districts.

## Typical drill sequences

1. Right-click a district bar → **Drill by → segment** → segment share
   table for that district.
2. Right-click a segment-coloured slice → **Drill by → state_label** →
   segment share across the three loaded states.
3. Right-click any slice → **Drill to detail** → raw rows from
   `vw_state_district_segment_geo`.

## Dataset dependency

- `dataset.household.state_district_segment_geo`
- Required columns:
  - `state_label`, `district_name`, `segment`, `hh_weight`
  - (`geometry` is not used here; the Cartodiagram uses it.)

## Related files

- `assets/charts/district_segment_distribution_bar.yaml`
- `assets/charts/district_pie_unified.yaml` (map sibling)
- `assets/datasets/lca_state_district_segment_geo.yaml`
- `assets/dashboards/household_survey.yaml`
