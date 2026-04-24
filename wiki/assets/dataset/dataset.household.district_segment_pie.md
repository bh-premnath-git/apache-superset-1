# dataset.household.district_segment_pie

## Purpose

Pre-aggregated district-level segment dataset intended for pie/gradient driven district visuals.

## Source of truth

- File: `assets/datasets/lca_district_segment_pie.yaml`
- Kind: `Dataset`
- Runtime name: `lca_district_segment_pie`
- Physical object: `household.vw_district_segment_pie`

## Dependency

- `db.analytics`

## Notes

The view stores one row per `(state_label, district_code)` with precomputed segment percentage slices and cumulative endpoints suitable for CSS conic-gradient style rendering.
