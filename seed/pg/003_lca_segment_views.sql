-- ============================================================================
-- LCA segment views for the Household Survey dashboard
-- ----------------------------------------------------------------------------
-- Segment codes follow the Living Conditions Approach (LCA) convention:
--   R1/R2/R3/R4 — rural segments, best (R1) to most constrained (R4)
--   U1/U2/U3   — urban segments, best (U1) to most constrained (U3)
-- Classification mirrors the legacy scoring logic (commit 9f4044e) and is
-- derived from digital, asset, and welfare signals already present on
-- household.hh_master. Households missing all signals fall into R4/U3.
--
-- Note: Views include ALL Indian states (not just Bihar/Jharkhand/MP) to
-- support cross-filtering from the India state map dashboard.
-- ============================================================================

-- ── Base: one row per household with derived segment.
-- Using `wt` as the survey weight for all downstream weighted aggregates
-- (`weighted_count` on the dataset uses SUM(wt) too).
CREATE OR REPLACE VIEW household.vw_hh_segments AS
WITH scored AS (
    SELECT
        "HHID"                                         AS hhid,
        "State_label"                                  AS state_label,
        state_map_name                                 AS state_map_name,
        "District"                                     AS district_code,
        COALESCE("Sector_label", '')                   AS sector_label,
        COALESCE(wt, 1.0)                              AS wt,
        COALESCE(n_children_u15, 0)                    AS n_children_u15,
        (CASE WHEN COALESCE(any_internet, 0) = 1 THEN 2 ELSE 0 END +
         CASE WHEN "Possess_Mobile" = '1'       THEN 1 ELSE 0 END +
         CASE WHEN "Online_Groceries" = '1'     THEN 1 ELSE 0 END)
                                                       AS digital_score,
        (CASE WHEN "Possess_Car" = '1'          THEN 2 ELSE 0 END +
         CASE WHEN "Possess_Mobile" = '1'       THEN 1 ELSE 0 END)
                                                       AS asset_score,
        CASE WHEN COALESCE(any_internet, 0) = 1 THEN 1 ELSE 0 END
                                                       AS internet_access,
        CASE WHEN "Possess_Mobile" = '1' THEN 1 ELSE 0 END
                                                       AS mobile_ownership
    FROM household.hh_master
    -- All Indian states included for full cross-filtering support
),
classified AS (
    SELECT
        *,
        CASE
            WHEN sector_label ILIKE 'Urban' THEN
                CASE
                    WHEN asset_score >= 2 AND digital_score >= 2 AND internet_access = 1 THEN 'U1'
                    WHEN digital_score >= 2 AND mobile_ownership = 1 THEN 'U2'
                    ELSE 'U3'
                END
            ELSE
                CASE
                    WHEN asset_score >= 2 AND digital_score >= 2 AND internet_access = 1 THEN 'R1'
                    WHEN digital_score >= 2 AND mobile_ownership = 1 THEN 'R2'
                    WHEN digital_score <= 1 AND internet_access = 0 THEN 'R3'
                    ELSE 'R4'
                END
        END AS segment
    FROM scored
)
SELECT
    hhid,
    state_label,
    state_map_name,
    district_code,
    sector_label,
    wt,
    n_children_u15,
    CASE
        WHEN n_children_u15 = 0 THEN 'No U15 minor'
        WHEN n_children_u15 BETWEEN 1 AND 2 THEN '1-2 U15 minors'
        ELSE '3+ U15 minors'
    END AS minor_bucket,
    segment,
    CASE WHEN sector_label ILIKE 'Urban' THEN 'Urban' ELSE 'Rural' END AS segment_band
FROM classified;

-- ── District-level segment percentages with cumulative endpoints
-- powering the CSS `conic-gradient` pie chart per district inside the
-- handlebars-rendered state grid. Weighted (`SUM(wt)`) to match the
-- rest of the dashboard.
CREATE OR REPLACE VIEW household.vw_district_segment_pie AS
WITH dist_counts AS (
    SELECT
        state_label,
        state_map_name,
        district_code,
        SUM(wt)                                               AS hh_weight,
        SUM(CASE WHEN segment = 'R1' THEN wt ELSE 0 END)      AS r1_w,
        SUM(CASE WHEN segment = 'R2' THEN wt ELSE 0 END)      AS r2_w,
        SUM(CASE WHEN segment = 'R3' THEN wt ELSE 0 END)      AS r3_w,
        SUM(CASE WHEN segment = 'R4' THEN wt ELSE 0 END)      AS r4_w,
        SUM(CASE WHEN segment = 'U1' THEN wt ELSE 0 END)      AS u1_w,
        SUM(CASE WHEN segment = 'U2' THEN wt ELSE 0 END)      AS u2_w,
        SUM(CASE WHEN segment = 'U3' THEN wt ELSE 0 END)      AS u3_w
    FROM household.vw_hh_segments
    GROUP BY state_label, state_map_name, district_code
),
pct AS (
    SELECT
        state_label,
        state_map_name,
        district_code,
        hh_weight,
        ROUND((r1_w * 100.0 / NULLIF(hh_weight, 0))::numeric, 2) AS r1_pct,
        ROUND((r2_w * 100.0 / NULLIF(hh_weight, 0))::numeric, 2) AS r2_pct,
        ROUND((r3_w * 100.0 / NULLIF(hh_weight, 0))::numeric, 2) AS r3_pct,
        ROUND((r4_w * 100.0 / NULLIF(hh_weight, 0))::numeric, 2) AS r4_pct,
        ROUND((u1_w * 100.0 / NULLIF(hh_weight, 0))::numeric, 2) AS u1_pct,
        ROUND((u2_w * 100.0 / NULLIF(hh_weight, 0))::numeric, 2) AS u2_pct,
        ROUND((u3_w * 100.0 / NULLIF(hh_weight, 0))::numeric, 2) AS u3_pct
    FROM dist_counts
)
SELECT
    state_label,
    state_map_name,
    district_code,
    hh_weight,
    COALESCE(r1_pct, 0) AS r1_pct,
    COALESCE(r2_pct, 0) AS r2_pct,
    COALESCE(r3_pct, 0) AS r3_pct,
    COALESCE(r4_pct, 0) AS r4_pct,
    COALESCE(u1_pct, 0) AS u1_pct,
    COALESCE(u2_pct, 0) AS u2_pct,
    COALESCE(u3_pct, 0) AS u3_pct,
    -- Cumulative endpoints feed a seven-stop CSS conic-gradient.
    COALESCE(r1_pct, 0)                                                                 AS c1,
    COALESCE(r1_pct, 0) + COALESCE(r2_pct, 0)                                           AS c2,
    COALESCE(r1_pct, 0) + COALESCE(r2_pct, 0) + COALESCE(r3_pct, 0)                     AS c3,
    COALESCE(r1_pct, 0) + COALESCE(r2_pct, 0) + COALESCE(r3_pct, 0) + COALESCE(r4_pct, 0) AS c4,
    COALESCE(r1_pct, 0) + COALESCE(r2_pct, 0) + COALESCE(r3_pct, 0) + COALESCE(r4_pct, 0)
        + COALESCE(u1_pct, 0)                                                           AS c5,
    COALESCE(r1_pct, 0) + COALESCE(r2_pct, 0) + COALESCE(r3_pct, 0) + COALESCE(r4_pct, 0)
        + COALESCE(u1_pct, 0) + COALESCE(u2_pct, 0)                                     AS c6
FROM pct;

-- ── Weighted share of households by U15-minor bucket within each segment.
-- The bars in the reference image sum to 100% per segment (rows R1-R4,U1-U3)
-- and are split into No U15 minor / 1-2 U15 minors / 3+ U15 minors stacks.
CREATE OR REPLACE VIEW household.vw_segment_minor_bucket AS
WITH per_bucket AS (
    SELECT
        segment,
        minor_bucket,
        SUM(wt) AS bucket_weight
    FROM household.vw_hh_segments
    GROUP BY segment, minor_bucket
),
per_segment AS (
    SELECT segment, SUM(bucket_weight) AS seg_weight
    FROM per_bucket
    GROUP BY segment
)
SELECT
    b.segment,
    b.minor_bucket,
    ROUND((b.bucket_weight * 100.0 / NULLIF(s.seg_weight, 0))::numeric, 1) AS pct,
    b.bucket_weight,
    s.seg_weight
FROM per_bucket b
JOIN per_segment s USING (segment);

-- ── Overall segment distribution across the three states (pie chart).
CREATE OR REPLACE VIEW household.vw_segment_distribution AS
WITH totals AS (
    SELECT SUM(wt) AS total_weight FROM household.vw_hh_segments
),
per_seg AS (
    SELECT segment, SUM(wt) AS seg_weight
    FROM household.vw_hh_segments
    GROUP BY segment
)
SELECT
    p.segment,
    p.seg_weight,
    ROUND((p.seg_weight * 100.0 / NULLIF(t.total_weight, 0))::numeric, 1) AS pct
FROM per_seg p
CROSS JOIN totals t;

-- ── Per-state segment mix (stacked bar, 3 bars = Bihar / MP / Jharkhand).
CREATE OR REPLACE VIEW household.vw_state_segment_distribution AS
WITH per_state AS (
    SELECT state_label, SUM(wt) AS state_weight
    FROM household.vw_hh_segments
    GROUP BY state_label
),
per_state_seg AS (
    SELECT state_label, segment, SUM(wt) AS seg_weight
    FROM household.vw_hh_segments
    GROUP BY state_label, segment
)
SELECT
    ps.state_label,
    ps.segment,
    ps.seg_weight,
    ROUND((ps.seg_weight * 100.0 / NULLIF(s.state_weight, 0))::numeric, 1) AS pct
FROM per_state_seg ps
JOIN per_state s USING (state_label);

-- ── Long-form (state, district, segment) weighted count.
-- Feeds the custom `state_district_pies` viz plugin, which groups on
-- all three columns in buildQuery and expects one row per tuple. We
-- also carry the ISO 3166-2 state code so the state choropleth layer
-- can join on the same `ISO` property used by Superset's bundled
-- India geojson.
CREATE OR REPLACE VIEW household.vw_state_district_segment AS
SELECT
    h.state_iso_code,
    s.state_label,
    s.district_code,
    s.segment,
    SUM(s.wt) AS hh_weight
FROM household.vw_hh_segments s
JOIN (
    SELECT DISTINCT "State_label" AS state_label, state_iso_code
    FROM household.hh_master
    WHERE state_iso_code IS NOT NULL
) h USING (state_label)
GROUP BY h.state_iso_code, s.state_label, s.district_code, s.segment;
