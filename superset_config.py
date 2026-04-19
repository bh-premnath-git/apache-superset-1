import os
from datetime import timedelta

from celery.schedules import crontab
from flask_appbuilder.security.manager import AUTH_OAUTH


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

FEATURE_FLAGS = {
    "ALERT_REPORTS": True,
    "EMBEDDED_SUPERSET": True,
}

MAPBOX_API_KEY = env("MAPBOX_API_KEY", "")
APP_NAME = env("SUPERSET_APP_NAME", "BigHammer")
APP_ICON = env("SUPERSET_APP_ICON", "/static/assets/images/logo.svg")
FAVICONS = [{"href": env("SUPERSET_APP_FAVICON", "/static/assets/images/logo.svg")}]

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
    AUTH_USER_REGISTRATION = True
    AUTH_USER_REGISTRATION_ROLE = "Gamma"
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
                "client_kwargs": {"scope": "openid profile email roles"},
                "server_metadata_url": f"{internal_base}/realms/{KEYCLOAK_REALM}/.well-known/openid-configuration",
            },
        }
    ]

    OAUTH_PROVIDERS[0]["remote_app"]["redirect_uri"] = KEYCLOAK_REDIRECT_URI
    OAUTH_PROVIDERS[0]["remote_app"]["role_keys"] = KEYCLOAK_ROLE_CLAIM

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
PERMANENT_SESSION_LIFETIME = timedelta(hours=8)
WTF_CSRF_ENABLED = True
