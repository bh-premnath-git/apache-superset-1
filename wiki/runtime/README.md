# Runtime

Day-to-day operations for the Superset stack.

## Bring-up

```bash
# 1. Ensure the external network exists
docker network create shared_network 2>/dev/null || true

# 2. Bring up bh-keycloak (separate repo). Wait for healthy.
( cd /path/to/bh-keycloak && docker compose up -d )

# 3. Bring up Superset
docker compose up --build -d
```

After services start:

| URL | Service |
|---|---|
| `http://localhost:8088` | Superset web |
| `http://localhost:8088/login/keycloak?tenant=master` | Force tenant-aware Keycloak login |
| `http://localhost:5008` | MCP HTTP endpoint |
| `http://localhost:5433` | Analytics Postgres (host port) |

## Status checks

```bash
# Compact one-line view
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

# Compose-aware status
docker compose ps

# Container can reach Keycloak OIDC discovery?
docker exec superset-app curl -s -o /dev/null -w "%{http_code}\n" \
  http://nginx:8080/realms/master/.well-known/openid-configuration

# Login redirect from Superset works?
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  "http://localhost:8088/login/keycloak?tenant=master"
```

## Logs

```bash
# Live logs across all services
docker compose logs -f --tail=200

# A single service
docker compose logs -f superset
docker compose logs -f superset-init
docker compose logs -f superset-runtime-seed

# Errors only (rough filter)
docker compose logs --since=10m | grep -E "ERROR|Traceback|connection refused|502"
```

## Rebuild / restart

```bash
# Rebuild image after Dockerfile / plugin / extension changes
docker compose build superset

# Recreate one service after config change
docker compose up -d --force-recreate superset

# Re-run reconciler against a running Superset
docker compose up -d superset-runtime-seed
```

## Reset

```bash
# Stop everything (keeps named volumes)
docker compose down

# Stop and wipe Superset state (metadata DB, redis, analytics seed)
docker compose down -v
```

## When `bh-keycloak` is restarted

Superset does not need a restart — it talks to Keycloak per request. Existing logged-in sessions may need to re-authenticate if the Keycloak session store was wiped.

## Common operational notes

- The `superset` service is the only builder for the `apache-superset-1-superset:local` tag. All other services consume that tag with `pull_policy: never` to avoid parallel rebuilds.
- The `extension-builder*` services are one-shot bundle builders. They exit after writing `.supx` to `extensions/bundles/`.
- The reconciler (`superset-runtime-seed`) runs `docker/scripts/reconciler_entrypoint.sh`, which loops over `assets/**/*.yaml`.
