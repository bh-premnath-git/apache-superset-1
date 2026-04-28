# Extension Architecture: dashboard-chatbot

## Overview

Superset Extension scaffold for adding a chatbot assistant to dashboards. Follows Superset Extensions framework (development lifecycle as of 6.x).

## Directory Structure

```
dashboard-chatbot/
├── frontend/             # Frontend extension (Module Federation)
│   ├── src/
│   │   └── index.tsx     # Extension entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── webpack.config.js # Builds remoteEntry.js
├── backend/              # Backend extension
│   ├── pyproject.toml
│   └── src/
│       └── entrypoint.py # Flask extension entry
├── extension.json        # Extension manifest
└── Dockerfile.builder    # Builds .supx bundle
```

## Extension Manifest (extension.json)

```json
{
  "publisher": "my-org",
  "name": "dashboard-chatbot",
  "version": "0.1.0",
  "displayName": "Dashboard Chatbot",
  "permissions": ["can_read"],
  "frontend": { "module": "./frontend/dist/remoteEntry.js" },
  "backend": { "module": "my_org.dashboard_chatbot.entrypoint" }
}
```

## Build Process

1. **Frontend build**: Webpack produces `remoteEntry.js` (Module Federation)
2. **Backend build**: Python package with `pyproject.toml`
3. **Bundle**: `Dockerfile.builder` creates `.supx` (zip of frontend + backend)
4. **Output**: `extensions/bundles/my-org.dashboard-chatbot-0.1.0.supx`

## Runtime Integration

```
superset-runtime-seed
  → mounts extensions/bundles/ → /app/extensions/
  → reconciler_entrypoint.sh discovers *.supx
  → exports DASHBOARD_CHATBOT_SUPX_PATH
  → ExtensionReconciler validates
```

## Superset Config Requirements

```python
FEATURE_FLAGS = {
    "ENABLE_EXTENSIONS": True  # Required for extension loading
}
EXTENSIONS_PATH = "/app/extensions"
```

## Lifecycle Caveats

| Aspect | Status |
|--------|--------|
| API stability | Development (Superset 6.x) |
| Endpoint availability | May 404 even with flag enabled |
| Production readiness | Use with caution; plugins preferred for critical features |

## Development Workflow

```bash
# Build extension
docker compose up extension-builder

# Verify bundle
docker compose logs superset-runtime-seed
```

## Reference Links

- Superset Extensions: https://github.com/apache/superset/discussions/38607
- Issue tracking: https://github.com/apache/superset/issues/34162
