"""Backend for the India Segmentation Home Shell extension.

Mounts at ``/extensions/my-org/home-shell/...`` and serves the Living
Conditions Approach (LCA) segmentation aggregates that power the Overview
and Prevalence Map pages.

All queries run against the registered Superset database ``Analytics
Warehouse`` (configured by ``assets/databases/analytics.yaml``), against
the ``household`` schema seeded by ``seed/pg/00{1..5}_*.sql``.

Returned shapes are stable contracts with ``frontend/src/api.ts``; columns
and dict keys must not be renamed without a matching frontend change.
"""

from __future__ import annotations

from typing import Any, Iterable

from flask import Response, request
from flask_appbuilder.api import expose, protect, safe
from sqlalchemy import text
from superset import db
from superset.models.core import Database
from superset_core.rest_api.api import RestApi
from superset_core.rest_api.decorators import api


ANALYTICS_DB_NAME = "Analytics Warehouse"
FOCUS_STATES: tuple[str, ...] = ("Bihar", "Jharkhand", "Madhya Pradesh")
SEGMENT_ORDER: tuple[str, ...] = ("R1", "R2", "R3", "R4", "U1", "U2", "U3")


def _get_database() -> Database:
    obj = (
        db.session.query(Database)
        .filter_by(database_name=ANALYTICS_DB_NAME)
        .one_or_none()
    )
    if obj is None:
        raise RuntimeError(
            f"Superset database '{ANALYTICS_DB_NAME}' is not registered. "
            f"Apply assets/databases/analytics.yaml first."
        )
    return obj


def _query(sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """Run a read-only query against the analytics warehouse and return
    list-of-dicts. Booleans / Decimal / date types are coerced to JSON-safe
    primitives so flask-appbuilder's response serializer doesn't choke."""
    database = _get_database()
    with database.get_sqla_engine() as engine, engine.connect() as conn:
        result = conn.execute(text(sql), params or {})
        rows = result.mappings().all()
    return [_jsonify(dict(row)) for row in rows]


def _jsonify(row: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in row.items():
        if v is None:
            out[k] = None
        elif isinstance(v, (int, float, str, bool)):
            out[k] = v
        else:
            out[k] = float(v) if hasattr(v, "__float__") else str(v)
    return out


def _states_param(req_states: str | None) -> list[str]:
    if not req_states:
        return list(FOCUS_STATES)
    parts = [s.strip() for s in req_states.split(",") if s.strip()]
    return parts or list(FOCUS_STATES)


def _bind_in(name: str, values: Iterable[str]) -> tuple[str, dict[str, Any]]:
    keys = [f"{name}_{i}" for i, _ in enumerate(values)]
    placeholders = ", ".join(f":{k}" for k in keys)
    binds = {k: v for k, v in zip(keys, values)}
    return placeholders, binds


@api(
    id="home_shell_api",
    name="Home Shell API",
    description="Endpoints serving LCA segmentation aggregates for the home shell.",
)
class HomeShellAPI(RestApi):
    openapi_spec_tag = "Home Shell"
    class_permission_name = "home_shell"

    @expose("/health", methods=("GET",))
    @protect()
    @safe
    def health(self) -> Response:
        return self.response(
            200,
            result={"status": "ok", "extension": "home_shell"},
        )

    @expose("/summary", methods=("GET",))
    @protect()
    @safe
    def summary(self) -> Response:
        """Top-level KPIs: weighted households, distinct districts, segments
        observed, and per-focus-state weighted totals."""
        states = _states_param(request.args.get("states"))
        ph, binds = _bind_in("st", states)

        totals = _query(
            f"""
            SELECT
                COALESCE(SUM(seg_weight), 0)::float    AS weighted_households,
                COUNT(DISTINCT segment)                AS segments_observed,
                COUNT(DISTINCT state_label)            AS states_covered
            FROM household.vw_state_segment_distribution
            WHERE state_label IN ({ph})
            """,
            binds,
        )

        per_state = _query(
            f"""
            SELECT
                state_label                            AS state,
                COALESCE(SUM(seg_weight), 0)::float    AS weighted_households
            FROM household.vw_state_segment_distribution
            WHERE state_label IN ({ph})
            GROUP BY state_label
            ORDER BY state_label
            """,
            binds,
        )

        districts = _query(
            f"""
            SELECT COUNT(DISTINCT district_name)::int AS districts_covered
            FROM household.vw_state_district_segment_geo
            WHERE state_label IN ({ph})
            """,
            binds,
        )

        result = {
            "states_focus": states,
            "weighted_households": totals[0]["weighted_households"] if totals else 0,
            "segments_observed": int(totals[0]["segments_observed"]) if totals else 0,
            "states_covered": int(totals[0]["states_covered"]) if totals else 0,
            "districts_covered": int(districts[0]["districts_covered"]) if districts else 0,
            "per_state": per_state,
        }
        return self.response(200, result=result)

    @expose("/segments", methods=("GET",))
    @protect()
    @safe
    def segments(self) -> Response:
        """All-India (focus-states) segment distribution.

        Output rows: ``{segment, sector, weighted_count, share_pct}`` ordered
        by the conventional R1..U3 axis. ``sector`` is derived from the
        segment letter to align with vw_mpce_by_segment.
        """
        states = _states_param(request.args.get("states"))
        ph, binds = _bind_in("st", states)
        rows = _query(
            f"""
            WITH agg AS (
                SELECT
                    segment,
                    SUM(seg_weight) AS weighted_count
                FROM household.vw_state_segment_distribution
                WHERE state_label IN ({ph})
                GROUP BY segment
            ),
            tot AS (SELECT NULLIF(SUM(weighted_count), 0) AS total FROM agg)
            SELECT
                a.segment,
                CASE WHEN a.segment LIKE 'R%' THEN 'Rural' ELSE 'Urban' END AS sector,
                a.weighted_count::float                         AS weighted_count,
                ROUND((a.weighted_count * 100.0 / t.total)::numeric, 2)::float
                                                                AS share_pct
            FROM agg a CROSS JOIN tot t
            """,
            binds,
        )
        ordered = sorted(
            rows,
            key=lambda r: SEGMENT_ORDER.index(r["segment"])
            if r["segment"] in SEGMENT_ORDER
            else len(SEGMENT_ORDER),
        )
        return self.response(
            200,
            result={"states_focus": states, "segments": ordered},
        )

    @expose("/states/segments", methods=("GET",))
    @protect()
    @safe
    def state_segments(self) -> Response:
        """Per-state segment mix. Output: list of
        ``{state, total_weight, segments: [{segment, weighted_count, share_pct}]}``
        in focus-state order."""
        states = _states_param(request.args.get("states"))
        ph, binds = _bind_in("st", states)
        rows = _query(
            f"""
            WITH agg AS (
                SELECT
                    state_label,
                    segment,
                    SUM(seg_weight) AS weighted_count
                FROM household.vw_state_segment_distribution
                WHERE state_label IN ({ph})
                GROUP BY state_label, segment
            ),
            totals AS (
                SELECT state_label, NULLIF(SUM(weighted_count), 0) AS total
                FROM agg
                GROUP BY state_label
            )
            SELECT
                a.state_label                                   AS state,
                a.segment,
                a.weighted_count::float                         AS weighted_count,
                ROUND((a.weighted_count * 100.0 / t.total)::numeric, 2)::float
                                                                AS share_pct,
                t.total::float                                  AS total_weight
            FROM agg a JOIN totals t USING (state_label)
            """,
            binds,
        )

        by_state: dict[str, dict[str, Any]] = {}
        for r in rows:
            entry = by_state.setdefault(
                r["state"],
                {"state": r["state"], "total_weight": r["total_weight"], "segments": []},
            )
            entry["segments"].append(
                {
                    "segment": r["segment"],
                    "weighted_count": r["weighted_count"],
                    "share_pct": r["share_pct"],
                }
            )
        ordered_states = [by_state[s] for s in states if s in by_state]
        for entry in ordered_states:
            entry["segments"].sort(
                key=lambda s: SEGMENT_ORDER.index(s["segment"])
                if s["segment"] in SEGMENT_ORDER
                else len(SEGMENT_ORDER),
            )

        return self.response(
            200,
            result={"states_focus": states, "states": ordered_states},
        )

    @expose("/states/<state>/districts", methods=("GET",))
    @protect()
    @safe
    def state_districts(self, state: str) -> Response:
        """Per-district segment shares for a single state. Output:
        ``[{district, total_weight, segments: [{segment, weighted_count, share_pct}]}]``
        sorted by district name. ``district`` is the geojson ``NAME_2``-aligned
        ``district_name`` exposed by vw_state_district_segment_geo."""
        rows = _query(
            """
            WITH agg AS (
                SELECT
                    district_name,
                    segment,
                    SUM(hh_weight) AS weighted_count
                FROM household.vw_state_district_segment_geo
                WHERE state_label = :state
                GROUP BY district_name, segment
            ),
            totals AS (
                SELECT district_name, NULLIF(SUM(weighted_count), 0) AS total
                FROM agg
                GROUP BY district_name
            )
            SELECT
                a.district_name                                 AS district,
                a.segment,
                a.weighted_count::float                         AS weighted_count,
                ROUND((a.weighted_count * 100.0 / t.total)::numeric, 2)::float
                                                                AS share_pct,
                t.total::float                                  AS total_weight
            FROM agg a JOIN totals t USING (district_name)
            ORDER BY a.district_name, a.segment
            """,
            {"state": state},
        )

        by_district: dict[str, dict[str, Any]] = {}
        for r in rows:
            entry = by_district.setdefault(
                r["district"],
                {
                    "district": r["district"],
                    "total_weight": r["total_weight"],
                    "segments": [],
                },
            )
            entry["segments"].append(
                {
                    "segment": r["segment"],
                    "weighted_count": r["weighted_count"],
                    "share_pct": r["share_pct"],
                }
            )

        for entry in by_district.values():
            entry["segments"].sort(
                key=lambda s: SEGMENT_ORDER.index(s["segment"])
                if s["segment"] in SEGMENT_ORDER
                else len(SEGMENT_ORDER),
            )

        ordered = sorted(by_district.values(), key=lambda d: d["district"])
        return self.response(
            200,
            result={"state": state, "districts": ordered},
        )

    @expose("/states/<state>/districts/<district>", methods=("GET",))
    @protect()
    @safe
    def district_detail(self, state: str, district: str) -> Response:
        """Detail KPIs for a single district: weighted hh, sector mix, top
        segments, and segment×minor-bucket breakdown when available."""
        sector_mix = _query(
            """
            SELECT
                CASE WHEN segment LIKE 'R%' THEN 'Rural' ELSE 'Urban' END AS sector,
                SUM(hh_weight)::float AS weighted_count
            FROM household.vw_state_district_segment_geo
            WHERE state_label = :state AND district_name = :district
            GROUP BY 1
            ORDER BY 1
            """,
            {"state": state, "district": district},
        )
        segments = _query(
            """
            WITH agg AS (
                SELECT segment, SUM(hh_weight) AS w
                FROM household.vw_state_district_segment_geo
                WHERE state_label = :state AND district_name = :district
                GROUP BY segment
            ),
            tot AS (SELECT NULLIF(SUM(w), 0) AS total FROM agg)
            SELECT
                a.segment,
                a.w::float                              AS weighted_count,
                ROUND((a.w * 100.0 / t.total)::numeric, 2)::float
                                                        AS share_pct
            FROM agg a CROSS JOIN tot t
            """,
            {"state": state, "district": district},
        )
        segments.sort(
            key=lambda s: SEGMENT_ORDER.index(s["segment"])
            if s["segment"] in SEGMENT_ORDER
            else len(SEGMENT_ORDER),
        )
        total = sum(s["weighted_count"] for s in segments)
        return self.response(
            200,
            result={
                "state": state,
                "district": district,
                "weighted_households": total,
                "sector_mix": sector_mix,
                "segments": segments,
            },
        )

    @expose("/mpce", methods=("GET",))
    @protect()
    @safe
    def mpce(self) -> Response:
        """Weighted mean MPCE per LCA segment from vw_mpce_by_segment.

        The view is already restricted to the focus states (Bihar, Jharkhand,
        Madhya Pradesh) inside seed/pg/005_mpce_by_segment.sql, so no extra
        filter is applied here.
        """
        rows = _query(
            """
            SELECT
                segment,
                sector,
                segment_order,
                mean_mpce::float            AS mean_mpce,
                stddev_mpce::float          AS stddev_mpce,
                weighted_count::float       AS weighted_count,
                overall_sector_mean::float  AS overall_sector_mean
            FROM household.vw_mpce_by_segment
            ORDER BY segment_order
            """
        )
        return self.response(200, result={"segments": rows})
