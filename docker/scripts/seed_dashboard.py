#!/usr/bin/env python3
"""Config-driven dashboard seeder — reads seed/chart_config.yaml; no code changes needed for new tables."""

from __future__ import annotations

import json
import os
import uuid
from typing import TYPE_CHECKING

import yaml

from superset.app import create_app

if TYPE_CHECKING:
    from superset.connectors.sqla.models import SqlaTable
    from superset.models.dashboard import Dashboard
    from superset.models.core import Database
    from superset.models.slice import Slice

CHART_CONFIG_PATH = os.environ.get("CHART_CONFIG_PATH", "/app/seed/chart_config.yaml")


def simple_metric(column_name: str, aggregate: str = "SUM") -> dict:
    label = f"{aggregate}({column_name})"
    return {
        "expressionType": "SIMPLE",
        "column": {"column_name": column_name},
        "aggregate": aggregate,
        "sqlExpression": None,
        "label": label,
        "optionName": label,
    }


def get_table(database_name: str, table_name: str) -> SqlaTable:
    from superset.connectors.sqla.models import SqlaTable
    from superset.extensions import db
    from superset.models.core import Database

    database = db.session.query(Database).filter(Database.database_name == database_name).one_or_none()
    if not database:
        raise RuntimeError(f"Database '{database_name}' not found. Ensure import_datasources ran first.")
    table = (
        db.session.query(SqlaTable)
        .filter(SqlaTable.database_id == database.id, SqlaTable.table_name == table_name)
        .one_or_none()
    )
    if not table:
        raise RuntimeError(f"Dataset '{database_name}.{table_name}' not found.")
    return table


def ensure_columns(table: SqlaTable, required: list[str]) -> None:
    from superset.extensions import db

    existing = {col.column_name for col in table.columns}
    missing = set(required) - existing
    if not missing:
        return
    table.fetch_metadata()
    db.session.flush()
    missing = set(required) - {col.column_name for col in table.columns}
    if missing:
        raise RuntimeError(
            f"Dataset '{table.table_name}' missing columns after refresh: {', '.join(sorted(missing))}."
        )


def build_params(spec: dict) -> dict:
    params: dict = {}
    if "x_axis" in spec:
        params["x_axis"] = spec["x_axis"]
    if "time_grain" in spec:
        params["time_grain_sqla"] = spec["time_grain"]
    if "metrics" in spec:
        params["metrics"] = [simple_metric(m["column"], m["aggregate"]) for m in spec["metrics"]]
    if "metric" in spec:
        params["metric"] = simple_metric(spec["metric"]["column"], spec["metric"]["aggregate"])
    if "groupby" in spec:
        params["groupby"] = spec["groupby"]
    for key in ("entity", "country_fieldtype", "show_bubbles", "max_bubble_size", "color_by_metric"):
        if key in spec:
            params[key] = spec[key]
    params["row_limit"] = spec.get("row_limit", 10000)
    return params


def upsert_chart(chart_name: str, viz_type: str, table: SqlaTable, params: dict) -> Slice:
    from superset.extensions import db
    from superset.models.slice import Slice

    chart = db.session.query(Slice).filter(Slice.slice_name == chart_name).one_or_none()
    payload = dict(params)
    payload["viz_type"] = viz_type
    payload["datasource"] = f"{table.id}__table"

    if chart:
        chart.viz_type = viz_type
        chart.datasource_id = table.id
        chart.datasource_type = "table"
        chart.params = json.dumps(payload)
        print(f"[seed-dashboard] Updated chart: {chart_name}")
        return chart

    chart = Slice(
        slice_name=chart_name,
        viz_type=viz_type,
        datasource_id=table.id,
        datasource_type="table",
        params=json.dumps(payload),
    )
    db.session.add(chart)
    db.session.flush()
    print(f"[seed-dashboard] Created chart: {chart_name}")
    return chart


def build_position_json(charts: list[Slice]) -> str:
    row_ids: list[str] = []
    row_nodes: dict = {}
    chart_nodes: dict = {}

    for i, chart in enumerate(charts):
        chart_id = f"CHART-{i + 1}"
        row_id = f"ROW-{i // 2 + 1}"

        if row_id not in row_nodes:
            row_ids.append(row_id)
            row_nodes[row_id] = {
                "id": row_id,
                "type": "ROW",
                "children": [],
                "parents": ["ROOT_ID", "GRID_ID"],
                "meta": {"background": "BACKGROUND_TRANSPARENT"},
            }

        row_nodes[row_id]["children"].append(chart_id)
        chart_nodes[chart_id] = {
            "id": chart_id,
            "type": "CHART",
            "children": [],
            "parents": ["ROOT_ID", "GRID_ID", row_id],
            "meta": {
                "chartId": chart.id,
                "height": 50,
                "width": 6,
                "sliceName": chart.slice_name,
                "uuid": str(uuid.uuid4()),
            },
        }

    layout = {
        "ROOT_ID": {"id": "ROOT_ID", "type": "ROOT", "children": ["GRID_ID"]},
        "GRID_ID": {
            "id": "GRID_ID",
            "type": "GRID",
            "children": row_ids,
            "parents": ["ROOT_ID"],
        },
        **row_nodes,
        **chart_nodes,
    }
    return json.dumps(layout)


def upsert_dashboard(title: str, slug: str, charts: list[Slice]) -> None:
    from superset.models.dashboard import Dashboard
    from superset.extensions import db

    position = build_position_json(charts)
    dashboard = db.session.query(Dashboard).filter(Dashboard.dashboard_title == title).one_or_none()
    if dashboard:
        dashboard.slices = charts
        dashboard.position_json = position
        dashboard.published = True
        print(f"[seed-dashboard] Updated dashboard: {title}")
        return

    dashboard = Dashboard(
        dashboard_title=title,
        slug=slug,
        position_json=position,
        json_metadata=json.dumps({"timed_refresh_immune_slices": []}),
        published=True,
    )
    dashboard.slices = charts
    db.session.add(dashboard)
    print(f"[seed-dashboard] Created dashboard: {title}")


def main() -> None:
    if not os.path.exists(CHART_CONFIG_PATH):
        print(f"[seed-dashboard] Config not found at {CHART_CONFIG_PATH}, skipping.")
        return

    with open(CHART_CONFIG_PATH) as f:
        config = yaml.safe_load(f)

    app = create_app()
    with app.app_context():
        from superset.extensions import db

        for dashboard_spec in config.get("dashboards", []):
            title = dashboard_spec["title"]
            slug = dashboard_spec.get("slug", title.lower().replace(" ", "-"))
            charts: list = []

            for chart_spec in dashboard_spec.get("charts", []):
                table = get_table(chart_spec["database"], chart_spec["table"])
                if required := chart_spec.get("required_columns"):
                    ensure_columns(table, required)
                params = build_params(chart_spec)
                chart = upsert_chart(chart_spec["name"], chart_spec["viz_type"], table, params)
                charts.append(chart)

            upsert_dashboard(title, slug, charts)
            db.session.commit()
            print(f"[seed-dashboard] Done — '{title}' ({len(charts)} charts).")


if __name__ == "__main__":
    main()
