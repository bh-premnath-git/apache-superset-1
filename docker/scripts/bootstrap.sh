#!/usr/bin/env bash
set -euo pipefail

export FLASK_APP=superset
export SUPERSET_CONFIG_PATH="${SUPERSET_CONFIG_PATH:-/app/pythonpath/superset_config.py}"

if [[ "${1:-}" != "" ]]; then
  exec "$@"
fi

exec gunicorn \
  --bind "0.0.0.0:8088" \
  --workers "${GUNICORN_WORKERS:-3}" \
  --worker-class "${GUNICORN_WORKER_CLASS:-gthread}" \
  --timeout "${GUNICORN_TIMEOUT:-120}" \
  --limit-request-line 0 \
  --limit-request-field_size 0 \
  "superset.app:create_app()"
