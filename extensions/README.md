# Extensions Bundles Directory

This directory contains built `.supx` extension bundles for the Superset Extensions framework.

## Current Extensions

| Extension | Source | Bundle | Status |
|-----------|--------|--------|--------|
| Dashboard Chatbot | `superset-extensions/dashboard-chatbot/` | `bundles/my-org.dashboard-chatbot-0.1.0.supx` | ⚠️ Source exists but not built |

## Building an Extension

Extensions must be built using the official Superset Extensions CLI:

```bash
pip install apache-superset-extensions-cli
superset-extensions build
superset-extensions bundle  # Produces .supx file
```

Then place the `.supx` file in `extensions/bundles/` and set the env var:

```bash
DASHBOARD_CHATBOT_SUPX_PATH=/app/extensions/my-org.dashboard-chatbot-0.1.0.supx
```

## Important Notes

- The Extensions API (`/api/v1/extensions/`) is **lifecycle: IN DEVELOPMENT** as of Superset 6.0/6.1
- Even with `ENABLE_EXTENSIONS: True`, the API may return 404 (see [GitHub Discussion #38607](https://github.com/apache/superset/discussions/38607))
- The reconciler will skip extension assets gracefully when the bundle is missing or API is unavailable
- For production use today, consider **Dynamic Plugins** (testing lifecycle, more stable) or **embedding** instead

## Related Files

- `assets/extensions/chatbot_assistant.yaml` - Registration metadata (skipped at runtime until built)
- `superset-extensions/dashboard-chatbot/` - Source code scaffold
- `docker-compose.yml` - Volume mount: `./extensions/bundles:/app/extensions:ro`
