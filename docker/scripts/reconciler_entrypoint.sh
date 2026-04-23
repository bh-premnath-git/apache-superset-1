#!/bin/sh
# ─── Generic reconciler entrypoint ────────────────────────────────────────────
# Auto-discovers plugin bundle URLs from /plugin-dist/<plugin-name>/ directories.
# No plugin names are hardcoded; every plugin is discovered at runtime from the
# filesystem layout, and env vars are derived from directory names.
#
# Expected layout (populated by plugin-builder services):
#   /plugin-dist/state-district-pies/bundle-url.txt
#   /plugin-dist/custom-waterfall/bundle-url.txt
#
# Resolution per plugin (first match wins):
#   1. Env var already set externally (preserved)
#   2. /plugin-dist/<name>/bundle-url.txt (auto-discovered, exported as <NAME>_PLUGIN_BUNDLE_URL)
#   3. Skip — reconciler will log a clear message and continue
#
# See _resolve_bundle_url in seed_dashboard.py for the full resolution chain.
set -eu

# ── Plugin bundle auto-discovery ────────────────────────────────────────────
PLUGINS_DIR="${PLUGINS_DIR:-/plugin-dist}"

if [ -d "$PLUGINS_DIR" ]; then
  for plugin_dir in "$PLUGINS_DIR"/*; do
    [ -d "$plugin_dir" ] || continue  # Skip non-directories

    plugin_name="$(basename "$plugin_dir")"
    url_file="${plugin_dir}/bundle-url.txt"

    # Convert plugin-name to ENV_VAR_NAME (kebab → UPPER_SNAKE + suffix)
    # e.g., "state-district-pies" → "STATE_DISTRICT_PIES_PLUGIN_BUNDLE_URL"
    env_var="$(echo "$plugin_name" | tr '[:lower:]-' '[:upper:]_')_PLUGIN_BUNDLE_URL"

    current_val=$(eval echo "\${${env_var}:-}")
    if [ -n "$current_val" ]; then
      echo "[reconciler-entrypoint] ${env_var} preset (keeping existing)"
    elif [ -f "$url_file" ]; then
      val="$(cat "$url_file")"
      export "$env_var=$val"
      echo "[reconciler-entrypoint] ${env_var}=${val} (from ${url_file})"
    else
      echo "[reconciler-entrypoint] warning: ${url_file} missing; ${env_var} will not be set"
    fi
  done
else
  echo "[reconciler-entrypoint] note: ${PLUGINS_DIR} not found — no plugins to discover"
fi

# ── Extension bundle auto-discovery ──────────────────────────────────────────
EXTENSIONS_DIR="${EXTENSIONS_DIR:-/app/extensions}"

if [ -d "$EXTENSIONS_DIR" ]; then
  for supx_file in "$EXTENSIONS_DIR"/*.supx; do
    [ -f "$supx_file" ] || continue  # Skip if no .supx files

    # Extract publisher and name from filename (my-org.name-0.1.0.supx)
    basename_supx="$(basename "$supx_file")"
    # Remove .supx extension
    name_version="${basename_supx%.supx}"
    # Remove version suffix (last -X.Y.Z part)
    publisher_name="$(echo "$name_version" | sed -E 's/-[0-9]+\.[0-9]+\.[0-9]+$//')"
    # Convert to env var name (my-org.name → MY_ORG_NAME + _SUPX_PATH)
    env_var="$(echo "$publisher_name" | tr '[:lower:]-' '[:upper:]_')_SUPX_PATH"

    export "$env_var=$supx_file"
    echo "[reconciler-entrypoint] ${env_var}=${supx_file} (auto-discovered)"
  done
else
  echo "[reconciler-entrypoint] note: ${EXTENSIONS_DIR} not found — no extensions to discover"
fi

exec python -u /app/docker/scripts/seed_dashboard.py "$@"
