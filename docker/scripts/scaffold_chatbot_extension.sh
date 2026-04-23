#!/usr/bin/env bash
set -euo pipefail

# Bootstrap helper for a real Superset extension project.
# Requires: pip install apache-superset-extensions-cli

EXT_NAME="dashboard-chatbot"

if ! command -v superset-extensions >/dev/null 2>&1; then
  echo "superset-extensions CLI not found. Install with:"
  echo "  pip install apache-superset-extensions-cli"
  exit 1
fi

if [ -d "$EXT_NAME" ]; then
  echo "Directory '$EXT_NAME' already exists; refusing to overwrite."
  exit 1
fi

superset-extensions init "$EXT_NAME"

echo
echo "Next steps:"
echo "  cd $EXT_NAME"
echo "  superset-extensions build"
echo "  superset-extensions bundle"
