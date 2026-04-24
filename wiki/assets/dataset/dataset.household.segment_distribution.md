# dataset.household.segment_distribution

## Purpose

One-row-per-segment weighted distribution dataset across the covered states.

## Source of truth

- File: `assets/datasets/lca_segment_distribution.yaml`
- Kind: `Dataset`
- Runtime name: `lca_segment_distribution`
- Physical object: `household.vw_segment_distribution`

## Dependency

- `db.analytics`

## Declared shape

- dimension: `segment`
- each row contains weighted count/share values used for high-level segment split visuals

## Downstream consumer

- `chart.household.segment_distribution_pie`
