# Plugin: `state_district_pies`

- Source package: `superset-plugins/plugin-chart-state-district-pies/`
- Runtime registration: static, via `docker/frontend-build/register-plugin.mjs`
- Runtime loading mode: bundled in SPA (not dynamic plugin API)

## Why static registration

- Avoids `DYNAMIC_PLUGINS` runtime fetch path (`/dynamic-plugins/api/read`) issues on Superset 6.0/6.1.
- Keeps plugin available at app startup without module federation runtime dependency.

## Data contract (high level)

- Grouping columns: state, district, category
- Metric: numeric aggregate (for wedge weights and pie radius scaling)
- GeoJSON key mapping controlled by:
  - `state_feature_key_prop`
  - `district_feature_key_prop`

## Current UX contract

- Drill path: `India -> State -> District -> Details`
- Detail page renders rural/urban segment comparisons in-plugin.
- District click drill-down is local to plugin view.

## Important implementation note

If plugin click handlers emit dashboard filter events, dashboard refresh can reset local drill state. Keep district detail navigation local unless cross-filtering is explicitly desired.
