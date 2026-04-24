# Research Note: Dashboard Chatbot Extension

_Last reviewed: 2026-04-24_

## Source

- Extension project: `superset-extensions/dashboard-chatbot/`
- Declarative asset: `assets/extensions/chatbot_assistant.yaml`
- Bundle output path: `extensions/bundles/`

## Purpose

Package dashboard chatbot functionality as a Superset extension bundle (`.supx`) that can be registered and managed through the extension lifecycle.

## Build path in this repo

- `extension-builder` service in `docker-compose.yml` builds the extension artifact.
- Output is written to `extensions/bundles/` for runtime discovery/registration.

## Operational notes

- Extension support can vary by Superset version and feature maturity.
- Keep extension docs explicit about required feature flags and APIs.
- Prefer graceful degradation when extension endpoints are unavailable.

## Validation checklist

1. Confirm `.supx` exists in `extensions/bundles/` after build.
2. Confirm reconcile logs show extension asset discovery.
3. Confirm runtime registration/apply step succeeds.
4. Confirm dashboard UI loads without extension-related JS errors.
