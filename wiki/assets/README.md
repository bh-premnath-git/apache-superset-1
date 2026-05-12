# Assets

Declarative YAML manifests under `assets/**/*.yaml`, reconciled into Superset by `docker/scripts/seed_dashboard.py`.

## Inventory

| Kind | Source folder | Index |
|---|---|---|
| Database | `assets/databases/` | (single asset — see [db.analytics.md](db.analytics.md)) |
| Dataset | `assets/datasets/` | [dataset/README.md](dataset/README.md) |
| Chart | `assets/charts/` | [chart/README.md](chart/README.md) |
| Dashboard | `assets/dashboards/` | [dashboard/README.md](dashboard/README.md) |
| Extension | `assets/extensions/` | [extension/README.md](extension/README.md) |
| Plugin | `superset-plugins/` | [plugin/README.md](plugin/README.md) |

## Asset shape

Every YAML asset has:

- `apiVersion` — internal manifest schema version
- `kind` — one of `Database`, `Dataset`, `Chart`, `Dashboard`, `Extension`, `Plugin`
- `metadata.key` — stable identifier used by other assets to cross-reference
- `spec` — kind-specific body

Cross-references use the `*.key` form (e.g., `databaseRef: db.analytics`). The reconciler resolves keys to live Superset IDs at apply time, so no static IDs are stored in the repo.

## Reconciler order

`docker/scripts/seed_dashboard.py` registers reconcilers in dependency order:

1. `Database`
2. `Dataset`
3. `Chart`
4. `Dashboard`
5. `Plugin`
6. `Extension`

Within a kind, individual assets are also dependency-sorted topologically so chart-of-chart and dashboard-of-charts relations apply cleanly.
