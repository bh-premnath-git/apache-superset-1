# Datasets

Source: `assets/datasets/*.yaml`.

## Current datasets

| File | Notes |
|---|---|
| `hh_master.yaml` | Household master table loaded from `seed/pg/HH.master.csv` |
| `hh_master_metrics_geo.yaml` | Pre-aggregated household metrics joined to district geometry |
| `lca_district_segment_pie.yaml` | Per-district segment distribution view |
| `lca_mpce_by_segment.yaml` | MPCE (monthly per-capita expenditure) by segment |
| `lca_segment_distribution.yaml` | Overall segment distribution |
| `lca_segment_minor_bucket.yaml` | Segment minor-bucket breakdown |
| `lca_state_district_segment.yaml` | State + district + segment join |
| `lca_state_district_segment_geo.yaml` | Same as above with geometry payload |
| `lca_state_segment_distribution.yaml` | State-level segment distribution |

All datasets reference the single Database asset:

- `databaseRef: db.analytics` (see [db.analytics.md](../db.analytics.md))

## Reconciler behavior

- Resolves `databaseRef` to a live database ID first.
- Performs `find_or_create` by `metadata.key` mapped to dataset name, then `PUT` to converge columns/metrics.
- After columns sync, calls `PUT /api/v1/dataset/{id}/refresh` so column metadata reflects the underlying table/view.
