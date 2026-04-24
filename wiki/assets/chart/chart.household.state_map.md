# chart.household.state_map

> **⚠️ Chart removed — see log 2026-04-22**
>
> This chart asset has been deleted. The "Households by State" Country Map
> visualization is no longer part of the Household Survey dashboard.
>
> **Replacement**: The dashboard now uses `chart.household.district_pie_unified`
> (Cartodiagram with per-district segment pies) which provides both state-level
> context and district-level detail. The State filter controls which state's
> districts are displayed.
>
> See [chart.household.district_pie_unified](chart.household.district_pie_unified.md).

## Purpose (historical)

Interactive India map showing household counts by state. Used Superset's built-in **Country Map** visualization with India boundaries.

## Source of truth (historical)
- ~~File: `assets/charts/household_state_map.yaml`~~ **Deleted**
- Kind: `Chart`
- Runtime name: `Households by State`
- `vizType`: `country_map`

## Upstream dependency
- `dataset.household.hh_master`

## Configuration

### Map settings
- **Country control**: `select_country: india` (built-in geoJSON, no external service needed)
- **Entity field**: `State_label` (text state names like "Andhra Pradesh")
- **Metric**: COUNT of `HHID` (total households per state)
- **Filter**: Excludes null state labels

> The Country Map plugin's control key is **`select_country`** and the value
> must be a lowercase slug (e.g. `india`, `usa`, `france`) — not `INDIA` or an
> ISO code. An earlier `country: INDIA` / `iso_code: IND` spec produced the
> runtime error *"Must specify a country"* because Superset silently ignored
> the unknown keys. Authoritative source:
> `apache/superset` `superset-frontend/plugins/legacy-plugin-chart-country-map/src/controlPanel.ts`
> and `countries.ts`.

### Why Country Map?
The Country Map visualization is ideal because:
- **No external API key** (unlike MapBox)
- **Built-in India boundaries** with all 28 states and 8 UTs
- **Lightweight** — renders as SVG, no tile loading
- **Cross-filtering support** — click states to filter other charts

## Cross-filtering behavior

This chart is the primary filter driver for the dashboard:

| Action | Effect |
|--------|--------|
| Click a state | Filters `rural_segment_comparison` to that state only |
| Click again | Clears the filter |
| No selection | Shows all-India data |

## Data notes

The chart uses `State_label` (text) rather than `State` (numeric code) for better map matching. The NSS dataset includes all Indian states and union territories.

Common state names in data:
- Andhra Pradesh, Karnataka, Kerala, Tamil Nadu (South)
- Maharashtra, Gujarat, Rajasthan (West)
- Uttar Pradesh, Bihar, West Bengal (East)
- Delhi, Jammu & Kashmir (UTs)

## Related files
- `assets/charts/household_state_map.yaml`
- `assets/dashboards/household_survey.yaml`

## Related pages
- [dataset.household.hh_master](dataset.household.hh_master.md)
- [dashboard.household.survey](dashboard.household.survey.md)
