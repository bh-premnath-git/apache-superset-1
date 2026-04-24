# plugin.chart.state_district_pies

## Purpose

Declarative registration metadata for the optional dynamic Superset plugin
`state_district_pies`.

## Source of truth
- File: `assets/plugins/state_district_pies.yaml`
- Kind: `Plugin`
- Runtime key: `plugin.chart.state_district_pies`
- Runtime name: `State + District Pies`

## Current runtime state

This asset is present but intentionally optional in the current stack:

- The active dashboard uses built-in `cartodiagram` for district pies.
- `DYNAMIC_PLUGINS` is currently disabled by feature flag in `superset_config.py` per upstream API limitations noted in YAML comments.

## Spec highlights

- `vizType: state_district_pies`
- Bundle resolution is environment-driven via
  `STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL` / `STATE_DISTRICT_PIES_PLUGIN_BUNDLE_PATH`
- Static mount path: `/static/assets/plugins/state-district-pies`
- Guarded by feature flag: `DYNAMIC_PLUGINS`

## Related files

- `assets/plugins/state_district_pies.yaml`
- `superset-plugins/plugin-chart-state-district-pies/README.md`
- `docker-compose.yml`
- `superset_config.py`

## Related pages

- [chart.household.state_district_pies](../chart/chart.household.state_district_pies.md)
- [State District Pies plugin note](../../research/state_district_pies-plugin.md)
