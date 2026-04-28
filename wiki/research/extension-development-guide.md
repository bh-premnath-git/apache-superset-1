# Extension Development Guide

## Location

`superset-extensions/dashboard-chatbot/`

## Architecture Overview

See: `superset-extensions/dashboard-chatbot/ARCHITECTURE.md`

## Frontend Structure

```
frontend/
├── src/
│   └── index.tsx          # Extension entry
├── package.json
├── tsconfig.json
└── webpack.config.js      # Builds remoteEntry.js
```

### Webpack Configuration

Outputs Module Federation bundle:
- `remoteEntry.js` - Exposed to Superset shell
- Must match Superset's Module Federation runtime version

### Extension Entry Point

```typescript
// src/index.tsx
export default function extensionEntry(container: HTMLElement, config: any) {
  // Render chatbot UI into container
}
```

## Backend Structure

```
backend/
├── src/
│   └── entrypoint.py      # Flask extension
└── pyproject.toml
```

### Backend Entry Point

```python
# src/entrypoint.py
from flask import Flask

def init_app(app: Flask) -> None:
    # Register routes, blueprints
    pass
```

## Build Process

### Step 1: Dockerfile.builder

```dockerfile
# Multi-stage build
FROM node:20 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/ .
RUN npm ci && npm run build

FROM python:3.11 AS backend-builder
WORKDIR /app/backend
COPY backend/ .
RUN pip install build && python -m build

# Combine into .supx
FROM alpine
COPY --from=frontend-builder /app/frontend/dist /frontend
COPY --from=backend-builder /app/backend/dist /backend
COPY extension.json /
RUN zip -r /output/my-org.dashboard-chatbot-0.1.0.supx .
```

### Step 2: Compose Integration

```yaml
extension-builder:
  build:
    context: ./superset-extensions/dashboard-chatbot
    dockerfile: Dockerfile.builder
  volumes:
    - ./extensions/bundles:/output
```

### Step 3: Runtime Discovery

`reconciler_entrypoint.sh` auto-discovers:
```bash
for supx_file in /app/extensions/*.supx; do
  export DASHBOARD_CHATBOT_SUPX_PATH="$supx_file"
done
```

## Extension vs Plugin Decision Matrix

| Use Case | Recommended |
|----------|-------------|
| Custom visualization | Plugin (static bundle) |
| Dashboard augmentation (chat, comments) | Extension |
| Critical data display | Plugin |
| Experimental features | Extension |

## Troubleshooting

### Extension not loading

Check `ENABLE_EXTENSIONS` feature flag:
```python
# superset_config.py
FEATURE_FLAGS = {"ENABLE_EXTENSIONS": True}
```

### Module Federation errors

Ensure Webpack `shared` config matches Superset's React version.

### 404 on extension endpoint

Upstream issue: https://github.com/apache/superset/issues/34162

## References

- Superset Extensions Discussion: https://github.com/apache/superset/discussions/38607
- Module Federation: https://module-federation.io/
