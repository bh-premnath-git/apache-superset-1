"""Continuous reconciler for Superset analytics assets.

Implements a small, dynamic control-plane runtime: asset kinds are discovered
from YAML manifests under ``ASSETS_DIR``, resolved into a dependency order
derived from each kind's declared dependencies, and applied through Superset's
REST API.  Nothing about the asset layout is hardcoded in this script — new
kinds can be added by registering a reconciler class.
"""

from __future__ import annotations

import hashlib
import http.cookiejar
import json
import os
import time
import urllib.error
import urllib.request
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

import yaml

# ---------------------------------------------------------------------------
# Configuration — every value is driven by environment so nothing is baked in
# ---------------------------------------------------------------------------
SUPERSET_URL = os.getenv("SUPERSET_URL", "http://superset:8088").rstrip("/")
USERNAME = os.getenv("SUPERSET_ADMIN_USERNAME", "admin")
PASSWORD = os.getenv("SUPERSET_ADMIN_PASSWORD", "admin")
ASSETS_DIR = os.getenv("ASSETS_DIR", "/app/assets")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "30"))
API_TIMEOUT = int(os.getenv("SUPERSET_API_TIMEOUT", "30"))
HEALTH_TIMEOUT = int(os.getenv("SUPERSET_HEALTH_TIMEOUT", "300"))


# ---------------------------------------------------------------------------
# Superset REST client
# ---------------------------------------------------------------------------
class SupersetClient:
    """Minimal Superset REST client with cookie jar + CSRF handling."""

    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self._cookies = http.cookiejar.CookieJar()
        self._opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self._cookies)
        )
        self._token: str | None = None
        self._csrf: str | None = None

    # -- low-level ----------------------------------------------------------
    def _request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
        authed: bool = True,
    ) -> dict[str, Any]:
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if authed and self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        if authed and self._csrf:
            headers["X-CSRFToken"] = self._csrf
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = urllib.request.Request(
            f"{self.base_url}{path}", data=body, headers=headers, method=method
        )
        with self._opener.open(req, timeout=API_TIMEOUT) as resp:
            raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}

    # -- lifecycle ----------------------------------------------------------
    def wait_healthy(self, timeout_seconds: int = HEALTH_TIMEOUT) -> None:
        deadline = time.time() + timeout_seconds
        while time.time() < deadline:
            try:
                with self._opener.open(
                    f"{self.base_url}/health", timeout=10
                ) as resp:
                    if resp.status == 200:
                        return
            except Exception:
                pass
            time.sleep(5)
        raise RuntimeError("Superset API did not become ready within timeout")

    def login(self) -> None:
        response = self._request(
            "POST",
            "/api/v1/security/login",
            payload={
                "username": self.username,
                "password": self.password,
                "provider": "db",
                "refresh": False,
            },
            authed=False,
        )
        token = response.get("access_token")
        if not token:
            raise RuntimeError("Unable to obtain access token")
        self._token = token
        csrf = self._request("GET", "/api/v1/security/csrf_token/").get("result")
        if not csrf:
            raise RuntimeError("Unable to obtain CSRF token")
        self._csrf = csrf

    # -- convenience --------------------------------------------------------
    def get(self, path: str) -> dict[str, Any]:
        return self._request("GET", path)

    def post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", path, payload=payload)

    def put(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("PUT", path, payload=payload)

    def find_by_field(
        self, endpoint: str, field_name: str, value: str
    ) -> dict[str, Any] | None:
        """Look up a resource by a single field value.

        Superset's list endpoints accept a rison ``q`` parameter, but shape
        differs per resource and RISON is awkward to build.  We instead
        page through listing results and match client-side — more portable
        and correct for idempotent lookup.
        """
        listing = self.get(f"{endpoint}?page_size=200")
        for row in listing.get("result", []) or []:
            if row.get(field_name) == value:
                return row
        return None


# ---------------------------------------------------------------------------
# Asset manifest loading
# ---------------------------------------------------------------------------
@dataclass
class Asset:
    """An in-memory representation of a YAML manifest."""

    kind: str
    key: str
    name: str
    spec: dict[str, Any]
    source_path: Path


def load_assets(root: Path) -> list[Asset]:
    """Discover every ``*.yaml`` manifest under *root* regardless of layout.

    The asset's kind comes from the ``kind:`` field in the document itself —
    directory structure is informational, not authoritative.
    """
    assets: list[Asset] = []
    for filepath in sorted(root.rglob("*.yaml")):
        with filepath.open() as fh:
            doc = yaml.safe_load(fh)
        if not isinstance(doc, dict):
            continue
        kind = doc.get("kind")
        metadata = doc.get("metadata") or {}
        spec = doc.get("spec") or {}
        key = metadata.get("key")
        name = metadata.get("name", key)
        if not kind or not key:
            continue
        assets.append(
            Asset(
                kind=kind,
                key=key,
                name=name,
                spec=spec,
                source_path=filepath,
            )
        )
    return assets


# ---------------------------------------------------------------------------
# Reconciler framework
# ---------------------------------------------------------------------------
@dataclass
class ReconcileContext:
    """Runtime IDs produced by prior reconcilers, keyed by ``asset.key``."""

    ids: dict[str, dict[str, int]] = field(default_factory=dict)

    def put(self, kind: str, key: str, runtime_id: int) -> None:
        self.ids.setdefault(kind, {})[key] = runtime_id

    def resolve(self, kind: str, key: str) -> int | None:
        return self.ids.get(kind, {}).get(key)


class Reconciler(ABC):
    """Base class — each subclass owns a single ``kind``.

    Subclasses declare the kinds they depend on (``depends_on``).  The engine
    uses that to compute execution order.
    """

    kind: ClassVar[str] = ""
    depends_on: ClassVar[tuple[str, ...]] = ()

    @abstractmethod
    def apply(
        self, client: SupersetClient, asset: Asset, ctx: ReconcileContext
    ) -> int:
        """Create-or-update *asset* in Superset.  Return its runtime id."""


class DatabaseReconciler(Reconciler):
    kind = "Database"

    def apply(
        self, client: SupersetClient, asset: Asset, ctx: ReconcileContext
    ) -> int:
        spec = asset.spec
        existing = client.find_by_field(
            "/api/v1/database/", "database_name", asset.name
        )
        if existing:
            log(f"  Database '{asset.name}' already exists (id={existing['id']})")
            return int(existing["id"])

        uri = _resolve_sqlalchemy_uri(spec)
        if not uri:
            raise RuntimeError(
                f"Database '{asset.name}' has no resolvable SQLAlchemy URI "
                f"(spec.sqlalchemyUri or spec.sqlalchemyUriFromEnv)"
            )
        payload = {
            "database_name": asset.name,
            "sqlalchemy_uri": uri,
            "expose_in_sqllab": spec.get("exposeInSqlLab", True),
            "allow_ctas": spec.get("allowCtas", False),
            "allow_cvas": spec.get("allowCvas", False),
            "allow_dml": spec.get("allowDml", False),
        }
        created = client.post("/api/v1/database/", payload)
        log(f"  Database '{asset.name}' created (id={created['id']})")
        return int(created["id"])


class DatasetReconciler(Reconciler):
    kind = "Dataset"
    depends_on = ("Database",)

    def apply(
        self, client: SupersetClient, asset: Asset, ctx: ReconcileContext
    ) -> int:
        spec = asset.spec
        db_ref = spec["databaseRef"]
        database_id = ctx.resolve("Database", db_ref)
        if database_id is None:
            raise RuntimeError(
                f"Dataset '{asset.name}' references unknown databaseRef '{db_ref}'"
            )

        existing = client.find_by_field(
            "/api/v1/dataset/", "table_name", spec["table"]
        )
        if existing:
            dataset_id = int(existing["id"])
            log(f"  Dataset '{asset.name}' already exists (id={dataset_id})")
        else:
            payload: dict[str, Any] = {
                "database": database_id,
                "table_name": spec["table"],
            }
            if spec.get("schema"):
                payload["schema"] = spec["schema"]
            created = client.post("/api/v1/dataset/", payload)
            dataset_id = int(created["id"])
            log(f"  Dataset '{asset.name}' created (id={dataset_id})")

        self._sync_metrics(client, dataset_id, spec.get("metrics") or [])
        self._sync_main_dttm(client, dataset_id, spec.get("timeColumn"))
        return dataset_id

    def _sync_metrics(
        self,
        client: SupersetClient,
        dataset_id: int,
        desired: list[dict[str, Any]],
    ) -> None:
        """Reconcile dataset metrics declaratively.

        Superset's PUT /api/v1/dataset/{id} with a full ``metrics`` list
        performs an upsert: entries with a matching ``id`` are updated, new
        ones (no id) are created, and existing metrics missing from the list
        are deleted.  We therefore merge declared metrics onto whatever is
        currently in Superset, preserving ids for known metric_names.
        """
        if not desired:
            return
        detail = client.get(f"/api/v1/dataset/{dataset_id}")
        existing_by_name = {
            m["metric_name"]: m["id"]
            for m in (detail.get("result", {}).get("metrics") or [])
            if m.get("metric_name") and m.get("id") is not None
        }
        payload_metrics: list[dict[str, Any]] = []
        for raw in desired:
            entry = {
                k: v
                for k, v in raw.items()
                if k
                in {
                    "metric_name",
                    "expression",
                    "verbose_name",
                    "metric_type",
                    "d3format",
                    "description",
                    "warning_text",
                    "extra",
                }
                and v is not None
            }
            existing_id = existing_by_name.get(entry.get("metric_name"))
            if existing_id is not None:
                entry["id"] = existing_id
            payload_metrics.append(entry)

        client.put(
            f"/api/v1/dataset/{dataset_id}",
            {"metrics": payload_metrics},
        )
        names = ", ".join(m["metric_name"] for m in payload_metrics)
        log(f"    metrics synced: [{names}]")

    def _sync_main_dttm(
        self, client: SupersetClient, dataset_id: int, time_column: str | None
    ) -> None:
        """Mark the time column as the dataset's main datetime column."""
        if not time_column:
            return
        client.put(
            f"/api/v1/dataset/{dataset_id}", {"main_dttm_col": time_column}
        )


class ChartReconciler(Reconciler):
    kind = "Chart"
    depends_on = ("Dataset",)

    def apply(
        self, client: SupersetClient, asset: Asset, ctx: ReconcileContext
    ) -> int:
        spec = asset.spec
        ds_ref = spec["datasetRef"]
        dataset_id = ctx.resolve("Dataset", ds_ref)
        if dataset_id is None:
            raise RuntimeError(
                f"Chart '{asset.name}' references unknown datasetRef '{ds_ref}'"
            )

        viz_type = spec["vizType"]
        params = {
            "datasource": f"{dataset_id}__table",
            "viz_type": viz_type,
            **(spec.get("params") or {}),
        }
        base_payload = {
            "slice_name": asset.name,
            "viz_type": viz_type,
            "datasource_id": dataset_id,
            "datasource_type": "table",
            "params": json.dumps(params),
        }

        existing = client.find_by_field(
            "/api/v1/chart/", "slice_name", asset.name
        )
        if existing:
            chart_id = int(existing["id"])
            client.put(f"/api/v1/chart/{chart_id}", base_payload)
            log(f"  Chart '{asset.name}' updated (id={chart_id})")
            return chart_id

        created = client.post("/api/v1/chart/", base_payload)
        chart_id = int(created["id"])
        log(f"  Chart '{asset.name}' created (id={chart_id})")
        return chart_id


class DashboardReconciler(Reconciler):
    kind = "Dashboard"
    depends_on = ("Chart",)

    def apply(
        self, client: SupersetClient, asset: Asset, ctx: ReconcileContext
    ) -> int:
        spec = asset.spec
        existing = client.find_by_field(
            "/api/v1/dashboard/", "dashboard_title", asset.name
        )
        if existing:
            dashboard_id = int(existing["id"])
            log(f"  Dashboard '{asset.name}' already exists (id={dashboard_id})")
        else:
            payload: dict[str, Any] = {
                "dashboard_title": asset.name,
                "published": spec.get("published", True),
            }
            if spec.get("slug"):
                payload["slug"] = spec["slug"]
            created = client.post("/api/v1/dashboard/", payload)
            dashboard_id = int(created["id"])
            log(f"  Dashboard '{asset.name}' created (id={dashboard_id})")

        chart_ids: list[int] = []
        for ref in spec.get("chartRefs", []):
            cid = ctx.resolve("Chart", ref)
            if cid is None:
                raise RuntimeError(
                    f"Dashboard '{asset.name}' references unknown chartRef '{ref}'"
                )
            chart_ids.append(cid)

        self._sync_layout(client, dashboard_id, chart_ids)
        return dashboard_id

    def _sync_layout(
        self, client: SupersetClient, dashboard_id: int, chart_ids: list[int]
    ) -> None:
        if not chart_ids:
            return
        detail = client.get(f"/api/v1/dashboard/{dashboard_id}")
        existing_position = detail.get("result", {}).get("position_json") or ""
        missing = [cid for cid in chart_ids if f"CHART-{cid}" not in existing_position]
        if not missing:
            return
        position = _auto_grid_layout(chart_ids)
        client.put(
            f"/api/v1/dashboard/{dashboard_id}",
            {
                "position_json": json.dumps(position),
                "json_metadata": json.dumps(
                    {"positions": position, "default_filters": "{}"}
                ),
            },
        )


# ---------------------------------------------------------------------------
# Reconciler registry — adding a new kind = adding a class here
# ---------------------------------------------------------------------------
RECONCILERS: tuple[Reconciler, ...] = (
    DatabaseReconciler(),
    DatasetReconciler(),
    ChartReconciler(),
    DashboardReconciler(),
)


def _ordered_reconcilers() -> list[Reconciler]:
    """Topologically sort reconcilers by their declared ``depends_on``."""
    by_kind = {r.kind: r for r in RECONCILERS}
    ordered: list[Reconciler] = []
    visited: set[str] = set()

    def visit(kind: str, trail: tuple[str, ...] = ()) -> None:
        if kind in visited:
            return
        if kind in trail:
            raise RuntimeError(f"Dependency cycle among reconcilers: {' -> '.join(trail + (kind,))}")
        reconciler = by_kind.get(kind)
        if reconciler is None:
            raise RuntimeError(f"No reconciler registered for kind '{kind}'")
        for dep in reconciler.depends_on:
            visit(dep, trail + (kind,))
        visited.add(kind)
        ordered.append(reconciler)

    for r in RECONCILERS:
        visit(r.kind)
    return ordered


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _resolve_sqlalchemy_uri(spec: dict[str, Any]) -> str:
    env_key = spec.get("sqlalchemyUriFromEnv")
    if env_key:
        return os.getenv(env_key, "")
    return spec.get("sqlalchemyUri", "")


def _auto_grid_layout(chart_ids: list[int]) -> dict[str, Any]:
    """Single-row equal-width layout as a reasonable default.

    Dashboards that need a specific layout should embed it in the YAML spec
    (future extension); the engine will prefer that over the auto layout.
    """
    row_children = [f"CHART-{cid}" for cid in chart_ids]
    position: dict[str, Any] = {
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
            "children": row_children,
            "parents": ["ROOT_ID", "GRID_ID"],
            "meta": {"background": "BACKGROUND_TRANSPARENT"},
        },
    }
    width = max(1, 12 // len(chart_ids))
    for cid in chart_ids:
        chart_key = f"CHART-{cid}"
        position[chart_key] = {
            "type": "CHART",
            "id": chart_key,
            "children": [],
            "parents": ["ROOT_ID", "GRID_ID", "ROW-1"],
            "meta": {"width": width, "height": 50, "chartId": cid},
        }
    return position


def _compute_assets_checksum(root: Path) -> str:
    h = hashlib.sha256()
    for filepath in sorted(root.rglob("*.yaml")):
        h.update(str(filepath).encode())
        h.update(filepath.read_bytes())
    return h.hexdigest()


def log(message: str) -> None:
    print(message, flush=True)


# ---------------------------------------------------------------------------
# Reconcile pass
# ---------------------------------------------------------------------------
def reconcile_once(assets_root: Path) -> None:
    client = SupersetClient(SUPERSET_URL, USERNAME, PASSWORD)
    client.login()

    assets = load_assets(assets_root)
    by_kind: dict[str, list[Asset]] = {}
    for asset in assets:
        by_kind.setdefault(asset.kind, []).append(asset)

    log(f"Reconciling {len(assets)} asset(s) from {assets_root} ...")
    ctx = ReconcileContext()
    for reconciler in _ordered_reconcilers():
        for asset in by_kind.get(reconciler.kind, []):
            runtime_id = reconciler.apply(client, asset, ctx)
            ctx.put(reconciler.kind, asset.key, runtime_id)

    log("Reconcile complete:")
    for kind, mapping in ctx.ids.items():
        log(f"  {kind}: {mapping}")


# ---------------------------------------------------------------------------
# Main — continuous reconciler loop
# ---------------------------------------------------------------------------
def main() -> None:
    assets_root = Path(ASSETS_DIR)
    bootstrap = SupersetClient(SUPERSET_URL, USERNAME, PASSWORD)
    bootstrap.wait_healthy()

    reconcile_once(assets_root)
    last_checksum = _compute_assets_checksum(assets_root)
    log(f"Watching {assets_root} for changes (poll every {POLL_INTERVAL}s) ...")

    while True:
        time.sleep(POLL_INTERVAL)
        try:
            current = _compute_assets_checksum(assets_root)
            if current != last_checksum:
                log("Asset change detected — re-reconciling ...")
                reconcile_once(assets_root)
                last_checksum = current
        except urllib.error.HTTPError as ex:
            body = ex.read().decode("utf-8", errors="ignore")
            log(f"Reconcile error (will retry): {ex.code} {body}")
        except Exception as ex:
            log(f"Reconcile error (will retry): {ex}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("Reconciler stopped.")
    except urllib.error.HTTPError as ex:
        body = ex.read().decode("utf-8", errors="ignore")
        raise SystemExit(f"Superset REST API error: {ex.code} {body}")
