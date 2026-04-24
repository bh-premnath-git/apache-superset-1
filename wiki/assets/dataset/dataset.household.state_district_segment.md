# dataset.household.state_district_segment

## Purpose

Long-form district segment dataset (without geometry) for state/district segment analysis and custom map overlays.

## Source of truth

- File: `assets/datasets/lca_state_district_segment.yaml`
- Kind: `Dataset`
- Runtime name: `lca_state_district_segment`
- Physical object: `household.vw_state_district_segment`

## Dependency

- `db.analytics`

## Declared shape

One row per `(state_iso_code, state_label, district_code, segment)` with weighted `hh_weight` metric.

## Typical consumer

- custom `state_district_pies` plugin workflow
