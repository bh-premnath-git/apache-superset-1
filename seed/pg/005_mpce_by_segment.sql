-- ============================================================================
-- MPCE (Monthly Per Capita Consumption Expenditure) by LCA Segment
-- ----------------------------------------------------------------------------
-- Weighted mean MPCE with error margins (stddev) for line chart visualization.
-- Includes segment ordering (R1→R4→U1→U3) and overall rural/urban means.
-- ============================================================================

CREATE OR REPLACE VIEW household.vw_mpce_by_segment AS
WITH base AS (
    SELECT
        s.*,
        (
            COALESCE(h.cereal_val_total,0) + COALESCE(h.pulses_val_total,0) +
            COALESCE(h.dairy_val_total,0) + COALESCE(h.vegetables_val_total,0) +
            COALESCE(h.egg_fish_meat_val_total,0) + COALESCE(h."edible oil_val_total",0) +
            COALESCE(h.spices_val_total,0) + COALESCE(h.suger_salt_val_total,0) +
            COALESCE(h.beverages_val_total,0) +
            COALESCE(h."subtotal fuel and light_val_total",0) +
            COALESCE(h."edu expense_val_total",0) +
            COALESCE(h.conveyance_val_total,0) +
            COALESCE(h."house_garage rent_val_total",0) +
            COALESCE(h."medical nonhospitalized_val_total",0) +
            COALESCE(h.entertainment_val_total,0) +
            COALESCE(h.internet_val_total,0) +
            COALESCE(h.clothing_val_total,0) +
            COALESCE(h.footwear_val_total,0)
        ) / NULLIF(h.hh_size, 0) AS mpce
    FROM household.vw_hh_segments s
    JOIN household.hh_master h ON h."HHID" = s.hhid
    WHERE (
        COALESCE(h.cereal_val_total,0) + COALESCE(h.pulses_val_total,0) +
        COALESCE(h.dairy_val_total,0) + COALESCE(h.vegetables_val_total,0) +
        COALESCE(h.egg_fish_meat_val_total,0) + COALESCE(h."edible oil_val_total",0) +
        COALESCE(h.spices_val_total,0) + COALESCE(h.suger_salt_val_total,0) +
        COALESCE(h.beverages_val_total,0) +
        COALESCE(h."subtotal fuel and light_val_total",0) +
        COALESCE(h."edu expense_val_total",0) +
        COALESCE(h.conveyance_val_total,0) +
        COALESCE(h."house_garage rent_val_total",0) +
        COALESCE(h."medical nonhospitalized_val_total",0) +
        COALESCE(h.entertainment_val_total,0) +
        COALESCE(h.internet_val_total,0) +
        COALESCE(h.clothing_val_total,0) +
        COALESCE(h.footwear_val_total,0)
    ) > 0
),
-- Weighted mean per segment, materialised as its own CTE so the stddev
-- calculation below can reference it without nesting aggregates (Postgres
-- rejects SUM(... SUM(...) ...) with "aggregate function calls cannot be
-- nested").
segment_mean AS (
    SELECT
        segment,
        SUM(mpce * wt) / NULLIF(SUM(wt), 0) AS wmean,
        SUM(wt)                             AS weighted_count
    FROM base
    GROUP BY segment
),
segment_stats AS (
    SELECT
        b.segment,
        CASE
            WHEN b.segment IN ('R1','R2','R3','R4') THEN 'Rural'
            ELSE 'Urban'
        END AS sector,
        CASE b.segment
            WHEN 'R1' THEN 1
            WHEN 'R2' THEN 2
            WHEN 'R3' THEN 3
            WHEN 'R4' THEN 4
            WHEN 'U1' THEN 5
            WHEN 'U2' THEN 6
            WHEN 'U3' THEN 7
        END AS segment_order,
        ROUND(MAX(m.wmean)::numeric, 0) AS mean_mpce,
        ROUND(
            SQRT(
                (SUM(b.wt * (b.mpce - m.wmean)^2) / NULLIF(SUM(b.wt), 0))::numeric
            ), 0
        ) AS stddev_mpce,
        MAX(m.weighted_count) AS weighted_count
    FROM base b
    JOIN segment_mean m USING (segment)
    GROUP BY b.segment
),
rural_overall AS (
    SELECT
        'Rural' AS sector,
        ROUND((SUM(mpce * wt) / NULLIF(SUM(wt), 0))::numeric, 0) AS overall_mean
    FROM base
    WHERE segment IN ('R1','R2','R3','R4')
),
urban_overall AS (
    SELECT
        'Urban' AS sector,
        ROUND((SUM(mpce * wt) / NULLIF(SUM(wt), 0))::numeric, 0) AS overall_mean
    FROM base
    WHERE segment IN ('U1','U2','U3')
)
SELECT
    s.segment,
    s.sector,
    s.segment_order,
    s.mean_mpce,
    s.stddev_mpce,
    s.weighted_count,
    CASE WHEN s.sector = 'Rural' THEN r.overall_mean ELSE u.overall_mean END AS overall_sector_mean
FROM segment_stats s
LEFT JOIN rural_overall r ON s.sector = 'Rural'
LEFT JOIN urban_overall u ON s.sector = 'Urban'
ORDER BY s.segment_order;
