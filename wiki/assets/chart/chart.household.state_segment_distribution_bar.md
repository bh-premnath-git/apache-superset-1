# chart.household.state_segment_distribution_bar

## Purpose

Stacked bar chart showing within-state weighted segment distribution.

## Source of truth

- File: `assets/charts/state_segment_distribution_bar.yaml`
- Kind: `Chart`
- Runtime name: `Segment Distribution within State (Weighted)`
- `vizType`: `echarts_timeseries_bar`

## Dataset dependency

- `dataset.household.state_segment_distribution`

## Query/visual config highlights

- x-axis: `state_label`
- groupby: `segment`
- metric: `MAX(pct)` as `weighted_pct`
- stacked bars to compare segment mix by state
- legend/value labels enabled

## Related pages

- [dataset.household.state_segment_distribution](../dataset/dataset.household.state_segment_distribution.md)
- [dashboard.household.survey](../dashboard/dashboard.household.survey.md)
