# Documentation Cross-Reference

## Canonical docs

- Project entry: `README.md`
- Wiki entry: `wiki/index.md`

## Wiki pages by domain

### Architecture

- `wiki/architecture/README.md`

### Runtime and operations

- `wiki/runtime/database-seeding.md`
- `wiki/runtime/seed-database.md`
- `wiki/troubleshooting/chart-visibility-in-ui.md`

### Development guides

- `wiki/research/plugin-development-guide.md`
- `wiki/research/extension-development-guide.md`

### Research and data sources

- `wiki/research/plugins-vs-extensions.md`
- `wiki/research/state_district_pies-plugin.md`
- `wiki/research/dashboard-chatbot-extension.md`
- `wiki/research/geojson-sources.md`

### Assets

- `wiki/assets/db.analytics.md`
- `wiki/assets/dataset/dataset.household.district_segment_pie.md`
- `wiki/assets/chart/chart.household.district_pie_unified.md`
- `wiki/assets/dashboard/dashboard.household.survey.md`
- `wiki/assets/extension/extension.ext.my_org.dashboard_chatbot.md`
- `wiki/assets/plugin/plugin.chart.state_district_pies.md`

### Research

- `wiki/research/plugins-vs-extensions.md`
- `wiki/research/state_district_pies-plugin.md`
- `wiki/research/dashboard-chatbot-extension.md`

## Source-of-truth pointers

- Runtime topology: `docker-compose.yml`
- Reconciler engine: `docker/scripts/seed_dashboard.py`
- Superset settings: `superset_config.py`
- Plugin source: `superset-plugins/plugin-chart-state-district-pies/`
- Extension source: `superset-extensions/dashboard-chatbot/`
