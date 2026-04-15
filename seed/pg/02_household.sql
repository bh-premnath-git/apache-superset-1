-- Sample household survey schema for Postgres (superset-analytics-db)
-- Connection URI: postgresql+psycopg2://sample_user:sample_pass@analytics-db:5432/analytics
--
-- ── Architecture ─────────────────────────────────────────────────────────────
-- Raw layer       : household          (atomic facts, 200K rows)
-- Analytical layer: segment_summary, state_summary, income_distribution,
--                   district_segment_summary, household_monthly_trend
--
-- Charts should point at the analytical views (not the raw table) for:
--   • consistent weighting / bucketing logic
--   • reusable semantics across dashboards
--   • smaller payloads and faster render

-- ── Raw fact table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS household (
    household_id       BIGSERIAL PRIMARY KEY,

    -- Time dimension (enables monthly / weekly / yearly rollups)
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Geography (name + stable code + coordinates for maps)
    state              TEXT,
    state_code         TEXT,
    district           TEXT,
    district_code      TEXT,
    lat                NUMERIC(8, 4),
    lon                NUMERIC(8, 4),

    -- Segment (R1 Stable, R2 Aspirant, R3 Disconnected, R4 Constrained)
    segment            TEXT,

    -- Income & spend
    income             NUMERIC,
    food_spend_pct     NUMERIC,
    edu_spend_pct      NUMERIC,

    -- Digital behaviour
    has_internet       BOOLEAN,
    does_online_purchase BOOLEAN,

    -- Demographics
    social_category    TEXT,
    hh_size            INT,

    -- Welfare programs
    has_pmay           BOOLEAN,
    has_ayushman       BOOLEAN,
    has_ration_card    BOOLEAN,

    -- Survey weight
    multiplier         NUMERIC
);

-- ── Fast Bulk Data Generation (200K households) ───────────────────────────────
-- Row generation is driven by one CTE so state name/code/centroid stay aligned
-- and the segment probability draw (`r`) is reused across dependent columns.
WITH gen AS (
    SELECT
        random()                                AS r,
        (floor(random() * 5) + 1)::int          AS state_idx,
        (floor(random() * 50) + 1)::int         AS district_idx,
        -- Spread creation dates over the last 365 days for time-series views
        NOW() - (random() * INTERVAL '365 days') AS created_at
    FROM generate_series(1, 200000)
)
INSERT INTO household (
    created_at,
    state, state_code, district, district_code, lat, lon,
    segment,
    income, food_spend_pct, edu_spend_pct,
    has_internet, does_online_purchase,
    social_category, hh_size,
    has_pmay, has_ayushman, has_ration_card,
    multiplier
)
SELECT
    created_at,

    -- Geography: name, ISO-like code and jittered centroid for each state
    (ARRAY['Bihar','MP','Jharkhand','UP','Odisha'])[state_idx]          AS state,
    (ARRAY['BR','MP','JH','UP','OD'])[state_idx]                        AS state_code,
    'District_' || district_idx                                         AS district,
    'D' || LPAD(district_idx::text, 3, '0')                             AS district_code,
    -- Centroid latitude with ~±1° jitter so map points spread across the state
    ((ARRAY[25.0961, 23.4733, 23.6102, 26.8467, 20.9517])[state_idx]
        + (random() - 0.5) * 2)::numeric(8, 4)                          AS lat,
    ((ARRAY[85.3131, 77.9470, 85.2799, 80.9462, 85.0985])[state_idx]
        + (random() - 0.5) * 2)::numeric(8, 4)                          AS lon,

    -- Segment distribution (approx from survey data)
    CASE
        WHEN r < 0.10 THEN 'R1'  -- Stable (10%)
        WHEN r < 0.40 THEN 'R2'  -- Aspirant (30%)
        WHEN r < 0.47 THEN 'R3'  -- Disconnected (7%)
        ELSE 'R4'                -- Constrained (53%)
    END AS segment,

    -- Income (segment-based realistic ranges)
    CASE
        WHEN r < 0.10 THEN 4500 + random()*1000   -- R1: 4500-5500
        WHEN r < 0.40 THEN 3500 + random()*800    -- R2: 3500-4300
        WHEN r < 0.47 THEN 3000 + random()*1000   -- R3: 3000-4000
        ELSE 2500 + random()*800                  -- R4: 2500-3300
    END,

    -- Food spend % (segment-based)
    CASE
        WHEN r < 0.10 THEN 30 + random()*10   -- R1: 30-40%
        WHEN r < 0.40 THEN 30 + random()*15   -- R2: 30-45%
        WHEN r < 0.47 THEN 50 + random()*15   -- R3: 50-65%
        ELSE 50 + random()*20                 -- R4: 50-70%
    END,

    -- Education spend % (segment-based)
    CASE
        WHEN r < 0.10 THEN 20 + random()*15   -- R1: 20-35%
        WHEN r < 0.40 THEN 15 + random()*10   -- R2: 15-25%
        ELSE 5 + random()*10                  -- R3/R4: 5-15%
    END,

    -- Internet access (segment-based penetration)
    CASE
        WHEN r < 0.10 THEN random() < 0.9   -- R1: 90%
        WHEN r < 0.40 THEN random() < 0.9   -- R2: 90%
        WHEN r < 0.47 THEN random() < 0.05  -- R3: 5%
        ELSE false                          -- R4: 0%
    END,

    -- Online purchase behavior (segment-based)
    CASE
        WHEN r < 0.10 THEN random() < 0.5   -- R1: 50%
        WHEN r < 0.40 THEN random() < 0.6   -- R2: 60%
        WHEN r < 0.47 THEN random() < 0.1   -- R3: 10%
        ELSE false                          -- R4: 0%
    END,

    -- Social category distribution
    (ARRAY['SC','ST','OBC','GEN'])[floor(random()*4)+1],

    -- Household size (2-8 members)
    floor(2 + random()*6)::INT,

    -- Welfare scheme participation (random but realistic)
    random() < 0.3,  -- PMAY: ~30%
    random() < 0.4,  -- Ayushman: ~40%
    random() < 0.6,  -- Ration card: ~60%

    -- Multiplier for weighted analysis (0.5-2.5)
    0.5 + random()*2
FROM gen;

-- ── Indexes for Analytics Performance ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_household_segment         ON household(segment);
CREATE INDEX IF NOT EXISTS idx_household_state           ON household(state);
CREATE INDEX IF NOT EXISTS idx_household_state_code      ON household(state_code);
CREATE INDEX IF NOT EXISTS idx_household_district_code   ON household(district_code);
CREATE INDEX IF NOT EXISTS idx_household_income          ON household(income);
CREATE INDEX IF NOT EXISTS idx_household_social_category ON household(social_category);
CREATE INDEX IF NOT EXISTS idx_household_has_internet    ON household(has_internet);
CREATE INDEX IF NOT EXISTS idx_household_created_at      ON household(created_at);

-- ═══════════════════════════════════════════════════════════════════════════
--  Analytical views — point dashboards here, not at the raw table.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── segment_summary: weighted KPIs by segment (R1–R4) ────────────────────────
-- Chart uses: bar of weighted_income, line of internet_pct across segments, etc.
CREATE OR REPLACE VIEW segment_summary AS
SELECT
    segment,
    COUNT(*)                                                                  AS households,
    ROUND((SUM(income * multiplier) / NULLIF(SUM(multiplier), 0))::numeric, 2) AS weighted_income,
    ROUND(AVG(income)::numeric, 2)                                            AS avg_income,
    ROUND(AVG(food_spend_pct)::numeric, 2)                                    AS avg_food_spend_pct,
    ROUND(AVG(edu_spend_pct)::numeric, 2)                                     AS avg_edu_spend_pct,
    ROUND((AVG(has_internet::int) * 100)::numeric, 2)                         AS internet_pct,
    ROUND((AVG(does_online_purchase::int) * 100)::numeric, 2)                 AS online_purchase_pct,
    ROUND((AVG(has_pmay::int) * 100)::numeric, 2)                             AS pmay_pct,
    ROUND((AVG(has_ayushman::int) * 100)::numeric, 2)                         AS ayushman_pct,
    ROUND((AVG(has_ration_card::int) * 100)::numeric, 2)                      AS ration_pct,
    ROUND(AVG(hh_size)::numeric, 2)                                           AS avg_hh_size
FROM household
GROUP BY segment;

-- ── state_summary: weighted KPIs by state (for choropleth / bar) ─────────────
CREATE OR REPLACE VIEW state_summary AS
SELECT
    state,
    state_code,
    COUNT(*)                                                                  AS households,
    ROUND((SUM(income * multiplier) / NULLIF(SUM(multiplier), 0))::numeric, 2) AS weighted_income,
    ROUND(AVG(income)::numeric, 2)                                            AS avg_income,
    ROUND((AVG(has_internet::int) * 100)::numeric, 2)                         AS internet_pct,
    ROUND((AVG(does_online_purchase::int) * 100)::numeric, 2)                 AS online_purchase_pct,
    ROUND(AVG(lat)::numeric, 4)                                               AS centroid_lat,
    ROUND(AVG(lon)::numeric, 4)                                               AS centroid_lon
FROM household
GROUP BY state, state_code;

-- ── income_distribution: fixed-width buckets for histogram / bar chart ───────
CREATE OR REPLACE VIEW income_distribution AS
SELECT
    income_bucket,
    bucket_order,
    COUNT(*)                        AS households,
    ROUND(SUM(multiplier)::numeric, 2) AS weighted_households
FROM (
    SELECT
        multiplier,
        -- Labels are zero-padded so they sort lexicographically in Superset
        -- (the bar chart sorts x-axis alphabetically by default).
        CASE
            WHEN income < 3000 THEN '0000-2999'
            WHEN income < 3500 THEN '3000-3499'
            WHEN income < 4000 THEN '3500-3999'
            WHEN income < 4500 THEN '4000-4499'
            WHEN income < 5000 THEN '4500-4999'
            ELSE '5000+'
        END AS income_bucket,
        CASE
            WHEN income < 3000 THEN 1
            WHEN income < 3500 THEN 2
            WHEN income < 4000 THEN 3
            WHEN income < 4500 THEN 4
            WHEN income < 5000 THEN 5
            ELSE 6
        END AS bucket_order
    FROM household
) b
GROUP BY income_bucket, bucket_order;

-- ── district_segment_summary: state → district → segment hierarchy ───────────
-- Chart uses: treemap, sunburst, drill-down bar.
CREATE OR REPLACE VIEW district_segment_summary AS
SELECT
    state,
    state_code,
    district,
    district_code,
    segment,
    COUNT(*)                                          AS households,
    ROUND(AVG(income)::numeric, 2)                    AS avg_income,
    ROUND((AVG(has_internet::int) * 100)::numeric, 2) AS internet_pct
FROM household
GROUP BY state, state_code, district, district_code, segment;

-- ── household_monthly_trend: time-series of household creation / KPIs ────────
CREATE OR REPLACE VIEW household_monthly_trend AS
SELECT
    DATE_TRUNC('month', created_at)::DATE                     AS month,
    COUNT(*)                                                  AS households,
    ROUND(AVG(income)::numeric, 2)                            AS avg_income,
    ROUND((AVG(has_internet::int) * 100)::numeric, 2)         AS internet_pct,
    ROUND((AVG(does_online_purchase::int) * 100)::numeric, 2) AS online_purchase_pct
FROM household
GROUP BY DATE_TRUNC('month', created_at);

-- ── Validation Queries (run manually to verify data quality) ──────────────────
-- Segment distribution
--   SELECT * FROM segment_summary ORDER BY segment;
--
-- Weighted income by state
--   SELECT * FROM state_summary ORDER BY weighted_income DESC;
--
-- Income histogram
--   SELECT income_bucket, households
--   FROM income_distribution ORDER BY bucket_order;
--
-- Monthly trend
--   SELECT * FROM household_monthly_trend ORDER BY month;

-- ── Optional: Scale to 1M+ rows (uncomment and adjust generate_series) ─────────
-- Just change generate_series(1, 1000000) in the INSERT statement above

-- ── Optional: Promote views to MATERIALIZED VIEWs for heavy dashboards ────────
-- CREATE MATERIALIZED VIEW segment_summary_mv AS SELECT * FROM segment_summary;
-- CREATE UNIQUE INDEX ON segment_summary_mv (segment);
-- REFRESH MATERIALIZED VIEW CONCURRENTLY segment_summary_mv;
