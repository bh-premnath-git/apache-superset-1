# chart.household.minor_structure

## Purpose

Stacked bar showing weighted household share by minor bucket (`<15 years`) across LCA segments.

## Source of truth

- File: `assets/charts/household_minor_structure.yaml`
- Kind: `Chart`
- Runtime name: `Household Structure - Proportion of Minor (< 15 yrs) (Weighted)`
- `vizType`: `echarts_timeseries_bar`

## Dataset dependency

- `dataset.household.segment_minor_bucket` — grain
  `(state_label, sector_label, segment, minor_bucket)`. The chart
  re-aggregates to `(segment, minor_bucket)` at query time.

## Query/visual config highlights

- x-axis: `segment`
- groupby: `minor_bucket`
- metric: `SUM(bucket_weight)` as `weighted_count`
- `stack: Expand` — renders 100%-normalised stacked bars so each
  segment's bar still totals to 100%, matching the previous
  "% per segment" visual.
- legend enabled, value labels enabled

## Drill-by / Drill to detail

The upstream `echarts_timeseries_bar` plugin registers
`[InteractiveChart, DrillToDetail, DrillBy]`, and the backing dataset
now declares `state_label` + `sector_label` on top of the columns
the chart already uses. Right-clicking a slice exposes Drill by →
`state_label` or `sector_label`, opening a chart pivoted on that
dimension.

## Related pages

- [dataset.household.segment_minor_bucket](../dataset/dataset.household.segment_minor_bucket.md)
- [dashboard.household.survey](../dashboard/dashboard.household.survey.md)
