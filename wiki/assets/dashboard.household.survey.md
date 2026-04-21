# dashboard.household.survey

## Purpose

Household-facing dashboard for the household survey part of the repository.

## Source of truth
- File: `assets/dashboards/household_survey.yaml`
- Kind: `Dashboard`
- Runtime name: `Household Survey Overview`
- slug: `household-survey`

## Current chart refs
- `chart.household.rural_segment_comparison`

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
    - chart.household.rural_segment_comparison
```

## Operational notes

The dashboard layout is managed by the reconciler. When chart refs are available, the dashboard receives an auto-generated grid layout with the specified `chartHeight`.

If a chart ref is missing at reconcile time, the reconciler logs the missing chart but can still preserve the dashboard resource.

## Related files
- `assets/dashboards/household_survey.yaml`
- `assets/charts/rural_segment_comparison.yaml`

## Related pages
- [chart.household.rural_segment_comparison](chart.household.rural_segment_comparison.md)
- [dataset.household.hh_master](dataset.household.hh_master.md)
