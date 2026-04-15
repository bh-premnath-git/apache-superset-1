# Custom Superset image with common SQLAlchemy DB drivers.
FROM apache/superset:5.0.0

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
RUN chmod +x /app/bootstrap.sh
RUN chmod +x /app/init.sh

# Copy custom branding assets.
COPY docker/assets/premdash-logo.svg /app/superset/static/assets/images/premdash-logo.svg

USER superset

ENTRYPOINT ["/app/bootstrap.sh"]
