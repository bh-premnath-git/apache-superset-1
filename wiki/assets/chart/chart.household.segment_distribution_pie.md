# chart.household.segment_distribution_pie

## Purpose

Pie chart for weighted overall segment distribution across the covered states.

## Source of truth

- File: `assets/charts/segment_distribution_pie.yaml`
- Kind: `Chart`
- Runtime name: `Distribution of Segments in 3 States [Weighted]`
- `vizType`: `pie`

## Dataset dependency

- `dataset.household.segment_distribution` — grain
  `(state_label, sector_label, segment)`. The chart re-aggregates to
  per-segment at query time.

## Query/visual config highlights

- groupby: `segment`
- metric: `SUM(seg_weight)` as `weighted_count`
- labels shown as key + percent (`label_type: key_percent`) — pie
  normalises the raw weighted counts into slice percentages at render
  time.
- legend enabled, color scheme `supersetColors`

## Drill-by / Drill to detail

The upstream `pie` plugin registers
`[InteractiveChart, DrillToDetail, DrillBy]`, and the backing dataset
now declares `state_label` + `sector_label` on top of the groupby
column `segment`. Right-clicking a slice exposes Drill by → `state_label`
or `sector_label`, opening a chart pivoted on that dimension.

## Related pages

- [dataset.household.segment_distribution](../dataset/dataset.household.segment_distribution.md)
- [dashboard.household.survey](../dashboard/dashboard.household.survey.md)
