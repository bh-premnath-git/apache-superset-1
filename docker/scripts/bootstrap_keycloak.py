import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

KEYCLOAK_INTERNAL_URL = os.getenv("KEYCLOAK_INTERNAL_URL", "http://keycloak:8080").rstrip("/")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "master")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "bighammer-admin")
KEYCLOAK_CLIENT_SECRET = os.getenv("KEYCLOAK_CLIENT_SECRET", "")
KEYCLOAK_REDIRECT_URI = os.getenv(
    "KEYCLOAK_REDIRECT_URI", "http://localhost:8088/oauth-authorized/keycloak"
)
KEYCLOAK_ADMIN = os.getenv("KEYCLOAK_ADMIN", "admin")
KEYCLOAK_ADMIN_PASSWORD = os.getenv("KEYCLOAK_ADMIN_PASSWORD", "password")
KEYCLOAK_BOOTSTRAP_USERNAME = os.getenv("KEYCLOAK_BOOTSTRAP_USERNAME", "superset-user")
KEYCLOAK_BOOTSTRAP_PASSWORD = os.getenv("KEYCLOAK_BOOTSTRAP_PASSWORD", "superset123")
KEYCLOAK_BOOTSTRAP_EMAIL = os.getenv("KEYCLOAK_BOOTSTRAP_EMAIL", "superset@example.com")
KEYCLOAK_BOOTSTRAP_ROLE = os.getenv("KEYCLOAK_BOOTSTRAP_ROLE", "superset_gamma")
KEYCLOAK_ROLE_CLAIM = os.getenv("KEYCLOAK_ROLE_CLAIM", "role_keys")
SUPERSET_ROLE_NAMES = ["superset_admin", "superset_alpha", "superset_gamma"]


def request(
    method: str,
    url: str,
    payload: dict[str, Any] | list[Any] | None = None,
    token: str | None = None,
) -> Any:
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode("utf-8")
        if not body:
            return None
        return json.loads(body)


def request_or_none(
    method: str,
    url: str,
    payload: dict[str, Any] | list[Any] | None = None,
    token: str | None = None,
) -> Any:
    try:
        return request(method, url, payload=payload, token=token)
    except urllib.error.HTTPError as ex:
        if ex.code == 404:
            return None
        raise


def wait_for_keycloak(timeout_seconds: int = 300) -> None:
    deadline = time.time() + timeout_seconds
    realm_url = f"{KEYCLOAK_INTERNAL_URL}/realms/master"
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(realm_url, timeout=10) as resp:
                if resp.status == 200:
                    print("Keycloak is healthy.")
                    return
        except Exception:
            pass
        time.sleep(5)
    raise RuntimeError("Keycloak did not become ready within timeout")


def get_admin_token() -> str:
    payload = urllib.parse.urlencode(
        {
            "client_id": "admin-cli",
            "grant_type": "password",
            "username": KEYCLOAK_ADMIN,
            "password": KEYCLOAK_ADMIN_PASSWORD,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        f"{KEYCLOAK_INTERNAL_URL}/realms/master/protocol/openid-connect/token",
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    token = body.get("access_token")
    if not token:
        raise RuntimeError("Unable to obtain Keycloak admin access token")
    return token


def ensure_realm_role(token: str, role_name: str) -> None:
    roles = request_or_none(
        "GET",
        f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/roles/{urllib.parse.quote(role_name)}",
        token=token,
    )
    if roles:
        print(f"Keycloak role already exists: {role_name}")
        return

    request(
        "POST",
        f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/roles",
        payload={"name": role_name},
        token=token,
    )
    print(f"Created Keycloak role: {role_name}")


def get_client_internal_id(token: str) -> str:
    query = urllib.parse.quote(KEYCLOAK_CLIENT_ID)
    clients = request(
        "GET",
        f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/clients?clientId={query}",
        token=token,
    ) or []
    if not clients:
        raise RuntimeError(f"Keycloak client not found after creation: {KEYCLOAK_CLIENT_ID}")
    return clients[0]["id"]


def ensure_role_mapper(token: str, client_id: str) -> None:
    mappers = request(
        "GET",
        f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/clients/{client_id}/protocol-mappers/models",
        token=token,
    ) or []
    mapper_name = "superset-role-keys"
    for mapper in mappers:
        if mapper.get("name") == mapper_name:
            request(
                "PUT",
                f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/clients/{client_id}/protocol-mappers/models/{mapper['id']}",
                payload={
                    "id": mapper["id"],
                    "name": mapper_name,
                    "protocol": "openid-connect",
                    "protocolMapper": "oidc-usermodel-realm-role-mapper",
                    "config": {
                        "multivalued": "true",
                        "userinfo.token.claim": "true",
                        "id.token.claim": "true",
                        "access.token.claim": "true",
                        "claim.name": KEYCLOAK_ROLE_CLAIM,
                        "jsonType.label": "String",
                    },
                },
                token=token,
            )
            print("Updated Keycloak role mapper: superset-role-keys")
            return

    payload = {
        "name": mapper_name,
        "protocol": "openid-connect",
        "protocolMapper": "oidc-usermodel-realm-role-mapper",
        "config": {
            "multivalued": "true",
            "userinfo.token.claim": "true",
            "id.token.claim": "true",
            "access.token.claim": "true",
            "claim.name": KEYCLOAK_ROLE_CLAIM,
            "jsonType.label": "String",
        },
    }
    request(
        "POST",
        f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/clients/{client_id}/protocol-mappers/models",
        payload=payload,
        token=token,
    )
    print("Created Keycloak role mapper: superset-role-keys")


def ensure_client(token: str) -> None:
    query = urllib.parse.quote(KEYCLOAK_CLIENT_ID)
    url = f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/clients?clientId={query}"
    clients = request("GET", url, token=token) or []
    redirect_uris = [KEYCLOAK_REDIRECT_URI]
    web_origins = sorted({"http://localhost:8088", "http://localhost:8080"})
    payload = {
        "clientId": KEYCLOAK_CLIENT_ID,
        "enabled": True,
        "protocol": "openid-connect",
        "publicClient": not bool(KEYCLOAK_CLIENT_SECRET),
        "secret": KEYCLOAK_CLIENT_SECRET or None,
        "redirectUris": redirect_uris,
        "webOrigins": web_origins,
        "standardFlowEnabled": True,
        "directAccessGrantsEnabled": True,
        "serviceAccountsEnabled": False,
        "attributes": {
            "post.logout.redirect.uris": "+",
        },
    }
    payload = {k: v for k, v in payload.items() if v is not None}

    if clients:
        client_id = clients[0]["id"]
        request(
            "PUT",
            f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/clients/{client_id}",
            payload=payload,
            token=token,
        )
        print(f"Updated Keycloak client: {KEYCLOAK_CLIENT_ID}")
        return

    request(
        "POST",
        f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/clients",
        payload=payload,
        token=token,
    )
    print(f"Created Keycloak client: {KEYCLOAK_CLIENT_ID}")


def get_user_internal_id(token: str) -> str | None:
    query = urllib.parse.quote(KEYCLOAK_BOOTSTRAP_USERNAME)
    url = f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/users?username={query}"
    users = request("GET", url, token=token) or []
    if not users:
        return None
    return users[0]["id"]


def ensure_user(token: str) -> None:
    query = urllib.parse.quote(KEYCLOAK_BOOTSTRAP_USERNAME)
    url = f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/users?username={query}"
    users = request("GET", url, token=token) or []
    payload = {
        "username": KEYCLOAK_BOOTSTRAP_USERNAME,
        "enabled": True,
        "email": KEYCLOAK_BOOTSTRAP_EMAIL,
        "emailVerified": True,
        "firstName": "Superset",
        "lastName": "User",
        "credentials": [
            {
                "type": "password",
                "value": KEYCLOAK_BOOTSTRAP_PASSWORD,
                "temporary": False,
            }
        ],
    }

    if users:
        user_id = users[0]["id"]
        request(
            "PUT",
            f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/users/{user_id}",
            payload=payload,
            token=token,
        )
        request(
            "PUT",
            f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/users/{user_id}/reset-password",
            payload=payload["credentials"][0],
            token=token,
        )
        print(f"Updated Keycloak user: {KEYCLOAK_BOOTSTRAP_USERNAME}")
        return

    request(
        "POST",
        f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/users",
        payload=payload,
        token=token,
    )
    print(f"Created Keycloak user: {KEYCLOAK_BOOTSTRAP_USERNAME}")


def assign_realm_role_to_user(token: str, user_id: str, role_name: str) -> None:
    role = request_or_none(
        "GET",
        f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/roles/{urllib.parse.quote(role_name)}",
        token=token,
    )
    if not role:
        raise RuntimeError(f"Keycloak role not found for assignment: {role_name}")
    existing = request(
        "GET",
        f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/users/{user_id}/role-mappings/realm",
        token=token,
    ) or []
    if any(item.get("name") == role_name for item in existing):
        print(f"Keycloak user already has role: {role_name}")
        return

    request(
        "POST",
        f"{KEYCLOAK_INTERNAL_URL}/admin/realms/{KEYCLOAK_REALM}/users/{user_id}/role-mappings/realm",
        payload=[
            {
                "id": role["id"],
                "name": role["name"],
            }
        ],
        token=token,
    )
    print(f"Assigned Keycloak role {role_name} to user {KEYCLOAK_BOOTSTRAP_USERNAME}")


def main() -> None:
    wait_for_keycloak()
    token = get_admin_token()
    for role_name in SUPERSET_ROLE_NAMES:
        ensure_realm_role(token, role_name)
    ensure_client(token)
    client_internal_id = get_client_internal_id(token)
    ensure_role_mapper(token, client_internal_id)
    ensure_user(token)
    user_internal_id = get_user_internal_id(token)
    if not user_internal_id:
        raise RuntimeError(f"Unable to find Keycloak user after creation: {KEYCLOAK_BOOTSTRAP_USERNAME}")
    assign_realm_role_to_user(token, user_internal_id, KEYCLOAK_BOOTSTRAP_ROLE)
    print("Keycloak bootstrap completed.")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as ex:
        body = ex.read().decode("utf-8", errors="ignore")
        raise SystemExit(f"Keycloak bootstrap HTTP error: {ex.code} {body}")
