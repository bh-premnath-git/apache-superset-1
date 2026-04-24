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
- `chart.household.district_pie_unified` — Cartodiagram with per-district pies for the state currently pinned by the **State** filter (full-width). No context-menu actions — see [chart.household.district_pie_unified](chart.household.district_pie_unified.md) for why.
- `chart.household.district_segment_distribution_bar` — echarts stacked bar of districts × segment on the same dataset as the Cartodiagram above. Exists as the drill-by companion to the map because the Cartodiagram plugin does not register `Behavior.DRILL_BY`.
- `chart.household.minor_structure` — 100%-stacked bar of U15 minor buckets by LCA segment
- `chart.household.segment_distribution_pie` — Overall segment distribution pie (acts as the shared segment legend — colors are stable across every chart via `supersetColors`)
- `chart.household.state_segment_distribution_bar` — Per-state segment stacked bar
- `chart.household.mpce_by_segment` — MPCE (monthly per-capita expenditure) line by segment

## Layout configuration

The dashboard uses:

- `chartHeight: 55` — compact default vertical space for charts
- `chartHeights` — per-chart height overrides for the two data-dense full-width charts:
  - Rural Segments table: `105`
  - District Segments Cartodiagram: `95` (room for pie markers + map controls)
- `fullWidthFirst: 2` — first two charts (Rural Segments table and District Segments Cartodiagram) get full-width rows
- `chartsPerRow: 2` — remaining charts pair up side-by-side

Example from `household_survey.yaml`:
```yaml
spec:
  slug: household-survey
  chartHeight: 55
  fullWidthFirst: 2
  chartsPerRow: 2
  chartHeights:
    chart.household.rural_segment_comparison: 105
    chart.household.district_pie_unified: 70
  chartRefs:
    - chart.household.rural_segment_comparison
    - chart.household.district_pie_unified
    - chart.household.district_segment_distribution_bar
    - chart.household.minor_structure
    - chart.household.segment_distribution_pie
    - chart.household.state_segment_distribution_bar
    - chart.household.mpce_by_segment
```

## Data exploration story

The dashboard is designed so a reader can narrow from "all rural India
segments" down to a single district and see every chart stay in sync.
There are four complementary mechanisms:

### 1. Native filters (top-right filter bar)

| Filter | Default | Targets | What it narrows |
|--------|---------|---------|-----------------|
| **State** | Bihar (first alphabetically) | `hh_master`, `state_district_segment_geo` | Rural Segments table + District Segments map + District Segment Breakdown bar |
| **Sector** | unset | `hh_master` | Rural Segments table only |
| **Social group of HH head** | unset | `hh_master` | Rural Segments table only |

**Filter coverage gap (known):** the four pre-aggregated LCA views
(`segment_distribution`, `segment_minor_bucket`,
`state_segment_distribution`, `mpce_by_segment`) don't carry
`Sector_label` / `Social_Group_of_HH_Head_label` columns, so those
filters have no effect on the summary charts. Extending coverage would
require rebuilding those views to aggregate by the extra dimensions.

### 2. Cross-filters

`crossFiltersEnabled: true` at the dashboard level. Clicking a district pie slice on the District Segments map or a cell in a summary chart pins
that value as an ephemeral filter that propagates to every other chart
whose dataset exposes the clicked column. Clear a cross-filter from the
small chip that appears above the dashboard.

### 3. Drill to detail (Superset built-in)

Right-click any chart whose upstream `ChartMetadata` registers
`Behavior.DRILL_TO_DETAIL` → **Drill to detail** → Superset shows the
raw rows from the source dataset that feed the aggregated cell.
`FEATURE_FLAGS["DRILL_TO_DETAIL"] = True` in `superset_config.py`
enables the feature at the app level; per-chart availability still
depends on the plugin's `behaviors` list. Useful for: "which
households in Bhagalpur landed in the R1 slice?"

### 4. Drill by (Superset built-in)

Right-click any chart whose upstream `ChartMetadata` registers
`Behavior.DRILL_BY` → **Drill by** → pick another column from the
dataset → Superset opens a chart pivoted on that dimension.

Two conditions must both hold for the menu item to appear:

1. The viz plugin must declare `Behavior.DRILL_BY` in its `ChartMetadata`
   (all the echarts plugins used on this dashboard do; cartodiagram and
   handlebars do not).
2. The chart's dataset must expose at least one dimension that the
   chart is **not** already using as `x_axis` or `groupby`. Superset's
   drill-by submenu is populated from "dataset dimensions minus chart
   dimensions"; if nothing is left, the menu item is hidden. This
   dashboard's four pre-aggregated LCA views were originally defined
   at the exact grain the chart consumed, so drill-by was silently
   empty on every one of them. The views have been rewritten at a
   finer grain (`state_label, sector_label` added) so drill-by now
   has real pivot targets.

`FEATURE_FLAGS["DRILL_BY"] = True` in `superset_config.py` enables the
feature at the app level; the two conditions above decide whether a
given chart gets the menu item.

Concrete drill-by paths on this dashboard:

1. **Distribution of Segments in 3 States** (`pie` on
   `segment_distribution`) → drill by `state_label` or `sector_label`.
2. **Segment Distribution within State** (`echarts_timeseries_bar` on
   `state_segment_distribution`) → drill by `sector_label`.
3. **Household Structure — Proportion of Minor** (`echarts_timeseries_bar`
   on `segment_minor_bucket`) → drill by `state_label` or `sector_label`.
4. **Average MPCE by Segment** (`echarts_timeseries_line` on
   `mpce_by_segment`) → drill by `sector`.
5. **District Segment Breakdown (Drill-by)** (`echarts_timeseries_bar`
   on `state_district_segment_geo`) → drill by `district_name` or
   `segment`. This chart is the drill-by path for the Cartodiagram
   map next to it.

**Upstream exceptions on this dashboard (no context menu at all):**

- **Cartodiagram** (`chart.household.district_pie_unified` — "District
  Segments by State"). Upstream
  `plugin-chart-cartodiagram/src/plugin/index.ts` constructs its
  `ChartMetadata` without a `behaviors` entry, so neither
  `Behavior.DRILL_BY` nor `Behavior.DRILL_TO_DETAIL` is registered.
  Right-clicking the map surfaces no drill menu items regardless of
  the feature flags. `chart.household.district_segment_distribution_bar`
  is the companion that exposes drill-by over the same dataset.
- **Handlebars** (`chart.household.rural_segment_comparison` — "Rural
  Segments table"). Upstream does not expose the context menu on this
  viz. Cross-filters remain the only interaction path. Rebuilding it
  as a Pivot Table or Table chart would restore drill-by.

The other four charts (`household_minor_structure` —
`echarts_timeseries_bar`, `segment_distribution_pie` — `pie`,
`state_segment_distribution_bar` — `echarts_timeseries_bar`,
`mpce_by_segment` — `echarts_timeseries_line`) are all echarts plugins
and expose both menu items out of the box.

### Recommended exploration flow

1. Load the dashboard — State filter is pre-pinned to **Bihar**, so the
   District Segments map renders only Bihar's districts.
2. Scan the pies — segment colours are stable across every chart on the
   dashboard (via `color_scheme: supersetColors`) so a slice colour on
   this chart matches the same segment in the Segment Distribution pie
   and the State Segment Distribution bar.
3. Click a pie slice → cross-filter pins that `(district, segment)`
   → the Rural Segments table + summary charts update in place.
4. Right-click the pinned segment → **Drill to detail** → see the
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
- `assets/charts/district_segment_distribution_bar.yaml`
- `superset_config.py` — `FEATURE_FLAGS["DRILL_BY"]` /
  `FEATURE_FLAGS["DRILL_TO_DETAIL"]` set to `True` so the context menu
  is available on every chart type whose upstream `ChartMetadata`
  registers the corresponding `Behavior`.

## Related pages
- [chart.household.district_pie_unified](chart.household.district_pie_unified.md)
- [chart.household.district_segment_distribution_bar](chart.household.district_segment_distribution_bar.md)
- [chart.household.rural_segment_comparison](chart.household.rural_segment_comparison.md)
- [dataset.household.hh_master](dataset.household.hh_master.md)
- [dataset.household.state_district_segment_geo](dataset.household.state_district_segment_geo.md)
