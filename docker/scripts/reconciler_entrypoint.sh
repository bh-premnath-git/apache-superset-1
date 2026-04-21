#!/bin/sh
# Resolve STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL from the shared plugin-dist
# volume populated by the `plugin-builder` service, then exec the reconciler.
# If the file is missing, the reconciler will skip the plugin with a clear
# error (see _resolve_bundle_url in seed_dashboard.py).
set -eu

BUNDLE_URL_FILE=/plugin-dist/bundle-url.txt
if [ -n "${STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL:-}" ]; then
  echo "[reconciler-entrypoint] STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL preset=${STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL}"
elif [ -f "$BUNDLE_URL_FILE" ]; then
  STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL="$(cat "$BUNDLE_URL_FILE")"
  export STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL
  echo "[reconciler-entrypoint] STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL=${STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL}"
else
  echo "[reconciler-entrypoint] warning: ${BUNDLE_URL_FILE} missing; state_district_pies plugin will be skipped"
fi

exec python -u /app/docker/scripts/seed_dashboard.py "$@"
