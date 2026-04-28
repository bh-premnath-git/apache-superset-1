# Research: `state_district_pies` Plugin

## Objective

Provide a single interactive chart experience for:

- India/state/district geospatial navigation
- District pie overlays by segment
- In-plugin district detail breakdowns

## Current UX pattern

- Drill levels: `india -> state -> district -> detail`
- Breadcrumb-based navigation
- District detail view includes segment comparison with formatted values

## Technical shape

- Orchestrator: `src/components/StateDistrictPies.tsx`
- Detail page: `src/components/DistrictDetailView.tsx`
- Pie renderer: `src/components/DistrictPie.tsx`
- Geo utilities: `src/geo/*`
- Data transform: `src/plugin/transformProps.ts`

## Key integration decisions

- Plugin is statically bundled into Superset frontend (no dynamic plugin runtime fetch).
- GeoJSON is fetched from same-origin static path (`/static/assets/india-districts.geojson`).
- Drill-down behavior is kept local in chart UI to avoid dashboard refresh resetting state.

## Known follow-up opportunities

- Add screenshot examples for each drill level.
