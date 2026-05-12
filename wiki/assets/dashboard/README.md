# Dashboards

Source: `assets/dashboards/*.yaml`.

## Current dashboards

| Key | File | Notes |
|---|---|---|
| `dashboard.household.survey` | `household_survey.yaml` | Household survey — composes the unified district pie chart and related drill-by visuals |

## Reconciler behavior

- Resolves all `chartRef`s to live chart IDs before applying layout.
- Syncs native filters and cross-filter metadata as part of layout sync.
- Idempotent: re-running preserves slice positions and metadata.
- Drill-by and drill-to-detail are enabled globally via `FEATURE_FLAGS` in `superset_config.py`, so they apply on every Echarts/Table chart regardless of dashboard YAML.
