# Wiki Change Log

## 2026-04-29

- `state_district_pies` plugin detail page now stacks Rural and Urban comparison tables vertically rather than rendering them side-by-side at wide widths.
- Implemented Option B (rich per-segment metrics): when `metrics_datasource` is configured the detail page issues a runtime `POST /api/v1/chart/data` (via `SupersetClient`) scoped to the selected (state, district) and renders a wide grouped per-segment metrics table with colour-banded column headers (size / econ / digi / cap / wel). Defaults reproduce the SQL from the previously-deleted `rural_segment_comparison.yaml` so it works out of the box.
- Added segment description modal: clicking any segment label (R1/R2/U1/...) on either detail table opens a plain overlay modal with title, summary, classification criteria, and suggested interventions. Content is operator-supplied JSON via the `segment_descriptions` control; missing codes render a stub note instead of breaking.
- Both metric definitions and segment descriptions parse with safe fallbacks — invalid JSON cannot brick the chart.
- New module surface: `src/data/buildMetricsQuery.ts`, `src/data/segmentDescriptions.ts`, `src/hooks/useDetailMetrics.ts`, `src/components/DetailMetricsTable.tsx`, `src/components/SegmentModal.tsx`. Updated `controlPanel.ts`, `transformProps.ts`, `types.ts`, `constants.ts`, `DistrictDetailView.tsx`, `SegmentComparisonTable.tsx`.

## 2026-04-28

- Initialized wiki content from current repository state.
- Added architecture, runtime, troubleshooting, research, and asset pages.
- Documented static plugin registration path and extension lifecycle caveats.
- Refactored `state_district_pies` plugin: extracted `useDrillDown`, `useResolvedFeatureProps`, `data/normalize`, `data/splitWedges`, and `format.ts` so the orchestrator stays focused on layout. No behaviour change.
- Redesigned the in-plugin district detail view as side-by-side rural/urban comparison tables with per-segment count, intra-section share, share-of-district, and proportional bar. Replaced hand-rolled stacked SVG bars.
- Made rural/urban segment groups configurable via `rural_categories` and `urban_categories` control-panel fields (defaults remain `R1–R4` / `U1–U3`). Removed hard-coded regex from `transformProps`.

- Removed 9 unused chart assets from `assets/charts/` that were not referenced by `household_survey.yaml` dashboard:
  - `district_helper_text.yaml`
  - `district_segment_distribution_bar.yaml`
  - `household_minor_structure.yaml`
  - `mpce_by_segment.yaml`
  - `rural_district_segments.yaml`
  - `rural_segment_comparison.yaml`
  - `segment_distribution_pie.yaml`
  - `state_segment_distribution_bar.yaml`
  - `urban_district_segments.yaml`

## Template for future entries

```markdown
## YYYY-MM-DD
- What changed
- Why it changed
- Which files/features it affects
```
