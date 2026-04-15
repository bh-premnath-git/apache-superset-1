# Custom Superset image with extra DB drivers
FROM apache/superset:5.0.0

# Switch to root to install system deps and Python packages
USER root

# Install drivers for MySQL, PostgreSQL, and MS SQL Server
RUN pip install --no-cache-dir \
    mysqlclient \
    pymysql \
    psycopg2-binary \
    pyodbc \
    # Hive / Trino / Presto (uncomment as needed)
    # pyhive[hive] \
    # trino \
    # pybigquery \
    cryptography

# Copy startup bootstrap script
COPY docker/scripts/bootstrap.sh /app/bootstrap.sh
RUN chmod +x /app/bootstrap.sh

# Drop back to the unprivileged superset user
USER superset

ENTRYPOINT ["/app/bootstrap.sh"]
