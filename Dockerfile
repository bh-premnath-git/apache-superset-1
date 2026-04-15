# Custom Superset image with common SQLAlchemy DB drivers.
FROM apache/superset:5.0.0

USER root

# Keep drivers pure-Python where possible to avoid system-compiler/toolchain issues.
RUN pip install --no-cache-dir \
    pymysql \
    psycopg2-binary \
    cryptography

# Copy startup bootstrap script.
COPY docker/scripts/bootstrap.sh /app/bootstrap.sh
RUN chmod +x /app/bootstrap.sh

# Copy custom branding assets.
COPY docker/assets/premdash-logo.svg /app/superset/static/assets/images/premdash-logo.svg

USER superset

ENTRYPOINT ["/app/bootstrap.sh"]
