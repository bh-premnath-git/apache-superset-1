-- Sample sales schema for MySQL (superset-mysql-db)
-- Connection URI: mysql+pymysql://sample_user:sample_pass@mysql-db:3306/sales

CREATE TABLE IF NOT EXISTS products (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(120)   NOT NULL,
    category    VARCHAR(60)    NOT NULL,
    unit_price  DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    first_name  VARCHAR(60)  NOT NULL,
    last_name   VARCHAR(60)  NOT NULL,
    country     VARCHAR(60)  NOT NULL,
    signup_date DATE         NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT            NOT NULL,
    product_id  INT            NOT NULL,
    quantity    INT            NOT NULL DEFAULT 1,
    amount      DECIMAL(10, 2) NOT NULL,
    order_date  DATE           NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (product_id)  REFERENCES products(id)
);

-- ── Seed data ─────────────────────────────────────────────────────────────────
INSERT INTO products (name, category, unit_price) VALUES
  ('Widget A',    'Electronics',  29.99),
  ('Widget B',    'Electronics',  49.99),
  ('Gadget Pro',  'Accessories',  19.99),
  ('Desk Chair',  'Furniture',   199.00),
  ('Standing Desk','Furniture',  499.00),
  ('USB Hub',     'Electronics',  24.99),
  ('Monitor Arm', 'Accessories',  59.99),
  ('Webcam HD',   'Electronics',  79.99);

INSERT INTO customers (first_name, last_name, country, signup_date) VALUES
  ('Alice',   'Johnson', 'US',  '2023-01-15'),
  ('Bob',     'Smith',   'GB',  '2023-03-20'),
  ('Carlos',  'García',  'MX',  '2023-05-10'),
  ('Diana',   'Lee',     'CA',  '2023-07-01'),
  ('Evan',    'Brown',   'AU',  '2023-08-22'),
  ('Fatima',  'Khan',    'IN',  '2023-09-14'),
  ('George',  'Müller',  'DE',  '2023-11-03'),
  ('Hina',    'Sato',    'JP',  '2024-01-18');

INSERT INTO orders (customer_id, product_id, quantity, amount, order_date) VALUES
  (1, 1, 2,  59.98, '2024-01-05'),
  (1, 3, 1,  19.99, '2024-01-12'),
  (2, 4, 1, 199.00, '2024-01-20'),
  (3, 2, 1,  49.99, '2024-02-03'),
  (3, 6, 2,  49.98, '2024-02-03'),
  (4, 5, 1, 499.00, '2024-02-15'),
  (5, 7, 1,  59.99, '2024-03-01'),
  (6, 8, 1,  79.99, '2024-03-10'),
  (7, 1, 3,  89.97, '2024-03-22'),
  (8, 2, 2,  99.98, '2024-04-05'),
  (1, 4, 1, 199.00, '2024-04-18'),
  (2, 8, 1,  79.99, '2024-05-02'),
  (5, 6, 3,  74.97, '2024-05-15'),
  (6, 3, 2,  39.98, '2024-06-01'),
  (7, 5, 1, 499.00, '2024-06-20');
