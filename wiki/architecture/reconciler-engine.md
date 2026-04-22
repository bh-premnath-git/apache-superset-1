# Reconciler Engine

## Purpose

`docker/scripts/seed_dashboard.py` is the core operational engine of this repository.

It discovers declarative asset manifests under `/app/assets`, orders them by dependency, and applies them to Superset through the REST API.

## Key responsibilities

- login to Superset with admin credentials
- load all YAML assets recursively
- group assets by `kind`
- topologically order reconciler classes by `depends_on`
- create or update runtime objects through the Superset API
- poll for changes continuously
- skip unsupported or not-yet-configured assets cleanly
- report failures with timestamps

## Important implementation details

### Asset loading
- Function: `load_assets(root)`
- Behavior: recursively loads every `*.yaml` under the assets root
- Important rule: asset kind comes from YAML `kind:`, not directory path

### Implemented reconciler kinds
Current registry:
- `Database`
- `Dataset`
- `Chart`
- `Dashboard`
- `Plugin`
- `Extension`

### Dependency order
- `Dataset` depends on `Database`
- `Chart` depends on `Dataset`
- `Dashboard` depends on `Chart`
- `Plugin` and `Extension` currently have no declared upstream kind dependencies

## Important resilience behavior

A key improvement was made to dependency failure handling.

### Old failure mode
Previously, one failed dataset could mark the entire `Dataset` kind as failed. That caused all charts to be skipped, including charts that depended on a different dataset that had reconciled successfully.

### Current behavior
The reconciler now tracks failures per **asset key**, not just per kind.

Effect:
- one failed dataset only blocks charts that reference that specific dataset
- unrelated assets can still reconcile successfully

This isolates failures so one broken chart does not block the entire dashboard.

## Error visibility improvement

The Superset REST client now reads HTTP error bodies and includes them in raised exceptions. This makes 422-type failures significantly easier to diagnose.

## Dashboard behavior

`DashboardReconciler` now tolerates missing chart refs better:
- missing chart refs are logged
- available charts can still be laid out
- dashboards are not forced to fail just because one chart is unavailable

### Chart height configuration

Dashboard YAML supports an optional `chartHeight` field (default: 50):

```yaml
spec:
  chartHeight: 100
  chartRefs:
    - chart.household.rural_segment_comparison
```

This controls the vertical grid units allocated to charts. The Handlebars table in the Household Survey uses `100` (~800px) instead of the default `50` (~400px) to properly display all data rows.

### Charts per row configuration

Dashboard YAML supports two optional layout fields on top of the 12-column
grid. By default the reconciler places all chart refs in a single row and
splits `12 // N` columns per chart.

- `chartsPerRow` — default grouping once any `fullWidthFirst` prefix has
  been consumed. `1` stacks each chart on its own full-width row; `2` pairs
  them side-by-side; `null` keeps the legacy all-in-one-row behavior.
- `fullWidthFirst` — how many leading charts get their own full-width row.
  The rest fall back to `chartsPerRow`.

The Household Survey dashboard uses the combination below:

```yaml
spec:
  fullWidthFirst: 2
  chartsPerRow: 2
  chartRefs:
    - chart.household.rural_segment_comparison      # full row
    - chart.household.district_pie_unified        # full row (state-filterable map)
    - chart.household.minor_structure               # row 3 col 1
    - chart.household.segment_distribution_pie      # row 3 col 2
    - chart.household.state_segment_distribution_bar # row 4 col 1
```

The reconciler compares the desired and existing `position_json` and
rewrites the layout when they differ, so changing layout spec on a
dashboard that already exists takes effect on the next reconcile pass.

## Operational significance

This file is effectively the current control-plane implementation for the project. Any debugging of missing assets, skipped charts, or odd reconcile behavior should start here.

## Related files
- `docker/scripts/seed_dashboard.py`
- `docker-compose.yml`
- `assets/**/*.yaml`

## Related pages
- [Project Overview](../overview.md)
- [Chart Visibility in UI](../troubleshooting/chart-visibility-in-ui.md)
- [Plugins vs Extensions](../research/plugins-vs-extensions.md)
