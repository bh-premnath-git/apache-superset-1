# Plugins vs Extensions

## Short answer

In this repository, **dynamic plugins are the practical extension mechanism today**. The Superset extensions framework is documented here, but should be treated as forward-looking scaffolding rather than a production-ready capability.

## Dynamic plugins

### Current status
- supported by repo asset model
- reconciler implemented
- can be skipped cleanly if bundle URL is not configured
- depends on Superset dynamic plugins API availability and feature flags

### Repo representation
- asset kind: `Plugin`
- examples:
  - `assets/plugins/custom_waterfall.yaml` — third-party demo bundle
  - `assets/plugins/state_district_pies.yaml` — in-repo bundle built from `superset-plugins/plugin-chart-state-district-pies/`
- reconciler: `PluginReconciler`
- in-repo source: `superset-plugins/plugin-chart-state-district-pies/` (state + district pies, see
  [architecture page](../architecture/custom-viz-plugin.md))

### Operational requirement
A plugin bundle URL must be provided, typically through environment injection.

## Extensions framework

### Current status
- represented in repo documentation and assets
- reconciler implemented defensively
- expected to skip on unsupported released builds
- should be considered lifecycle development / immature upstream

### Repo representation
- asset kind: `Extension`
- example: `assets/extensions/query_optimizer.yaml`
- reconciler: `ExtensionReconciler`

### Why caution is needed
The repo explicitly documents that released Superset 6.0.0 / 6.1.0rc2 do not yet provide a fully operational extension loading experience.

## Why this distinction matters

Without this distinction, it is easy to assume:
- plugin and extension are interchangeable
- extension YAML means usable runtime behavior
- skipped extension assets are bugs

In practice:
- plugin assets are optional runtime features with real operational value
- extension assets are mainly scaffolding and documentation for a future upstream capability

## Related files
- `assets/plugins/custom_waterfall.yaml`
- `assets/extensions/query_optimizer.yaml`
- `docker/scripts/seed_dashboard.py`
- `README.md`

## Related pages
- [Project Overview](../overview.md)
- [Reconciler Engine](../architecture/reconciler-engine.md)
