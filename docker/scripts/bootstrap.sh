#!/usr/bin/env bash
set -euo pipefail

export FLASK_APP=superset
export SUPERSET_CONFIG_PATH="${SUPERSET_CONFIG_PATH:-/app/pythonpath/superset_config.py}"

if [[ "${1:-}" != "" ]]; then
  exec "$@"
fi

# --threads is REQUIRED with gthread. Without it, each worker runs a single
# thread, so 3 workers serve only 3 concurrent requests. The login page
# fans out into 6+ parallel asset requests (entry chunks, pwa-manifest,
# loader.gif, pwa icons), and once HTTP keep-alive holds those slots the
# remaining connections get reset (ERR_CONNECTION_RESET → white screen).
# Upstream apache/superset's docker bootstrap defaults to --threads 20.
exec gunicorn \
  --bind "0.0.0.0:8088" \
  --access-logfile '-' \
  --error-logfile '-' \
  --workers "${GUNICORN_WORKERS:-3}" \
  --worker-class "${GUNICORN_WORKER_CLASS:-gthread}" \
  --threads "${GUNICORN_THREADS:-20}" \
  --timeout "${GUNICORN_TIMEOUT:-120}" \
  --keep-alive "${GUNICORN_KEEPALIVE:-2}" \
  --limit-request-line 0 \
  --limit-request-field_size 0 \
  "superset.app:create_app()"
