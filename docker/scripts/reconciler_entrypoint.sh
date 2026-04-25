#!/bin/sh
# ─── Reconciler entrypoint ────────────────────────────────────────────────────
# Bridges container-mounted bundles into the env-var contract that the seed
# script expects, then execs the seeder.
#
# History note: this script used to auto-discover dynamic-plugin bundles from
# ``/plugin-dist/<name>/bundle-url.txt``. That path is gone — viz plugins are
# now compiled into the SPA bundle by the frontend-builder stage of
# ./Dockerfile and statically registered in MainPreset.ts (see
# docker/frontend-build/register-plugin.mjs). No ``kind: Plugin`` YAMLs
# remain under ``assets/``, so there is nothing left to discover at runtime.
set -eu

# ── Extension bundle auto-discovery ──────────────────────────────────────────
EXTENSIONS_DIR="${EXTENSIONS_DIR:-/app/extensions}"

if [ -d "$EXTENSIONS_DIR" ]; then
  for supx_file in "$EXTENSIONS_DIR"/*.supx; do
    [ -f "$supx_file" ] || continue  # Skip if no .supx files

    # Extract extension name from filename (publisher.name-X.Y.Z.supx)
    basename_supx="$(basename "$supx_file")"
    # Remove .supx extension
    name_version="${basename_supx%.supx}"
    # Remove version suffix (last -X.Y.Z part) → "publisher.name"
    publisher_name="$(echo "$name_version" | sed -E 's/-[0-9]+\.[0-9]+\.[0-9]+$//')"
    # Extract just the name part after the dot (e.g., "dashboard-chatbot")
    ext_name="$(echo "$publisher_name" | cut -d'.' -f2)"
    # Convert to env var name (dashboard-chatbot → DASHBOARD_CHATBOT + _SUPX_PATH)
    env_var="$(echo "$ext_name" | tr '[:lower:]-' '[:upper:]_')_SUPX_PATH"

    export "$env_var=$supx_file"
    echo "[reconciler-entrypoint] ${env_var}=${supx_file} (auto-discovered)"
  done
else
  echo "[reconciler-entrypoint] note: ${EXTENSIONS_DIR} not found — no extensions to discover"
fi

exec python -u /app/docker/scripts/seed_dashboard.py "$@"
