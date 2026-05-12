# Charts

Source: `assets/charts/*.yaml`.

## Current charts

| Key | File | Notes |
|---|---|---|
| `chart.household.district_pie_unified` | `district_pie_unified.yaml` | India state choropleth + per-district pies, uses the `state_district_pies` viz plugin compiled into the SPA |
| `chart.household.three_state_comparison` | `three_state_comparison.yaml` | Three-state comparison view, uses the `three_state_comparison` viz plugin |

## Reconciler behavior

- Resolves `datasetRef` to a live dataset ID before creating/updating the chart.
- Idempotent — re-running converges chart properties (viz type, params, slice name).
- Charts referenced by dashboards must be applied before the dashboard. The dependency-sorted run order in `docker/scripts/seed_dashboard.py` handles this automatically.
