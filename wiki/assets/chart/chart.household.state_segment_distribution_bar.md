# chart.household.state_segment_distribution_bar

## Purpose

Stacked bar chart showing within-state weighted segment distribution.

## Source of truth

- File: `assets/charts/state_segment_distribution_bar.yaml`
- Kind: `Chart`
- Runtime name: `Segment Distribution within State (Weighted)`
- `vizType`: `echarts_timeseries_bar`

## Dataset dependency

- `dataset.household.state_segment_distribution` — grain
  `(state_label, sector_label, segment)`. The chart re-aggregates to
  `(state_label, segment)` at query time.

## Query/visual config highlights

- x-axis: `state_label`
- groupby: `segment`
- metric: `SUM(seg_weight)` as `weighted_count`
- `stack: Expand` — renders 100%-normalised stacked bars so each
  state's bar still totals to 100%, matching the previous "% within
  state" visual.
- legend/value labels enabled

## Drill-by / Drill to detail

The upstream `echarts_timeseries_bar` plugin registers
`[InteractiveChart, DrillToDetail, DrillBy]`, and the backing dataset
now declares `sector_label` on top of the `state_label` + `segment`
columns the chart already uses. Right-clicking a slice exposes Drill by →
`sector_label`, opening a chart pivoted on Rural / Urban.

## Related pages

- [dataset.household.state_segment_distribution](../dataset/dataset.household.state_segment_distribution.md)
- [dashboard.household.survey](../dashboard/dashboard.household.survey.md)
