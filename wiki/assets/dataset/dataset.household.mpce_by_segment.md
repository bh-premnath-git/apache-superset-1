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

- dimension: `segment`
- metrics:
  - `count` (`COUNT(*)`)
  - `weighted_mean_mpce` (`SUM(mean_mpce * weighted_count) / NULLIF(SUM(weighted_count), 0)`)

## Downstream consumer

- `chart.household.mpce_by_segment`
