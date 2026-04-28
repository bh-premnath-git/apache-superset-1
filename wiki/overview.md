# Wiki Overview

## Purpose

This wiki captures implementation-level details that are too granular for the top-level `README.md`, with a focus on:

- Asset contracts and runtime mapping
- Reconciler behavior
- Plugin and extension integration details
- Troubleshooting workflows

## Scope boundaries

- `README.md`: canonical project overview, quick start, and verified inventory snapshot
- `wiki/`: deep technical notes and per-asset documentation

## Update policy

When changing any of these areas, update the corresponding wiki page in the same PR:

- `assets/**/*.yaml`
- `docker/scripts/seed_dashboard.py`
- `superset_config.py`
- `superset-plugins/plugin-chart-state-district-pies/**`
- `superset-extensions/dashboard-chatbot/**`

## Suggested read order

1. `architecture/README.md`
2. `assets/` pages for relevant keys
3. `runtime/database-seeding.md`
4. `troubleshooting/chart-visibility-in-ui.md`
