# Research: Dashboard Chatbot Extension

## Current state

- Extension scaffold exists at `superset-extensions/dashboard-chatbot/`.
- Extension manifest exists at `superset-extensions/dashboard-chatbot/extension.json`.
- Declarative registration metadata exists at `assets/extensions/chatbot_assistant.yaml`.

## Build path

- Compose service `extension-builder` builds `.supx` bundle to `extensions/bundles/`.

## Runtime path

- `superset-runtime-seed` mounts `extensions/bundles` at `/app/extensions`.
- `reconciler_entrypoint.sh` discovers `.supx` files and exports `*_SUPX_PATH` vars.
- `ExtensionReconciler` validates configuration and bundle presence.

## Constraints

- Superset extension APIs/loaders are still evolving in 6.x.
- Treat extension as optional/experimental integration until upstream maturity.

## Practical guidance

- Keep extension docs and assets in place for future activation.
- Do not rely on extension path for critical dashboard rendering behavior.
