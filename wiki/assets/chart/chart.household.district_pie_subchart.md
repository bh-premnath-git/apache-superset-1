# chart.household.district_pie_subchart

## Purpose

Reusable pie sub-chart consumed by the Cartodiagram parent chart
`chart.household.district_pie_unified`.

## Source of truth

- File: `assets/charts/_district_pie_subchart.yaml`
- Kind: `Chart`
- Runtime name: `District Segment Pie (Cartodiagram sub-chart)`
- `vizType`: `pie`

## Dataset dependency

- `dataset.household.state_district_segment_geo`

## Query/visual config highlights

- groupby: `segment`
- metric: `SUM(hh_weight)`
- legend/labels disabled for cleaner rendering inside each map point marker
- color scheme: `supersetColors` for consistency across dashboard charts

## Relationship

This chart is not intended to be placed directly on dashboards. It is referenced as
`selectedChartRef` by the Cartodiagram parent.
