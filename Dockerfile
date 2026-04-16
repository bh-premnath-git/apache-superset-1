# Custom Superset image with common SQLAlchemy DB drivers.
FROM apache/superset:6.0.0

USER root

# Install drivers into Superset's bundled virtualenv. In the base image `uv`
# is global, while the app runtime uses `/app/.venv/bin/python`.
RUN UV_CACHE_DIR=/tmp/uv-cache uv pip install --python /app/.venv/bin/python \
    pymysql \
    psycopg2-binary \
    cryptography

# Copy startup bootstrap script.
COPY docker/scripts/bootstrap.sh /app/bootstrap.sh
COPY docker/scripts/init.sh /app/init.sh
COPY docker/scripts/seed_dashboard.py /app/docker/scripts/seed_dashboard.py
RUN chmod +x /app/bootstrap.sh
RUN chmod +x /app/init.sh

# Copy custom branding assets.
COPY docker/assets/logo.svg /app/superset/static/assets/images/logo.svg
# Replace the default Superset favicon so browsers that request favicon.png
# directly (or fall back from /favicon.ico) also get the custom icon.
COPY docker/assets/logo.svg /app/superset/static/assets/images/favicon.png

USER superset

ENTRYPOINT ["/app/bootstrap.sh"]
