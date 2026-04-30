import logging
import os
from typing import Any, Dict, List

import requests
from flask import session
from flask_appbuilder.security.sqla.models import Role
from superset.security import SupersetSecurityManager

from keycloak_oidc_dynamic import (
    SESSION_KEY,
    DynamicKeycloakAuthOAuthView,
    OidcTenantConfig,
    dynamic_enabled,
)

logger = logging.getLogger(__name__)

_INTERNAL_BASE = (
    os.getenv("KEYCLOAK_API_BASE_URL") or os.getenv("KEYCLOAK_SERVER_URL", "")
).rstrip("/")
_REALM = os.getenv("KEYCLOAK_REALM", "master")
_USERINFO_URL = f"{_INTERNAL_BASE}/realms/{_REALM}/protocol/openid-connect/userinfo"


class CustomSsoSecurityManager(SupersetSecurityManager):
    """Keycloak OAuth + optional multi-tenant dynamic OIDC (see keycloak_oidc_dynamic)."""

    authoauthview = DynamicKeycloakAuthOAuthView

    def _oauth_calculate_user_roles(self, userinfo) -> List[Role]:
        """Every Keycloak sign-in gets Superset Admin (ignores Keycloak role mappings)."""
        admin = self.find_role("Admin")
        if admin:
            return [admin]
        logger.warning("Admin role missing in DB; falling back to default OAuth role logic")
        return super()._oauth_calculate_user_roles(userinfo)

    def get_oauth_user_info(
        self, provider: str, resp: Dict[str, Any]
    ) -> Dict[str, Any]:
        if provider == "keycloak":
            access_token = resp.get("access_token", "")
            role_claim = os.getenv("KEYCLOAK_ROLE_CLAIM", "role_keys")
            userinfo_url = _USERINFO_URL

            if dynamic_enabled():
                blob = session.get(SESSION_KEY)
                if blob:
                    cfg = OidcTenantConfig.from_session_blob(blob)
                    role_claim = cfg.role_claim or role_claim
                    internal = (cfg.api_base_url or _INTERNAL_BASE).rstrip("/")
                    userinfo_url = (
                        f"{internal}/realms/{cfg.realm}/protocol/openid-connect/userinfo"
                    )

            me = requests.get(
                userinfo_url,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
            me.raise_for_status()
            data = me.json()
            logger.info("Keycloak user info: %s", data)

            keys = data.get(role_claim, [])
            if not keys and role_claim != "role_keys":
                keys = data.get("role_keys", [])
            if isinstance(keys, str):
                keys = [keys]

            return {
                "username": data.get("preferred_username", ""),
                "first_name": data.get("given_name", ""),
                "last_name": data.get("family_name", ""),
                "email": data.get("email", ""),
                "role_keys": keys,
            }
        return super().get_oauth_user_info(provider, resp)
