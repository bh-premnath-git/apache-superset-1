# dataset.household.state_district_segment_geo

## Purpose

LCA (Living Conditions Approach) segment dataset with district centroid geometries for the Cartodiagram visualization.

## Source of truth
- File: `assets/datasets/lca_state_district_segment_geo.yaml`
- Kind: `Dataset`
- Runtime name: `lca_state_district_segment_geo`
- Schema: `household`
- Table/View: `vw_state_district_segment_geo`

## Upstream dependency
- `db.analytics` — Analytics Warehouse database connection

## SQL view definition

The dataset is backed by `household.vw_state_district_segment_geo`, which joins:

1. `household.vw_state_district_segment` — Long-form (state, district, segment, hh_weight)
2. `household.district_centroids` — District centroid coordinates (lat/lon) for Bihar, Jharkhand, and Madhya Pradesh

The view computes a `ROW_NUMBER()` ordinal over centroids (partitioned by state) to match the 1-based district codes in the source data with the Census 2011 absolute codes in the centroids table.

```sql
CREATE OR REPLACE VIEW household.vw_state_district_segment_geo AS
WITH centroid_ord AS (
    SELECT
        state_label,
        district_name,
        lon,
        lat,
        ROW_NUMBER() OVER (
            PARTITION BY state_label ORDER BY district_code
        )::int AS ordinal
    FROM household.district_centroids
)
SELECT
    s.state_iso_code,
    s.state_label,
    s.district_code,
    c.district_name,
    s.segment,
    s.hh_weight,
    json_build_object(
        'type', 'Point',
        'coordinates', json_build_array(c.lon, c.lat)
    )::text AS geometry
FROM household.vw_state_district_segment s
JOIN centroid_ord c
  ON c.state_label = s.state_label
 AND c.ordinal     = s.district_code;
```

## Data shape

| Column | Type | Description |
|--------|------|-------------|
| `state_iso_code` | text | ISO 3166-2 code (e.g., IN-BR, IN-JH, IN-MP) |
| `state_label` | text | State name (e.g., "Bihar") |
| `district_code` | integer | 1-based per-state ordinal (1..N) |
| `district_name` | text | Official district name from Census 2011 |
| `segment` | text | LCA segment code (R1, R2, R3, R4, U1, U2, U3) |
| `hh_weight` | double | Weighted household count for segment in district |
| `geometry` | text | GeoJSON Point as JSON string: `{"type":"Point","coordinates":[lon,lat]}` |

## Coverage

- **Bihar**: 38 districts
- **Jharkhand**: 24 districts  
- **Madhya Pradesh**: 50 districts
- **Total rows**: 586 (sum of all segment rows across all districts)

## Usage

This dataset feeds the Cartodiagram visualization (`chart.household.district_pie_unified`), which renders a pie chart at each district centroid showing the segment mix.

The dataset is also a target of the dashboard's **State** filter, allowing users to filter the Cartodiagram to show only one state's districts.

## Related files
- `assets/datasets/lca_state_district_segment_geo.yaml`
- `seed/pg/003_lca_segment_views.sql` — Source view `vw_state_district_segment`
- `seed/pg/004_district_centroids.sql` — Centroid table and `vw_state_district_segment_geo` view

## Related pages
- [chart.household.district_pie_unified](chart.household.district_pie_unified.md)
- [dashboard.household.survey](dashboard.household.survey.md)
- [dataset.household.hh_master](dataset.household.hh_master.md)
