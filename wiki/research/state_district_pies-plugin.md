# Research Note: `state_district_pies` Plugin

_Last reviewed: 2026-04-24_

## Goal

Provide a custom map visualization that combines:

1. state-level choropleth context, and
2. district-level proportional pies at centroids.

## Source

- Plugin code: `superset-plugins/plugin-chart-state-district-pies/`
- Declarative plugin asset: `assets/plugins/state_district_pies.yaml`

## Current runtime posture

The main household dashboard currently uses built-in `cartodiagram` for district pies (`chart.household.district_pie_unified`) and does not depend on the dynamic plugin at runtime.

## Why keep this plugin in the repo

- preserves an advanced rendering path for future UX requirements,
- serves as a reference implementation of custom geo + pie composition,
- can be re-enabled if/when dynamic plugin runtime constraints are resolved.

## Re-enable checklist (if needed)

1. Ensure dynamic plugin feature flag is enabled in Superset config.
2. Ensure `plugin-builder` outputs bundle and URL metadata correctly.
3. Ensure bundle is reachable by browser from Superset static path.
4. Point at least one chart asset to `vizType: state_district_pies`.
5. Reconcile assets and verify chart appears without “unknown viz type.”
