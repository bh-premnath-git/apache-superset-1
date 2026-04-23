# Custom Superset image with common SQLAlchemy DB drivers.
#
# The base tag is parameterised so operators can bump between release
# candidates or pinned stable versions without editing this file.  The
# default targets the 6.1 line because it bundles the built-in ``superset
# mcp run`` CLI (see README §6).
ARG SUPERSET_BASE_IMAGE=apache/superset:6.1.0rc2
FROM ${SUPERSET_BASE_IMAGE}

USER root

# Install drivers into Superset's bundled virtualenv. In the base image `uv`
# is global, while the app runtime uses `/app/.venv/bin/python`.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

RUN UV_CACHE_DIR=/tmp/uv-cache uv pip install --python /app/.venv/bin/python \
    mysqlclient \
    psycopg2-binary \
    snowflake-sqlalchemy \
    sqlalchemy-bigquery \
    oracledb \
    pymssql \
    sqlalchemy-redshift \
    "pyathena[pandas]" \
    trino \
    pyhive \
    impyla \
    clickhouse-connect \
    pydruid \
    elasticsearch-dbapi \
    shillelagh \
    Authlib \
    cryptography \
    fastmcp

# Copy startup bootstrap script.
COPY docker/scripts/bootstrap.sh /app/bootstrap.sh
COPY docker/scripts/init.sh /app/init.sh
COPY docker/scripts/bootstrap_keycloak.py /app/docker/scripts/bootstrap_keycloak.py
COPY docker/scripts/seed_dashboard.py /app/docker/scripts/seed_dashboard.py
COPY docker/scripts/reconciler_entrypoint.sh /app/docker/scripts/reconciler_entrypoint.sh
RUN chmod +x /app/bootstrap.sh
RUN chmod +x /app/init.sh
RUN chmod +x /app/docker/scripts/reconciler_entrypoint.sh

# Copy custom branding assets.
COPY docker/assets/logo.svg /app/superset/static/assets/images/logo.svg
# Replace the default Superset favicon so browsers that request favicon.png
# directly (or fall back from /favicon.ico) also get the custom icon.
COPY docker/assets/logo.svg /app/superset/static/assets/images/favicon.png

# Superset 6.x registers /static/service-worker.js from the host page, but
# this image ships without the production PWA bundle and returns 404 at that
# path. Installing a no-op service worker at the expected location satisfies
# the registration request without caching or intercepting any traffic.
COPY docker/assets/service-worker.js /app/superset/static/service-worker.js

USER superset

ENTRYPOINT ["/app/bootstrap.sh"]
