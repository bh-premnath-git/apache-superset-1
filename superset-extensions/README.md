# Superset Extensions

This directory contains Superset Extensions framework packages (experimental, Superset 6.x).

## Current Extension

### `dashboard-chatbot/`

Chatbot assistant scaffold for dashboards.

**Key files**:
- `ARCHITECTURE.md` — Extension structure and build process
- `extension.json` — Extension manifest
- `Dockerfile.builder` — Multi-stage build for .supx bundle

**Wiki documentation**:
- `wiki/research/extension-development-guide.md`
- `wiki/research/dashboard-chatbot-extension.md`
- `wiki/assets/extension/extension.ext.my_org.dashboard_chatbot.md`

## Extension Lifecycle

⚠️ **Development stage**: Extension APIs may 404 even with `ENABLE_EXTENSIONS=True`.

Tracking issues:
- https://github.com/apache/superset/discussions/38607
- https://github.com/apache/superset/issues/34162

## Build System

1. `extension-builder` service runs `Dockerfile.builder`
2. Outputs `.supx` bundle to `extensions/bundles/`
3. `superset-runtime-seed` mounts and auto-discovers bundles
4. `ExtensionReconciler` validates and reports status

## Recommended Use

Use extensions for non-critical features. For critical data visualization, use **plugins** (statically bundled, more stable).

See: `wiki/research/plugins-vs-extensions.md`
