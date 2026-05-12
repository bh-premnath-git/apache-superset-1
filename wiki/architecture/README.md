# Architecture

This page describes the runtime topology of the Superset Control Plane after the external `bh-keycloak` cutover.

## At a glance

### Architecture overview

```mermaid
flowchart LR
    user[UserBrowser] --> superset[SupersetUI]
    superset --> mcp[MCPServer]
    superset --> meta[MetadataPostgres]
    superset --> redis[Redis]
    superset --> analytics[AnalyticsPostgres]
    superset --> seed[RuntimeSeed]
    superset -->|"redirect to login"| bhKc[bh_keycloak]
    bhKc -->|"auth code"| superset
    superset -->|"token / userinfo"| bhKc
```

### Login sequence

```mermaid
sequenceDiagram
    participant U as User
    participant S as Superset
    participant K as bh_keycloak
    U->>S: GET /login/keycloak?tenant=master
    S->>S: resolve tenant -> realm/client (keycloak_oidc_dynamic)
    S-->>U: 302 to bh-keycloak /auth
    U->>K: login at bh-keycloak
    K-->>U: 302 to /oauth-authorized/keycloak
    U->>S: callback with code
    S->>K: exchange code for token + userinfo
    S->>S: CustomSsoSecurityManager assigns Admin
    S-->>U: Superset session cookie
```

The detailed runtime topology, network attachments, and startup ordering follow.

## Service map

| Service | Image | Role |
|---|---|---|
| `superset` | `apache-superset-1-superset:local` | Web UI / API |
| `superset-init` | same image | One-shot DB migrate, init, admin user |
| `celery-worker` | same image | Async tasks |
| `celery-beat` | same image | Scheduled tasks (alerts, cache, prune) |
| `mcp` | same image | MCP server (`superset mcp run`) |
| `superset-runtime-seed` | same image | Continuous reconciler from `assets/` |
| `metadata-db` | `postgres:18-alpine` | Superset metadata Postgres |
| `analytics-db` | `postgres:18-alpine` | Sample analytics Postgres (LFS-seeded) |
| `redis` | `redis:8-alpine` | Celery broker + cache |
| `extension-builder` | local builder | Builds the `dashboard-chatbot` `.supx` |
| `extension-builder-home-shell` | local builder | Builds the `home-shell` `.supx` |

External dependency (provided by the `bh-keycloak` repo):

- `bh-keycloak-keycloak-1` (Keycloak server)
- `bh-keycloak-nginx-1` (TLS reverse proxy in front of Keycloak)
- `bh-keycloak-postgres-1` (Keycloak DB)

## Networks

| Network | Driver | Purpose |
|---|---|---|
| `superset-net` | bridge (project-scoped) | Internal Superset wiring |
| `bh-keycloak-net` | external (`shared_network`) | Reach `bh-keycloak` containers by hostname |

Every Superset runtime service is attached to both networks so Keycloak hostnames (`nginx`, `keycloak`) resolve from inside the Superset containers.

## Topology diagram

```mermaid
flowchart LR
    user[UserBrowser] -->|"http://localhost:8088"| superset[SupersetUI]
    user -->|"http://localhost:8080 (login)"| bhNginx[bh_keycloak_nginx]
    superset -->|"DB"| meta[MetadataPostgres]
    superset -->|"cache / broker"| redis[Redis]
    superset -->|"queries"| analytics[AnalyticsPostgres]
    superset --> mcp[MCPServer]
    seed[RuntimeSeed] -->|"REST reconcile"| superset
    celeryWorker[CeleryWorker] --> redis
    celeryBeat[CeleryBeat] --> redis
    superset -->|"token / userinfo"| bhNginx
    bhNginx --> bhKc[bh_keycloak]
    bhKc --> bhPg[bh_keycloak_postgres]
```

## Startup order

```mermaid
flowchart LR
    metaDb[metadata_db] --> init[superset_init]
    redisSvc[redis] --> init
    analyticsDb[analytics_db] --> init
    init --> superset[superset]
    init --> worker[celery_worker]
    init --> beat[celery_beat]
    superset --> mcp[mcp]
    superset --> seed[superset_runtime_seed]
    extBuilder[extension_builder] --> seed
    extBuilderHs[extension_builder_home_shell] --> seed
```

`superset-init` no longer waits on a Keycloak bootstrap — there is no embedded Keycloak in this stack. Auth is verified at request time against external `bh-keycloak`.

## Build pipeline

- The `superset` service is the canonical builder for the image tag `apache-superset-1-superset:local`.
- All other services that need this image use `image:` + `pull_policy: never` to avoid parallel rebuilds.
- The `frontend-builder` Docker stage compiles custom viz plugins from `superset-plugins/` into the SPA bundle. There is no runtime plugin loader (`FEATURE_FLAGS["DYNAMIC_PLUGINS"] = False`).

## External boundary

```mermaid
flowchart TB
    subgraph supersetStack ["Superset stack (this repo)"]
        s1[superset]
        s2[superset-runtime-seed]
        s3[mcp]
        s4[celery worker and beat]
    end
    subgraph bhKcStack ["bh-keycloak stack (separate repo)"]
        k1[nginx 8080 and 8443]
        k2[keycloak]
        k3[postgres]
    end
    sharedNet["shared_network external Docker network"]
    supersetStack --- sharedNet
    bhKcStack --- sharedNet
```

The Superset stack does not own the IdP lifecycle. Bringing `bh-keycloak` up/down is independent of `docker compose up` here.
