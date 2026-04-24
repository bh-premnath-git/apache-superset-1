# dataset.household.state_segment_distribution

## Purpose

Pre-aggregated weighted segment distribution per state.

## Source of truth

- File: `assets/datasets/lca_state_segment_distribution.yaml`
- Kind: `Dataset`
- Runtime name: `lca_state_segment_distribution`
- Physical object: `household.vw_state_segment_distribution`

## Dependency

- `db.analytics`

## Declared shape

- dimensions: `state_label`, `segment`
- one row per state+segment combination with weighted share values

## Downstream consumer

- `chart.household.state_segment_distribution_bar`
