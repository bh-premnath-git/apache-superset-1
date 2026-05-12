# Extensions

Source: `assets/extensions/*.yaml`. Built `.supx` bundles live in `extensions/bundles/`.

## Current extensions

| Key | File | Source | Notes |
|---|---|---|---|
| `ext.my_org.dashboard_chatbot` | `chatbot_assistant.yaml` | `superset-extensions/dashboard-chatbot/` | Chatbot UI on dashboards |
| `ext.my_org.home_shell` | `home_shell.yaml` | `superset-extensions/home-shell/` | Pathways-style left sidebar replacing the Welcome page |

## Build pipeline

The two `extension-builder*` services in `docker-compose.yml` produce `.supx` bundles into `extensions/bundles/` using each extension's `Dockerfile.builder`. They are one-shot containers that exit after writing output.

`superset-runtime-seed` (entrypoint: `docker/scripts/reconciler_entrypoint.sh`) auto-discovers `*.supx` files at startup and exports the appropriate `*_SUPX_PATH` env vars before running the reconciler.

## Caveats

- Upstream extension framework is **lifecycle: development** in Superset 6.0/6.1 — the registration API may 404 even with `FEATURE_FLAGS["ENABLE_EXTENSIONS"] = True`. See [research/README.md](../../research/README.md).
- For production use cases today, prefer dynamic plugins or embedded dashboards over extensions.
