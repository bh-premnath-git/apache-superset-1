#!/usr/bin/env bash
set -euo pipefail

export FLASK_APP=superset
export SUPERSET_CONFIG_PATH="${SUPERSET_CONFIG_PATH:-/app/pythonpath/superset_config.py}"

superset db upgrade

superset fab create-admin \
  --username "${SUPERSET_ADMIN_USERNAME:-admin}" \
  --firstname "Superset" \
  --lastname "Admin" \
  --email "${SUPERSET_ADMIN_EMAIL:-admin@example.com}" \
  --password "${SUPERSET_ADMIN_PASSWORD:-admin}" || true

superset init


echo "Superset initialization completed."
