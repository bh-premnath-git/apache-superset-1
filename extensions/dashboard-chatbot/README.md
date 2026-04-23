# Dashboard Chatbot Extension (Implementation Skeleton)

This folder documents the **actual extension build workflow** for a future
`.supx` chatbot package. The YAML asset (`assets/extensions/chatbot_assistant.yaml`)
only registers an already-built bundle; it does **not** generate extension code.

## In-repo implementation

This repo now includes an actual extension source scaffold under this folder:

```text
extensions/dashboard-chatbot/
├── extension.json
├── backend/src/my_org/dashboard_chatbot/entrypoint.py
└── frontend/src/index.tsx
```

- Backend currently exposes placeholder endpoints: `GET /health`, `POST /ask`.
- Frontend exports `mount(el)` with a minimal chatbot panel placeholder.

## Official workflow (Superset docs)

1. Install extension CLI:

   ```bash
   pip install apache-superset-extensions-cli
   ```

2. Scaffold extension source:

   ```bash
   superset-extensions init dashboard-chatbot
   ```

3. Implement frontend and/or backend features in the generated project:
   - frontend entry point: `frontend/src/index.tsx`
   - backend entry point: `backend/src/<publisher>/<name>/entrypoint.py`

4. Build production artifacts:

   ```bash
   superset-extensions build
   ```

5. Package `.supx`:

   ```bash
   superset-extensions bundle
   ```

6. Configure this repo to register the built artifact by setting one of:
   - `DASHBOARD_CHATBOT_SUPX_PATH`
   - `DASHBOARD_CHATBOT_SUPX_URL`

7. Re-run runtime seeding so `ExtensionReconciler` can attempt registration.
8. Verify extension endpoint once installed: `/extensions/my_org/dashboard_chatbot/health`.

## Suggested chatbot scope

- Frontend panel in dashboard or SQL Lab context.
- Backend extension API under `/extensions/<publisher>/<name>/...` for secure tool calls.
- Read-only data access and strict allowlists for SQL/question answering.

## Why this exists

The repo now has both:
- declarative registration (`assets/extensions/chatbot_assistant.yaml`), and
- concrete implementation instructions (this file)

so the extension path is actionable rather than YAML-only scaffolding.


## Where is the chatbot `.supx` file?
After running `superset-extensions bundle`, copy the generated artifact into:

- repo path: `extensions/bundles/my-org.dashboard-chatbot-0.1.0.supx`
- container path (mounted): `/app/extensions/my-org.dashboard-chatbot-0.1.0.supx`

Then set:

```bash
DASHBOARD_CHATBOT_SUPX_PATH=/app/extensions/my-org.dashboard-chatbot-0.1.0.supx
```

The optional `DASHBOARD_CHATBOT_SUPX_URL=...` variant is only for a remote
registry/CDN-hosted bundle.
