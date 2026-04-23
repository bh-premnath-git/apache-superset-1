import os
from datetime import timedelta

from celery.schedules import crontab
from flask_appbuilder.security.manager import AUTH_OAUTH
from custom_sso_security_manager import CustomSsoSecurityManager


def env(key: str, default: str = "") -> str:
    return os.getenv(key, default)


SECRET_KEY = env("SUPERSET_SECRET_KEY", "please_change_me")
SQLALCHEMY_DATABASE_URI = (
    f"postgresql+psycopg2://{env('METADATA_DB_USER', 'superset')}:"
    f"{env('METADATA_DB_PASS', 'superset')}@"
    f"{env('METADATA_DB_HOST', 'metadata-db')}:"
    f"{env('METADATA_DB_PORT', '5432')}/"
    f"{env('METADATA_DB_NAME', 'superset')}"
)

REDIS_HOST = env("REDIS_HOST", "redis")
REDIS_PORT = env("REDIS_PORT", "6379")

class CeleryConfig:
    broker_url = f"redis://{REDIS_HOST}:{REDIS_PORT}/1"
    result_backend = f"redis://{REDIS_HOST}:{REDIS_PORT}/2"
    imports = (
        "superset.sql_lab",
        "superset.tasks.scheduler",
        "superset.tasks.thumbnails",
        "superset.tasks.cache",
    )
    worker_prefetch_multiplier = 1
    task_acks_late = False
    beat_schedule = {
        "reports.scheduler": {
            "task": "reports.scheduler",
            "schedule": crontab(minute="*", hour="*"),
        },
        "reports.prune_log": {
            "task": "reports.prune_log",
            "schedule": crontab(minute=0, hour=0),
        },
    }


CELERY_CONFIG = CeleryConfig

# Extensions path - directory where .supx bundles are loaded from
EXTENSIONS_PATH = "/app/extensions"

FEATURE_FLAGS = {
    "ALERT_REPORTS": True,
    "EMBEDDED_SUPERSET": True,
    "SQLLAB_BACKEND_PERSISTENCE": True,
    # Handlebars charts need <style> tags and inline styles to render.
    # ESCAPE_MARKDOWN_HTML must be False so HTML is not entity-escaped.
    # HTML_SANITIZATION must be True with schema extensions that whitelist
    # the <style> tag and style/class attributes.
    # See: https://github.com/apache/superset/issues/30381
    "ESCAPE_MARKDOWN_HTML": False,
    "HTML_SANITIZATION": True,
    # "Drill by" (pivot to another dimension) and "Drill to detail" (show
    # underlying rows) are GA since Superset 4.x and default-true since
    # https://github.com/apache/superset/pull/26637, but we set them
    # explicitly so the dashboard's "drill by on every chart" contract is
    # visible in config and survives upstream default changes.
    # Scope (Superset 6.0): the right-click menu exposes these on every
    # Echarts plugin (pie, bar, line, area, scatter, etc.), Table, Pivot
    # Table and World Map. Legacy deck.gl maps and Handlebars charts are
    # upstream exceptions and do not expose the context menu today.
    "DRILL_BY": True,
    "DRILL_TO_DETAIL": True,
    # ── Dynamic plugins ────────────────────────────────────────────────────
    # DYNAMIC_PLUGINS is intentionally DISABLED.  With the flag ON, Superset's
    # ``<DynamicPluginProvider>`` in superset-frontend/src/components/
    # DynamicPlugins/index.tsx starts with ``loading: true`` and fetches
    # ``/dynamic-plugins/api/read``.  On Superset 6.0/6.1 that endpoint 404s
    # even when the flag is on (apache/superset#35870, closed ``not planned``),
    # and the reducer has no FAILED branch — the catch only logs, so the
    # provider stays ``loading: true`` forever and every dashboard spins
    # indefinitely.
    #
    # Our only custom viz (state_district_pies) is not wired into any
    # dashboard — ``assets/dashboards/household_survey.yaml`` uses the
    # built-in ``cartodiagram`` viz instead.  So keeping the flag off is
    # correct and removes the hang.  Re-enable only when upstream fixes
    # #35870 AND a chart actually references a dynamic plugin viz type.
    "DYNAMIC_PLUGINS": False,
    # Extensions framework (development lifecycle) - required for chatbot extension
    # API may 404 even when enabled (upstream discussion #38607)
    "ENABLE_EXTENSIONS": True,
}

# Allow <style> tags and style/class attributes through the HTML sanitizer
# so that Handlebars styleTemplate CSS is applied instead of rendered as text.
HTML_SANITIZATION_SCHEMA_EXTENSIONS = {
    "attributes": {
        "*": ["style", "className", "class"],
    },
    "tagNames": ["style"],
}

MAPBOX_API_KEY = env("MAPBOX_API_KEY", "")
APP_NAME = env("SUPERSET_APP_NAME", "BigHammer")
APP_ICON = env("SUPERSET_APP_ICON", "/static/assets/images/logo.svg")
FAVICONS = [{"href": env("SUPERSET_APP_FAVICON", "/static/assets/images/logo.svg")}]
LOGO_RIGHT_TEXT = ""
LOGO_TARGET_PATH = "/"

# Superset 6: APP_ICON is deprecated for logo rendering.
# Use THEME_DEFAULT / THEME_DARK with brandLogoUrl instead.
THEME_DEFAULT = {
    "token": {
        "brandLogoUrl": "/static/assets/images/logo.svg",
        "brandLogoHref": "/",
        "colorPrimary": "#000000",
        "colorTextLightSolid": "#FFFFFF",
    },
}
THEME_DARK = {
    "token": {
        "brandLogoUrl": "/static/assets/images/logo.svg",
        "brandLogoHref": "/",
    },
    "algorithm": "dark",
}

# Optional Keycloak OAuth integration.
# KEYCLOAK_SERVER_URL: browser-facing URL (e.g., http://localhost:8080 for local dev)
# KEYCLOAK_API_BASE_URL: internal URL for server-to-server calls (e.g., http://keycloak:8080)
KEYCLOAK_SERVER_URL = env("KEYCLOAK_SERVER_URL")
KEYCLOAK_API_BASE_URL = env("KEYCLOAK_API_BASE_URL")
KEYCLOAK_REALM = env("KEYCLOAK_REALM")
KEYCLOAK_CLIENT_ID = env("KEYCLOAK_CLIENT_ID")
KEYCLOAK_CLIENT_SECRET = env("KEYCLOAK_CLIENT_SECRET")
KEYCLOAK_REDIRECT_URI = env("KEYCLOAK_REDIRECT_URI")
KEYCLOAK_ROLE_CLAIM = env("KEYCLOAK_ROLE_CLAIM", "role_keys")

if KEYCLOAK_SERVER_URL and KEYCLOAK_REALM and KEYCLOAK_CLIENT_ID:
    AUTH_TYPE = AUTH_OAUTH
    CUSTOM_SECURITY_MANAGER = CustomSsoSecurityManager
    AUTH_USER_REGISTRATION = True
    AUTH_USER_REGISTRATION_ROLE = "Admin"
    AUTH_ROLES_SYNC_AT_LOGIN = True
    AUTH_ROLES_MAPPING = {
        "superset_admin": ["Admin"],
        "superset_alpha": ["Alpha"],
        "superset_gamma": ["Gamma"],
    }

    # Use internal URL for server-to-server calls, browser URL for authorize redirect
    internal_base = (KEYCLOAK_API_BASE_URL or KEYCLOAK_SERVER_URL).rstrip("/")
    browser_base = KEYCLOAK_SERVER_URL.rstrip("/")

    OAUTH_PROVIDERS = [
        {
            "name": "keycloak",
            "token_key": "access_token",
            "icon": "fa-key",
            "remote_app": {
                "client_id": KEYCLOAK_CLIENT_ID,
                "client_secret": KEYCLOAK_CLIENT_SECRET,
                "api_base_url": f"{internal_base}/realms/{KEYCLOAK_REALM}/protocol/openid-connect",
                "access_token_url": f"{internal_base}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/token",
                "authorize_url": f"{browser_base}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/auth",
                "jwks_uri": f"{internal_base}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs",
                "userinfo_endpoint": f"{internal_base}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/userinfo",
                "client_kwargs": {"scope": "openid profile email roles"},
                # Note: server_metadata_url removed to prevent Keycloak from overriding
                # our explicit URLs with its advertised hostname
            },
        }
    ]

    OAUTH_PROVIDERS[0]["remote_app"]["redirect_uri"] = KEYCLOAK_REDIRECT_URI
    OAUTH_PROVIDERS[0]["remote_app"]["role_keys"] = KEYCLOAK_ROLE_CLAIM

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
PERMANENT_SESSION_LIFETIME = timedelta(hours=8)
WTF_CSRF_ENABLED = True
# Exempt Superset REST API from CSRF — JWT Bearer auth is sufficient
# See: https://github.com/apache/superset/issues/14130
WTF_CSRF_CHECK_DEFAULT = False

# ── Content Security Policy (Talisman) ────────────────────────────────────────
# Superset 3.0+ enables Flask-Talisman with a strict CSP by default.
# Handlebars charts compile templates at runtime using new Function(), which
# requires 'unsafe-eval' in script-src.  The styleTemplate feature also needs
# 'unsafe-inline' in style-src.
# See: https://github.com/apache/superset/issues/25205
TALISMAN_ENABLED = True
# Tile servers used by the Cartodiagram viz (and any other map-based chart)
# load raster tiles as <img> elements, so they have to be whitelisted under
# img-src or the browser blocks them and the chart renders blank / never
# finishes loading.  The district_pie_unified chart references CARTO Voyager
# (basemaps.cartocdn.com); OpenStreetMap and Mapbox are included because they
# are the other two providers Superset's map vizzes ship with by default.
_MAP_TILE_HOSTS = [
    "https://*.basemaps.cartocdn.com",
    "https://*.tile.openstreetmap.org",
    "https://tile.openstreetmap.org",
    "https://api.mapbox.com",
    "https://*.tiles.mapbox.com",
]

TALISMAN_CONFIG = {
    "content_security_policy": {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "blob:", *_MAP_TILE_HOSTS],
        "worker-src": ["'self'", "blob:"],
        "connect-src": [
            "'self'",
            "https://api.mapbox.com",
            "https://events.mapbox.com",
            *_MAP_TILE_HOSTS,
        ],
        "object-src": "'none'",
        "style-src": [
            "'self'",
            "'unsafe-inline'",
        ],
        "script-src": [
            "'self'",
            "'unsafe-eval'",
            "'unsafe-inline'",
        ],
        "font-src": ["'self'", "data:"],
    },
    "content_security_policy_nonce_in": ["script-src"],
    "force_https": False,
}

# ── MCP (Model Context Protocol) Server ──────────────────────────────────────
# The built-in ``superset mcp run`` CLI is available in Superset 6.1.x+.
# Configuration is entirely driven by environment — nothing is hardcoded so
# operators can flip between dev-impersonation mode and JWT-auth (e.g. against
# Keycloak) without editing code.
#
# Dev mode (simple, no token validation):
#   MCP_DEV_USERNAME=admin   # must exist in the Superset user database
#
# Production mode (OIDC / JWT-validated, typically against Keycloak):
#   MCP_AUTH_ENABLED=True
#   MCP_JWT_ALGORITHM=RS256
#   MCP_JWT_ISSUER=https://auth.example.com/realms/analytics
#   MCP_JWT_AUDIENCE=superset-mcp
#   MCP_JWKS_URI=https://auth.example.com/realms/analytics/protocol/openid-connect/certs
MCP_DEV_USERNAME = env("MCP_DEV_USERNAME", "")
MCP_AUTH_ENABLED = env("MCP_AUTH_ENABLED", "False").lower() == "true"
MCP_JWT_ALGORITHM = env("MCP_JWT_ALGORITHM", "")
MCP_JWT_ISSUER = env("MCP_JWT_ISSUER", "")
MCP_JWT_AUDIENCE = env("MCP_JWT_AUDIENCE", "")
MCP_JWKS_URI = env("MCP_JWKS_URI", "")
MCP_JWT_SECRET = env("MCP_JWT_SECRET", "")
MCP_JWT_PUBLIC_KEY = env("MCP_JWT_PUBLIC_KEY", "")
