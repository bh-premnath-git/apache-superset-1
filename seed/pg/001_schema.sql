CREATE SCHEMA IF NOT EXISTS mart_sales;

CREATE TABLE IF NOT EXISTS mart_sales.orders (
  order_id BIGSERIAL PRIMARY KEY,
  order_date DATE NOT NULL,
  country TEXT NOT NULL,
  revenue NUMERIC(12, 2) NOT NULL
);

INSERT INTO mart_sales.orders (order_date, country, revenue)
SELECT d::date,
       (ARRAY['US', 'CA', 'GB', 'DE'])[1 + (random() * 3)::int],
       round((50 + random() * 5000)::numeric, 2)
FROM generate_series(date '2024-01-01', date '2024-12-31', interval '1 day') AS g(d)
ON CONFLICT DO NOTHING;
