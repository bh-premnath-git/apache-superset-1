"""
Superset local development configuration.
Mounted into the container at /app/pythonpath/superset_config.py.
"""
import os


# ── Secret key ────────────────────────────────────────────────────────────────
SECRET_KEY = os.environ["SUPERSET_SECRET_KEY"]

# ── Metadata DB ───────────────────────────────────────────────────────────────
_DB_USER = os.environ["METADATA_DB_USER"]
_DB_PASS = os.environ["METADATA_DB_PASS"]
_DB_HOST = os.environ["METADATA_DB_HOST"]
_DB_PORT = os.environ["METADATA_DB_PORT"]
_DB_NAME = os.environ["METADATA_DB_NAME"]

SQLALCHEMY_DATABASE_URI = (
    f"postgresql+psycopg2://{_DB_USER}:{_DB_PASS}@{_DB_HOST}:{_DB_PORT}/{_DB_NAME}"
)

# ── Redis – results back-end and caching ──────────────────────────────────────
_REDIS_HOST = os.environ["REDIS_HOST"]
_REDIS_PORT = os.environ["REDIS_PORT"]
_REDIS_URI = f"redis://{_REDIS_HOST}:{_REDIS_PORT}/0"

CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 300,
    "CACHE_KEY_PREFIX": "superset_",
    "CACHE_REDIS_URL": _REDIS_URI,
}

DATA_CACHE_CONFIG = {
    **CACHE_CONFIG,
    "CACHE_KEY_PREFIX": "superset_data_",
    "CACHE_REDIS_URL": f"redis://{_REDIS_HOST}:{_REDIS_PORT}/1",
}

FILTER_STATE_CACHE_CONFIG = {
    **CACHE_CONFIG,
    "CACHE_KEY_PREFIX": "superset_filter_",
    "CACHE_REDIS_URL": f"redis://{_REDIS_HOST}:{_REDIS_PORT}/2",
}

EXPLORE_FORM_DATA_CACHE_CONFIG = {
    **CACHE_CONFIG,
    "CACHE_KEY_PREFIX": "superset_explore_",
    "CACHE_REDIS_URL": f"redis://{_REDIS_HOST}:{_REDIS_PORT}/3",
}

# ── Celery (async queries) ────────────────────────────────────────────────────
class CeleryConfig:
    broker_url = f"redis://{_REDIS_HOST}:{_REDIS_PORT}/4"
    result_backend = f"redis://{_REDIS_HOST}:{_REDIS_PORT}/5"
    worker_prefetch_multiplier = 1
    task_acks_late = True
    broker_connection_retry_on_startup = True


CELERY_CONFIG = CeleryConfig

# ── Feature flags ─────────────────────────────────────────────────────────────
FEATURE_FLAGS = {
    "ALERT_REPORTS": True,
    "DASHBOARD_NATIVE_FILTERS": True,
    "DASHBOARD_CROSS_FILTERS": True,
    "ENABLE_TEMPLATE_PROCESSING": True,
}

MAPBOX_API_KEY = os.getenv("MAPBOX_API_KEY", "")

# ── Other settings ────────────────────────────────────────────────────────────
APP_NAME = os.getenv("SUPERSET_APP_NAME", "BigHammer")
APP_ICON = os.getenv("SUPERSET_APP_ICON", "/static/assets/images/logo.svg")
APP_FAVICON = os.getenv("SUPERSET_APP_FAVICON", "/static/assets/images/logo.svg")
THEME_DEFAULT = {
    "algorithm": "default",
    "token": {
        "brandLogoUrl": APP_ICON,
        "brandLogoAlt": APP_NAME,
        "brandLogoHref": "/",
    },
}
THEME_DARK = {
    "algorithm": "dark",
    "token": {
        "brandLogoUrl": APP_ICON,
        "brandLogoAlt": APP_NAME,
        "brandLogoHref": "/",
    },
}


def COMMON_BOOTSTRAP_OVERRIDES_FUNC(bootstrap_data: dict) -> dict:
    return {
        "appName": APP_NAME,
        "appIcon": APP_ICON,
    }


FAVICONS = [{"href": APP_FAVICON, "type": "image/svg+xml"}]
WTF_CSRF_ENABLED = True
TALISMAN_ENABLED = False          # set True behind a real TLS terminator
CONTENT_SECURITY_POLICY_WARNING = False
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = False     # set True when behind HTTPS
ENABLE_PROXY_FIX = True
ROW_LIMIT = 5_000
VIZ_ROW_LIMIT = 10_000
RATELIMIT_STORAGE_URI = f"redis://{_REDIS_HOST}:{_REDIS_PORT}/6"
