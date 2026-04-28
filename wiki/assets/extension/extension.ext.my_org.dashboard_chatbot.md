# Asset: `ext.my_org.dashboard_chatbot`

- Kind: `Extension`
- Source: `assets/extensions/chatbot_assistant.yaml`
- Display name: `Dashboard Chatbot Assistant`

## Spec summary

- `publisher: my-org`
- `extensionName: dashboard-chatbot`
- `version: 0.1.0`
- `supxPathFromEnv: DASHBOARD_CHATBOT_SUPX_PATH`
- `featureFlag: ENABLE_EXTENSIONS`
- `permissions: [can_read]`

## Build and runtime path

1. Source scaffold lives at `superset-extensions/dashboard-chatbot/`.
2. `extension-builder` creates `.supx` bundle into `extensions/bundles/`.
3. `reconciler_entrypoint.sh` auto-discovers `.supx` bundles and exports `*_SUPX_PATH` env vars.
4. Reconciler validates extension config and reports apply status.

## Caveat

Superset extensions are still development lifecycle in upstream 6.x; endpoint and loader behavior can vary between versions.
