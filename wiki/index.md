# Project Wiki

_Last reviewed: 2026-04-24_

This wiki is the operator/developer companion for the Superset Control Plane repository.
It complements the root `README.md` with task-focused runbooks and full asset references.

## Start here

1. [Overview](overview.md) — what this repository does and how it is organized.
2. [Architecture](architecture/README.md) — runtime services, reconciliation flow, and extension/plugin model.
3. [Database seeding runbook](runtime/database-seeding.md) — how the analytics database is seeded and validated.
4. [Troubleshooting: chart visibility](troubleshooting/chart-visibility-in-ui.md) — common “chart missing/not rendering” paths.

## Asset reference pages

### Database
- [db.analytics](assets/db.analytics.md)

### Datasets
- [dataset.household.hh_master](assets/dataset/dataset.household.hh_master.md)
- [dataset.household.district_segment_pie](assets/dataset/dataset.household.district_segment_pie.md)
- [dataset.household.mpce_by_segment](assets/dataset/dataset.household.mpce_by_segment.md)
- [dataset.household.segment_distribution](assets/dataset/dataset.household.segment_distribution.md)
- [dataset.household.segment_minor_bucket](assets/dataset/dataset.household.segment_minor_bucket.md)
- [dataset.household.state_district_segment](assets/dataset/dataset.household.state_district_segment.md)
- [dataset.household.state_district_segment_geo](assets/dataset/dataset.household.state_district_segment_geo.md)
- [dataset.household.state_segment_distribution](assets/dataset/dataset.household.state_segment_distribution.md)

### Charts
- [chart.household.district_pie_subchart](assets/chart/chart.household.district_pie_subchart.md)
- [chart.household.district_pie_unified](assets/chart/chart.household.district_pie_unified.md)
- [chart.household.minor_structure](assets/chart/chart.household.minor_structure.md)
- [chart.household.mpce_by_segment](assets/chart/chart.household.mpce_by_segment.md)
- [chart.household.rural_segment_comparison](assets/chart/chart.household.rural_segment_comparison.md)
- [chart.household.segment_distribution_pie](assets/chart/chart.household.segment_distribution_pie.md)
- [chart.household.state_district_pies](assets/chart/chart.household.state_district_pies.md)
- [chart.household.state_map](assets/chart/chart.household.state_map.md)
- [chart.household.state_segment_distribution_bar](assets/chart/chart.household.state_segment_distribution_bar.md)

### Dashboard
- [dashboard.household.survey](assets/dashboard/dashboard.household.survey.md)

## Research notes

- [Plugins vs Extensions](research/plugins-vs-extensions.md)
- [State District Pies plugin note](research/state_district_pies-plugin.md)
- [Dashboard chatbot extension note](research/dashboard-chatbot-extension.md)

## Change log

- [Wiki log](log.md)
