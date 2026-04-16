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
VISUALIZATION_TYPE_MAP = {
    "Bar Chart": "echarts_timeseries_bar",
    "Line Chart": "echarts_timeseries_line",
    "Pie Chart": "pie",
    "World Map": "world_map",
    "Big Number": "big_number_total",
    "Big Number with Trendline": "big_number",
    "Histogram": "histogram_v2",
    "Heatmap": "heatmap_v2",
    "Treemap": "treemap_v2",
    "Sunburst": "sunburst_v2",
    "Sankey": "sankey_v2",
    "MapBox": "mapbox",
    "Scatter Plot": "deck_scatter",
    "deck.gl Scatterplot": "deck_scatter",
    "deck.gl Heatmap": "deck_heatmap",
    "deck.gl Polygon": "deck_polygon",
}
VIZ_TYPE_ALIASES = {
    # Legacy NVD3 categorical bar plugin removed in recent Superset releases.
    "dist_bar": "echarts_timeseries_bar",
    # Temporary compatibility alias for previously seeded configs.
    "echarts_bar": "echarts_timeseries_bar",
}
SUPPORTED_VIZ_TYPES = {
    "echarts_timeseries_bar",
    "echarts_timeseries_line",
    "pie",
    "world_map",
    "big_number_total",
    "big_number",
    "histogram_v2",
    "heatmap_v2",
    "treemap_v2",
    "sunburst_v2",
    "sankey_v2",
    "mapbox",
    "deck_scatter",
    "deck_heatmap",
    "deck_polygon",
}


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
    for key in (
        "entity",
        "country_fieldtype",
        "show_bubbles",
        "max_bubble_size",
        "color_by_metric",
        "all_columns_x",
        "all_columns_y",
        "all_columns",
        "series",
        "adhoc_filters",
        "filters",
        "columns",
        "group_by",
        "granularity_sqla",
        "since",
        "until",
        "metric_2",
        "size",
        "size_encoding",
        "x",
        "y",
        "value",
        "sort_x_axis",
        "sort_y_axis",
        "normalize_across",
        "longitude",
        "latitude",
        "spatial",
        "js_columns",
        "mapbox_style",
        "viewport",
        "line_column",
        "categorical_columns",
        "primary_metric",
        "secondary_metric",
        "time_range",
        "comparison_type",
        "source",
        "target",
    ):
        if key in spec:
            params[key] = spec[key]
    params["row_limit"] = spec.get("row_limit", 10000)
    return params


def resolve_viz_type(spec: dict) -> str:
    if "visualization_type" in spec:
        visualization_type = spec["visualization_type"]
        if visualization_type not in VISUALIZATION_TYPE_MAP:
            supported = ", ".join(sorted(VISUALIZATION_TYPE_MAP))
            raise RuntimeError(
                f"Chart '{spec.get('name', '<unnamed>')}' uses unsupported visualization_type "
                f"'{visualization_type}'. Supported visualization types in this build: {supported}."
            )
        return VISUALIZATION_TYPE_MAP[visualization_type]

    if "viz_type" not in spec:
        raise RuntimeError(f"Chart '{spec.get('name', '<unnamed>')}' must define 'visualization_type' or 'viz_type'.")

    return VIZ_TYPE_ALIASES.get(spec["viz_type"], spec["viz_type"])


def validate_chart_spec(spec: dict) -> str:
    chart_name = spec.get("name", "<unnamed>")
    missing_top_level = [key for key in ("database", "table", "name") if key not in spec]
    if missing_top_level:
        raise RuntimeError(
            f"Chart '{chart_name}' missing required keys: {', '.join(missing_top_level)}."
        )

    canonical_viz_type = resolve_viz_type(spec)
    if canonical_viz_type not in SUPPORTED_VIZ_TYPES:
        supported = ", ".join(sorted(SUPPORTED_VIZ_TYPES))
        raise RuntimeError(
            f"Chart '{chart_name}' uses unsupported viz_type '{spec.get('viz_type', spec.get('visualization_type'))}' "
            f"(canonical: '{canonical_viz_type}'). Supported viz types in this build: {supported}."
        )

    if canonical_viz_type in {"echarts_timeseries_bar", "echarts_timeseries_line"}:
        if "x_axis" not in spec:
            raise RuntimeError(f"Chart '{chart_name}' must define 'x_axis'.")
        if not spec.get("metrics"):
            raise RuntimeError(f"Chart '{chart_name}' must define non-empty 'metrics'.")

    if canonical_viz_type == "pie":
        if not spec.get("groupby"):
            raise RuntimeError(f"Chart '{chart_name}' must define non-empty 'groupby'.")
        if "metric" not in spec:
            raise RuntimeError(f"Chart '{chart_name}' must define 'metric'.")

    if canonical_viz_type == "world_map":
        missing_world_map = [key for key in ("entity", "country_fieldtype", "metric") if key not in spec]
        if missing_world_map:
            raise RuntimeError(
                f"Chart '{chart_name}' missing world_map keys: {', '.join(missing_world_map)}."
            )

    if canonical_viz_type in {"big_number_total", "big_number"}:
        if "metric" not in spec and not spec.get("metrics"):
            raise RuntimeError(f"Chart '{chart_name}' must define 'metric' or 'metrics' for big number charts.")

    if canonical_viz_type in {"histogram_v2", "heatmap_v2", "treemap_v2", "sunburst_v2"}:
        if not spec.get("groupby") and not spec.get("columns") and "x_axis" not in spec:
            raise RuntimeError(
                f"Chart '{chart_name}' must define grouping columns for '{canonical_viz_type}'."
            )
        if "metric" not in spec and not spec.get("metrics"):
            raise RuntimeError(
                f"Chart '{chart_name}' must define 'metric' or 'metrics' for '{canonical_viz_type}'."
            )

    if canonical_viz_type == "sankey_v2":
        missing_sankey = [key for key in ("source", "target") if key not in spec]
        if missing_sankey:
            raise RuntimeError(
                f"Chart '{chart_name}' missing sankey keys: {', '.join(missing_sankey)}."
            )
        if "metric" not in spec and not spec.get("metrics"):
            raise RuntimeError(f"Chart '{chart_name}' must define 'metric' or 'metrics' for sankey charts.")

    if canonical_viz_type in {"mapbox", "deck_scatter", "deck_heatmap", "deck_polygon"}:
        missing_geo = [key for key in ("longitude", "latitude") if key not in spec and key != "deck_polygon"]
        if canonical_viz_type != "deck_polygon" and missing_geo:
            raise RuntimeError(
                f"Chart '{chart_name}' missing geo keys: {', '.join(missing_geo)}."
            )

    return canonical_viz_type


def upsert_chart(chart_name: str, viz_type: str, table: SqlaTable, params: dict) -> Slice:
    from superset.extensions import db
    from superset.models.slice import Slice

    canonical_viz_type = VIZ_TYPE_ALIASES.get(viz_type, viz_type)
    if canonical_viz_type != viz_type:
        print(f"[seed-dashboard] Mapping legacy viz_type '{viz_type}' → '{canonical_viz_type}'")

    chart = db.session.query(Slice).filter(Slice.slice_name == chart_name).one_or_none()
    payload = dict(params)
    payload["viz_type"] = canonical_viz_type
    payload["datasource"] = f"{table.id}__table"

    if chart:
        chart.viz_type = canonical_viz_type
        chart.datasource_id = table.id
        chart.datasource_type = "table"
        chart.params = json.dumps(payload)
        print(f"[seed-dashboard] Updated chart: {chart_name}")
        return chart

    chart = Slice(
        slice_name=chart_name,
        viz_type=canonical_viz_type,
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
                canonical_viz_type = validate_chart_spec(chart_spec)
                table = get_table(chart_spec["database"], chart_spec["table"])
                if required := chart_spec.get("required_columns"):
                    ensure_columns(table, required)
                params = build_params(chart_spec)
                chart = upsert_chart(chart_spec["name"], canonical_viz_type, table, params)
                charts.append(chart)

            upsert_dashboard(title, slug, charts)
            db.session.commit()
            print(f"[seed-dashboard] Done — '{title}' ({len(charts)} charts).")


if __name__ == "__main__":
    main()
