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

- dimensions: `segment`, `minor_bucket`
- rows represent weighted percentages; rows per segment sum to ~100

## Downstream consumer

- `chart.household.minor_structure`
