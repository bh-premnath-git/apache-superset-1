# Troubleshooting

Quick index of common failures and where to look.

| Symptom | Page |
|---|---|
| `Invalid parameter: redirect_uri` on Keycloak login screen | [keycloak-login.md](keycloak-login.md) |
| Superset login redirects to a wrong realm | [keycloak-login.md](keycloak-login.md) |
| Superset container cannot resolve `nginx` or `keycloak` host | [keycloak-login.md](keycloak-login.md) |
| `502 Bad Gateway` from Keycloak nginx during cold start | [keycloak-login.md](keycloak-login.md) |
| `superset-init` exits with errors | See `docker compose logs superset-init` |
| Reconciler not applying changes | See `docker compose logs superset-runtime-seed` |
| Charts render blank with map tiles | Check `TALISMAN_CONFIG` CSP `img-src`/`connect-src` in `superset_config.py` |

## General triage

```bash
# 1. Are containers up?
docker ps --format 'table {{.Names}}\t{{.Status}}'

# 2. Is bh-keycloak healthy?
docker ps | grep bh-keycloak

# 3. Can Superset reach Keycloak?
docker exec superset-app curl -s -o /dev/null -w "%{http_code}\n" \
  http://nginx:8080/realms/master/.well-known/openid-configuration

# 4. Tail recent errors
docker compose logs --since=10m | grep -E "ERROR|Traceback|connection refused|502"
```

If the OIDC discovery probe in step 3 returns anything other than `200`, the issue is upstream of Superset (network or `bh-keycloak` itself). See [keycloak-login.md](keycloak-login.md).
