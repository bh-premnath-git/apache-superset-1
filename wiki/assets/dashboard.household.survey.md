# dashboard.household.survey

## Purpose

Household-facing dashboard for the household survey part of the repository.

## Source of truth
- File: `assets/dashboards/household_survey.yaml`
- Kind: `Dashboard`
- Runtime name: `Household Survey Overview`
- slug: `household-survey`

## Current chart refs
- `chart.household.rural_segment_comparison` — Handlebars table comparing rural household segments (full-width)
- `chart.household.district_pie_unified` — Cartodiagram map with per-district segment pies (full-width, state-filterable)
- `chart.household.minor_structure` — 100%-stacked bar of U15 minor buckets by LCA segment
- `chart.household.segment_distribution_pie` — Overall segment distribution pie
- `chart.household.state_segment_distribution_bar` — Per-state segment stacked bar

## Layout configuration

The dashboard uses:

- `chartHeight: 100` — default vertical space for charts (default is 50)
- `chartHeights: { chart.household.district_pie_unified: 150 }` — extra height for the map
- `fullWidthFirst: 2` — first two charts (Rural Segments table and District map) get full-width rows
- `chartsPerRow: 2` — remaining charts pair up side-by-side

Example from `household_survey.yaml`:
```yaml
spec:
  slug: household-survey
  chartHeight: 100
  fullWidthFirst: 2
  chartsPerRow: 2
  chartHeights:
    chart.household.district_pie_unified: 150
  chartRefs:
    - chart.household.rural_segment_comparison
    - chart.household.district_pie_unified
    - chart.household.minor_structure
    - chart.household.segment_distribution_pie
    - chart.household.state_segment_distribution_bar
```

## State filter

The dashboard includes a **State** native filter that controls the unified district pie chart:

- **Default behavior**: Shows all three states (Bihar, Jharkhand, Madhya Pradesh) when no filter applied
- **Filter options**: 36 Indian states/UTs from the hh_master dataset
- **Effect**: Selecting a state filters the Cartodiagram to show only that state's districts
- **Target datasets**: Both `dataset.household.hh_master` and `dataset.household.state_district_segment_geo`

To use:
1. Open the filter panel (top-right)
2. Select a state from the dropdown (e.g., "Bihar")
3. The **District Segments by State** map zooms to that state
4. Clear the filter to see all states again

## Operational notes

The dashboard layout is managed by the reconciler. When chart refs are available, the dashboard receives an auto-generated grid layout with the specified `chartHeight` and `chartHeights` overrides.

If a chart ref is missing at reconcile time, the reconciler logs the missing chart but can still preserve the dashboard resource.

## Related files
- `assets/dashboards/household_survey.yaml`
- `assets/charts/rural_segment_comparison.yaml`
- `assets/charts/district_pie_unified.yaml`
- `assets/charts/_district_pie_subchart.yaml`

## Related pages
- [chart.household.district_pie_unified](chart.household.district_pie_unified.md)
- [chart.household.rural_segment_comparison](chart.household.rural_segment_comparison.md)
- [dataset.household.hh_master](dataset.household.hh_master.md)
- [dataset.household.state_district_segment_geo](dataset.household.state_district_segment_geo.md)
