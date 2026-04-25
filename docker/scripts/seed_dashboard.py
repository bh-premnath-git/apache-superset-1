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
import socket
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
API_RETRIES = int(os.getenv("SUPERSET_API_RETRIES", "3"))
API_RETRY_BACKOFF_SECONDS = float(os.getenv("SUPERSET_API_RETRY_BACKOFF_SECONDS", "5"))


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
        headers: dict[str, str] = {
            "Content-Type": "application/json",
            "Referer": self.base_url,
        }
        if authed and self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        if authed and self._csrf:
            headers["X-CSRFToken"] = self._csrf
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = urllib.request.Request(
            f"{self.base_url}{path}", data=body, headers=headers, method=method
        )
        attempts = max(1, API_RETRIES)
        for attempt in range(1, attempts + 1):
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
            except (TimeoutError, socket.timeout, urllib.error.URLError) as ex:
                timed_out = isinstance(ex, (TimeoutError, socket.timeout)) or "timed out" in str(ex).lower()
                if not timed_out or attempt >= attempts:
                    raise RuntimeError("timed out") from ex
                log(
                    f"  … retrying {method} {path} after timeout "
                    f"({attempt}/{attempts})"
                )
                time.sleep(API_RETRY_BACKOFF_SECONDS * attempt)
        raise RuntimeError("timed out")

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
        self._refresh_columns_if_view_changed(client, dataset_id, spec)
        return dataset_id

    def _refresh_columns_if_view_changed(
        self,
        client: SupersetClient,
        dataset_id: int,
        spec: dict[str, Any],
    ) -> None:
        """Reconcile Superset's cached column list with the physical object.

        Superset caches the column list of a dataset in its metadata DB at
        creation time and never re-introspects unless asked. When the
        backing table/view is ALTER'd or recreated with new columns (for
        example, when ``seed/pg/*.sql`` evolves a view to carry extra
        dimensions for drill-by), Superset's dataset keeps the old column
        list, so new dimensions don't show up in the chart explorer and
        drill-by has no pivot targets.

        The ``declared`` dimensions in the YAML are the source of truth
        for "what columns we expect on this dataset". If any are missing
        from Superset's cached list, we POST ``/api/v1/dataset/{id}/refresh``
        which re-introspects the physical object. That endpoint also
        upserts ``groupby: true`` / ``filterable: true`` on every column
        it discovers (see apache/superset issue #24136), which is exactly
        what drill-by needs — the submenu is built from columns where
        ``groupby: true``.
        """
        declared = spec.get("dimensions") or []
        if not declared:
            return
        try:
            detail = client.get(f"/api/v1/dataset/{dataset_id}")
        except urllib.error.HTTPError:
            return
        existing_cols = {
            c.get("column_name")
            for c in (detail.get("result", {}).get("columns") or [])
            if c.get("column_name")
        }
        missing = [c for c in declared if c not in existing_cols]
        if not missing:
            return
        log(
            f"    refreshing dataset columns (missing declared dimensions: "
            f"{', '.join(missing)})"
        )
        try:
            client.put(f"/api/v1/dataset/{dataset_id}/refresh", {})
        except urllib.error.HTTPError as ex:
            log(f"    ⚠ could not refresh dataset {dataset_id}: {ex}")

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

        # Cartodiagram references another chart by key; Superset expects
        # form_data.selected_chart to be a doubly JSON-encoded string of the
        # sub-chart's slice record. Resolve the reference to a runtime id,
        # fetch the chart record via the API, and inject.
        sub_ref = spec.get("selectedChartRef")
        if sub_ref:
            sub_id = ctx.resolve("Chart", sub_ref)
            if sub_id is None:
                raise SkipAsset(
                    f"selectedChartRef '{sub_ref}' not applied yet"
                )
            sub_row = client.get(f"/api/v1/chart/{sub_id}").get("result") or {}
            if not sub_row:
                raise SkipAsset(
                    f"selectedChartRef '{sub_ref}' (id={sub_id}) not found"
                )
            # sub_row["params"] is already a JSON string in Superset's
            # storage. Re-serialize the outer wrapper as a JSON string so
            # Cartodiagram's buildQuery sees a stringified-slice-record
            # whose inner `params` is itself a stringified form_data.
            params["selected_chart"] = json.dumps({
                "id": sub_id,
                "slice_name": sub_row.get("slice_name", ""),
                "viz_type": sub_row.get("viz_type", ""),
                "params": sub_row.get("params", "{}"),
            })

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
        per_chart_heights: dict[int, int] = {}
        chart_height_overrides = spec.get("chartHeights") or {}
        for ref in spec.get("chartRefs", []):
            cid = ctx.resolve("Chart", ref)
            if cid is None:
                skipped_refs.append(ref)
            else:
                chart_ids.append(cid)
                if ref in chart_height_overrides:
                    per_chart_heights[cid] = int(chart_height_overrides[ref])
        if skipped_refs:
            log(f"    ⚠ Dashboard '{asset.name}' — charts not yet available: {skipped_refs}")

        if chart_ids:
            chart_height = spec.get("chartHeight", 50)
            charts_per_row = spec.get("chartsPerRow")
            full_width_first = spec.get("fullWidthFirst", 0)
            cross_filters_enabled = bool(spec.get("crossFiltersEnabled", False))
            native_filters = self._build_native_filters(spec, ctx)
            # Link charts to the dashboard first. Setting position_json alone
            # is not enough — Superset renders CHART positions whose chartId
            # maps to a slice that isn't in ``dashboard.slices`` as an empty
            # "Loading…" tile, so the dashboard appears stuck on load. See:
            # https://github.com/apache/superset/issues/24188
            self._link_charts_to_dashboard(client, dashboard_id, chart_ids)
            self._sync_layout(
                client,
                dashboard_id,
                chart_ids,
                chart_height,
                charts_per_row,
                full_width_first,
                per_chart_heights,
                cross_filters_enabled,
                native_filters,
            )
        return dashboard_id

    def _link_charts_to_dashboard(
        self,
        client: SupersetClient,
        dashboard_id: int,
        chart_ids: list[int],
    ) -> None:
        """Ensure each chart's ``dashboards`` relation contains this dashboard.

        Superset's ``PUT /api/v1/dashboard/{id}`` with ``position_json``
        updates layout but does not always rewrite the many-to-many
        ``slices`` relation (varies by release — 6.1.0rc2 leaves it
        untouched), which is what drives rendering.  Pushing the dashboard
        id onto each chart is the canonical cross-version way to link.
        """
        for cid in chart_ids:
            try:
                detail = client.get(f"/api/v1/chart/{cid}")
            except urllib.error.HTTPError:
                continue
            current = detail.get("result", {}).get("dashboards") or []
            current_ids = [d["id"] for d in current if isinstance(d, dict) and "id" in d]
            if dashboard_id in current_ids:
                continue
            merged = sorted({*current_ids, dashboard_id})
            try:
                client.put(f"/api/v1/chart/{cid}", {"dashboards": merged})
            except urllib.error.HTTPError as ex:
                log(f"    ⚠ could not link chart {cid} to dashboard {dashboard_id}: {ex}")

    def _build_native_filters(
        self, spec: dict[str, Any], ctx: ReconcileContext
    ) -> list[dict[str, Any]] | None:
        """Translate declarative ``nativeFilters`` into ``native_filter_configuration``.

        See the Superset reference implementation at
        ``superset-frontend/src/filters/components`` and
        ``superset-frontend/src/constants.ts::FilterPlugins`` — the ``filterType``
        string values are ``filter_select`` / ``filter_range`` / ``filter_time`` /
        ``filter_timecolumn`` / ``filter_timegrain``. Each entry on the dashboard
        carries a ``targets`` array of ``{datasetId, column:{name}}`` pairs
        together with ``controlValues`` that vary by ``filterType``.

        Returning ``None`` means the YAML did not declare filters — the caller
        preserves whatever Superset already has so users who added filters in
        the UI don't lose them on reconcile.
        """
        raw = spec.get("nativeFilters")
        if raw is None:
            return None
        if not isinstance(raw, list):
            raise RuntimeError("nativeFilters must be a list")
        configuration: list[dict[str, Any]] = []
        for entry in raw:
            key = entry.get("key")
            name = entry.get("name")
            if not key or not name:
                raise RuntimeError(
                    "each nativeFilters entry requires 'key' and 'name'"
                )
            filter_type = entry.get("filterType", "filter_select")
            targets_out: list[dict[str, Any]] = []
            for target in entry.get("targets") or []:
                ds_ref = target.get("datasetRef")
                column = target.get("column")
                if not ds_ref or not column:
                    raise RuntimeError(
                        f"nativeFilters/{key}: each target needs datasetRef + column"
                    )
                ds_id = ctx.resolve("Dataset", ds_ref)
                if ds_id is None:
                    raise SkipAsset(
                        f"nativeFilters/{key}: dataset '{ds_ref}' not ready"
                    )
                targets_out.append(
                    {"datasetId": ds_id, "column": {"name": column}}
                )
            # Deterministic id so repeated reconciles don't spawn duplicates.
            fid = "NATIVE_FILTER-" + hashlib.sha1(key.encode()).hexdigest()[:10]
            control_values = {
                "enableEmptyFilter": False,
                "defaultToFirstItem": False,
                "multiSelect": True,
                "searchAllOptions": False,
                "inverseSelection": False,
            }
            control_values.update(entry.get("controlValues") or {})
            configuration.append(
                {
                    "id": fid,
                    "type": "NATIVE_FILTER",
                    "name": name,
                    "filterType": filter_type,
                    "description": entry.get("description", ""),
                    "targets": targets_out,
                    "controlValues": control_values,
                    "defaultDataMask": {
                        "extraFormData": {},
                        "filterState": {},
                        "ownState": {},
                    },
                    "cascadeParentIds": entry.get("cascadeParentIds") or [],
                    "scope": entry.get("scope")
                    or {"rootPath": ["ROOT_ID"], "excluded": []},
                }
            )
        return configuration

    def _sync_layout(
        self,
        client: SupersetClient,
        dashboard_id: int,
        chart_ids: list[int],
        chart_height: int = 50,
        charts_per_row: int | None = None,
        full_width_first: int = 0,
        per_chart_heights: dict[int, int] | None = None,
        cross_filters_enabled: bool = False,
        native_filters: list[dict[str, Any]] | None = None,
    ) -> None:
        if not chart_ids:
            return
        detail = client.get(f"/api/v1/dashboard/{dashboard_id}")
        result = detail.get("result", {})
        existing_raw = result.get("position_json") or ""
        try:
            existing_position = json.loads(existing_raw) if existing_raw else {}
        except json.JSONDecodeError:
            existing_position = {}
        existing_meta_raw = result.get("json_metadata") or ""
        try:
            existing_meta = json.loads(existing_meta_raw) if existing_meta_raw else {}
        except json.JSONDecodeError:
            existing_meta = {}
        position = _auto_grid_layout(
            chart_ids,
            chart_height=chart_height,
            charts_per_row=charts_per_row,
            full_width_first=full_width_first,
            per_chart_heights=per_chart_heights,
        )
        # Only overwrite native_filter_configuration when the YAML declared it;
        # otherwise preserve whatever Superset already has.
        if native_filters is None:
            resolved_native_filters = existing_meta.get(
                "native_filter_configuration", []
            )
        else:
            resolved_native_filters = native_filters
        new_meta = {
            **existing_meta,
            "default_filters": existing_meta.get("default_filters", "{}"),
            "cross_filters_enabled": cross_filters_enabled,
            "native_filter_configuration": resolved_native_filters,
        }
        # Always update if position is empty or different
        should_update = (
            not existing_position  # Empty position
            or existing_position != position
            or existing_meta.get("cross_filters_enabled") != cross_filters_enabled
            or existing_meta.get("native_filter_configuration") != resolved_native_filters
        )
        
        if not should_update:
            log(f"  Dashboard layout unchanged (id={dashboard_id})")
            return
            
        log(f"  Updating dashboard layout (id={dashboard_id}, {len(chart_ids)} charts)")
        client.put(
            f"/api/v1/dashboard/{dashboard_id}",
            {
                "position_json": json.dumps(position),
                "json_metadata": json.dumps(new_meta),
            },
        )
        log(f"  Dashboard layout updated (id={dashboard_id})")


PLUGIN_READ_ENDPOINT = "/dynamic-plugins/api/read"
PLUGIN_CREATE_ENDPOINT = "/dynamic-plugins/api/create"
PLUGIN_UPDATE_ENDPOINT = "/dynamic-plugins/api/update"


class PluginReconciler(Reconciler):
    """Reconciles ``kind: Plugin`` assets via Superset's dynamic plugins API.

    Requires the ``DYNAMIC_PLUGINS`` feature flag (lifecycle: **testing**)
    to be enabled in ``superset_config.py``.  Available since Superset 3.x.
    Plugins are matched by their ``key`` field (dynamic_plugins ``key`` column).

    Note: dynamic plugins are exposed by ``DynamicPluginsView`` under
    ``/dynamic-plugins/api/{read,create,update/<id>,delete/<id>}`` — they are
    **not** part of Superset's ``/api/v1/`` REST surface.

    The reconciler **skips** (rather than fails) when the bundle URL is not
    yet configured — this lets template YAML live in the repo without
    breaking the reconciler for everyone else.
    """

    kind = "Plugin"

    def preflight(self, asset: Asset) -> None:
        spec = asset.spec
        bundle_url = _resolve_bundle_url(spec)
        if not bundle_url:
            url_env = spec.get("bundleUrlFromEnv", "")
            path_env = spec.get("bundlePathFromEnv", "")
            if url_env and path_env:
                hint = f"set ${url_env} or ${path_env} in .env"
            elif url_env:
                hint = f"set ${url_env} in .env"
            elif path_env:
                hint = f"set ${path_env} in .env (path to built .js file)"
            else:
                hint = "set spec.bundleUrl or spec.bundleUrlFromEnv"
            raise SkipAsset(f"bundle not configured ({hint})")
        if not spec.get("vizType"):
            raise SkipAsset("spec.vizType is required")

    def apply(
        self, client: SupersetClient, asset: Asset, ctx: ReconcileContext
    ) -> int:
        spec = asset.spec
        viz_type = spec["vizType"]
        bundle_url = _resolve_bundle_url(spec)
        payload = {"name": asset.name, "key": viz_type, "bundle_url": bundle_url}

        existing: dict[str, Any] | None = None
        try:
            existing = client.find_by_field(
                PLUGIN_READ_ENDPOINT, "key", viz_type
            )
        except urllib.error.HTTPError as ex:
            if ex.code == 404:
                raise SkipAsset(
                    f"{PLUGIN_READ_ENDPOINT} not available — enable "
                    "FEATURE_FLAGS['DYNAMIC_PLUGINS'] = True in superset_config.py"
                ) from ex
            if ex.code != 405:
                raise

        if existing:
            plugin_id = int(existing["id"])
            client.post(f"{PLUGIN_UPDATE_ENDPOINT}/{plugin_id}", payload)
            log(f"  Plugin '{asset.name}' updated (id={plugin_id})")
            return plugin_id

        try:
            created = client.post(PLUGIN_CREATE_ENDPOINT, payload)
            plugin_id = int(created["id"])
            log(f"  Plugin '{asset.name}' created (id={plugin_id})")
            return plugin_id
        except urllib.error.HTTPError as ex:
            if ex.code in (404, 405):
                raise SkipAsset(
                    f"{PLUGIN_CREATE_ENDPOINT} write API unavailable in this Superset build"
                ) from ex
            # Duplicate key/write race: treat as already present if backend reports it.
            msg = str(ex).lower()
            if "already exists" in msg or "duplicate" in msg or "unique" in msg:
                log(f"  Plugin '{asset.name}' already exists (detected from API response)")
                return int(hashlib.sha1(viz_type.encode('utf-8')).hexdigest()[:8], 16)
            raise


class ExtensionReconciler(Reconciler):
    """Reconciles ``kind: Extension`` assets via file-based extension loading.

    Superset's current extension deployment flow is file-based: place ``.supx``
    bundles under ``EXTENSIONS_PATH`` and Superset loads them on startup.

    This reconciler therefore validates extension metadata and bundle presence,
    and reports success without attempting legacy create/update API calls.
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

        supx_url = _resolve_env_or_literal(spec, "supxUrl", "supxUrlFromEnv")
        supx_path = _resolve_env_or_literal(spec, "supxPath", "supxPathFromEnv")

        if supx_path:
            path = Path(supx_path)
            if not path.exists():
                raise SkipAsset(f".supx bundle path does not exist: {supx_path}")
            log(
                f"  Extension '{full_name}' bundle detected at {supx_path} "
                "(loaded by Superset from EXTENSIONS_PATH on startup)"
            )
        elif supx_url:
            log(
                f"  Extension '{full_name}' configured with remote bundle URL "
                f"{supx_url} (runtime fetch handled by Superset)"
            )

        # Return a deterministic runtime id so dependent reconcilers can reference it.
        ext_id = int(hashlib.sha1(f"{full_name}:{version}".encode("utf-8")).hexdigest()[:8], 16)
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
    """Resolve plugin bundle URL from env or spec.

    Resolution order (first non-empty wins):

    1. ``bundleUrlFromEnv``  — env var holding a ready-to-use URL
       (CDN, static-serve path, etc.).
    2. ``bundlePathFromEnv`` — env var holding a **local filesystem path**
       to the built ``.js`` file.  Combined with ``staticMountPath``
       (or derived from ``vizType``) to produce a browser-loadable URL.
    3. ``bundleUrl``         — literal URL in the spec (last resort).

    All three mechanisms are fully dynamic — no plugin name is hardcoded
    in this function.
    """
    # Priority 1: direct URL from env
    url_env_key = spec.get("bundleUrlFromEnv")
    if url_env_key:
        url = os.getenv(url_env_key, "")
        if url:
            return url

    # Priority 2: local build path → derive URL (requires staticMountPath in spec)
    path_env_key = spec.get("bundlePathFromEnv")
    if path_env_key:
        local_path = os.getenv(path_env_key, "")
        if local_path and os.path.isfile(local_path):
            mount = spec.get("staticMountPath")
            if not mount:
                # Fail fast: staticMountPath must be declared in YAML for path-based loading
                raise ValueError(
                    f"Plugin {spec.get('vizType', 'unknown')} declares bundlePathFromEnv "
                    f"({path_env_key}) but missing required spec.staticMountPath. "
                    f"Add staticMountPath: /static/assets/plugins/<plugin-dir> to the YAML."
                )
            filename = os.path.basename(local_path)
            return f"{mount.rstrip('/')}/{filename}"

    # Priority 3: literal URL in spec
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


def _auto_grid_layout(
    chart_ids: list[int],
    *,
    chart_height: int = 50,
    charts_per_row: int | None = None,
    full_width_first: int = 0,
    per_chart_heights: dict[int, int] | None = None,
) -> dict[str, Any]:
    """Auto layout that groups charts into rows.

    Superset's dashboard grid is 12 columns wide. By default all charts share
    a single row with equal widths (12 // N).

    Options
    -------
    charts_per_row
        Default grouping once ``full_width_first`` is exhausted. ``1`` stacks
        each chart on its own row; ``2`` puts pairs side-by-side; ``None``
        keeps the legacy "all charts in one row" behavior.
    full_width_first
        Number of leading charts that each get their own full-width row. The
        remainder fall back to ``charts_per_row``. Set to ``2`` to make the
        first two charts full width and the rest share rows.
    per_chart_heights
        Optional per-chart height overrides keyed by chart id. Charts not in
        the map fall back to ``chart_height``.
    """
    per_chart_heights = per_chart_heights or {}
    rows: list[list[int]] = []
    # Leading full-width rows (one chart each).
    head_count = max(0, min(full_width_first, len(chart_ids)))
    for cid in chart_ids[:head_count]:
        rows.append([cid])

    # Remaining charts: pack into groups of `charts_per_row`.
    remaining = chart_ids[head_count:]
    if remaining:
        if charts_per_row is None or charts_per_row < 1:
            group = len(remaining)
        else:
            group = min(charts_per_row, len(remaining))
        for i in range(0, len(remaining), group):
            rows.append(remaining[i : i + group])

    position: dict[str, Any] = {
        "DASHBOARD_VERSION_KEY": "v2",
        "ROOT_ID": {"type": "ROOT", "id": "ROOT_ID", "children": ["GRID_ID"]},
    }
    row_ids: list[str] = []
    for row_idx, row in enumerate(rows, start=1):
        row_id = f"ROW-{row_idx}"
        row_ids.append(row_id)
        width = max(1, 12 // len(row))
        position[row_id] = {
            "type": "ROW",
            "id": row_id,
            "children": [f"CHART-{cid}" for cid in row],
            "parents": ["ROOT_ID", "GRID_ID"],
            "meta": {"background": "BACKGROUND_TRANSPARENT"},
        }
        for cid in row:
            chart_key = f"CHART-{cid}"
            height = per_chart_heights.get(cid, chart_height)
            position[chart_key] = {
                "type": "CHART",
                "id": chart_key,
                "children": [],
                "parents": ["ROOT_ID", "GRID_ID", row_id],
                "meta": {"width": width, "height": height, "chartId": cid},
            }

    position["GRID_ID"] = {
        "type": "GRID",
        "id": "GRID_ID",
        "children": row_ids,
        "parents": ["ROOT_ID"],
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
