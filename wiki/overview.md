# Overview

This repository is a **GitOps-native control plane for Apache Superset**:

- Analytics assets (databases, datasets, charts, dashboards, extensions) are authored as YAML in `assets/` and continuously reconciled into a running Superset instance via REST.
- A custom Superset image bakes a viz plugin into the SPA and ships an MCP (Model Context Protocol) endpoint.
- Identity is delegated to an **external `bh-keycloak`** stack — there is no Keycloak inside this compose project.

## How to navigate this wiki

- Start with [Architecture](architecture/README.md) if you want a system-level view.
- Use [Runtime](runtime/README.md) when you are operating the stack day-to-day.
- Use [Identity and Auth](runtime/identity-and-auth.md) when you are wiring up a new tenant realm in `bh-keycloak`.
- Use [Troubleshooting](troubleshooting/README.md) when something is failing.
- Use [Reference](reference/README.md) for env vars, paths, and external links.

## Operating principles

| Principle | Practice |
|---|---|
| Declarative over imperative | Assets are YAML; runtime state is derived. |
| Idempotent | Reconciliation can be re-run safely. |
| External identity | Auth is owned by `bh-keycloak`, not this repo. |
| Admin-for-all (today) | All authenticated users get Superset Admin; this is a deliberate posture, not a bug. |
| Single source of build | The Superset image is built once by the `superset` service and reused via tag `apache-superset-1-superset:local`. |

## Non-goals

- Replacing Superset internals.
- Running an embedded IdP (removed in the recent migration — see [log.md](log.md)).
- Storing secrets in source YAML.
