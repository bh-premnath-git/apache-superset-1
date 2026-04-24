# dataset.household.segment_minor_bucket

## Purpose

Pre-aggregated dataset for minor-age bucket composition within each segment.

## Source of truth

- File: `assets/datasets/lca_segment_minor_bucket.yaml`
- Kind: `Dataset`
- Runtime name: `lca_segment_minor_bucket`
- Physical object: `household.vw_segment_minor_bucket`

## Dependency

- `db.analytics`

## Declared shape

- Grain: `(state_label, sector_label, segment, minor_bucket)` with
  `SUM(wt)` pre-computed as `bucket_weight` inside the view.
- Dimensions: `state_label`, `sector_label`, `segment`, `minor_bucket`.
- Measure column: `bucket_weight`. The stacked-bar chart re-aggregates
  via `SUM(bucket_weight)` and uses `stack: Expand` to render
  100%-normalised bars per segment.
- `state_label` / `sector_label` are carried so Superset's drill-by
  has pivot targets.

## Downstream consumer

- `chart.household.minor_structure`
