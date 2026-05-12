# Change Log

Significant changes to the Superset Control Plane stack. Newest first.

---

## 2026-05-12 — External `bh-keycloak` cutover

Superset auth was migrated from an embedded Keycloak (in this compose project) to the external `bh-keycloak` stack.

### Changes

- Removed embedded Keycloak services from `docker-compose.yml`:
  - `keycloak-db`, `keycloak`, `keycloak-nginx`, `keycloak-bootstrap`.
  - Dropped `superset-init` dependency on `keycloak-bootstrap`.
  - Removed `x-keycloak-env` anchor and Keycloak named volumes.
- Added an external Docker network `bh-keycloak-net` mapped to `${KEYCLOAK_EXTERNAL_NETWORK:-shared_network}`.
- Attached every Superset runtime service (`superset-init`, `superset`, `celery-worker`, `celery-beat`, `mcp`, `superset-runtime-seed`) to that external network.
- Normalized Keycloak base URL handling via `keycloak_oidc_dynamic.normalize_keycloak_base()` so accidental `/realms/.../protocol/openid-connect` suffixes are tolerated.
- Updated `.env.example`:
  - `KEYCLOAK_API_BASE_URL=http://nginx:8080`
  - `KEYCLOAK_EXTERNAL_NETWORK=shared_network`
  - Removed embedded Keycloak DB/admin/bootstrap envs.
- Updated docs (`README.md`, `wiki/`).

### Deferred / deprecated (not deleted)

- `docker/scripts/bootstrap_keycloak.py`
- `docker/keycloak-nginx/`

These are vestigial and can be removed in a follow-up cleanup.

### Operational impact

- `bh-keycloak` must be running on the shared Docker network before Superset will accept logins.
- Each tenant realm in `bh-keycloak` must list `http://localhost:8088/oauth-authorized/keycloak` in its OIDC client's Valid Redirect URIs.
- All authenticated users still land as Superset `Admin` — no change to access policy.
