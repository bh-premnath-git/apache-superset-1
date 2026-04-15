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
    elif sales_db.sqlalchemy_uri != expected_uri:
        sales_db.sqlalchemy_uri = expected_uri
        db.session.commit()
        print("[init] Updated sales database URI to mysql+pymysql.")
    else:
        print("[init] Sales database URI already uses mysql+pymysql.")
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
