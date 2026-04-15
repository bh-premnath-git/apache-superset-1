#!/usr/bin/env bash
set -euo pipefail

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
