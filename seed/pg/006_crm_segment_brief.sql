-- ============================================================================
-- CRM (Customer Readiness Metric) content layer
-- ----------------------------------------------------------------------------
-- The structural LCA segmentation in 002_lca_segment_views.sql is reframed
-- here for the FSP-facing CRM Segment Explorer (SBC Labs / Swadhaar, M1).
--
-- This file populates the *content* tables that the CRM dashboard reads
-- from — readiness tiers, per-segment FSP-facing names and personas,
-- Need / Access / Slack readiness pillars, product hypothesis, channel
-- hypothesis and channel activation ladder. None of this content lives
-- in the frontend; the home-shell extension fetches it from the backend.
--
-- Edit text columns directly to update copy. Re-running this file is
-- safe — every section TRUNCATEs and re-INSERTs.
-- ============================================================================

-- ── Tier definitions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS household.crm_tier (
    tier            INT  PRIMARY KEY,
    label           TEXT NOT NULL,
    tagline         TEXT NOT NULL,
    badge_color     TEXT NOT NULL,
    badge_bg        TEXT NOT NULL,
    chip_color      TEXT NOT NULL
);

TRUNCATE household.crm_tier;
INSERT INTO household.crm_tier (tier, label, tagline, badge_color, badge_bg, chip_color) VALUES
    (1, 'Tier 1 · Direct FSP uptake',
        'Ready for direct sale of credit, savings and discretionary insurance.',
        '#065f46', '#d1fae5', '#10b981'),
    (2, 'Tier 2 · Welfare bridge',
        'Activate via SHG / welfare ecosystem — JLG, micro-savings, embedded insurance.',
        '#1e3a8a', '#dbeafe', '#3b82f6'),
    (3, 'Tier 3 · Protection entry',
        'Lead with protection (PMJJBY / PMSBY / Ayushman top-up) before credit.',
        '#92400e', '#fef3c7', '#f59e0b'),
    (4, 'Tier 4 · System linkage precondition',
        'Public-system linkage required before any FSP product can land.',
        '#9d174d', '#fce7f3', '#ec4899');

-- ── Per-segment brief ─────────────────────────────────────────────────────
-- One row per LCA segment code (R1..U3). `tier` references crm_tier.
CREATE TABLE IF NOT EXISTS household.crm_segment_brief (
    segment             TEXT PRIMARY KEY,
    sort_order          INT  NOT NULL,
    name                TEXT NOT NULL,
    persona             TEXT NOT NULL,
    overview            TEXT NOT NULL,
    tier                INT  NOT NULL REFERENCES household.crm_tier(tier),
    product_headline    TEXT NOT NULL,
    product_body        TEXT NOT NULL,
    channel_headline    TEXT NOT NULL,
    channel_body        TEXT NOT NULL
);

TRUNCATE household.crm_segment_brief CASCADE;
INSERT INTO household.crm_segment_brief
    (segment, sort_order, name, persona, overview, tier,
     product_headline, product_body,
     channel_headline, channel_body)
VALUES
    ('R1', 1, 'Connected, asset-rich rural',
        'Diversified-income rural households with smartphone, regular bank use, owned assets.',
        'R1 households sit at the top of the rural readiness ladder in Bihar, MP and Jharkhand. They typically have a regular bank account, an active smartphone, and at least one durable asset (car, two-wheeler or pucca dwelling). Discretionary consumption is observable in their basket. They are the most direct FSP target in rural geographies — credit, savings and discretionary insurance can be sold to them without a welfare intermediary.',
        1,
        'Lead with credit and discretionary insurance',
        'Personal loans, two-wheeler / consumer durable EMI, term life and motor insurance can be sold direct. Cross-sell mutual fund SIPs through digital onboarding.',
        'Direct digital + agent network',
        'BC Sakhi for cash-in / cash-out support, app-based onboarding for credit and insurance. Branch visits used for high-ticket products only.'),
    ('R2', 2, 'Digitally engaged rural',
        'Mobile-active rural households with bank linkage but limited asset depth.',
        'R2 households are present on digital channels and have ration card / Jan Dhan linkages, but lack the asset depth of R1. They are typical SHG and JLG members. The right approach is to ride existing welfare infrastructure: extend SHG-linked credit, layer micro-savings and embedded micro-insurance, and use the SRLM ecosystem to activate.',
        2,
        'JLG credit + embedded micro-insurance',
        'Group-liability working-capital loans through the SRLM ecosystem; bundle PMJJBY / PMSBY at disbursement. Offer recurring deposits via BC Sakhi.',
        'SHG → SRLM → BC Sakhi',
        'Activate at the SHG meeting; route applications via SRLM block coordinator; cash-in / cash-out via BC Sakhi.'),
    ('R3', 3, 'Low-connectivity rural — system linkage precondition',
        'Off-grid rural households without internet, often without complete welfare linkage.',
        'R3 households lack reliable connectivity and digital footprint. Many do not yet have full welfare linkage (Aadhaar seeding, Jan Dhan, Ayushman). Direct FSP products will not land. Treat this segment as a system-linkage precondition: partner with ASHA, FPS and CSC to first complete welfare onboarding, then layer protection products through BC Sakhi.',
        4,
        'Protection only — after welfare linkage',
        'Once Aadhaar / Jan Dhan / Ayushman are in place, lead with PMJJBY, PMSBY and Ayushman top-up. Defer credit until R3 → R2 transition.',
        'Public ecosystem first, FSP second',
        'Use ASHA worker for outreach, Fair Price Shop (FPS) as anchor location, Common Service Centre (CSC) for digitisation, then BC Sakhi for product activation.'),
    ('R4', 4, 'Most constrained rural — protection entry',
        'Largest rural segment; minimal digital, asset-poor, dependent on welfare.',
        'R4 is the largest rural segment in the focus states. Households are asset-poor, have limited digital activity, and rely heavily on PDS and welfare transfers. They are typically banked (Jan Dhan) but have shallow product use. Lead with protection — accident, life and health micro-insurance — before any credit.',
        3,
        'Protection-first, then nano-savings',
        'Bundle PMJJBY + PMSBY at the BC Sakhi touchpoint. Layer recurring micro-savings via Jan Dhan. Defer credit until protection adoption is established.',
        'BC Sakhi led, FPS / SHG anchored',
        'BC Sakhi as primary FSP face; Fair Price Shop as anchor location; SHG meeting for trust-building. Ayushman card as service hook.'),
    ('U1', 5, 'Most constrained urban — protection entry',
        'Urban informal-sector households; casual labour, low asset base, mobile-present.',
        'U1 households are urban informal-sector workers — daily wage, casual labour, street vending. They are mobile-present but asset-poor and exposed to income volatility. They are reachable through CSCs and BC outlets in basti areas, and through the urban PDS shop. Lead with protection and short-cycle savings before credit.',
        3,
        'Micro-insurance + flexible savings',
        'PMJJBY / PMSBY at point of bank reactivation. Flexible-deposit products for income-smoothing. Micro-credit only after savings track record.',
        'Urban CSC + BC outlet',
        'Common Service Centre (CSC) for onboarding, BC outlet in basti for daily transactions, urban PDS shop as awareness anchor.'),
    ('U2', 6, 'Digitally engaged urban',
        'Urban semi-formal households with smartphone, partial bank use, growing asset base.',
        'U2 households are urban semi-formal — small shopkeepers, salaried-but-informal workers, gig economy. They have smartphones and bank accounts in active use. They are reachable through digital channels and through MFI / SFB branches. Lead with working-capital credit and bundled health insurance.',
        2,
        'Working-capital credit + health cover',
        'Small-ticket business loans via MFI / SFB; bundled hospi-cash and Ayushman top-up; UPI-linked savings for liquidity.',
        'MFI / SFB branch + app',
        'MFI loan officer for first contact; app for repeat servicing; bancassurance partner for health cover.'),
    ('U3', 7, 'Connected, asset-rich urban — direct FSP uptake',
        'Urban formal / semi-formal households with smartphone, bank, owned assets.',
        'U3 households in this CRM mapping are the most-ready urban segment for direct FSP uptake — they have a consistent banking relationship, a smartphone, and observable discretionary consumption. They are reachable directly through digital channels and bancassurance, with branch visits reserved for high-ticket products.',
        1,
        'Cross-sell: credit + insurance + investment',
        'Personal loan, credit card, term life, motor insurance, and SIP — all sold direct.',
        'Digital direct + bancassurance',
        'App-based onboarding for most products; branch for high-ticket; bancassurance partner for insurance bundle.');

-- ── Per-segment readiness pillars ────────────────────────────────────────
-- Three rows per segment: pillar in ('need','access','slack').
CREATE TABLE IF NOT EXISTS household.crm_segment_readiness (
    segment     TEXT NOT NULL REFERENCES household.crm_segment_brief(segment),
    pillar      TEXT NOT NULL CHECK (pillar IN ('need','access','slack')),
    rating      TEXT NOT NULL CHECK (rating IN ('High','Med','Low')),
    note        TEXT NOT NULL,
    PRIMARY KEY (segment, pillar)
);

TRUNCATE household.crm_segment_readiness;
INSERT INTO household.crm_segment_readiness (segment, pillar, rating, note) VALUES
    ('R1','need',  'Med',  'Existing bank linkages; demand is for product depth, not access.'),
    ('R1','access','High', 'Internet, mobile, bank — all infrastructure present.'),
    ('R1','slack', 'High', 'Discretionary spend room visible in MPCE.'),
    ('R2','need',  'High', 'Working-capital gaps for petty trade and agri inputs.'),
    ('R2','access','Med',  'Mobile present; intermittent connectivity; SHG linkage in place.'),
    ('R2','slack', 'Med',  'Some surplus visible after food and fuel.'),
    ('R3','need',  'High', 'Highest exposure to health and crop shocks; lowest cushion.'),
    ('R3','access','Low',  'No internet; intermittent feature-phone access only.'),
    ('R3','slack', 'Low',  'Subsistence consumption; no observable surplus.'),
    ('R4','need',  'High', 'High health-expenditure stress; high female-headed share.'),
    ('R4','access','Med',  'Jan Dhan present; limited mobile internet.'),
    ('R4','slack', 'Low',  'No discretionary surplus.'),
    ('U1','need',  'High', 'Income volatility; no formal social security.'),
    ('U1','access','Med',  'Mobile present; bank account often dormant.'),
    ('U1','slack', 'Low',  'Low margin between income and consumption.'),
    ('U2','need',  'High', 'Working-capital and health protection gaps.'),
    ('U2','access','High', 'Smartphone, bank, UPI in regular use.'),
    ('U2','slack', 'Med',  'Surplus visible but volatile.'),
    ('U3','need',  'Med',  'Demand is for product breadth (credit + investment + insurance).'),
    ('U3','access','High', 'Full digital + bank stack.'),
    ('U3','slack', 'High', 'Discretionary spend visible.');

-- ── Per-segment channel activation ladder ────────────────────────────────
CREATE TABLE IF NOT EXISTS household.crm_segment_channel_step (
    segment     TEXT NOT NULL REFERENCES household.crm_segment_brief(segment),
    step_order  INT  NOT NULL,
    label       TEXT NOT NULL,
    PRIMARY KEY (segment, step_order)
);

TRUNCATE household.crm_segment_channel_step;
INSERT INTO household.crm_segment_channel_step (segment, step_order, label) VALUES
    ('R1', 1, 'Digital app'),
    ('R1', 2, 'BC Sakhi'),
    ('R1', 3, 'Branch (high-ticket)'),
    ('R1', 4, 'Bancassurance'),
    ('R2', 1, 'SHG meeting'),
    ('R2', 2, 'SRLM block'),
    ('R2', 3, 'BC Sakhi'),
    ('R2', 4, 'JLG loan'),
    ('R2', 5, 'PMJJBY add-on'),
    ('R3', 1, 'ASHA'),
    ('R3', 2, 'FPS'),
    ('R3', 3, 'CSC'),
    ('R3', 4, 'BC Sakhi'),
    ('R3', 5, 'PMJJBY / PMSBY'),
    ('R4', 1, 'FPS'),
    ('R4', 2, 'SHG'),
    ('R4', 3, 'BC Sakhi'),
    ('R4', 4, 'PMJJBY / PMSBY'),
    ('R4', 5, 'Jan Dhan RD'),
    ('U1', 1, 'Urban PDS'),
    ('U1', 2, 'CSC'),
    ('U1', 3, 'BC outlet'),
    ('U1', 4, 'PMJJBY / PMSBY'),
    ('U1', 5, 'Flexible RD'),
    ('U2', 1, 'MFI loan officer'),
    ('U2', 2, 'SFB branch'),
    ('U2', 3, 'App'),
    ('U2', 4, 'Bancassurance'),
    ('U2', 5, 'UPI savings'),
    ('U3', 1, 'App'),
    ('U3', 2, 'Bancassurance'),
    ('U3', 3, 'Branch (high-ticket)'),
    ('U3', 4, 'Credit card cross-sell');

-- ── Data dimension catalog ────────────────────────────────────────────────
-- Curates which backend metric keys (from METRIC_CATALOG in
-- entrypoint.py) populate each of the four panels on the segment profile.
CREATE TABLE IF NOT EXISTS household.crm_data_dimension (
    dimension_key   TEXT PRIMARY KEY,
    sort_order      INT  NOT NULL,
    label           TEXT NOT NULL,
    blurb           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS household.crm_data_dimension_metric (
    dimension_key   TEXT NOT NULL REFERENCES household.crm_data_dimension(dimension_key),
    metric_key      TEXT NOT NULL,
    sort_order      INT  NOT NULL,
    PRIMARY KEY (dimension_key, metric_key)
);

TRUNCATE household.crm_data_dimension CASCADE;
INSERT INTO household.crm_data_dimension (dimension_key, sort_order, label, blurb) VALUES
    ('economic',      1, 'Economic',       'MPCE, food share, asset ownership.'),
    ('welfare',       2, 'Welfare',        'Ration card, school meals, government scheme uptake.'),
    ('digital',       3, 'Digital',        'Internet, mobile, online purchase activity.'),
    ('vulnerability', 4, 'Vulnerability',  'Social group, demographic exposure, education stock.');

TRUNCATE household.crm_data_dimension_metric;
INSERT INTO household.crm_data_dimension_metric (dimension_key, metric_key, sort_order) VALUES
    ('economic',      'possess_car',       1),
    ('economic',      'dwelling_type',     2),
    ('economic',      'cooking_energy',    3),
    ('welfare',       'ration_card',       1),
    ('welfare',       'ration_any',        2),
    ('welfare',       'meal_from_school',  3),
    ('digital',       'any_internet',      1),
    ('digital',       'possess_mobile',    2),
    ('digital',       'online_groceries',  3),
    ('digital',       'online_mobile',     4),
    ('vulnerability', 'social_group',      1),
    ('vulnerability', 'any_elderly',       2),
    ('vulnerability', 'any_child',         3),
    ('vulnerability', 'any_secondary',     4);

-- ── Joined view used by the backend /crm/segments endpoint ───────────────
CREATE OR REPLACE VIEW household.vw_crm_segment_brief AS
SELECT
    b.segment,
    b.sort_order,
    b.name,
    b.persona,
    b.overview,
    b.tier,
    t.label              AS tier_label,
    t.tagline            AS tier_tagline,
    t.badge_color        AS tier_badge_color,
    t.badge_bg           AS tier_badge_bg,
    t.chip_color         AS tier_chip_color,
    b.product_headline,
    b.product_body,
    b.channel_headline,
    b.channel_body,
    -- readiness pillars folded as JSON
    (
        SELECT jsonb_object_agg(r.pillar,
                                jsonb_build_object('rating', r.rating, 'note', r.note))
        FROM household.crm_segment_readiness r
        WHERE r.segment = b.segment
    ) AS readiness,
    -- channel ladder as ordered text array
    (
        SELECT array_agg(s.label ORDER BY s.step_order)
        FROM household.crm_segment_channel_step s
        WHERE s.segment = b.segment
    ) AS channel_ladder
FROM household.crm_segment_brief b
JOIN household.crm_tier t USING (tier);
