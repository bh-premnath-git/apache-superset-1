# ── Stage 1: rebuild the Superset frontend with our viz plugin baked in ─────
#
# We clone the upstream Superset source at the same tag that the runtime
# image was built from, drop our plugin into ``superset-frontend/plugins/``
# (where npm workspaces auto-discover it), patch ``MainPreset.ts`` to
# register the plugin statically, and rebuild the SPA bundle. The result
# replaces ``/app/superset/static/assets`` in the runtime image, so the
# plugin ships with the rest of the JS — no /dynamic-plugins/api/read,
# no DYNAMIC_PLUGINS feature flag, no Module-Federation runtime load.
ARG SUPERSET_BASE_IMAGE=apache/superset:6.1.0rc2
ARG SUPERSET_SOURCE_REF=6.1.0rc2

FROM node:22-bullseye AS frontend-builder

ARG SUPERSET_SOURCE_REF
ENV SUPERSET_SOURCE_REF=${SUPERSET_SOURCE_REF}

# `zstd` is a runtime dependency of the `simple-zstd` npm package, which the
# Superset frontend's webpack.proxy-config.js requires at config-load time.
# Without the binary on PATH, `webpack` fails before the build even starts.
RUN apt-get update && apt-get install -y --no-install-recommends \
        git ca-certificates python3 make g++ zstd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work
RUN git clone --depth 1 --branch "${SUPERSET_SOURCE_REF}" \
        https://github.com/apache/superset.git superset

# Drop the plugin source into the frontend workspace. ``plugins/*`` is in
# the workspaces glob in superset-frontend/package.json, so npm treats it
# like any other in-tree plugin (e.g. @superset-ui/plugin-chart-echarts).
COPY superset-plugins/plugin-chart-state-district-pies \
     /work/superset/superset-frontend/plugins/plugin-chart-state-district-pies
COPY superset-plugins/plugin-chart-three-state-comparison \
     /work/superset/superset-frontend/plugins/plugin-chart-three-state-comparison

# Run the patcher: rewrites the plugin's package.json entry points to point
# at src (workspace mode) and edits MainPreset.ts to register the plugin.
COPY docker/frontend-build/register-plugin.mjs /tmp/register-plugin.mjs
RUN node /tmp/register-plugin.mjs /work/superset/superset-frontend

WORKDIR /work/superset/superset-frontend

# Install from lockfile. We intentionally use --legacy-peer-deps because
# Superset's published @superset-ui packages still advertise older React peer
# ranges, while the Superset 6.1 frontend tree installs React 18. Without
# legacy peer handling npm 10+ fails with ERESOLVE before install completes.
#
# Lockfile integrity still protects exact dependency versions; this flag only
# relaxes npm's peer dependency solver to tolerate that known metadata mismatch.
#
# Install and build are separate RUN steps so the failing layer's step number
# identifies the phase even when buildkit's parallel-target output truncates
# the actual error text.
RUN npm install \
    @react-spring/web@^9.7.5 \
    @fontsource/inter@^5.2.7 \
    @deck.gl/widgets@~9.2.5 \
    --package-lock-only \
    --no-audit \
    --no-fund \
    --legacy-peer-deps

RUN npm ci --no-audit --no-fund --legacy-peer-deps
RUN npm run build

# ── Stage 2: runtime image with custom drivers, branding, and the rebuilt
# frontend bundle from stage 1 ──────────────────────────────────────────────
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
    "sqlalchemy<2.0,>=1.4" \
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

# Replace the prebuilt SPA bundle with our rebuild that has the
# state_district_pies and three_state_comparison plugins compiled in.
COPY --from=frontend-builder /work/superset/superset/static/assets \
     /app/superset/static/assets

# Copy startup bootstrap script.
COPY docker/scripts/bootstrap.sh /app/bootstrap.sh
COPY docker/scripts/init.sh /app/init.sh
COPY docker/scripts/bootstrap_keycloak.py /app/docker/scripts/bootstrap_keycloak.py
COPY docker/scripts/seed_dashboard.py /app/docker/scripts/seed_dashboard.py
COPY docker/scripts/reconciler_entrypoint.sh /app/docker/scripts/reconciler_entrypoint.sh
RUN chmod +x /app/bootstrap.sh
RUN chmod +x /app/init.sh
RUN chmod +x /app/docker/scripts/reconciler_entrypoint.sh

# Self-host the India districts GeoJSON so the state_district_pies chart
# fetches it from the same origin as the SPA. Without this the browser
# hits CORS / mixed-content issues against external GeoJSON sources, and
# the CSP would also need to whitelist them. See
# assets/charts/district_pie_unified.yaml for the chart wiring.
COPY india-districts.geojson /app/superset/static/assets/india-districts.geojson

# Copy custom branding assets.
COPY docker/assets/logo.svg /app/superset/static/assets/images/logo.svg
# Replace the default Superset favicon so browsers that request favicon.png
# directly (or fall back from /favicon.ico) also get the custom icon.
COPY docker/assets/logo.svg /app/superset/static/assets/images/favicon.png

# Custom splash/loader shown before the SPA initializes. Superset 6.x renders
# this via the theme's brandSpinnerUrl token (see superset_config.py).
COPY docker/assets/loader.gif /app/superset/static/assets/images/loader.gif

# Superset 6.x registers /static/service-worker.js from the host page, but
# this image ships without the production PWA bundle and returns 404 at that
# path. Installing a no-op service worker at the expected location satisfies
# the registration request without caching or intercepting any traffic.
COPY docker/assets/service-worker.js /app/superset/static/service-worker.js

USER superset

ENTRYPOINT ["/app/bootstrap.sh"]
