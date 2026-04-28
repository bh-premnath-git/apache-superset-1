# Asset: `chart.household.district_pie_unified`

- Kind: `Chart`
- Source YAML: `assets/charts/district_pie_unified.yaml`
- Viz type: `state_district_pies`

## Behavior

- Uses custom plugin `state_district_pies`.
- Dataset reference: `dataset.household.state_district_segment_geo`.
- Uses same-origin GeoJSON paths:
  - `/static/assets/india-districts.geojson` for state layer
  - `/static/assets/india-districts.geojson` for district layer
- Metric expression: `SUM(hh_weight)`.

## Implementation note

`emit_filter: true` may trigger dashboard native filter updates unless the plugin click handler intentionally keeps drill-down local.
