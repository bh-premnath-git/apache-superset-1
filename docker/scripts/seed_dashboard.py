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
from datetime import datetime, timezone
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
        try:
            with self._opener.open(req, timeout=API_TIMEOUT) as resp:
                raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as ex:
            # Read the error body so downstream gets actionable detail.
            err_body = ""
            try:
                err_body = ex.read().decode("utf-8", errors="ignore")[:1000]
            except Exception:
                pass
            raise urllib.error.HTTPError(
                ex.url, ex.code, f"{ex.reason} — {err_body}", ex.headers, None
            ) from None

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


class SkipAsset(Exception):
    """Raised by a reconciler when an asset should be skipped, not failed.

    Use this for expected conditions like missing optional configuration
    (e.g. plugin bundle URL not set, extension file not present).
    """


@dataclass
class ReconcileResult:
    """Outcome of reconciling a single asset."""

    kind: str
    key: str
    action: str  # "created", "updated", "exists", "skipped", "failed"
    runtime_id: int | None = None
    reason: str = ""


@dataclass
class ReconcileReport:
    """Aggregated outcome of a full reconcile pass."""

    results: list[ReconcileResult] = field(default_factory=list)

    def add(self, result: ReconcileResult) -> None:
        self.results.append(result)

    @property
    def created(self) -> int:
        return sum(1 for r in self.results if r.action == "created")

    @property
    def updated(self) -> int:
        return sum(1 for r in self.results if r.action == "updated")

    @property
    def exists(self) -> int:
        return sum(1 for r in self.results if r.action == "exists")

    @property
    def skipped(self) -> int:
        return sum(1 for r in self.results if r.action == "skipped")

    @property
    def failed(self) -> int:
        return sum(1 for r in self.results if r.action == "failed")

    def summary(self) -> str:
        total = len(self.results)
        return (
            f"{total} asset(s): "
            f"{self.created} created, {self.updated} updated, "
            f"{self.exists} unchanged, {self.skipped} skipped, "
            f"{self.failed} failed"
        )


class Reconciler(ABC):
    """Base class — each subclass owns a single ``kind``.

    Subclasses declare the kinds they depend on (``depends_on``).  The engine
    uses that to compute execution order.
    """

    kind: ClassVar[str] = ""
    depends_on: ClassVar[tuple[str, ...]] = ()

    def preflight(self, asset: Asset) -> None:
        """Check prerequisites before applying.

        Raise ``SkipAsset`` with a human-readable reason if the asset
        cannot or should not be reconciled right now.  The default
        implementation does nothing (always proceeds).
        """

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
            raise SkipAsset(
                f"databaseRef '{db_ref}' not available yet"
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
            raise SkipAsset(
                f"datasetRef '{ds_ref}' not available yet"
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
        skipped_refs: list[str] = []
        for ref in spec.get("chartRefs", []):
            cid = ctx.resolve("Chart", ref)
            if cid is None:
                skipped_refs.append(ref)
            else:
                chart_ids.append(cid)
        if skipped_refs:
            log(f"    ⚠ Dashboard '{asset.name}' — charts not yet available: {skipped_refs}")

        if chart_ids:
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


class PluginReconciler(Reconciler):
    """Reconciles ``kind: Plugin`` assets via Superset's dynamic plugins API.

    Requires the ``DYNAMIC_PLUGINS`` feature flag (lifecycle: **testing**)
    to be enabled in ``superset_config.py``.  Available since Superset 3.x.
    Plugins are matched by their ``key`` field (dynamic_plugins ``key`` column).

    The reconciler **skips** (rather than fails) when the bundle URL is not
    yet configured — this lets template YAML live in the repo without
    breaking the reconciler for everyone else.
    """

    kind = "Plugin"

    def preflight(self, asset: Asset) -> None:
        spec = asset.spec
        bundle_url = _resolve_bundle_url(spec)
        if not bundle_url:
            env_key = spec.get("bundleUrlFromEnv", "")
            hint = f"set ${env_key} in .env" if env_key else "set spec.bundleUrl"
            raise SkipAsset(f"bundle URL not configured ({hint})")
        if not spec.get("vizType"):
            raise SkipAsset("spec.vizType is required")

    def apply(
        self, client: SupersetClient, asset: Asset, ctx: ReconcileContext
    ) -> int:
        spec = asset.spec
        viz_type = spec["vizType"]
        bundle_url = _resolve_bundle_url(spec)

        # Probe whether the dynamic plugins API is enabled.
        try:
            existing = client.find_by_field(
                "/api/v1/dynamic_plugins/", "key", viz_type
            )
        except urllib.error.HTTPError as ex:
            if ex.code in (404, 405):
                raise SkipAsset(
                    "/api/v1/dynamic_plugins/ not available — enable "
                    "FEATURE_FLAGS['DYNAMIC_PLUGINS'] = True in superset_config.py"
                ) from ex
            raise
        if existing:
            plugin_id = int(existing["id"])
            client.put(
                f"/api/v1/dynamic_plugins/{plugin_id}",
                {"name": asset.name, "key": viz_type, "bundle_url": bundle_url},
            )
            log(f"  Plugin '{asset.name}' updated (id={plugin_id})")
            return plugin_id

        created = client.post(
            "/api/v1/dynamic_plugins/",
            {"name": asset.name, "key": viz_type, "bundle_url": bundle_url},
        )
        plugin_id = int(created["id"])
        log(f"  Plugin '{asset.name}' created (id={plugin_id})")
        return plugin_id


class ExtensionReconciler(Reconciler):
    """Reconciles ``kind: Extension`` assets via Superset's extensions API.

    .. warning:: **Lifecycle: IN DEVELOPMENT** (as of Superset 6.0/6.1)

       The ``ENABLE_EXTENSIONS`` feature flag and the ``/api/v1/extensions/``
       endpoint are present on ``master`` but classified as *in development*.
       The runtime .supx loading infrastructure is **not yet functional** in
       released versions (see `GitHub Discussion #38607
       <https://github.com/apache/superset/discussions/38607>`_).

       This reconciler is included so that the YAML schema and reconciler
       pattern are ready when the feature stabilises.  Until then, assets
       of this kind will be **skipped** with a clear log message.

    The reconciler skips when:
    - The ``/api/v1/extensions/`` endpoint is not reachable (404)
    - ``spec.publisher`` or ``spec.extensionName`` is missing
    - No ``.supx`` bundle path or URL is resolvable
    """

    kind = "Extension"

    def preflight(self, asset: Asset) -> None:
        spec = asset.spec
        if not spec.get("publisher") or not spec.get("extensionName"):
            raise SkipAsset("spec.publisher and spec.extensionName are required")

        supx_url = _resolve_env_or_literal(spec, "supxUrl", "supxUrlFromEnv")
        supx_path = _resolve_env_or_literal(spec, "supxPath", "supxPathFromEnv")

        if not supx_url and not supx_path:
            raise SkipAsset(
                "no .supx bundle configured (set spec.supxUrl, spec.supxUrlFromEnv, "
                "spec.supxPath, or spec.supxPathFromEnv)"
            )

    def apply(
        self, client: SupersetClient, asset: Asset, ctx: ReconcileContext
    ) -> int:
        spec = asset.spec
        publisher = spec["publisher"]
        ext_name = spec["extensionName"]
        version = spec.get("version", "0.1.0")
        full_name = f"{publisher}.{ext_name}"

        # Probe whether the extensions API exists in this Superset version.
        try:
            existing = client.find_by_field(
                "/api/v1/extensions/", "name", full_name
            )
        except urllib.error.HTTPError as ex:
            if ex.code in (404, 405):
                raise SkipAsset(
                    "/api/v1/extensions/ not available in this Superset version "
                    "(ENABLE_EXTENSIONS is lifecycle:development — see "
                    "https://github.com/apache/superset/discussions/38607)"
                ) from ex
            raise
        if existing:
            ext_id = int(existing["id"])
            log(f"  Extension '{full_name}' already exists (id={ext_id})")
            return ext_id

        payload: dict[str, Any] = {
            "name": full_name,
            "publisher": publisher,
            "version": version,
        }
        supx_url = _resolve_env_or_literal(spec, "supxUrl", "supxUrlFromEnv")
        supx_path = _resolve_env_or_literal(spec, "supxPath", "supxPathFromEnv")
        if supx_url:
            payload["bundle_url"] = supx_url
        elif supx_path:
            payload["bundle_path"] = supx_path

        created = client.post("/api/v1/extensions/", payload)
        ext_id = int(created["id"])
        log(f"  Extension '{full_name}' created (id={ext_id})")
        return ext_id


# ---------------------------------------------------------------------------
# Reconciler registry — adding a new kind = adding a class here
# ---------------------------------------------------------------------------
RECONCILERS: tuple[Reconciler, ...] = (
    DatabaseReconciler(),
    DatasetReconciler(),
    ChartReconciler(),
    DashboardReconciler(),
    PluginReconciler(),
    ExtensionReconciler(),
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


def _resolve_bundle_url(spec: dict[str, Any]) -> str:
    env_key = spec.get("bundleUrlFromEnv")
    if env_key:
        return os.getenv(env_key, "")
    return spec.get("bundleUrl", "")


def _resolve_env_or_literal(
    spec: dict[str, Any], literal_key: str, env_key: str
) -> str:
    """Resolve a spec field that may be a literal value or an env-var reference.

    Checks ``spec[env_key]`` first (environment injection), then falls back
    to ``spec[literal_key]`` (hardcoded value).
    """
    from_env = spec.get(env_key)
    if from_env:
        return os.getenv(from_env, "")
    return spec.get(literal_key, "")


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
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    print(f"[{ts}] {message}", flush=True)


# ---------------------------------------------------------------------------
# Reconcile pass
# ---------------------------------------------------------------------------
def reconcile_once(assets_root: Path) -> ReconcileReport:
    client = SupersetClient(SUPERSET_URL, USERNAME, PASSWORD)
    client.login()

    assets = load_assets(assets_root)
    by_kind: dict[str, list[Asset]] = {}
    for asset in assets:
        by_kind.setdefault(asset.kind, []).append(asset)

    # Warn about asset kinds that have no registered reconciler.
    registered_kinds = {r.kind for r in RECONCILERS}
    for kind in by_kind:
        if kind not in registered_kinds:
            for asset in by_kind[kind]:
                log(f"  ⚠ No reconciler for kind '{kind}' — skipping {asset.key} ({asset.source_path})")

    log(f"Reconciling {len(assets)} asset(s) from {assets_root} ...")
    ctx = ReconcileContext()
    report = ReconcileReport()
    failed_assets: set[str] = set()  # keys of assets that failed

    for reconciler in _ordered_reconcilers():
        for asset in by_kind.get(reconciler.kind, []):
            # Check if THIS asset's specific dependency refs are resolvable.
            # We peek at spec refs (databaseRef, datasetRef, chartRefs) and
            # skip only if the specific upstream asset key failed.
            spec = asset.spec
            missing_refs = []
            for ref_field in ("databaseRef", "datasetRef"):
                ref_key = spec.get(ref_field)
                if ref_key and ref_key in failed_assets:
                    missing_refs.append(f"{ref_field}={ref_key}")
            for ref_key in spec.get("chartRefs", []):
                if ref_key in failed_assets:
                    missing_refs.append(f"chartRef={ref_key}")
            if missing_refs:
                reason = f"upstream dependency failed: {', '.join(missing_refs)}"
                log(f"  ⤳ {asset.kind} '{asset.key}' skipped — {reason}")
                failed_assets.add(asset.key)
                report.add(ReconcileResult(
                    kind=asset.kind, key=asset.key,
                    action="skipped", reason=reason,
                ))
                continue

            try:
                reconciler.preflight(asset)
                runtime_id = reconciler.apply(client, asset, ctx)
                ctx.put(reconciler.kind, asset.key, runtime_id)
                report.add(ReconcileResult(
                    kind=asset.kind, key=asset.key,
                    action="exists", runtime_id=runtime_id,
                ))
            except SkipAsset as skip:
                log(f"  ⊘ {asset.kind} '{asset.key}' skipped — {skip}")
                report.add(ReconcileResult(
                    kind=asset.kind, key=asset.key,
                    action="skipped", reason=str(skip),
                ))
            except Exception as ex:
                failed_assets.add(asset.key)
                log(f"  ✗ {asset.kind} '{asset.key}' FAILED — {ex}")
                report.add(ReconcileResult(
                    kind=asset.kind, key=asset.key,
                    action="failed", reason=str(ex),
                ))

    log(f"Reconcile complete — {report.summary()}")
    for r in report.results:
        if r.action == "failed":
            log(f"  FAILED: {r.kind}/{r.key} — {r.reason}")
    return report


# ---------------------------------------------------------------------------
# Main — continuous reconciler loop
# ---------------------------------------------------------------------------
def main() -> None:
    assets_root = Path(ASSETS_DIR)
    bootstrap = SupersetClient(SUPERSET_URL, USERNAME, PASSWORD)
    bootstrap.wait_healthy()

    report = reconcile_once(assets_root)
    if report.failed:
        log(f"Initial reconcile had {report.failed} failure(s) — will retry on next change")
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
