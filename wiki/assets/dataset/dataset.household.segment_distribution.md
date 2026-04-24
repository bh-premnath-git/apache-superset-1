# dataset.household.segment_distribution

## Purpose

Weighted segment distribution dataset across the covered states.

## Source of truth

- File: `assets/datasets/lca_segment_distribution.yaml`
- Kind: `Dataset`
- Runtime name: `lca_segment_distribution`
- Physical object: `household.vw_segment_distribution`

## Dependency

- `db.analytics`

## Declared shape

- Grain: `(state_label, sector_label, segment)` with `SUM(wt)`
  pre-computed as `seg_weight` inside the view. Multiple rows per
  segment — one per `(state_label, sector_label)` combination.
- Dimensions: `state_label`, `sector_label`, `segment`.
- Measure column: `seg_weight` — charts that want per-segment totals
  run `SUM(seg_weight)` in their metric, and Superset's drill-by has
  `state_label` / `sector_label` as pivot targets.

## Downstream consumer

- `chart.household.segment_distribution_pie` — groupby `segment`,
  metric `SUM(seg_weight)`; pie `label_type: key_percent` normalises
  the sums to slice percentages.
