#!/usr/bin/env python3
"""Create a starter dashboard with seed charts for local Superset environments."""

from __future__ import annotations

import json
import uuid
from typing import TYPE_CHECKING

from superset.app import create_app

if TYPE_CHECKING:
    from superset.connectors.sqla.models import SqlaTable
    from superset.models.dashboard import Dashboard
    from superset.models.core import Database
    from superset.models.slice import Slice

DASHBOARD_TITLE = "Starter Seed Dashboard"


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


def get_database(database_name: str) -> Database:
    from superset.extensions import db
    from superset.models.core import Database

    database = db.session.query(Database).filter(Database.database_name == database_name).one_or_none()
    if not database:
        raise RuntimeError(f"Database '{database_name}' not found. Ensure import_datasources ran first.")
    return database


def get_table(database_name: str, table_name: str) -> SqlaTable:
    from superset.connectors.sqla.models import SqlaTable
    from superset.extensions import db

    database = get_database(database_name)
    table = (
        db.session.query(SqlaTable)
        .filter(SqlaTable.database_id == database.id, SqlaTable.table_name == table_name)
        .one_or_none()
    )
    if not table:
        raise RuntimeError(f"Dataset '{database_name}.{table_name}' not found.")
    return table


def ensure_required_columns(table: SqlaTable, required_columns: set[str]) -> None:
    """Ensure imported datasets expose the required columns for seeded charts."""
    from superset.extensions import db

    def column_names() -> set[str]:
        return {column.column_name for column in table.columns}

    missing_columns = required_columns - column_names()
    if not missing_columns:
        return

    table.fetch_metadata()
    db.session.flush()

    missing_columns = required_columns - column_names()
    if missing_columns:
        missing_display = ", ".join(sorted(missing_columns))
        raise RuntimeError(
            f"Dataset '{table.table_name}' is missing expected columns after metadata refresh: {missing_display}. "
            "Verify seed SQL schema and imported datasets."
        )


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
    row_1 = charts[:2]
    row_2 = charts[2:]

    def chart_node(node_id: str, chart: Slice, row_id: str) -> dict:
        return {
            "id": node_id,
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
            "children": ["ROW-1", "ROW-2"],
            "parents": ["ROOT_ID"],
        },
        "ROW-1": {
            "id": "ROW-1",
            "type": "ROW",
            "children": ["CHART-1", "CHART-2"],
            "parents": ["ROOT_ID", "GRID_ID"],
            "meta": {"background": "BACKGROUND_TRANSPARENT"},
        },
        "ROW-2": {
            "id": "ROW-2",
            "type": "ROW",
            "children": ["CHART-3", "CHART-4"],
            "parents": ["ROOT_ID", "GRID_ID"],
            "meta": {"background": "BACKGROUND_TRANSPARENT"},
        },
        "CHART-1": chart_node("CHART-1", row_1[0], "ROW-1"),
        "CHART-2": chart_node("CHART-2", row_1[1], "ROW-1"),
        "CHART-3": chart_node("CHART-3", row_2[0], "ROW-2"),
        "CHART-4": chart_node("CHART-4", row_2[1], "ROW-2"),
    }
    return json.dumps(layout)


def upsert_dashboard(charts: list[Slice]) -> None:
    from superset.models.dashboard import Dashboard
    from superset.extensions import db

    dashboard = db.session.query(Dashboard).filter(Dashboard.dashboard_title == DASHBOARD_TITLE).one_or_none()
    if dashboard:
        dashboard.slices = charts
        dashboard.position_json = build_position_json(charts)
        dashboard.published = True
        print(f"[seed-dashboard] Updated dashboard: {DASHBOARD_TITLE}")
        return

    dashboard = Dashboard(
        dashboard_title=DASHBOARD_TITLE,
        slug="starter-seed-dashboard",
        position_json=build_position_json(charts),
        json_metadata=json.dumps({"timed_refresh_immune_slices": []}),
        published=True,
    )
    dashboard.slices = charts
    db.session.add(dashboard)
    print(f"[seed-dashboard] Created dashboard: {DASHBOARD_TITLE}")


def main() -> None:
    app = create_app()
    with app.app_context():
        from superset.extensions import db

        orders = get_table("sales", "orders")
        products = get_table("sales", "products")
        customers = get_table("sales", "customers")
        dau = get_table("analytics", "daily_active_users")

        ensure_required_columns(orders, {"order_date", "amount"})
        ensure_required_columns(products, {"id", "category"})
        ensure_required_columns(customers, {"id", "country"})
        ensure_required_columns(dau, {"date", "dau"})

        bar_chart = upsert_chart(
            chart_name="Sales Amount by Day (Bar)",
            viz_type="echarts_timeseries_bar",
            table=orders,
            params={
                "x_axis": "order_date",
                "time_grain_sqla": "P1D",
                "metrics": [simple_metric("amount", "SUM")],
                "groupby": [],
                "row_limit": 10000,
            },
        )

        line_chart = upsert_chart(
            chart_name="Daily Active Users (Line)",
            viz_type="echarts_timeseries_line",
            table=dau,
            params={
                "x_axis": "date",
                "time_grain_sqla": "P1D",
                "metrics": [simple_metric("dau", "SUM")],
                "groupby": [],
                "row_limit": 10000,
            },
        )

        pie_chart = upsert_chart(
            chart_name="Products by Category (Pie)",
            viz_type="pie",
            table=products,
            params={
                "groupby": ["category"],
                "metric": simple_metric("id", "COUNT"),
                "row_limit": 10000,
            },
        )

        # NOTE: `country_map` is a single-country choropleth and does not
        # ship a "world" TopoJSON, which causes the front-end to render
        # "Could not load map data for world". For a world-level view keyed
        # by ISO country codes we use the `world_map` plugin instead.
        geo_chart = upsert_chart(
            chart_name="Customers by Country (Geo)",
            viz_type="world_map",
            table=customers,
            params={
                "entity": "country",
                "country_fieldtype": "cca2",
                "metric": simple_metric("id", "COUNT"),
                "show_bubbles": True,
                "max_bubble_size": "25",
                "color_by_metric": True,
                "row_limit": 10000,
            },
        )

        upsert_dashboard([bar_chart, line_chart, pie_chart, geo_chart])
        db.session.commit()


if __name__ == "__main__":
    main()
