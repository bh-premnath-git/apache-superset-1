# chart.household.mpce_by_segment

## Purpose

Line chart of average monthly per-capita consumption expenditure (MPCE) by segment.

## Source of truth

- File: `assets/charts/mpce_by_segment.yaml`
- Kind: `Chart`
- Runtime name: `Average Monthly Per Capita Consumption Expenditure by Segment (Weighted)`
- `vizType`: `echarts_timeseries_line`

## Dataset dependency

- `dataset.household.mpce_by_segment`

## Query/visual config highlights

- x-axis: `segment`
- metric: `MAX(mean_mpce)`
- point symbols enabled (`circle`, size `8`)
- line width `2`, y-axis formatted as INR values

## Related pages

- [dataset.household.mpce_by_segment](../dataset/dataset.household.mpce_by_segment.md)
- [dashboard.household.survey](../dashboard/dashboard.household.survey.md)
