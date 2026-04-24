# chart.household.segment_distribution_pie

## Purpose

Pie chart for weighted overall segment distribution across the covered states.

## Source of truth

- File: `assets/charts/segment_distribution_pie.yaml`
- Kind: `Chart`
- Runtime name: `Distribution of Segments in 3 States [Weighted]`
- `vizType`: `pie`

## Dataset dependency

- `dataset.household.segment_distribution`

## Query/visual config highlights

- groupby: `segment`
- metric: `MAX(pct)` as `weighted_share`
- labels shown as key + percent (`label_type: key_percent`)
- legend enabled, color scheme `supersetColors`

## Related pages

- [dataset.household.segment_distribution](../dataset/dataset.household.segment_distribution.md)
- [dashboard.household.survey](../dashboard/dashboard.household.survey.md)
