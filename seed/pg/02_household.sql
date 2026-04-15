-- Sample household survey schema for Postgres (superset-analytics-db)
-- Connection URI: postgresql+psycopg2://sample_user:sample_pass@analytics-db:5432/analytics
-- Synthetic data with segment-aware distribution and weighted sampling

-- ── Schema ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS household (
    household_id       BIGSERIAL PRIMARY KEY,
    state              TEXT,
    district           TEXT,
    segment            TEXT, -- R1, R2, R3, R4
    
    income             NUMERIC,
    food_spend_pct     NUMERIC,
    edu_spend_pct      NUMERIC,

    has_internet       BOOLEAN,
    does_online_purchase BOOLEAN,

    social_category    TEXT, -- SC/ST/OBC/GEN
    hh_size            INT,

    has_pmay           BOOLEAN,
    has_ayushman       BOOLEAN,
    has_ration_card    BOOLEAN,

    multiplier         NUMERIC
);

-- ── Fast Bulk Data Generation (200K households) ───────────────────────────────
INSERT INTO household (
    state, district, segment,
    income, food_spend_pct, edu_spend_pct,
    has_internet, does_online_purchase,
    social_category, hh_size,
    has_pmay, has_ayushman, has_ration_card,
    multiplier
)
SELECT
    -- State distribution (5 states)
    (ARRAY['Bihar','MP','Jharkhand','UP','Odisha'])[floor(random()*5)+1],
    'District_' || (floor(random()*50)+1),

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

FROM (
    SELECT random() AS r
    FROM generate_series(1, 200000)
) t;

-- ── Indexes for Analytics Performance ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_household_segment ON household(segment);
CREATE INDEX IF NOT EXISTS idx_household_state ON household(state);
CREATE INDEX IF NOT EXISTS idx_household_income ON household(income);
CREATE INDEX IF NOT EXISTS idx_household_social_category ON household(social_category);
CREATE INDEX IF NOT EXISTS idx_household_has_internet ON household(has_internet);

-- ── Validation Queries (run manually to verify data quality) ──────────────────
-- Segment distribution
-- SELECT segment, COUNT(*) AS count, ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM household) * 100, 2) AS pct 
-- FROM household GROUP BY segment ORDER BY segment;

-- Weighted income by segment
-- SELECT 
--   segment,
--   ROUND(SUM(income * multiplier) / SUM(multiplier), 2) AS weighted_income,
--   ROUND(AVG(income), 2) AS avg_income
-- FROM household
-- GROUP BY segment ORDER BY segment;

-- Internet penetration by segment
-- SELECT 
--   segment,
--   ROUND(AVG(has_internet::int) * 100, 2) AS internet_pct,
--   ROUND(AVG(does_online_purchase::int) * 100, 2) AS online_purchase_pct
-- FROM household
-- GROUP BY segment ORDER BY segment;

-- Welfare scheme participation by segment
-- SELECT 
--   segment,
--   ROUND(AVG(has_pmay::int) * 100, 2) AS pmay_pct,
--   ROUND(AVG(has_ayushman::int) * 100, 2) AS ayushman_pct,
--   ROUND(AVG(has_ration_card::int) * 100, 2) AS ration_pct
-- FROM household
-- GROUP BY segment ORDER BY segment;

-- Social category distribution
-- SELECT social_category, COUNT(*) AS count FROM household GROUP BY social_category;

-- ── Optional: Scale to 1M+ rows (uncomment and adjust generate_series) ─────────
-- Just change generate_series(1, 1000000) in the INSERT statement above

-- ── Optional: Partitioning for large datasets (uncomment for production) ───────
-- CREATE TABLE household_partitioned (
--     household_id       BIGSERIAL,
--     state              TEXT,
--     district           TEXT,
--     segment            TEXT,
--     income             NUMERIC,
--     food_spend_pct     NUMERIC,
--     edu_spend_pct      NUMERIC,
--     has_internet       BOOLEAN,
--     does_online_purchase BOOLEAN,
--     social_category    TEXT,
--     hh_size            INT,
--     has_pmay           BOOLEAN,
--     has_ayushman       BOOLEAN,
--     has_ration_card    BOOLEAN,
--     multiplier         NUMERIC
-- ) PARTITION BY LIST (segment);

-- CREATE TABLE household_r1 PARTITION OF household_partitioned FOR VALUES IN ('R1');
-- CREATE TABLE household_r2 PARTITION OF household_partitioned FOR VALUES IN ('R2');
-- CREATE TABLE household_r3 PARTITION OF household_partitioned FOR VALUES IN ('R3');
-- CREATE TABLE household_r4 PARTITION OF household_partitioned FOR VALUES IN ('R4');

-- ── Optional: Materialized view for segment analytics (uncomment for production) ─
-- CREATE MATERIALIZED VIEW segment_summary AS
-- SELECT
--   segment,
--   COUNT(*) AS households,
--   ROUND(SUM(income * multiplier) / SUM(multiplier), 2) AS weighted_income,
--   ROUND(AVG(food_spend_pct), 2) AS avg_food_spend_pct,
--   ROUND(AVG(edu_spend_pct), 2) AS avg_edu_spend_pct,
--   ROUND(AVG(has_internet::int) * 100, 2) AS internet_pct,
--   ROUND(AVG(does_online_purchase::int) * 100, 2) AS online_purchase_pct
-- FROM household
-- GROUP BY segment;

-- CREATE UNIQUE INDEX ON segment_summary (segment);
-- REFRESH MATERIALIZED VIEW CONCURRENTLY segment_summary;
