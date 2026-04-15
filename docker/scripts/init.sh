#!/usr/bin/env bash
set -euo pipefail

# Wait until Postgres is accepting TCP connections before running one-time
# Superset metadata initialization.
echo "[init] Waiting for metadata DB at ${METADATA_DB_HOST}:${METADATA_DB_PORT}..."
python - <<'PY'
import os
import socket
import time

host = os.environ["METADATA_DB_HOST"]
port = int(os.environ["METADATA_DB_PORT"])

while True:
    try:
        with socket.create_connection((host, port), timeout=2):
            break
    except OSError:
        time.sleep(2)
PY
echo "[init] Metadata DB is ready."

wait_for_tcp() {
  local host="$1"
  local port="$2"
  local label="$3"
  echo "[init] Waiting for ${label} at ${host}:${port}..."
  python - "$host" "$port" <<'PY'
import socket
import sys
import time

host = sys.argv[1]
port = int(sys.argv[2])

while True:
    try:
        with socket.create_connection((host, port), timeout=2):
            break
    except OSError:
        time.sleep(2)
PY
  echo "[init] ${label} is ready."
}

wait_for_tcp "${MYSQL_DB_HOST:-mysql-db}" "${MYSQL_DB_PORT:-3306}" "seed MySQL DB"
wait_for_tcp "${ANALYTICS_DB_HOST:-analytics-db}" "${ANALYTICS_DB_PORT:-5432}" "seed analytics DB"

echo "[init] Running database migrations..."
superset db upgrade

echo "[init] Ensuring admin user exists..."
superset fab create-admin \
  --username "${SUPERSET_ADMIN_USERNAME}" \
  --firstname Admin \
  --lastname User \
  --email "${SUPERSET_ADMIN_EMAIL}" \
  --password "${SUPERSET_ADMIN_PASSWORD}" \
  2>/dev/null || echo "[init] Admin user already exists, skipping."

echo "[init] Initializing roles and permissions..."
superset init

if [[ -f /app/seed/import_datasources.yaml ]]; then
  echo "[init] Importing preconfigured seed connections and datasets..."
  superset import_datasources \
    -p /app/seed/import_datasources.yaml \
    -u "${SUPERSET_ADMIN_USERNAME}"

  echo "[init] Reconciling sales DB URI to mysql+pymysql for compatibility..."
python - <<'PY'
import os
import sys

from sqlalchemy.engine.url import make_url

from superset.app import create_app

username = os.environ["MYSQL_USER"]
password = os.environ["MYSQL_PASSWORD"]
host = os.getenv("MYSQL_DB_HOST", "mysql-db")
port = os.getenv("MYSQL_DB_PORT", "3306")
database_name = os.environ["MYSQL_DATABASE"]
expected_uri = f"mysql+pymysql://{username}:{password}@{host}:{port}/{database_name}"

app = create_app()
with app.app_context():
    from superset.extensions import db
    from superset.models.core import Database

    sales_db = (
        db.session.query(Database)
        .filter(Database.database_name == "sales")
        .one_or_none()
    )
    if sales_db is None:
        print("[init] Sales database metadata not found after import; skipping URI reconciliation.")
        sys.exit(0)

    # `sqlalchemy_uri` is stored with a masked password; the real password lives
    # in the separate encrypted `password` column. Compare on the driver +
    # hostname + database portion of the URL so we only rewrite when the stored
    # URI is missing the `+pymysql` driver suffix (or otherwise drifted).
    current = make_url(sales_db.sqlalchemy_uri)
    wanted = make_url(expected_uri)

    needs_update = (
        current.drivername != wanted.drivername
        or current.host != wanted.host
        or (current.port or 3306) != (wanted.port or 3306)
        or current.database != wanted.database
        or current.username != wanted.username
    )

    if needs_update:
        # Use the official setter so the password is extracted into the
        # encrypted `password` column and the stored URI keeps the driver
        # suffix (mysql+pymysql) with a masked password.
        sales_db.set_sqlalchemy_uri(expected_uri)
        db.session.commit()
        print(
            f"[init] Updated sales database URI to {sales_db.sqlalchemy_uri} "
            "(password stored encrypted)."
        )
    else:
        print("[init] Sales database URI already uses mysql+pymysql.")

    # Smoke-test the connection so any remaining driver/URI issues surface
    # during init rather than at first chart render. We resolve the URI
    # through `sqlalchemy_uri_decrypted` so we exercise the exact same
    # URL-reassembly path Superset uses when opening connections.
    from sqlalchemy import create_engine, text

    test_engine = create_engine(sales_db.sqlalchemy_uri_decrypted)
    with test_engine.connect() as conn:
        conn.execute(text("SELECT 1"))

        # The `world_map` viz expects ISO 3166-1 alpha-2 codes. The standard
        # alpha-2 for the United Kingdom is `GB`, not `UK`. Earlier seed data
        # used `UK`, which the world map plugin could not resolve. This
        # idempotent rewrite repairs already-populated MySQL volumes so the
        # UK customer renders on the world map without a volume wipe.
        result = conn.execute(
            text("UPDATE customers SET country = 'GB' WHERE country = 'UK'")
        )
        if result.rowcount:
            conn.commit()
            print(
                f"[init] Normalized {result.rowcount} customers.country "
                "value(s) from 'UK' to ISO 3166-1 alpha-2 'GB'."
            )
    test_engine.dispose()
    print("[init] Verified sales database connectivity via pymysql.")
PY
else
  echo "[init] No datasource import file found, skipping."
fi


if [[ -f /app/docker/scripts/seed_dashboard.py ]]; then
  echo "[init] Creating starter dashboard and charts from seed datasets..."
  python /app/docker/scripts/seed_dashboard.py
else
  echo "[init] Seed dashboard script not found, skipping."
fi

echo "[init] Superset metadata initialization completed."
