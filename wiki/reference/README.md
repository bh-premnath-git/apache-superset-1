# Reference

Quick lookup for environment variables, paths, and external links.

## Environment variables

### Superset core

| Variable | Default | Notes |
|---|---|---|
| `SUPERSET_SECRET_KEY` | (required) | Flask session key |
| `SUPERSET_ADMIN_USERNAME` | `admin` | Local admin user (created by `superset-init`) |
| `SUPERSET_ADMIN_PASSWORD` | `admin123` | Local admin password |
| `SUPERSET_ADMIN_EMAIL` | `admin@example.com` | Local admin email |
| `SUPERSET_APP_NAME` | `BigHammer` | Branding |
| `SUPERSET_URL` | `http://superset:8088` | Internal base URL for reconciler/MCP |
| `SUPERSET_CONFIG_PATH` | `/app/pythonpath/superset_config.py` | Mounted from repo |
| `PYTHONPATH` | `/app/pythonpath` | Adds mounted modules to import path |

### Metadata DB / cache / analytics

| Variable | Default | Notes |
|---|---|---|
| `METADATA_DB_USER` / `_PASS` / `_NAME` / `_HOST` / `_PORT` | `superset` / `superset` / `superset` / `metadata-db` / `5432` | Superset Postgres |
| `REDIS_HOST` / `REDIS_PORT` | `redis` / `6379` | Celery broker + cache |
| `ANALYTICS_DB_*` | sample defaults | Sample analytics Postgres |
| `ANALYTICS_DB_URI` | derived | Used by `assets/databases/analytics.yaml` |

### Keycloak (external `bh-keycloak`)

| Variable | Default | Notes |
|---|---|---|
| `KEYCLOAK_SERVER_URL` | `http://localhost:8080` | Browser-facing base URL |
| `KEYCLOAK_API_BASE_URL` | `http://nginx:8080` | Container-reachable base URL |
| `KEYCLOAK_REALM` | `master` | Static realm or fallback |
| `KEYCLOAK_CLIENT_ID` | `bighammer-admin` | OIDC client in target realm |
| `KEYCLOAK_CLIENT_SECRET` | `` | Empty for public clients |
| `KEYCLOAK_REDIRECT_URI` | `http://localhost:8088/oauth-authorized/keycloak` | Optional pinned callback |
| `KEYCLOAK_ROLE_CLAIM` | `role_keys` | Token claim for roles |
| `KEYCLOAK_DYNAMIC_TENANTS` | `true` | Per-tenant resolution on by default |
| `KEYCLOAK_TENANT_RESOLVERS` | `query,header,subdomain,cookie,fallback` | Resolver order |
| `KEYCLOAK_TENANT_QUERY_PARAM` | `tenant` | Query resolver name |
| `KEYCLOAK_TENANT_HEADER` | `X-Tenant-Key` | Header resolver name |
| `KEYCLOAK_TENANT_SUBDOMAIN_BASE_HOST` | (unset) | e.g., `app.example.com` |
| `KEYCLOAK_TENANT_COOKIE_NAME` | `tenant_key` | Cookie resolver name |
| `KEYCLOAK_DEFAULT_TENANT_KEY` | (unset) | Fallback tenant key |
| `KEYCLOAK_TENANT_REQUIRED` | `true` | Block login if no tenant resolves |
| `KEYCLOAK_TENANT_REGISTRY_JSON` | (unset) | Optional file mapping tenants → OIDC config |
| `KEYCLOAK_TENANT_REGISTRY_URL` | (unset) | Optional HTTP registry, supports `{tenant_key}` |
| `KEYCLOAK_TENANT_REGISTRY_CACHE_SECONDS` | `60` | Registry cache TTL |
| `KEYCLOAK_TENANT_REGISTRY_AUTH_HEADER` | (unset) | Auth header for registry HTTP fetch |
| `KEYCLOAK_OIDC_BOOTSTRAP_REALM` | `bootstrap-placeholder-realm` | Placeholder realm for FAB init |
| `KEYCLOAK_EXTERNAL_NETWORK` | `shared_network` | External Docker network to join |

### MCP

| Variable | Default | Notes |
|---|---|---|
| `MCP_PORT` | `5008` | Host port for MCP HTTP |
| `MCP_DEV_USERNAME` | `admin` | Dev impersonation user (no JWT validation) |
| `MCP_AUTH_ENABLED` | `False` | Set `True` for JWT-validated mode |
| `MCP_JWT_ALGORITHM` | `RS256` | JWT signing algorithm |
| `MCP_JWT_ISSUER` | (unset) | OIDC issuer URL for JWT validation |
| `MCP_JWT_AUDIENCE` | (unset) | Expected audience |
| `MCP_JWKS_URI` | (unset) | JWKS endpoint |
| `MCP_JWT_SECRET` / `MCP_JWT_PUBLIC_KEY` | (unset) | Static-key validation alternatives |

## Important paths

| Path | Purpose |
|---|---|
| `assets/**/*.yaml` | Declarative source for reconciler |
| `superset_config.py` | Mounted to `/app/pythonpath/` |
| `custom_sso_security_manager.py` | Mounted to `/app/pythonpath/` |
| `keycloak_oidc_dynamic.py` | Mounted to `/app/pythonpath/` |
| `seed/pg/*.sql` | Analytics DB seed |
| `seed/pg/HH.master.csv` | Git LFS data file |
| `extensions/bundles/*.supx` | Built Superset extension bundles |
| `superset-plugins/*` | Source for SPA-compiled viz plugins |
| `superset-extensions/*` | Source for `.supx` extensions |
| `docker/scripts/seed_dashboard.py` | Reconciler engine |
| `docker/scripts/reconciler_entrypoint.sh` | Reconciler entrypoint |
| `docker/scripts/init.sh` | Superset init / admin creation |

## Deprecated paths (kept on disk)

These are no longer wired into `docker-compose.yml` and can be removed in a follow-up cleanup:

- `docker/scripts/bootstrap_keycloak.py`
- `docker/keycloak-nginx/`

## External documentation

- [Apache Superset](https://superset.apache.org/docs/)
- [Apache Superset on Docker Compose](https://superset.apache.org/docs/installation/docker-compose)
- [Apache Superset configuration](https://superset.apache.org/docs/configuration/configuring-superset)
- [Superset MCP CLI (6.1+)](https://superset.apache.org/docs/configuration/setup-mcp-server)
- [Keycloak documentation](https://www.keycloak.org/documentation)
- [Keycloak OIDC client configuration](https://www.keycloak.org/docs/latest/server_admin/index.html#_oidc_clients)
- [Flask AppBuilder OAuth authentication](https://flask-appbuilder.readthedocs.io/en/latest/security.html#authentication-oauth)
- [Authlib Flask OAuth client](https://docs.authlib.org/en/latest/client/flask.html)
- [Git LFS](https://git-lfs.github.com/)
