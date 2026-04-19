"""Runtime seeding via Superset REST API.

This script waits for Superset API readiness, authenticates with admin credentials,
and creates sample analytics resources (database, dataset, chart, dashboard)
idempotently.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

SUPERSET_URL = os.getenv("SUPERSET_URL", "http://superset:8088").rstrip("/")
USERNAME = os.getenv("SUPERSET_ADMIN_USERNAME", "admin")
PASSWORD = os.getenv("SUPERSET_ADMIN_PASSWORD", "admin")

ANALYTICS_DB_NAME = "Analytics Warehouse"
DATASET_NAME = "sales_orders"
CHART_NAME = "Monthly Revenue"
DASHBOARD_TITLE = "Executive Overview"
DASHBOARD_SLUG = "executive-overview"


def _request(
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
    token: str | None = None,
) -> dict[str, Any]:
    body = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    if payload is not None:
        body = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        f"{SUPERSET_URL}{path}", data=body, headers=headers, method=method
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        content = resp.read().decode("utf-8")
    return json.loads(content) if content else {}


def wait_for_api(timeout_seconds: int = 300) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{SUPERSET_URL}/health", timeout=10) as resp:
                if resp.status == 200:
                    print("Superset API is healthy.")
                    return
        except Exception:
            pass
        time.sleep(5)
    raise RuntimeError("Superset API did not become ready within timeout")


def login() -> str:
    response = _request(
        "POST",
        "/api/v1/security/login",
        payload={
            "username": USERNAME,
            "password": PASSWORD,
            "provider": "db",
            "refresh": False,
        },
    )
    token = response.get("access_token")
    if not token:
        raise RuntimeError("Unable to obtain access token from Superset login endpoint")
    return token


def _first_by_name(result: dict[str, Any], key: str, expected: str) -> dict[str, Any] | None:
    for row in result.get("result", []):
        if row.get(key) == expected:
            return row
    return None


def ensure_database(token: str) -> int:
    listing = _request("GET", "/api/v1/database/?page_size=200", token=token)
    existing = _first_by_name(listing, "database_name", ANALYTICS_DB_NAME)
    if existing:
        return int(existing["id"])

    payload = {
        "database_name": ANALYTICS_DB_NAME,
        "sqlalchemy_uri": (
            f"postgresql+psycopg2://{os.getenv('ANALYTICS_DB_USER', 'sample_user')}:"
            f"{os.getenv('ANALYTICS_DB_PASS', 'sample_pass')}@"
            f"{os.getenv('ANALYTICS_DB_HOST', 'analytics-db')}:"
            f"{os.getenv('ANALYTICS_DB_PORT', '5432')}/"
            f"{os.getenv('ANALYTICS_DB_NAME', 'analytics')}"
        ),
        "expose_in_sqllab": True,
        "allow_ctas": False,
        "allow_cvas": False,
        "allow_dml": False,
    }
    created = _request("POST", "/api/v1/database/", payload=payload, token=token)
    return int(created["id"])


def ensure_dataset(token: str, database_id: int) -> int:
    listing = _request("GET", "/api/v1/dataset/?page_size=200", token=token)
    existing = _first_by_name(listing, "table_name", DATASET_NAME)
    if existing:
        return int(existing["id"])

    payload = {
        "database": database_id,
        "schema": "mart_sales",
        "table_name": DATASET_NAME,
    }
    created = _request("POST", "/api/v1/dataset/", payload=payload, token=token)
    return int(created["id"])


def ensure_chart(token: str, dataset_id: int) -> int:
    listing = _request("GET", "/api/v1/chart/?page_size=200", token=token)
    existing = _first_by_name(listing, "slice_name", CHART_NAME)
    if existing:
        return int(existing["id"])

    params = {
        "datasource": f"{dataset_id}__table",
        "viz_type": "echarts_timeseries_bar",
        "x_axis": "order_date",
        "metrics": ["sum__revenue"],
        "groupby": [],
    }
    payload = {
        "slice_name": CHART_NAME,
        "viz_type": "echarts_timeseries_bar",
        "datasource_id": dataset_id,
        "datasource_type": "table",
        "params": json.dumps(params),
    }
    created = _request("POST", "/api/v1/chart/", payload=payload, token=token)
    return int(created["id"])


def ensure_dashboard(token: str) -> int:
    listing = _request("GET", "/api/v1/dashboard/?page_size=200", token=token)
    existing = _first_by_name(listing, "dashboard_title", DASHBOARD_TITLE)
    if existing:
        return int(existing["id"])

    payload = {"dashboard_title": DASHBOARD_TITLE, "slug": DASHBOARD_SLUG, "published": True}
    created = _request("POST", "/api/v1/dashboard/", payload=payload, token=token)
    return int(created["id"])


def main() -> None:
    wait_for_api()
    token = login()
    db_id = ensure_database(token)
    dataset_id = ensure_dataset(token, db_id)
    chart_id = ensure_chart(token, dataset_id)
    dashboard_id = ensure_dashboard(token)
    print(
        "Seeded via REST API:",
        f"database_id={db_id}",
        f"dataset_id={dataset_id}",
        f"chart_id={chart_id}",
        f"dashboard_id={dashboard_id}",
    )


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as ex:
        body = ex.read().decode("utf-8", errors="ignore")
        raise SystemExit(f"Superset REST API error: {ex.code} {body}")
