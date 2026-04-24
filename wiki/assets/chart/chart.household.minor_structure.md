# chart.household.minor_structure

## Purpose

Stacked bar showing weighted household share by minor bucket (`<15 years`) across LCA segments.

## Source of truth

- File: `assets/charts/household_minor_structure.yaml`
- Kind: `Chart`
- Runtime name: `Household Structure - Proportion of Minor (< 15 yrs) (Weighted)`
- `vizType`: `echarts_timeseries_bar`

## Dataset dependency

- `dataset.household.segment_minor_bucket`

## Query/visual config highlights

- x-axis: `segment`
- groupby: `minor_bucket`
- metric: `MAX(pct)` as `weighted_pct`
- stacked bars (`stack: Stack`) to show composition within each segment
- legend enabled, value labels enabled

## Related pages

- [dataset.household.segment_minor_bucket](../dataset/dataset.household.segment_minor_bucket.md)
- [dashboard.household.survey](../dashboard/dashboard.household.survey.md)
