"""Runtime seeding via Superset REST API.

This script waits for Superset API readiness, authenticates with admin credentials,
and creates sample analytics resources (database, dataset, chart, dashboard)
idempotently.
"""

from __future__ import annotations

import http.cookiejar
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
COOKIE_JAR = http.cookiejar.CookieJar()
OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(COOKIE_JAR))


def _request(
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
    token: str | None = None,
    csrf_token: str | None = None,
) -> dict[str, Any]:
    body = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if csrf_token:
        headers["X-CSRFToken"] = csrf_token

    if payload is not None:
        body = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        f"{SUPERSET_URL}{path}", data=body, headers=headers, method=method
    )
    with OPENER.open(req, timeout=30) as resp:
        content = resp.read().decode("utf-8")
    return json.loads(content) if content else {}


def wait_for_api(timeout_seconds: int = 300) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with OPENER.open(f"{SUPERSET_URL}/health", timeout=10) as resp:
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


def get_csrf_token(token: str) -> str:
    response = _request("GET", "/api/v1/security/csrf_token/", token=token)
    csrf_token = response.get("result")
    if not csrf_token:
        raise RuntimeError("Unable to obtain CSRF token from Superset")
    return csrf_token


def _first_by_name(result: dict[str, Any], key: str, expected: str) -> dict[str, Any] | None:
    for row in result.get("result", []):
        if row.get(key) == expected:
            return row
    return None


def ensure_database(token: str, csrf_token: str) -> int:
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
    created = _request("POST", "/api/v1/database/", payload=payload, token=token, csrf_token=csrf_token)
    return int(created["id"])


def ensure_dataset(token: str, database_id: int, csrf_token: str) -> int:
    listing = _request("GET", "/api/v1/dataset/?page_size=200", token=token)
    existing = _first_by_name(listing, "table_name", DATASET_NAME)
    if existing:
        dataset_id = int(existing["id"])
    else:
        payload = {
            "database": database_id,
            "schema": "mart_sales",
            "table_name": DATASET_NAME,
        }
        created = _request("POST", "/api/v1/dataset/", payload=payload, token=token, csrf_token=csrf_token)
        dataset_id = int(created["id"])

    # Ensure a revenue sum metric exists so charts referencing ``sum__revenue``
    # can resolve. Superset auto-creates ``sum__<column>`` metrics only when the
    # dataset is refreshed in the UI, so we explicitly create one here.
    detail = _request("GET", f"/api/v1/dataset/{dataset_id}", token=token)
    metrics = detail.get("result", {}).get("metrics", [])
    if not any(m.get("metric_name") == "sum__revenue" for m in metrics):
        _request(
            "PUT",
            f"/api/v1/dataset/{dataset_id}?override_columns=false",
            payload={
                "metrics": [
                    {
                        "metric_name": "sum__revenue",
                        "expression": "SUM(revenue)",
                        "verbose_name": "Total Revenue",
                        "metric_type": "sum",
                    }
                ]
            },
            token=token,
            csrf_token=csrf_token,
        )
    return dataset_id


def ensure_chart(token: str, dataset_id: int, csrf_token: str) -> int:
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
    created = _request("POST", "/api/v1/chart/", payload=payload, token=token, csrf_token=csrf_token)
    return int(created["id"])


def ensure_dashboard(token: str, chart_id: int, csrf_token: str) -> int:
    listing = _request("GET", "/api/v1/dashboard/?page_size=200", token=token)
    existing = _first_by_name(listing, "dashboard_title", DASHBOARD_TITLE)
    if existing:
        dashboard_id = int(existing["id"])
    else:
        payload = {
            "dashboard_title": DASHBOARD_TITLE,
            "slug": DASHBOARD_SLUG,
            "published": True,
        }
        created = _request("POST", "/api/v1/dashboard/", payload=payload, token=token, csrf_token=csrf_token)
        dashboard_id = int(created["id"])

    detail = _request("GET", f"/api/v1/dashboard/{dashboard_id}", token=token)
    result = detail.get("result", {})
    existing_position = result.get("position_json") or ""

    if f"CHART-{chart_id}" not in existing_position:
        chart_uuid = f"CHART-{chart_id}"
        position = {
            "DASHBOARD_VERSION_KEY": "v2",
            "ROOT_ID": {"type": "ROOT", "id": "ROOT_ID", "children": ["GRID_ID"]},
            "GRID_ID": {
                "type": "GRID",
                "id": "GRID_ID",
                "children": ["ROW-1"],
                "parents": ["ROOT_ID"],
            },
            "ROW-1": {
                "type": "ROW",
                "id": "ROW-1",
                "children": [chart_uuid],
                "parents": ["ROOT_ID", "GRID_ID"],
                "meta": {"background": "BACKGROUND_TRANSPARENT"},
            },
            chart_uuid: {
                "type": "CHART",
                "id": chart_uuid,
                "children": [],
                "parents": ["ROOT_ID", "GRID_ID", "ROW-1"],
                "meta": {
                    "width": 12,
                    "height": 50,
                    "chartId": chart_id,
                },
            },
        }
        _request(
            "PUT",
            f"/api/v1/dashboard/{dashboard_id}",
            payload={"position_json": json.dumps(position)},
            token=token,
            csrf_token=csrf_token,
        )
    return dashboard_id


def main() -> None:
    wait_for_api()
    token = login()
    csrf_token = get_csrf_token(token)
    db_id = ensure_database(token, csrf_token)
    dataset_id = ensure_dataset(token, db_id, csrf_token)
    chart_id = ensure_chart(token, dataset_id, csrf_token)
    dashboard_id = ensure_dashboard(token, chart_id, csrf_token)
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
