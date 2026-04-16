-- Ethereum daily transaction value series (analytics-db)
-- Source CSV is sibling `eth_txn.csv` in this directory. Docker mounts
-- ./seed/pg into /docker-entrypoint-initdb.d, so both this script and the
-- CSV are available server-side when Postgres runs the init scripts.
--
-- The original CSV header is "Date(UTC)","UnixTimeStamp","Value" with dates
-- in M/D/YYYY form. We stage the CSV as text, then parse the date via
-- TO_DATE so the fact table has a real DATE column suitable for time-grain
-- bucketing in Superset charts.

CREATE TABLE IF NOT EXISTS eth_txn (
    txn_date  DATE    PRIMARY KEY,
    unix_ts   BIGINT  NOT NULL,
    value     BIGINT  NOT NULL
);

CREATE TEMP TABLE _eth_txn_staging (
    txn_date_str TEXT,
    unix_ts      BIGINT,
    value        BIGINT
) ON COMMIT DROP;

COPY _eth_txn_staging (txn_date_str, unix_ts, value)
FROM '/docker-entrypoint-initdb.d/eth_txn.csv'
WITH (FORMAT csv, HEADER true);

INSERT INTO eth_txn (txn_date, unix_ts, value)
SELECT TO_DATE(txn_date_str, 'MM/DD/YYYY'), unix_ts, value
FROM _eth_txn_staging
ON CONFLICT (txn_date) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_eth_txn_date ON eth_txn (txn_date);
