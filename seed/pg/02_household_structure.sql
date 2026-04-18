-- ─────────────────────────────────────────────────────────────────────────────
-- Household Structure — Proportion of Minor (< 15 yrs) (Weighted)
--
-- Mirrors the stacked-bar layout where each segment (R1–R4, U1–U3) is broken
-- down into three minor-count buckets. Percentages within a segment sum to
-- 100, so a regular stacked bar chart renders as a 100 % stacked bar.
--
-- Weighting uses the hh_master `wt` column so the bars reflect population
-- estimates rather than raw sample counts.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW vw_segment_minor_structure AS
WITH base AS (
    SELECT
        hs.segment,
        hs.segment_band,
        NULLIF(regexp_replace(hm."n_children_u15", '[^0-9.\-]+', '', 'g'), '')::NUMERIC AS n_u15,
        COALESCE(
            NULLIF(regexp_replace(hm."wt", '[^0-9.\-]+', '', 'g'), '')::NUMERIC,
            1
        ) AS wt
    FROM vw_household_segments hs
    JOIN hh_master hm ON hm."HHID" = hs.hhid
),
bucketed AS (
    SELECT
        segment,
        segment_band,
        CASE
            WHEN n_u15 IS NULL OR n_u15 = 0 THEN 'No U15 minor'
            WHEN n_u15 <= 2                THEN '1-2 U15 minors'
            ELSE                                '3+ U15 minors'
        END AS minor_bucket,
        CASE
            WHEN n_u15 IS NULL OR n_u15 = 0 THEN 1
            WHEN n_u15 <= 2                THEN 2
            ELSE                                3
        END AS minor_bucket_order,
        wt
    FROM base
),
segment_totals AS (
    SELECT segment, SUM(wt) AS total_wt
    FROM bucketed
    GROUP BY segment
)
SELECT
    b.segment,
    b.segment_band,
    b.minor_bucket,
    b.minor_bucket_order,
    SUM(b.wt)                                                         AS weighted_hh,
    ROUND(SUM(b.wt) * 100.0 / NULLIF(t.total_wt, 0), 1)               AS pct_of_segment
FROM bucketed b
JOIN segment_totals t ON t.segment = b.segment
GROUP BY b.segment, b.segment_band, b.minor_bucket, b.minor_bucket_order, t.total_wt
ORDER BY b.segment, b.minor_bucket_order;

-- ── Mean number of U15 minors per household, weighted, by sector band ───────
-- Feeds the two "Mean Number of Minor in HH — Rural / Urban" KPI tiles that
-- sit above the stacked-bar chart in the reference layout.
CREATE OR REPLACE VIEW vw_sector_minor_mean AS
WITH base AS (
    SELECT
        CASE WHEN COALESCE(hm."Sector_label", '') ILIKE 'Urban' THEN 'Urban' ELSE 'Rural' END AS sector_band,
        NULLIF(regexp_replace(hm."n_children_u15", '[^0-9.\-]+', '', 'g'), '')::NUMERIC AS n_u15,
        COALESCE(
            NULLIF(regexp_replace(hm."wt", '[^0-9.\-]+', '', 'g'), '')::NUMERIC,
            1
        ) AS wt
    FROM hh_master hm
)
SELECT
    sector_band,
    ROUND(SUM(COALESCE(n_u15, 0) * wt) / NULLIF(SUM(wt), 0), 1) AS mean_u15
FROM base
GROUP BY sector_band;

-- Split views so Big Number tiles don't require adhoc_filters plumbing.
CREATE OR REPLACE VIEW vw_sector_minor_mean_rural AS
SELECT mean_u15 FROM vw_sector_minor_mean WHERE sector_band = 'Rural';

CREATE OR REPLACE VIEW vw_sector_minor_mean_urban AS
SELECT mean_u15 FROM vw_sector_minor_mean WHERE sector_band = 'Urban';
