# dataset.household.state_segment_distribution

## Purpose

Weighted segment distribution dataset, per state + sector.

## Source of truth

- File: `assets/datasets/lca_state_segment_distribution.yaml`
- Kind: `Dataset`
- Runtime name: `lca_state_segment_distribution`
- Physical object: `household.vw_state_segment_distribution`

## Dependency

- `db.analytics`

## Declared shape

- Grain: `(state_label, sector_label, segment)` with `SUM(wt)`
  pre-computed as `seg_weight` inside the view.
- Dimensions: `state_label`, `sector_label`, `segment`.
- Measure column: `seg_weight`. Charts re-aggregate via `SUM(seg_weight)`
  and use `stack: Expand` to render 100%-normalised bars.
- `sector_label` is carried so Superset's drill-by has a pivot target
  from a chart that already uses `state_label` + `segment`.

## Downstream consumer

- `chart.household.state_segment_distribution_bar`
