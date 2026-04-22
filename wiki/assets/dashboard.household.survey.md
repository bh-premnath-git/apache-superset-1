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
- `chart.household.segment_distribution_pie` — Overall segment distribution pie (acts as the shared segment legend — colors are stable across every chart via `supersetColors`)
- `chart.household.state_segment_distribution_bar` — Per-state segment stacked bar
- `chart.household.mpce_by_segment` — MPCE (monthly per-capita expenditure) line by segment

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

## Data exploration story

The dashboard is designed so a reader can narrow from "all rural India
segments" down to a single district and see every chart stay in sync.
There are four complementary mechanisms:

### 1. Native filters (top-right filter bar)

| Filter | Default | Targets | What it narrows |
|--------|---------|---------|-----------------|
| **State** | Bihar (first alphabetically) | `hh_master`, `state_district_segment_geo` | Rural Segments table + District Segments map |
| **Sector** | unset | `hh_master` | Rural Segments table only |
| **Social group of HH head** | unset | `hh_master` | Rural Segments table only |

**Filter coverage gap (known):** the four pre-aggregated LCA views
(`segment_distribution`, `segment_minor_bucket`,
`state_segment_distribution`, `mpce_by_segment`) don't carry
`Sector_label` / `Social_Group_of_HH_Head_label` columns, so those
filters have no effect on the summary charts. Extending coverage would
require rebuilding those views to aggregate by the extra dimensions.

### 2. Cross-filters

`crossFiltersEnabled: true` at the dashboard level (see
`household_survey.yaml` line 17). Clicking a pie slice on the District
Segments map or a cell in the Rural Segments table pins that value as an
ephemeral filter that propagates to every other chart whose dataset
exposes the clicked column. Clear a cross-filter from the small chip
that appears above the dashboard.

### 3. Drill to detail (Superset 5.x built-in)

Right-click any chart → **Drill to detail** → Superset shows the raw
rows from the source dataset that feed the aggregated cell. No
per-chart YAML configuration — the feature is enabled automatically.
Useful for: "which 4 households in Bhagalpur landed in the R1 slice?"

### 4. Drill by (Superset 5.x built-in)

Right-click any chart → **Drill by** → pick another column from the
dataset → Superset opens a chart pivoted on that dimension. Useful
sequence:

1. On the **Segment Distribution** pie → drill by `state_label` →
   segment share per state.
2. On **State Segment Distribution** bar → drill by `segment_order` →
   per-segment ordering within each state.
3. On **Rural Segments** table → drill by `district_code` → district
   counts within the currently-selected state.

Drill-by uses the same dataset columns the chart already references, so
it "just works" for charts whose dataset carries rich dimensions
(notably `hh_master` and `state_district_segment_geo`).

### Recommended exploration flow

1. Load the dashboard — State filter is pre-pinned to **Bihar**, so the
   District Segments map renders only Bihar's 38 districts at zoom 6.
2. Scan the map — CARTO Voyager's state + district outlines make the
   administrative geography visible under each pie. Hover a pie to read
   the segment breakdown.
3. Click a district pie → cross-filter pins that district → the Rural
   Segments table updates to show just that district's rows.
4. Right-click the pinned district → **Drill to detail** → see the
   raw households.
5. Switch the State filter to Jharkhand or Madhya Pradesh to repeat.
6. For summary-chart exploration (segment distribution, MPCE, minor
   structure), use **Drill by** on each chart — those views are
   aggregated across all three states so the State filter doesn't
   apply.

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
