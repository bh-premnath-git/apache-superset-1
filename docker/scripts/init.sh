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

echo "[init] Superset metadata initialization completed."
