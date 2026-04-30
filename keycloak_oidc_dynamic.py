"""
Dynamic Keycloak OIDC for multi-realm / multi-tenant setups.

Resolves tenant-specific realm, client credentials, and Keycloak base URLs
per login request (query param, header, subdomain, cookie, or fallback),
optional JSON file or HTTP registry, then patches the Authlib OAuth client
before authorize_redirect and authorize_access_token.

Environment (see superset_config.py header):
  KEYCLOAK_DYNAMIC_TENANTS — on by default; set false/0/no/off to use a single static realm only
  KEYCLOAK_TENANT_REGISTRY_JSON, KEYCLOAK_TENANT_REGISTRY_URL
  KEYCLOAK_TENANT_RESOLVERS, KEYCLOAK_TENANT_QUERY_PARAM, etc.
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import asdict, dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import flash, redirect, request, session
from flask_appbuilder import expose
from flask_appbuilder.security.views import AuthOAuthView

logger = logging.getLogger(__name__)

SESSION_KEY = "kc_oidc_ctx"

_FALSEY = frozenset({"0", "false", "no", "off"})


def dynamic_enabled() -> bool:
    """Multi-tenant Keycloak OIDC is enabled unless explicitly turned off."""
    raw = os.getenv("KEYCLOAK_DYNAMIC_TENANTS")
    if raw is None:
        return True
    s = raw.strip().lower()
    if not s:
        return True
    return s not in _FALSEY


@dataclass
class OidcTenantConfig:
    tenant_key: str
    realm: str
    client_id: str
    client_secret: str
    browser_base_url: str | None = None
    api_base_url: str | None = None
    redirect_uri: str | None = None
    role_claim: str | None = None

    def to_session_blob(self) -> dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}

    @classmethod
    def from_session_blob(cls, data: dict[str, Any]) -> OidcTenantConfig:
        return cls(
            tenant_key=str(data["tenant_key"]),
            realm=str(data["realm"]),
            client_id=str(data["client_id"]),
            client_secret=str(data.get("client_secret", "") or ""),
            browser_base_url=data.get("browser_base_url"),
            api_base_url=data.get("api_base_url"),
            redirect_uri=data.get("redirect_uri"),
            role_claim=data.get("role_claim"),
        )


def _global_browser_base() -> str:
    return (os.getenv("KEYCLOAK_SERVER_URL") or "").rstrip("/")


def _global_internal_base() -> str:
    return (
        os.getenv("KEYCLOAK_API_BASE_URL")
        or os.getenv("KEYCLOAK_SERVER_URL")
        or ""
    ).rstrip("/")


_registry_cache: dict[str, Any] = {"data": None, "mtime": 0.0, "loaded_at": 0.0}


def _registry_cache_ttl() -> float:
    try:
        return float(os.getenv("KEYCLOAK_TENANT_REGISTRY_CACHE_SECONDS", "60"))
    except ValueError:
        return 60.0


def _load_registry_file() -> dict[str, Any] | None:
    path = os.getenv("KEYCLOAK_TENANT_REGISTRY_JSON", "").strip()
    if not path:
        return None
    try:
        mtime = os.path.getmtime(path)
    except OSError as e:
        logger.warning("Tenant registry file missing or unreadable %s: %s", path, e)
        return None
    if _registry_cache["data"] is not None and _registry_cache["mtime"] == mtime:
        return _registry_cache["data"]
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError("KEYCLOAK_TENANT_REGISTRY_JSON root must be an object")
    _registry_cache["data"] = data
    _registry_cache["mtime"] = mtime
    logger.info("Loaded Keycloak tenant registry from %s (%d keys)", path, len(data))
    return data


def _fetch_registry_http(tenant_key: str) -> dict[str, Any] | None:
    template = os.getenv("KEYCLOAK_TENANT_REGISTRY_URL", "").strip()
    if not template:
        return None
    url = template.format(tenant_key=tenant_key, tenant=tenant_key)
    ttl = _registry_cache_ttl()
    now = time.monotonic()
    cache_key = f"http:{url}"
    if (
        _registry_cache.get("http_key") == cache_key
        and _registry_cache.get("http_loaded_at", 0) + ttl > now
        and isinstance(_registry_cache.get("http_data"), dict)
    ):
        return _registry_cache["http_data"]

    headers = {"Accept": "application/json"}
    auth_hdr = os.getenv("KEYCLOAK_TENANT_REGISTRY_AUTH_HEADER", "").strip()
    if auth_hdr:
        name, _, value = auth_hdr.partition(":")
        headers[name.strip()] = value.strip()
    req = Request(url, headers=headers)
    try:
        with urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")
        payload = json.loads(body)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as e:
        logger.warning("HTTP tenant registry fetch failed %s: %s", url, e)
        return None
    if not isinstance(payload, dict):
        logger.warning("Tenant registry URL returned non-object JSON")
        return None
    _registry_cache["http_key"] = cache_key
    _registry_cache["http_data"] = payload
    _registry_cache["http_loaded_at"] = now
    return payload


def _merge_entry(tenant_key: str, entry: dict[str, Any] | None) -> OidcTenantConfig | None:
    if not entry:
        return None
    realm = entry.get("realm") or tenant_key
    cid = entry.get("client_id") or os.getenv("KEYCLOAK_CLIENT_ID", "")
    secret = entry.get("client_secret")
    if secret is None:
        secret = os.getenv("KEYCLOAK_CLIENT_SECRET", "")
    if not cid:
        return None
    return OidcTenantConfig(
        tenant_key=tenant_key,
        realm=str(realm),
        client_id=str(cid),
        client_secret=str(secret or ""),
        browser_base_url=entry.get("browser_base_url"),
        api_base_url=entry.get("api_base_url"),
        redirect_uri=entry.get("redirect_uri"),
        role_claim=entry.get("role_claim"),
    )


def resolve_oidc_config(tenant_key: str) -> OidcTenantConfig:
    """Resolve OIDC settings for a tenant_key (registry + env fallbacks)."""
    tk = tenant_key.strip()
    if not tk:
        raise ValueError("empty tenant key")

    reg = _load_registry_file()
    entry: dict[str, Any] | None = None
    if reg and tk in reg and isinstance(reg[tk], dict):
        entry = reg[tk]
    if entry is None:
        http_entry = _fetch_registry_http(tk)
        if http_entry:
            entry = http_entry

    merged = _merge_entry(tk, entry)
    if merged:
        return merged

    # Env-only: tenant_key is the Keycloak realm name (or alias)
    realm = tk
    cid = os.getenv("KEYCLOAK_CLIENT_ID", "")
    secret = os.getenv("KEYCLOAK_CLIENT_SECRET", "")
    if not cid:
        raise ValueError(
            f"No registry entry for tenant {tk!r} and KEYCLOAK_CLIENT_ID is unset"
        )
    return OidcTenantConfig(
        tenant_key=tk,
        realm=realm,
        client_id=cid,
        client_secret=secret,
    )


def _parse_resolvers() -> list[str]:
    raw = os.getenv(
        "KEYCLOAK_TENANT_RESOLVERS",
        "query,header,subdomain,cookie,fallback",
    )
    return [p.strip().lower() for p in raw.split(",") if p.strip()]


def _tenant_from_subdomain(host: str) -> str | None:
    base = os.getenv("KEYCLOAK_TENANT_SUBDOMAIN_BASE_HOST", "").strip().lower()
    if not base:
        return None
    h = (host or "").split(":")[0].lower()
    if not h.endswith("." + base) or h == base:
        return None
    return h[: -len("." + base)]


def resolve_tenant_key_from_request() -> str | None:
    for name in _parse_resolvers():
        if name == "query":
            qn = os.getenv("KEYCLOAK_TENANT_QUERY_PARAM", "tenant").strip() or "tenant"
            v = request.args.get(qn, type=str)
            if v:
                return v.strip()
        elif name == "header":
            hn = os.getenv("KEYCLOAK_TENANT_HEADER", "X-Tenant-Key").strip() or "X-Tenant-Key"
            v = request.headers.get(hn)
            if v:
                return v.strip()
        elif name == "subdomain":
            host = request.host or ""
            v = _tenant_from_subdomain(host)
            if v:
                return v.strip()
        elif name == "cookie":
            cn = os.getenv("KEYCLOAK_TENANT_COOKIE_NAME", "tenant_key").strip() or "tenant_key"
            v = request.cookies.get(cn)
            if v:
                return v.strip()
        elif name == "fallback":
            v = os.getenv("KEYCLOAK_DEFAULT_TENANT_KEY", "").strip()
            if v:
                return v
            v = os.getenv("KEYCLOAK_REALM", "").strip()
            if v:
                return v
        else:
            logger.debug("Unknown KEYCLOAK_TENANT_RESOLVERS entry: %s", name)
    return None


def _tenant_required() -> bool:
    raw = os.getenv("KEYCLOAK_TENANT_REQUIRED", "true")
    if raw is None:
        return True
    s = raw.strip().lower()
    if not s:
        return True
    return s not in _FALSEY


def apply_keycloak_remote_patch(remote: Any, cfg: OidcTenantConfig) -> None:
    """Patch Authlib Flask OAuth2 client in place for this realm/client."""
    browser = (cfg.browser_base_url or _global_browser_base()).rstrip("/")
    internal = (cfg.api_base_url or _global_internal_base()).rstrip("/")
    if not browser or not internal:
        raise ValueError("KEYCLOAK_SERVER_URL (and API base) must be set")
    realm = cfg.realm
    remote.client_id = cfg.client_id
    remote.client_secret = cfg.client_secret or ""
    remote.authorize_url = f"{browser}/realms/{realm}/protocol/openid-connect/auth"
    remote.access_token_url = f"{internal}/realms/{realm}/protocol/openid-connect/token"
    remote.api_base_url = f"{internal}/realms/{realm}/protocol/openid-connect"
    if cfg.redirect_uri:
        # Preserve scope and other kwargs from superset_config.
        ck = dict(remote.client_kwargs) if remote.client_kwargs else {}
        ck["redirect_uri"] = cfg.redirect_uri
        remote.client_kwargs = ck


class DynamicKeycloakAuthOAuthView(AuthOAuthView):
    """Runs tenant resolution + OAuth client patch for provider keycloak."""

    # Re-apply @expose on overrides — Flask-AppBuilder only registers routes from
    # decorated methods; without these, url_for('...login') raises BuildError.
    @expose("/login/")
    @expose("/login/<provider>")
    def login(self, provider: str | None = None):  # type: ignore[override]
        if provider == "keycloak" and dynamic_enabled():
            tenant_key = resolve_tenant_key_from_request()
            if not tenant_key and _tenant_required():
                flash(
                    "Tenant is required. Use the tenant query parameter, "
                    "X-Tenant-Key header, subdomain, or configure a fallback.",
                    "warning",
                )
                return redirect(self.appbuilder.get_url_for_login)
            if not tenant_key:
                return super().login(provider=provider)
            try:
                cfg = resolve_oidc_config(tenant_key)
                apply_keycloak_remote_patch(
                    self.appbuilder.sm.oauth_remotes["keycloak"], cfg
                )
                session[SESSION_KEY] = cfg.to_session_blob()
            except Exception as e:
                logger.exception("Keycloak tenant resolution failed")
                flash(f"Login configuration error: {e}", "error")
                return redirect(self.appbuilder.get_url_for_login)
        return super().login(provider=provider)

    @expose("/oauth-authorized/<provider>")
    def oauth_authorized(self, provider: str):  # type: ignore[override]
        if provider == "keycloak" and dynamic_enabled():
            blob = session.get(SESSION_KEY)
            if blob:
                try:
                    cfg = OidcTenantConfig.from_session_blob(blob)
                    apply_keycloak_remote_patch(
                        self.appbuilder.sm.oauth_remotes["keycloak"], cfg
                    )
                except Exception as e:
                    logger.exception("Failed to restore Keycloak OAuth client: %s", e)
                    flash("OAuth session was lost; try signing in again.", "warning")
                    return redirect(self.appbuilder.get_url_for_login)
        return super().oauth_authorized(provider=provider)
