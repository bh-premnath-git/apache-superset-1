# dashboard.household.survey

## Purpose

Household-facing dashboard for the household survey part of the repository.

## Source of truth
- File: `assets/dashboards/household_survey.yaml`
- Kind: `Dashboard`
- Runtime name: `Household Survey Overview`
- slug: `household-survey`

## Current chart refs
- `chart.household.state_map` — Interactive India map with state-level household counts
- `chart.household.rural_segment_comparison` — Handlebars table comparing rural household segments

## Historical note

This dashboard previously referenced a broader set of household charts. Those chart refs were later removed, and the dashboard is now centered on the `Rural Segments Comparison` chart.

This page should be updated if more household charts are added again.

## Layout configuration

The dashboard uses `chartHeight: 100` to give the Handlebars table sufficient vertical space (default is 50). This is important for data-dense tables like the Rural Segments Comparison.

Example from `household_survey.yaml`:
```yaml
spec:
  slug: household-survey
  chartHeight: 100
  chartRefs:
    - chart.household.state_map
    - chart.household.rural_segment_comparison
```

## Cross-filtering

The dashboard supports **cross-filtering** — clicking a state on the map filters the rural segments table to show only data for that state.

To use:
1. Click any state on the **Households by State** map
2. The **Rural Segments Comparison** table automatically updates to show only that state's data
3. Click the same state again or use the filter bar to clear the selection

This uses Superset's built-in cross-filtering feature (no additional configuration required in the YAML).

## Operational notes

The dashboard layout is managed by the reconciler. When chart refs are available, the dashboard receives an auto-generated grid layout with the specified `chartHeight`.

If a chart ref is missing at reconcile time, the reconciler logs the missing chart but can still preserve the dashboard resource.

## Related files
- `assets/dashboards/household_survey.yaml`
- `assets/charts/household_state_map.yaml`
- `assets/charts/rural_segment_comparison.yaml`

## Related pages
- [chart.household.state_map](chart.household.state_map.md)
- [chart.household.rural_segment_comparison](chart.household.rural_segment_comparison.md)
- [dataset.household.hh_master](dataset.household.hh_master.md)
