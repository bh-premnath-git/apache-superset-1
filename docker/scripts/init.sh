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
