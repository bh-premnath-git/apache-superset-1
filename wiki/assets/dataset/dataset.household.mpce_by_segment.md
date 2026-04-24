# dataset.household.mpce_by_segment

## Purpose

Segment-level MPCE summary dataset used by the MPCE line chart.

## Source of truth

- File: `assets/datasets/lca_mpce_by_segment.yaml`
- Kind: `Dataset`
- Runtime name: `MPCE by LCA Segment`
- Physical object: `household.vw_mpce_by_segment`

## Dependency

- `db.analytics`

## Declared shape

- Dimensions: `segment`, `sector`. `sector` is declared even though
  the chart does not group by it, so Superset's drill-by menu has a
  pivot target. `segment_order` is intentionally omitted because it
  is 1:1 with `segment` and a drill-by on it would produce the same
  slices.
- Metrics:
  - `count` (`COUNT(*)`)
  - `weighted_mean_mpce` (`SUM(mean_mpce * weighted_count) / NULLIF(SUM(weighted_count), 0)`)

## Downstream consumer

- `chart.household.mpce_by_segment`
