-- Sample analytics schema for Postgres (superset-analytics-db)
-- Connection URI: postgresql+psycopg2://sample_user:sample_pass@analytics-db:5432/analytics

CREATE TABLE IF NOT EXISTS events (
    id          SERIAL PRIMARY KEY,
    session_id  UUID          NOT NULL,
    user_id     INT,
    event_name  VARCHAR(80)   NOT NULL,
    page        VARCHAR(120),
    referrer    VARCHAR(240),
    country     VARCHAR(60),
    device      VARCHAR(30),
    occurred_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_active_users (
    date        DATE    PRIMARY KEY,
    dau         INT     NOT NULL,
    new_users   INT     NOT NULL,
    sessions    INT     NOT NULL
);

-- ── Seed events ───────────────────────────────────────────────────────────────
INSERT INTO events (session_id, user_id, event_name, page, referrer, country, device, occurred_at) VALUES
  ('a1b2c3d4-0001-0000-0000-000000000001', 1,    'page_view',  '/home',      'google.com',   'US', 'desktop', NOW() - INTERVAL '30 days'),
  ('a1b2c3d4-0001-0000-0000-000000000001', 1,    'click',      '/pricing',   NULL,           'US', 'desktop', NOW() - INTERVAL '30 days' + INTERVAL '2 min'),
  ('a1b2c3d4-0002-0000-0000-000000000002', 2,    'page_view',  '/home',      'twitter.com',  'UK', 'mobile',  NOW() - INTERVAL '29 days'),
  ('a1b2c3d4-0002-0000-0000-000000000002', 2,    'sign_up',    '/register',  NULL,           'UK', 'mobile',  NOW() - INTERVAL '29 days' + INTERVAL '5 min'),
  ('a1b2c3d4-0003-0000-0000-000000000003', NULL, 'page_view',  '/blog',      'bing.com',     'CA', 'tablet',  NOW() - INTERVAL '28 days'),
  ('a1b2c3d4-0004-0000-0000-000000000004', 3,    'page_view',  '/home',      'direct',       'DE', 'desktop', NOW() - INTERVAL '27 days'),
  ('a1b2c3d4-0004-0000-0000-000000000004', 3,    'purchase',   '/checkout',  NULL,           'DE', 'desktop', NOW() - INTERVAL '27 days' + INTERVAL '8 min'),
  ('a1b2c3d4-0005-0000-0000-000000000005', 4,    'page_view',  '/home',      'google.com',   'IN', 'mobile',  NOW() - INTERVAL '26 days'),
  ('a1b2c3d4-0006-0000-0000-000000000006', 5,    'page_view',  '/features',  'linkedin.com', 'AU', 'desktop', NOW() - INTERVAL '25 days'),
  ('a1b2c3d4-0006-0000-0000-000000000006', 5,    'sign_up',    '/register',  NULL,           'AU', 'desktop', NOW() - INTERVAL '25 days' + INTERVAL '3 min'),
  ('a1b2c3d4-0007-0000-0000-000000000007', 6,    'page_view',  '/blog',      'google.com',   'JP', 'mobile',  NOW() - INTERVAL '20 days'),
  ('a1b2c3d4-0008-0000-0000-000000000008', 7,    'purchase',   '/checkout',  NULL,           'MX', 'desktop', NOW() - INTERVAL '15 days'),
  ('a1b2c3d4-0009-0000-0000-000000000009', 8,    'page_view',  '/home',      'twitter.com',  'FR', 'mobile',  NOW() - INTERVAL '10 days'),
  ('a1b2c3d4-0010-0000-0000-000000000010', 9,    'page_view',  '/pricing',   'google.com',   'US', 'desktop', NOW() - INTERVAL '5 days'),
  ('a1b2c3d4-0010-0000-0000-000000000010', 9,    'purchase',   '/checkout',  NULL,           'US', 'desktop', NOW() - INTERVAL '5 days' + INTERVAL '12 min');

-- ── Seed daily active users ───────────────────────────────────────────────────
INSERT INTO daily_active_users (date, dau, new_users, sessions) VALUES
  (CURRENT_DATE - 30, 120,  18, 145),
  (CURRENT_DATE - 29, 134,  22, 160),
  (CURRENT_DATE - 28, 118,  15, 138),
  (CURRENT_DATE - 27, 145,  30, 172),
  (CURRENT_DATE - 26, 152,  27, 188),
  (CURRENT_DATE - 25, 160,  33, 201),
  (CURRENT_DATE - 24, 108,   9, 120),
  (CURRENT_DATE - 23, 114,  11, 130),
  (CURRENT_DATE - 20, 170,  40, 215),
  (CURRENT_DATE - 15, 188,  45, 230),
  (CURRENT_DATE - 10, 195,  50, 244),
  (CURRENT_DATE -  5, 210,  55, 263),
  (CURRENT_DATE -  1, 225,  60, 280);

-- ── Index for common query patterns ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events (occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_event_name  ON events (event_name);
CREATE INDEX IF NOT EXISTS idx_events_country     ON events (country);
