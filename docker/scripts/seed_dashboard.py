"""Continuous reconciler for Superset analytics assets.

Dynamically discovers asset manifests (Database, Dataset, Chart, Dashboard)
from YAML files under an assets directory.  Cross-references between resources
are resolved via ``metadata.key`` so nothing is hardcoded in this script.

Runs as a long-lived process that polls the assets directory for changes and
re-reconciles automatically — no manual container restarts needed.
"""

from __future__ import annotations

import glob
import hashlib
import http.cookiejar
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

import yaml

# ---------------------------------------------------------------------------
# Configuration from environment
# ---------------------------------------------------------------------------
SUPERSET_URL = os.getenv("SUPERSET_URL", "http://superset:8088").rstrip("/")
USERNAME = os.getenv("SUPERSET_ADMIN_USERNAME", "admin")
PASSWORD = os.getenv("SUPERSET_ADMIN_PASSWORD", "admin")
ASSETS_DIR = os.getenv("ASSETS_DIR", "/app/assets")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "30"))

COOKIE_JAR = http.cookiejar.CookieJar()
OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(COOKIE_JAR))


# ---------------------------------------------------------------------------
# Low-level HTTP helper
# ---------------------------------------------------------------------------
def _request(
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
    token: str | None = None,
    csrf_token: str | None = None,
) -> dict[str, Any]:
    body = None
    headers: dict[str, str] = {"Content-Type": "application/json"}
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


# ---------------------------------------------------------------------------
# Startup helpers
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# Asset manifest loader
# ---------------------------------------------------------------------------
def _load_manifests(kind: str) -> list[dict[str, Any]]:
    """Load all YAML manifests of a given *kind* from the assets directory."""
    manifests: list[dict[str, Any]] = []
    kind_dir = {
        "Database": "databases",
        "Dataset": "datasets",
        "Chart": "charts",
        "Dashboard": "dashboards",
    }.get(kind)
    if not kind_dir:
        return manifests

    search_path = os.path.join(ASSETS_DIR, kind_dir)
    for filepath in sorted(glob.glob(os.path.join(search_path, "*.yaml"))):
        with open(filepath) as fh:
            doc = yaml.safe_load(fh)
        if doc and doc.get("kind") == kind:
            manifests.append(doc)
    return manifests


# ---------------------------------------------------------------------------
# Lookup helpers
# ---------------------------------------------------------------------------
def _find_existing(endpoint: str, field: str, value: str, token: str) -> int | None:
    listing = _request("GET", f"{endpoint}?page_size=200", token=token)
    for row in listing.get("result", []):
        if row.get(field) == value:
            return int(row["id"])
    return None


# ---------------------------------------------------------------------------
# Resource reconcilers — each returns {metadata.key: superset_id}
# ---------------------------------------------------------------------------
def reconcile_databases(token: str, csrf_token: str) -> dict[str, int]:
    """Ensure every Database manifest exists in Superset."""
    key_to_id: dict[str, int] = {}
    for doc in _load_manifests("Database"):
        key = doc["metadata"]["key"]
        name = doc["metadata"]["name"]
        spec = doc["spec"]

        existing_id = _find_existing("/api/v1/database/", "database_name", name, token)
        if existing_id:
            key_to_id[key] = existing_id
            print(f"  Database '{name}' already exists (id={existing_id})")
            continue

        uri_env = spec.get("sqlalchemyUriFromEnv")
        sqlalchemy_uri = os.getenv(uri_env, "") if uri_env else spec.get("sqlalchemyUri", "")
        if not sqlalchemy_uri:
            print(f"  WARN: Database '{name}' — no URI resolved, skipping")
            continue

        created = _request(
            "POST", "/api/v1/database/",
            payload={
                "database_name": name,
                "sqlalchemy_uri": sqlalchemy_uri,
                "expose_in_sqllab": True,
                "allow_ctas": False,
                "allow_cvas": False,
                "allow_dml": False,
            },
            token=token, csrf_token=csrf_token,
        )
        key_to_id[key] = int(created["id"])
        print(f"  Database '{name}' created (id={key_to_id[key]})")
    return key_to_id


def reconcile_datasets(
    token: str, csrf_token: str, db_ids: dict[str, int],
) -> dict[str, int]:
    """Ensure every Dataset manifest exists in Superset."""
    key_to_id: dict[str, int] = {}
    for doc in _load_manifests("Dataset"):
        key = doc["metadata"]["key"]
        name = doc["metadata"]["name"]
        spec = doc["spec"]

        db_ref = spec["databaseRef"]
        database_id = db_ids.get(db_ref)
        if database_id is None:
            print(f"  WARN: Dataset '{name}' — unresolved databaseRef '{db_ref}', skipping")
            continue

        existing_id = _find_existing("/api/v1/dataset/", "table_name", spec["table"], token)
        if existing_id:
            dataset_id = existing_id
            print(f"  Dataset '{name}' already exists (id={dataset_id})")
        else:
            payload: dict[str, Any] = {
                "database": database_id,
                "table_name": spec["table"],
            }
            if spec.get("schema"):
                payload["schema"] = spec["schema"]
            created = _request(
                "POST", "/api/v1/dataset/",
                payload=payload, token=token, csrf_token=csrf_token,
            )
            dataset_id = int(created["id"])
            print(f"  Dataset '{name}' created (id={dataset_id})")

        key_to_id[key] = dataset_id
    return key_to_id


def reconcile_charts(
    token: str, csrf_token: str, dataset_ids: dict[str, int],
) -> dict[str, int]:
    """Ensure every Chart manifest exists in Superset."""
    key_to_id: dict[str, int] = {}
    for doc in _load_manifests("Chart"):
        key = doc["metadata"]["key"]
        name = doc["metadata"]["name"]
        spec = doc["spec"]

        viz_type = spec["vizType"]

        ds_ref = spec["datasetRef"]
        dataset_id = dataset_ids.get(ds_ref)
        if dataset_id is None:
            print(f"  WARN: Chart '{name}' — unresolved datasetRef '{ds_ref}', skipping")
            continue

        existing_id = _find_existing("/api/v1/chart/", "slice_name", name, token)
        if existing_id:
            # Update existing chart with correct dataset reference
            params = {
                "datasource": f"{dataset_id}__table",
                "viz_type": viz_type,
                **(spec.get("params") or {}),
            }
            _request(
                "PUT", f"/api/v1/chart/{existing_id}",
                payload={
                    "datasource_id": dataset_id,
                    "datasource_type": "table",
                    "params": json.dumps(params),
                },
                token=token, csrf_token=csrf_token,
            )
            key_to_id[key] = existing_id
            print(f"  Chart '{name}' updated (id={existing_id})")
            continue

        params = {
            "datasource": f"{dataset_id}__table",
            "viz_type": viz_type,
            **(spec.get("params") or {}),
        }
        payload = {
            "slice_name": name,
            "viz_type": viz_type,
            "datasource_id": dataset_id,
            "datasource_type": "table",
            "params": json.dumps(params),
        }
        created = _request(
            "POST", "/api/v1/chart/",
            payload=payload, token=token, csrf_token=csrf_token,
        )
        key_to_id[key] = int(created["id"])
        print(f"  Chart '{name}' created (id={key_to_id[key]})")
    return key_to_id


def reconcile_dashboards(
    token: str, csrf_token: str, chart_ids: dict[str, int],
) -> dict[str, int]:
    """Ensure every Dashboard manifest exists with its charts laid out."""
    key_to_id: dict[str, int] = {}
    for doc in _load_manifests("Dashboard"):
        key = doc["metadata"]["key"]
        name = doc["metadata"]["name"]
        spec = doc["spec"]

        existing_id = _find_existing(
            "/api/v1/dashboard/", "dashboard_title", name, token,
        )
        if existing_id:
            dashboard_id = existing_id
            print(f"  Dashboard '{name}' already exists (id={dashboard_id})")
        else:
            payload: dict[str, Any] = {
                "dashboard_title": name,
                "published": True,
            }
            if spec.get("slug"):
                payload["slug"] = spec["slug"]
            created = _request(
                "POST", "/api/v1/dashboard/",
                payload=payload, token=token, csrf_token=csrf_token,
            )
            dashboard_id = int(created["id"])
            print(f"  Dashboard '{name}' created (id={dashboard_id})")

        resolved_chart_ids = []
        for ref in spec.get("chartRefs", []):
            cid = chart_ids.get(ref)
            if cid is None:
                print(f"  WARN: Dashboard '{name}' — unresolved chartRef '{ref}', skipping chart")
                continue
            resolved_chart_ids.append(cid)

        _sync_dashboard_layout(token, csrf_token, dashboard_id, resolved_chart_ids)
        key_to_id[key] = dashboard_id
    return key_to_id


def _sync_dashboard_layout(
    token: str, csrf_token: str, dashboard_id: int, chart_ids: list[int],
) -> None:
    """Build a position layout for the given charts and sync slices."""
    if not chart_ids:
        return

    detail = _request("GET", f"/api/v1/dashboard/{dashboard_id}", token=token)
    existing_position = detail.get("result", {}).get("position_json") or ""

    missing = [cid for cid in chart_ids if f"CHART-{cid}" not in existing_position]
    if not missing:
        return

    row_children = [f"CHART-{cid}" for cid in chart_ids]
    position: dict[str, Any] = {
        "DASHBOARD_VERSION_KEY": "v2",
        "ROOT_ID": {"type": "ROOT", "id": "ROOT_ID", "children": ["GRID_ID"]},
        "GRID_ID": {
            "type": "GRID", "id": "GRID_ID",
            "children": ["ROW-1"], "parents": ["ROOT_ID"],
        },
        "ROW-1": {
            "type": "ROW", "id": "ROW-1",
            "children": row_children,
            "parents": ["ROOT_ID", "GRID_ID"],
            "meta": {"background": "BACKGROUND_TRANSPARENT"},
        },
    }
    width = max(1, 12 // len(chart_ids))
    for cid in chart_ids:
        chart_key = f"CHART-{cid}"
        position[chart_key] = {
            "type": "CHART", "id": chart_key,
            "children": [],
            "parents": ["ROOT_ID", "GRID_ID", "ROW-1"],
            "meta": {"width": width, "height": 50, "chartId": cid},
        }

    # json_metadata with "positions" triggers Superset's set_dash_metadata()
    # which syncs charts into the dashboard_slices relationship table.
    metadata = {"positions": position, "default_filters": "{}"}
    _request(
        "PUT", f"/api/v1/dashboard/{dashboard_id}",
        payload={
            "position_json": json.dumps(position),
            "json_metadata": json.dumps(metadata),
        },
        token=token, csrf_token=csrf_token,
    )


# ---------------------------------------------------------------------------
# Change detection
# ---------------------------------------------------------------------------
def _compute_assets_checksum() -> str:
    """SHA-256 over the sorted contents of every YAML file in ASSETS_DIR."""
    h = hashlib.sha256()
    for filepath in sorted(glob.glob(os.path.join(ASSETS_DIR, "**", "*.yaml"), recursive=True)):
        with open(filepath, "rb") as fh:
            h.update(filepath.encode())
            h.update(fh.read())
    return h.hexdigest()


# ---------------------------------------------------------------------------
# Single reconcile pass
# ---------------------------------------------------------------------------
def reconcile_once() -> None:
    """Authenticate and reconcile all asset manifests once."""
    token = login()
    csrf_token = get_csrf_token(token)

    print(f"Reconciling asset manifests from {ASSETS_DIR} ...")
    db_ids = reconcile_databases(token, csrf_token)
    dataset_ids = reconcile_datasets(token, csrf_token, db_ids)
    chart_ids = reconcile_charts(token, csrf_token, dataset_ids)
    dashboard_ids = reconcile_dashboards(token, csrf_token, chart_ids)

    print("Reconcile complete:")
    print(f"  databases:  {db_ids}")
    print(f"  datasets:   {dataset_ids}")
    print(f"  charts:     {chart_ids}")
    print(f"  dashboards: {dashboard_ids}")


# ---------------------------------------------------------------------------
# Main — continuous reconciler loop
# ---------------------------------------------------------------------------
def main() -> None:
    wait_for_api()

    # Initial reconcile
    reconcile_once()
    last_checksum = _compute_assets_checksum()
    print(f"Watching {ASSETS_DIR} for changes (poll every {POLL_INTERVAL}s) ...")

    while True:
        time.sleep(POLL_INTERVAL)
        try:
            current_checksum = _compute_assets_checksum()
            if current_checksum != last_checksum:
                print("Asset change detected — re-reconciling ...")
                reconcile_once()
                last_checksum = current_checksum
        except urllib.error.HTTPError as ex:
            body = ex.read().decode("utf-8", errors="ignore")
            print(f"Reconcile error (will retry): {ex.code} {body}")
        except Exception as ex:
            print(f"Reconcile error (will retry): {ex}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Reconciler stopped.")
    except urllib.error.HTTPError as ex:
        body = ex.read().decode("utf-8", errors="ignore")
        raise SystemExit(f"Superset REST API error: {ex.code} {body}")
