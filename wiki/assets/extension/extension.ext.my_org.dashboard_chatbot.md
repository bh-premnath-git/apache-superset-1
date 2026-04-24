# extension.ext.my_org.dashboard_chatbot

## Purpose

Declarative registration metadata for the Dashboard Chatbot Assistant extension
(`.supx` bundle path/URL driven by environment).

## Source of truth
- File: `assets/extensions/chatbot_assistant.yaml`
- Kind: `Extension`
- Runtime key: `ext.my_org.dashboard_chatbot`
- Runtime name: `Dashboard Chatbot Assistant`

## Current runtime state

This asset is scaffolding-oriented in the current repository state:

- Extension support in Superset 6.x is still marked lifecycle `development`.
- Runtime availability depends on upstream endpoint support and feature flag behavior.

## Spec highlights

- Publisher/name/version: `my-org` / `dashboard-chatbot` / `0.1.0`
- Bundle location from env: `DASHBOARD_CHATBOT_SUPX_PATH`
  (optional URL alternative shown in YAML comments)
- Guarded by feature flag: `ENABLE_EXTENSIONS`
- Permissions: `can_read`

## Related files

- `assets/extensions/chatbot_assistant.yaml`
- `extensions/bundles/`
- `docker-compose.yml`

## Related pages

- [Dashboard chatbot extension note](../../research/dashboard-chatbot-extension.md)
- [Plugins vs Extensions](../../research/plugins-vs-extensions.md)
