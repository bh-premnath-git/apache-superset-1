#!/usr/bin/env bash
set -euo pipefail

# ── Wait for metadata DB to be ready ─────────────────────────────────────────
echo "[bootstrap] Waiting for metadata DB at ${METADATA_DB_HOST}:${METADATA_DB_PORT}..."
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
echo "[bootstrap] Metadata DB is ready."

# ── Run DB migrations ─────────────────────────────────────────────────────────
superset db upgrade

# ── Create admin user (idempotent) ───────────────────────────────────────────
superset fab create-admin \
  --username "${SUPERSET_ADMIN_USERNAME}" \
  --firstname Admin \
  --lastname User \
  --email "${SUPERSET_ADMIN_EMAIL}" \
  --password "${SUPERSET_ADMIN_PASSWORD}" \
  2>/dev/null || echo "[bootstrap] Admin user already exists, skipping."

# ── Initialize default roles and permissions ──────────────────────────────────
superset init

# ── Start Superset web server ─────────────────────────────────────────────────
exec gunicorn \
  --bind "0.0.0.0:8088" \
  --access-logfile - \
  --error-logfile - \
  --workers 4 \
  --worker-class gthread \
  --threads 20 \
  --timeout 120 \
  --limit-request-line 0 \
  --limit-request-field_size 0 \
  "superset.app:create_app()"
