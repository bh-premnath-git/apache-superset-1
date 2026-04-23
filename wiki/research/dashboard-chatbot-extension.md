# Dashboard Chatbot Extension Research

## Goal
Add a chatbot experience alongside Superset dashboards in this project, with the least operational risk.

## What we checked

### Upstream Superset status (internet)
- Embedding is production-ready via `@superset-ui/embedded-sdk`, guest tokens, and `EMBEDDED_SUPERSET`.
- Superset extension framework is available in docs, but still lifecycle-development and not broadly proven in released runtime stacks.
- Security API endpoints needed for embedding/session flows are available (`/api/v1/security/login`, `/api/v1/security/csrf_token/`, `/api/v1/security/guest_token/`).

### Current repo status (local)
- This repo now includes a concrete chatbot extension scaffold source tree under `extensions/dashboard-chatbot/` (backend + frontend entrypoints).
- This repo already treats extensions as forward-looking and skips safely when extension API support is missing.
- A concrete extension template already exists at `assets/extensions/query_optimizer.yaml` with warning comments and env-injected bundle path.
- Dynamic plugins are considered the practical mechanism today in this repo's wiki.


## Important clarification
`assets/extensions/chatbot_assistant.yaml` is **registration metadata only**.
It cannot create extension UI/backend code by itself. A working chatbot extension requires a built `.supx` package from real source code (frontend and/or backend) using the official Extensions CLI workflow.

## Official extension development flow (from Superset docs)
1. `pip install apache-superset-extensions-cli`
2. `superset-extensions init dashboard-chatbot`
3. Implement frontend/backend in generated folders.
4. `superset-extensions build`
5. `superset-extensions bundle` (produces `.supx`)
6. Place the built artifact at `extensions/bundles/my-org.dashboard-chatbot-0.1.0.supx` (mounted to `/app/extensions/...` in Compose).
7. Point repo env (`DASHBOARD_CHATBOT_SUPX_PATH` or `_URL`) to that bundle so the YAML can register it.

See local implementation guide: `extensions/dashboard-chatbot/README.md` and bootstrap helper script: `docker/scripts/scaffold_chatbot_extension.sh`.

## Recommendation

### Short answer
For a **dashboard chatbot now**, use a **host-app sidecar chatbot** around an **embedded Superset dashboard**. Do not block on `.supx` extension runtime maturity.

### Why
- Embedding has clear, current docs and API surface.
- This repo already documents extension runtime uncertainty and defensive skip behavior.
- The chatbot mostly needs dashboard context + query tooling, which can live in a host app without modifying Superset core.

## Proposed architecture for this repo

1. Build a lightweight web host (e.g., Next.js/Flask UI) that embeds Superset dashboard iframe via Embedded SDK.
2. Add right-side chatbot panel in host UI.
3. Backend service mints Superset guest tokens and brokers LLM calls.
4. Pass dashboard context to chatbot:
   - dashboard UUID / slug
   - active filter state (state, district, segment)
   - user role / tenant metadata
5. Chatbot executes read-only actions:
   - summarize visible charts
   - answer filter-aware questions
   - suggest next drill-downs
6. Optional phase 2: when Superset extension runtime is stable in released versions, move UI integration into a true `.supx` extension.

## Minimal implementation plan

### Phase 1 (recommended now)
- Enable `EMBEDDED_SUPERSET` in Superset config.
- Create a backend endpoint in host app for guest token issuance.
- Embed `dashboard.household.survey` and add chatbot side panel.
- Start with retrieval over chart metadata and vetted SQL templates only.

### Phase 2 (later)
- Track Superset extension API maturity in upstream releases.
- Promote chatbot panel into a packaged extension asset once `/api/v1/extensions/` is production-ready.

## Risks and mitigations
- **Risk:** exposing raw SQL to LLM.
  - **Mitigation:** read-only service account + allowlisted queries/tools.
- **Risk:** token leakage in browser.
  - **Mitigation:** mint guest tokens server-side only; short TTL; refresh flow.
- **Risk:** extension APIs unavailable in target image.
  - **Mitigation:** keep integration in host app until extension runtime is stable.

## Repo-specific next steps
- Keep `assets/extensions/query_optimizer.yaml` as template/scaffolding.
- If desired, add a new `assets/extensions/chatbot_assistant.yaml` only as a disabled/template artifact (same cautionary pattern), while production rollout happens via embedding host app.

## Source links
- Superset embedding docs: https://superset.apache.org/user-docs/using-superset/embedding
- Superset feature flags (`ENABLE_EXTENSIONS`, `EMBEDDED_SUPERSET`): https://superset.apache.org/admin-docs/configuration/feature-flags/
- Superset security API overview (`csrf_token`, `guest_token`): https://superset.apache.org/docs/api/security
- Superset extensions overview: https://superset.apache.org/developer-docs/extensions/overview/
