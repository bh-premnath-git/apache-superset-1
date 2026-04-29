-- ==========================================================================
-- Household-level metrics view with district_name for plugin detail tables
-- --------------------------------------------------------------------------
-- The state_district_pies detail view filters by (state, district_name,
-- segment). Raw household.hh_master stores district as an ordinal code, so
-- this view joins the derived segment rows to centroid ordering to expose a
-- stable district_name while preserving all hh_master metric columns.
-- ==========================================================================

CREATE OR REPLACE VIEW household.vw_hh_master_metrics_geo AS
WITH centroid_ord AS (
    SELECT
        state_label,
        district_name,
        ROW_NUMBER() OVER (
            PARTITION BY state_label ORDER BY district_code
        )::int AS ordinal
    FROM household.district_centroids
)
SELECT
    h.*,
    s.segment,
    s.segment_band,
    c.district_name
FROM household.hh_master h
JOIN household.vw_hh_segments s
  ON s.hhid = h."HHID"
JOIN centroid_ord c
  ON c.state_label = s.state_label
 AND c.ordinal     = s.district_code;
