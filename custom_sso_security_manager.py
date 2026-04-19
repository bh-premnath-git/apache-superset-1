import logging
import os
from typing import Any, Dict

import requests
from superset.security import SupersetSecurityManager

logger = logging.getLogger(__name__)

_INTERNAL_BASE = (
    os.getenv("KEYCLOAK_API_BASE_URL") or os.getenv("KEYCLOAK_SERVER_URL", "")
).rstrip("/")
_REALM = os.getenv("KEYCLOAK_REALM", "master")
_USERINFO_URL = f"{_INTERNAL_BASE}/realms/{_REALM}/protocol/openid-connect/userinfo"


class CustomSsoSecurityManager(SupersetSecurityManager):
    def get_oauth_user_info(
        self, provider: str, resp: Dict[str, Any]
    ) -> Dict[str, Any]:
        if provider == "keycloak":
            access_token = resp.get("access_token", "")
            me = requests.get(
                _USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
            me.raise_for_status()
            data = me.json()
            logger.info("Keycloak user info: %s", data)

            role_keys = data.get("role_keys", [])
            if isinstance(role_keys, str):
                role_keys = [role_keys]

            return {
                "username": data.get("preferred_username", ""),
                "first_name": data.get("given_name", ""),
                "last_name": data.get("family_name", ""),
                "email": data.get("email", ""),
                "role_keys": role_keys,
            }
        return super().get_oauth_user_info(provider, resp)
