# Documentation Cross-Reference

_Last reviewed: 2026-04-24_

This page inventories **every `README.md`**, **every file under `wiki/` (all subfolders)**,
and an explicit coverage matrix for **every YAML file under `assets/` (all subfolders)**.

## README.md inventory

- [`README.md`](../../README.md)
  - Canonical entry point for repository setup and architecture.
  - Linked from: root navigation (this file and wiki index).

- [`superset-plugins/plugin-chart-state-district-pies/README.md`](../../superset-plugins/plugin-chart-state-district-pies/README.md)
  - Plugin implementation/readme for optional dynamic viz bundle.
  - Referenced from: [`wiki/assets/plugin/plugin.chart.state_district_pies.md`](../assets/plugin/plugin.chart.state_district_pies.md).

- [`wiki/architecture/README.md`](../architecture/README.md)
  - Architecture summary for runtime and reconciliation model.
  - Referenced from: [`wiki/index.md`](../index.md) and root `README.md`.

## Assets coverage matrix (all files under `assets/`)

| Asset YAML | Kind | Coverage page |
|---|---|---|
| `assets/databases/analytics.yaml` | Database | [`wiki/assets/db.analytics.md`](../assets/db.analytics.md) |
| `assets/datasets/hh_master.yaml` | Dataset | [`wiki/assets/dataset/dataset.household.hh_master.md`](../assets/dataset/dataset.household.hh_master.md) |
| `assets/datasets/lca_district_segment_pie.yaml` | Dataset | [`wiki/assets/dataset/dataset.household.district_segment_pie.md`](../assets/dataset/dataset.household.district_segment_pie.md) |
| `assets/datasets/lca_mpce_by_segment.yaml` | Dataset | [`wiki/assets/dataset/dataset.household.mpce_by_segment.md`](../assets/dataset/dataset.household.mpce_by_segment.md) |
| `assets/datasets/lca_segment_distribution.yaml` | Dataset | [`wiki/assets/dataset/dataset.household.segment_distribution.md`](../assets/dataset/dataset.household.segment_distribution.md) |
| `assets/datasets/lca_segment_minor_bucket.yaml` | Dataset | [`wiki/assets/dataset/dataset.household.segment_minor_bucket.md`](../assets/dataset/dataset.household.segment_minor_bucket.md) |
| `assets/datasets/lca_state_district_segment.yaml` | Dataset | [`wiki/assets/dataset/dataset.household.state_district_segment.md`](../assets/dataset/dataset.household.state_district_segment.md) |
| `assets/datasets/lca_state_district_segment_geo.yaml` | Dataset | [`wiki/assets/dataset/dataset.household.state_district_segment_geo.md`](../assets/dataset/dataset.household.state_district_segment_geo.md) |
| `assets/datasets/lca_state_segment_distribution.yaml` | Dataset | [`wiki/assets/dataset/dataset.household.state_segment_distribution.md`](../assets/dataset/dataset.household.state_segment_distribution.md) |
| `assets/charts/_district_pie_subchart.yaml` | Chart | [`wiki/assets/chart/chart.household.district_pie_subchart.md`](../assets/chart/chart.household.district_pie_subchart.md) |
| `assets/charts/district_pie_unified.yaml` | Chart | [`wiki/assets/chart/chart.household.district_pie_unified.md`](../assets/chart/chart.household.district_pie_unified.md) |
| `assets/charts/district_segment_distribution_bar.yaml` | Chart | [`wiki/assets/chart/chart.household.district_segment_distribution_bar.md`](../assets/chart/chart.household.district_segment_distribution_bar.md) |
| `assets/charts/household_minor_structure.yaml` | Chart | [`wiki/assets/chart/chart.household.minor_structure.md`](../assets/chart/chart.household.minor_structure.md) |
| `assets/charts/mpce_by_segment.yaml` | Chart | [`wiki/assets/chart/chart.household.mpce_by_segment.md`](../assets/chart/chart.household.mpce_by_segment.md) |
| `assets/charts/rural_segment_comparison.yaml` | Chart | [`wiki/assets/chart/chart.household.rural_segment_comparison.md`](../assets/chart/chart.household.rural_segment_comparison.md) |
| `assets/charts/segment_distribution_pie.yaml` | Chart | [`wiki/assets/chart/chart.household.segment_distribution_pie.md`](../assets/chart/chart.household.segment_distribution_pie.md) |
| `assets/charts/state_segment_distribution_bar.yaml` | Chart | [`wiki/assets/chart/chart.household.state_segment_distribution_bar.md`](../assets/chart/chart.household.state_segment_distribution_bar.md) |
| `assets/dashboards/household_survey.yaml` | Dashboard | [`wiki/assets/dashboard/dashboard.household.survey.md`](../assets/dashboard/dashboard.household.survey.md) |
| `assets/plugins/state_district_pies.yaml` | Plugin | [`wiki/assets/plugin/plugin.chart.state_district_pies.md`](../assets/plugin/plugin.chart.state_district_pies.md) |
| `assets/extensions/chatbot_assistant.yaml` | Extension | [`wiki/assets/extension/extension.ext.my_org.dashboard_chatbot.md`](../assets/extension/extension.ext.my_org.dashboard_chatbot.md) |

> Notes:
> - The wiki also keeps historical chart pages for previously deleted assets,
>   e.g. `chart.household.state_map` and `chart.household.state_district_pies`.
>   Those are intentionally retained as history and are not counted as active `assets/` files.

## Repository folder coverage (including `config/`, `docker/`, `seed/`, and peers)

| Folder | Coverage status | Primary references |
|---|---|---|
| `assets/` | Fully mapped at file level in the assets matrix above | This page; `wiki/index.md` asset pages |
| `config/` | Covered | Root [`README.md`](../../README.md) runtime/config sections; architecture docs in [`wiki/architecture/README.md`](../architecture/README.md) |
| `docker/` | Covered | Root [`README.md`](../../README.md) container/orchestration sections; [`wiki/runtime/database-seeding.md`](../runtime/database-seeding.md) for bootstrap/seed flow |
| `seed/` | Covered | Root [`README.md`](../../README.md) seeding and SQL/view references; [`wiki/runtime/database-seeding.md`](../runtime/database-seeding.md) |
| `env/` | Covered | Root [`README.md`](../../README.md) environment variable guidance and `.env` usage |
| `extensions/` | Covered | Root [`README.md`](../../README.md); [`wiki/assets/extension/extension.ext.my_org.dashboard_chatbot.md`](../assets/extension/extension.ext.my_org.dashboard_chatbot.md) |
| `superset-extensions/` | Covered | Root [`README.md`](../../README.md); extension asset page in wiki |
| `superset-plugins/` | Covered | Plugin README + root [`README.md`](../../README.md); [`wiki/assets/plugin/plugin.chart.state_district_pies.md`](../assets/plugin/plugin.chart.state_district_pies.md) |
| `wiki/` | Fully inventoried in this page | Wiki inventory section below |

## Wiki file inventory

### Top-level
- [`wiki/index.md`](../index.md)
- [`wiki/overview.md`](../overview.md)
- [`wiki/log.md`](../log.md)

### Architecture
- [`wiki/architecture/README.md`](../architecture/README.md)

### Runtime
- [`wiki/runtime/database-seeding.md`](../runtime/database-seeding.md)

### Troubleshooting
- [`wiki/troubleshooting/chart-visibility-in-ui.md`](../troubleshooting/chart-visibility-in-ui.md)

### Research
- [`wiki/research/plugins-vs-extensions.md`](../research/plugins-vs-extensions.md)
- [`wiki/research/state_district_pies-plugin.md`](../research/state_district_pies-plugin.md)
- [`wiki/research/dashboard-chatbot-extension.md`](../research/dashboard-chatbot-extension.md)

### Asset reference: database
- [`wiki/assets/db.analytics.md`](../assets/db.analytics.md)

### Asset reference: datasets
- [`wiki/assets/dataset/dataset.household.hh_master.md`](../assets/dataset/dataset.household.hh_master.md)
- [`wiki/assets/dataset/dataset.household.district_segment_pie.md`](../assets/dataset/dataset.household.district_segment_pie.md)
- [`wiki/assets/dataset/dataset.household.mpce_by_segment.md`](../assets/dataset/dataset.household.mpce_by_segment.md)
- [`wiki/assets/dataset/dataset.household.segment_distribution.md`](../assets/dataset/dataset.household.segment_distribution.md)
- [`wiki/assets/dataset/dataset.household.segment_minor_bucket.md`](../assets/dataset/dataset.household.segment_minor_bucket.md)
- [`wiki/assets/dataset/dataset.household.state_district_segment.md`](../assets/dataset/dataset.household.state_district_segment.md)
- [`wiki/assets/dataset/dataset.household.state_district_segment_geo.md`](../assets/dataset/dataset.household.state_district_segment_geo.md)
- [`wiki/assets/dataset/dataset.household.state_segment_distribution.md`](../assets/dataset/dataset.household.state_segment_distribution.md)

### Asset reference: charts
- [`wiki/assets/chart/chart.household.district_pie_subchart.md`](../assets/chart/chart.household.district_pie_subchart.md)
- [`wiki/assets/chart/chart.household.district_pie_unified.md`](../assets/chart/chart.household.district_pie_unified.md)
- [`wiki/assets/chart/chart.household.minor_structure.md`](../assets/chart/chart.household.minor_structure.md)
- [`wiki/assets/chart/chart.household.mpce_by_segment.md`](../assets/chart/chart.household.mpce_by_segment.md)
- [`wiki/assets/chart/chart.household.rural_segment_comparison.md`](../assets/chart/chart.household.rural_segment_comparison.md)
- [`wiki/assets/chart/chart.household.segment_distribution_pie.md`](../assets/chart/chart.household.segment_distribution_pie.md)
- [`wiki/assets/chart/chart.household.state_district_pies.md`](../assets/chart/chart.household.state_district_pies.md)
- [`wiki/assets/chart/chart.household.state_map.md`](../assets/chart/chart.household.state_map.md)
- [`wiki/assets/chart/chart.household.state_segment_distribution_bar.md`](../assets/chart/chart.household.state_segment_distribution_bar.md)

### Asset reference: dashboard
- [`wiki/assets/dashboard/dashboard.household.survey.md`](../assets/dashboard/dashboard.household.survey.md)

### Asset reference: plugin/extension
- [`wiki/assets/plugin/plugin.chart.state_district_pies.md`](../assets/plugin/plugin.chart.state_district_pies.md)
- [`wiki/assets/extension/extension.ext.my_org.dashboard_chatbot.md`](../assets/extension/extension.ext.my_org.dashboard_chatbot.md)

### Reference pages
- [`wiki/reference/docs-cross-reference.md`](docs-cross-reference.md)
