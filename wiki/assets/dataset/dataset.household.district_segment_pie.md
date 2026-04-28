# Asset: `dataset.household.district_segment_pie`

- Kind: `Dataset`
- Source: `assets/datasets/lca_district_segment_pie.yaml`
- Table: `household.vw_district_segment_pie`

## Purpose

Provides district-level segment percentages used for pie-style district overlays.

## Spec summary

- `databaseRef: db.analytics`
- `schema: household`
- `table: vw_district_segment_pie`

## Notes

- YAML comment indicates one row per `(state_label, district_code)` with precomputed segment percentages and cumulative endpoints for pie rendering.
- This page documents only the declared asset; runtime query shape depends on chart form data.
