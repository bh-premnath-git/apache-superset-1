# Keycloak login issues

This page lists the failures we have actually hit during the `bh-keycloak` cutover, with concrete fixes.

---

## 1. `Invalid parameter: redirect_uri`

**Symptom:** After clicking the Keycloak login on the Superset page, the Keycloak page shows `Invalid parameter: redirect_uri`.

**Cause:** The OIDC client in the target realm does not list Superset's callback URL.

**Fix (Admin UI):**

1. Open `http://localhost:8080`, sign in to `bh-keycloak`.
2. Realm: `master` (or the tenant realm).
3. Clients → `bighammer-admin` (or the dedicated `superset` client).
4. Add to **Valid redirect URIs**:

   ```text
   http://localhost:8088/oauth-authorized/keycloak
   ```

   Or the wider pattern for local dev:

   ```text
   http://localhost:8088/*
   ```

5. Save.

**Fix (kcadm.sh, no UI):**

```bash
CID=$(docker exec bh-keycloak-keycloak-1 /opt/keycloak/bin/kcadm.sh get clients -r master \
  -q clientId=bighammer-admin --fields id --format csv --noquotes | tail -n1)

docker exec bh-keycloak-keycloak-1 /opt/keycloak/bin/kcadm.sh update "clients/$CID" -r master \
  -s 'redirectUris=["http://localhost:8080/*","http://localhost:5001/*","https://localhost:8443/*","http://localhost:8088/*"]'
```

**Fix (persisted via `bh-keycloak/.env`):** add `http://localhost:8088/*` to `KEYCLOAK_REDIRECT_URIS`, then restart the keycloak container. Note this also recreates the `bighammer-admin` user with the script's default password.

---

## 2. Superset container cannot resolve `nginx` or `keycloak`

**Symptom:** Superset logs show `Temporary failure in name resolution` or `Name does not resolve` when calling Keycloak.

**Cause:** The Superset services are not joined to the same Docker network as `bh-keycloak`.

**Fix:**

```bash
# Check
docker inspect superset-app --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool

# Expected: both apache-superset-1_superset-net and shared_network present.
```

If `shared_network` is missing, ensure:

- The external network exists:

  ```bash
  docker network create shared_network 2>/dev/null || true
  ```

- The `.env` value matches: `KEYCLOAK_EXTERNAL_NETWORK=shared_network`.
- Recreate Superset services so they pick up the network:

  ```bash
  docker compose up -d --force-recreate superset
  ```

---

## 3. `502 Bad Gateway` from Keycloak nginx

**Symptom:** The OIDC discovery probe returns `502`, even though the nginx container is up.

**Cause:** Keycloak inside `bh-keycloak` is still warming up (DB schema migration on first boot). nginx is upstream-pointing at Keycloak, which is not yet listening.

**Fix:** Wait. On a fresh start, Keycloak takes 20-60 seconds. Re-probe:

```bash
docker exec superset-app curl -s -o /dev/null -w "%{http_code}\n" \
  http://nginx:8080/realms/master/.well-known/openid-configuration
```

If it stays `502`, check `bh-keycloak` directly:

```bash
docker compose -f /path/to/bh-keycloak/docker-compose.yml logs keycloak --tail 80
```

---

## 4. Superset login redirects to wrong realm

**Symptom:** You expected `realms/acme/...` but Superset redirects to `realms/master/...`.

**Cause:** Tenant resolver did not find your tenant key. Resolver order is (default):

1. `?tenant=` query
2. `X-Tenant-Key` header
3. subdomain
4. `tenant_key` cookie
5. fallback (`KEYCLOAK_DEFAULT_TENANT_KEY`, then `KEYCLOAK_REALM`)

**Fix:** Force the tenant explicitly while testing:

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" \
  "http://localhost:8088/login/keycloak?tenant=acme"
```

If you want a default for an environment, set `KEYCLOAK_DEFAULT_TENANT_KEY` in `.env`.

---

## 5. `Tenant is required` flash message

**Symptom:** Login redirects you back to the Superset login page with `Tenant is required. Use the tenant query parameter, X-Tenant-Key header, subdomain, or configure a fallback.`

**Cause:** `KEYCLOAK_TENANT_REQUIRED=true` (default) and no resolver matched.

**Fix:** Pick one of:

- Append `?tenant=<realm>` to the login URL.
- Set `KEYCLOAK_DEFAULT_TENANT_KEY=<realm>` in `.env`.
- Set `KEYCLOAK_TENANT_REQUIRED=false` to allow login without tenant context (will fall back to `KEYCLOAK_REALM`).

---

## 6. Token works but user is not Admin

**Symptom:** User signs in via Keycloak but gets a permission error inside Superset.

**Cause:** The custom security manager's role assignment did not run. This typically means `CUSTOM_SECURITY_MANAGER` is not loaded.

**Fix:**

- Confirm `superset_config.py` is mounted at `/app/pythonpath/superset_config.py` in the running container:

  ```bash
  docker exec superset-app ls -la /app/pythonpath
  ```

- Check `AUTH_TYPE` resolved at boot:

  ```bash
  docker exec superset-app python -c "from superset_config import AUTH_TYPE; print(AUTH_TYPE)"
  ```

  Expected: `4` (FAB constant for `AUTH_OAUTH`).

- Check `PYTHONPATH=/app/pythonpath` env is set on the container.

---

## 7. Double `/realms/.../protocol/openid-connect` in URLs

**Symptom:** Logs show URLs like `.../realms/master/protocol/openid-connect/realms/master/protocol/openid-connect/token` and token exchange fails.

**Cause:** `KEYCLOAK_API_BASE_URL` includes the realm/OIDC suffix and the code appends another one.

**Fix:** This is now handled by `keycloak_oidc_dynamic.normalize_keycloak_base()`, which strips both `…/realms/<realm>` and `…/realms/<realm>/protocol/openid-connect` suffixes. If you still see this, confirm the running container actually has the latest `keycloak_oidc_dynamic.py` mounted:

```bash
docker exec superset-app grep -n "normalize_keycloak_base" /app/pythonpath/keycloak_oidc_dynamic.py
```
