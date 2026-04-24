# Wiki Change Log

## 2026-04-24 (round 6)

- Extended `wiki/reference/docs-cross-reference.md` with a repository folder coverage table explicitly covering `config/`, `docker/`, `seed/`, `env/`, `extensions/`, `superset-extensions/`, and `superset-plugins/` in addition to the file-level `assets/` matrix.
- Added direct reference links in that table so coverage can be verified quickly from one page when auditing non-asset folders.

## 2026-04-24 (round 5)

- Added an explicit `assets/` coverage matrix to `wiki/reference/docs-cross-reference.md` so every YAML under `assets/` is mapped to a wiki reference page.
- Clarified historical-vs-active asset docs in the cross-reference notes (deleted chart pages are retained for history but not counted as active assets).
- Corrected stale downstream dependency examples in `wiki/assets/db.analytics.md` to match current dataset keys under `assets/datasets/`.

## 2026-04-24 (round 4)

- Added full documentation cross-reference page: `wiki/reference/docs-cross-reference.md` (every `README.md` and every `wiki/` file/subfolder documented).
- Added missing asset reference pages for:
  - `plugin.chart.state_district_pies`
  - `extension.ext.my_org.dashboard_chatbot`
- Updated `wiki/index.md` navigation so plugin and extension references are first-class entries.
- Updated root `README.md` to link the documentation cross-reference page.
- Fixed stale/broken documentation links in:
  - `superset-plugins/plugin-chart-state-district-pies/README.md`
  - `wiki/assets/chart/chart.household.state_district_pies.md`
  - `assets/extensions/chatbot_assistant.yaml` comments

## 2026-04-24 (round 3)

- Expanded root `README.md` with an explicit **Architecture & Design Pattern Highlights** section to summarize GitOps/reconcile-loop design decisions and link to deeper architecture references.

## 2026-04-24 (round 2)

- Added missing per-chart docs for:
  - `chart.household.district_pie_subchart`
  - `chart.household.minor_structure`
  - `chart.household.mpce_by_segment`
  - `chart.household.segment_distribution_pie`
  - `chart.household.state_segment_distribution_bar`
- Added missing per-dataset docs for:
  - `dataset.household.district_segment_pie`
  - `dataset.household.mpce_by_segment`
  - `dataset.household.segment_distribution`
  - `dataset.household.segment_minor_bucket`
  - `dataset.household.state_district_segment`
  - `dataset.household.state_segment_distribution`
- Expanded `wiki/index.md` to include complete chart and dataset catalog.
- Updated root `README.md` documentation status to explicitly point to full asset catalog.

## 2026-04-24 (round 1)

- Added foundational wiki navigation in `wiki/index.md`.
- Added project scope summary in `wiki/overview.md`.
- Added architecture summary in `wiki/architecture/README.md`.
- Added database seeding runbook in `wiki/runtime/database-seeding.md`.
- Added chart visibility troubleshooting guide in `wiki/troubleshooting/chart-visibility-in-ui.md`.
- Added research notes:
  - `wiki/research/plugins-vs-extensions.md`
  - `wiki/research/state_district_pies-plugin.md`
  - `wiki/research/dashboard-chatbot-extension.md`
