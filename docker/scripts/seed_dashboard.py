#!/usr/bin/env python3
"""Config-driven dashboard seeder.

Loads shared config from ``seed/chart_config.yaml`` and per-dashboard specs from
``seed/charts/*.yaml`` so dashboards can be maintained as smaller YAML files.
"""

from __future__ import annotations

import glob
import json
import os
import uuid
from typing import TYPE_CHECKING

import yaml
from sqlalchemy.exc import NoSuchTableError

from superset.app import create_app

if TYPE_CHECKING:
    from superset.connectors.sqla.models import SqlaTable
    from superset.models.dashboard import Dashboard
    from superset.models.core import Database
    from superset.models.slice import Slice

CHART_CONFIG_PATH = os.environ.get("CHART_CONFIG_PATH", "/app/seed/chart_config.yaml")
CHART_CONFIG_GLOB = os.environ.get("CHART_CONFIG_GLOB", "/app/seed/charts/*.yaml")
VISUALIZATION_TYPE_MAP = {
    "Bar Chart": "echarts_timeseries_bar",
    "Line Chart": "echarts_timeseries_line",
    "Pie Chart": "pie",
    "World Map": "world_map",
    "Country Map": "country_map",
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
    "country_map",
    "big_number_total",
    "big_number",
    "histogram_v2",
    "heatmap_v2",
    "treemap_v2",
    "sunburst_v2",
    "sankey_v2",
    "table",
    "handlebars",
    "mapbox",
    "deck_scatter",
    "deck_heatmap",
    "deck_polygon",
}


def simple_metric(column_name: str, aggregate: str = "SUM", label: str | None = None) -> dict:
    auto_label = f"{aggregate}({column_name})"
    final_label = label or auto_label
    return {
        "expressionType": "SIMPLE",
        "column": {"column_name": column_name},
        "aggregate": aggregate,
        "sqlExpression": None,
        "label": final_label,
        "optionName": final_label,
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
        params["metrics"] = [simple_metric(m["column"], m.get("aggregate", "SUM"), m.get("label")) for m in spec["metrics"]]
    if "metric" in spec:
        m = spec["metric"]
        params["metric"] = simple_metric(m["column"], m.get("aggregate", "SUM"), m.get("label"))
    if "groupby" in spec:
        params["groupby"] = spec["groupby"]
    if "emit_filter" in spec:
        params["emit_filter"] = spec["emit_filter"]
    # Cross-filter wiring (cross_filter_source / cross_filter_target) is purely
    # dashboard-level metadata; do not leak it into per-chart form data.
    for key in (
        "entity",
        "country_fieldtype",
        "select_country",
        "number_format",
        "linear_color_scheme",
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
        "line_type",
        "categorical_columns",
        "primary_metric",
        "secondary_metric",
        "time_range",
        "comparison_type",
        "source",
        "target",
        "handlebars_template",
        "css_styles",
        "stack",
        "contributionMode",
        "show_legend",
        "show_value",
        "legendType",
        "legendOrientation",
        "legendMargin",
        "rich_tooltip",
        "orientation",
        "order_desc",
        "x_axis_title",
        "y_axis_title",
        "x_axis_title_margin",
        "y_axis_title_margin",
        "y_axis_format",
        "color_scheme",
        "x_axis_sort_series",
        "x_axis_sort_series_ascending",
    ):
        if key in spec:
            params[key] = spec[key]
    params["row_limit"] = spec.get("row_limit", 10000)
    return params


def build_native_filter_configuration(charts: list[dict], filter_specs: list[dict]) -> list[dict]:
    all_chart_ids = [chart["slice"].id for chart in charts]
    native_filters: list[dict] = []

    for i, spec in enumerate(filter_specs, start=1):
        target_tables = set(spec.get("targets", []))
        matching_charts = [chart for chart in charts if not target_tables or chart["table"] in target_tables]
        targets = [
            {"datasetId": chart["slice"].datasource_id, "column": {"name": spec["column"]}}
            for chart in matching_charts
        ]
        charts_in_scope = [chart["slice"].id for chart in matching_charts] or all_chart_ids
        native_filters.append(
            {
                "id": spec.get("id", f"NATIVE_FILTER-{i}"),
                "controlValues": {
                    "enableEmptyFilter": False,
                    "defaultToFirstItem": False,
                    "multiSelect": spec.get("multi_select", True),
                    "inverseSelection": False,
                    "searchAllOptions": True,
                },
                "name": spec.get("name", spec["column"]),
                "filterType": spec.get("filter_type", "filter_select"),
                "targets": targets,
                "defaultDataMask": spec.get("default_data_mask", {"extraFormData": {}, "filterState": {}}),
                "cascadeParentIds": spec.get("cascade_parent_ids", []),
                "scope": {"rootPath": ["ROOT_ID"], "excluded": spec.get("excluded_charts", [])},
                "chartsInScope": charts_in_scope,
                "tabsInScope": [],
                "adhoc_filters": spec.get("adhoc_filters", []),
            }
        )

    return native_filters


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

    if canonical_viz_type == "country_map":
        missing_country_map = [key for key in ("entity", "select_country", "metric") if key not in spec]
        if missing_country_map:
            raise RuntimeError(
                f"Chart '{chart_name}' missing country_map keys: {', '.join(missing_country_map)}. "
                f"Provide 'entity' (ISO 3166-2 column), 'select_country' (e.g. 'india'), and 'metric'."
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

    if canonical_viz_type in {"mapbox", "deck_scatter", "deck_heatmap"}:
        missing_geo = [key for key in ("longitude", "latitude") if key not in spec]
        if missing_geo:
            raise RuntimeError(
                f"Chart '{chart_name}' missing geo keys: {', '.join(missing_geo)}."
            )

    if canonical_viz_type == "deck_polygon":
        if "line_column" not in spec:
            raise RuntimeError(f"Chart '{chart_name}' must define 'line_column' for deck_polygon.")

    if canonical_viz_type == "handlebars":
        if not spec.get("groupby") and not spec.get("columns"):
            raise RuntimeError(
                f"Chart '{chart_name}' must define 'groupby' or 'columns' for handlebars charts."
            )
        if "handlebars_template" not in spec:
            raise RuntimeError(f"Chart '{chart_name}' must define 'handlebars_template'.")

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


def build_position_json(items: list[dict]) -> str:
    """Build dashboard position JSON from a list of layout items.

    Items are either charts ({"slice": Slice, "width": int, "height": int})
    or layout headers ({"header": "<text>"}). Headers force a row break;
    charts pack into 12-col rows.
    """
    grid_children: list[str] = []
    row_nodes: dict = {}
    chart_nodes: dict = {}

    current_row_index = 0
    current_row_id: str | None = None
    current_row_width = 0
    chart_counter = 0

    def open_row() -> str:
        nonlocal current_row_index, current_row_id, current_row_width
        current_row_index += 1
        current_row_id = f"ROW-{current_row_index}"
        current_row_width = 0
        grid_children.append(current_row_id)
        row_nodes[current_row_id] = {
            "id": current_row_id,
            "type": "ROW",
            "children": [],
            "parents": ["ROOT_ID", "GRID_ID"],
            "meta": {"background": "BACKGROUND_TRANSPARENT"},
        }
        return current_row_id

    for item in items:
        if "header" in item:
            # Headers act as row breaks only; omit custom header nodes because
            # Superset layout rendering is sensitive to component schema.
            current_row_id = None
            current_row_width = 0
            continue

        chart = item["slice"]
        chart_width = max(1, min(int(item.get("width", 6)), 12))
        chart_height = item.get("height", 36)
        chart_counter += 1
        chart_id = f"CHART-{chart_counter}"

        if current_row_id is None or (
            current_row_width + chart_width > 12 and row_nodes[current_row_id]["children"]
        ):
            open_row()

        row_nodes[current_row_id]["children"].append(chart_id)
        current_row_width += chart_width
        chart_nodes[chart_id] = {
            "id": chart_id,
            "type": "CHART",
            "children": [],
            "parents": ["ROOT_ID", "GRID_ID", current_row_id],
            "meta": {
                "chartId": chart.id,
                "height": chart_height,
                "width": chart_width,
                "sliceName": chart.slice_name,
                "uuid": str(uuid.uuid4()),
            },
        }

    layout = {
        "ROOT_ID": {"id": "ROOT_ID", "type": "ROOT", "children": ["GRID_ID"]},
        "GRID_ID": {
            "id": "GRID_ID",
            "type": "GRID",
            "children": grid_children,
            "parents": ["ROOT_ID"],
        },
        **row_nodes,
        **chart_nodes,
    }
    return json.dumps(layout)


def build_chart_configuration(items: list[dict]) -> tuple[dict, dict]:
    """Build dashboard cross-filter scoping.

    For every chart item with `cross_filter_source: true`, restrict its
    cross-filter scope to charts that declare `cross_filter_target: <source>`.
    All other charts are excluded from that source's scope so country-wide
    KPIs don't collapse to the clicked region.

    Returns (chart_configuration, global_chart_configuration).
    """
    chart_items = [item for item in items if "slice" in item]
    all_chart_ids = [item["slice"].id for item in chart_items]

    chart_configuration: dict = {}
    for item in chart_items:
        spec = item["spec"]
        if not spec.get("cross_filter_source"):
            continue
        source_id = item["slice"].id
        source_name = spec["name"]
        target_ids = [
            other["slice"].id
            for other in chart_items
            if other["spec"].get("cross_filter_target") == source_name
        ]
        if not target_ids:
            # No declared receivers — leave the source on default global scope.
            continue
        excluded = [cid for cid in all_chart_ids if cid not in target_ids and cid != source_id]
        chart_configuration[str(source_id)] = {
            "id": source_id,
            "crossFilters": {
                "scope": {"rootPath": ["ROOT_ID"], "excluded": excluded},
                "chartsInScope": target_ids,
            },
        }

    global_chart_configuration = {
        "scope": {"rootPath": ["ROOT_ID"], "excluded": []},
        "chartsInScope": all_chart_ids,
    }
    return chart_configuration, global_chart_configuration


def upsert_dashboard(title: str, slug: str, items: list[dict], native_filters: list[dict] | None = None) -> None:
    from superset.models.dashboard import Dashboard
    from superset.extensions import db

    position = build_position_json(items)
    chart_items = [item for item in items if "slice" in item]
    deduped_slices: list = []
    seen_slice_ids: set[int] = set()
    for chart in chart_items:
        slice_obj = chart["slice"]
        if slice_obj.id in seen_slice_ids:
            continue
        seen_slice_ids.add(slice_obj.id)
        deduped_slices.append(slice_obj)
    chart_configuration, global_chart_configuration = build_chart_configuration(items)
    json_metadata = json.dumps(
        {
            "timed_refresh_immune_slices": [],
            "native_filter_configuration": native_filters or [],
            "cross_filters_enabled": True,
            "chart_configuration": chart_configuration,
            "global_chart_configuration": global_chart_configuration,
        }
    )
    dashboard = db.session.query(Dashboard).filter(Dashboard.dashboard_title == title).one_or_none()
    if dashboard:
        dashboard.slices = []
        db.session.flush()
        dashboard.slices = deduped_slices
        dashboard.position_json = position
        dashboard.json_metadata = json_metadata
        dashboard.published = True
        print(f"[seed-dashboard] Updated dashboard: {title}")
        return

    dashboard = Dashboard(
        dashboard_title=title,
        slug=slug,
        position_json=position,
        json_metadata=json_metadata,
        published=True,
    )
    dashboard.slices = deduped_slices
    db.session.add(dashboard)
    print(f"[seed-dashboard] Created dashboard: {title}")


def load_dashboard_config() -> dict:
    config: dict = {"dashboards": []}

    if os.path.exists(CHART_CONFIG_PATH):
        with open(CHART_CONFIG_PATH) as f:
            root_config = yaml.safe_load(f) or {}
        if not isinstance(root_config, dict):
            raise RuntimeError(f"Dashboard config at {CHART_CONFIG_PATH} must be a YAML mapping.")
        for key, value in root_config.items():
            if key == "dashboards":
                config["dashboards"].extend(value or [])
            else:
                config[key] = value

    for extra_path in sorted(glob.glob(CHART_CONFIG_GLOB)):
        with open(extra_path) as f:
            extra_config = yaml.safe_load(f) or {}
        if not isinstance(extra_config, dict):
            raise RuntimeError(f"Dashboard config at {extra_path} must be a YAML mapping.")
        extra_dashboards = extra_config.get("dashboards", [])
        if extra_dashboards and not isinstance(extra_dashboards, list):
            raise RuntimeError(f"Key 'dashboards' in {extra_path} must be a YAML list.")
        config["dashboards"].extend(extra_dashboards)

    return config


def main() -> None:
    if not os.path.exists(CHART_CONFIG_PATH) and not glob.glob(CHART_CONFIG_GLOB):
        print(
            f"[seed-dashboard] Config not found at {CHART_CONFIG_PATH} "
            f"and no chart files matched {CHART_CONFIG_GLOB}, skipping."
        )
        return

    config = load_dashboard_config()

    app = create_app()
    with app.app_context():
        from superset.extensions import db

        for dashboard_spec in config.get("dashboards", []):
            title = dashboard_spec["title"]
            slug = dashboard_spec.get("slug", title.lower().replace(" ", "-"))
            items: list = []

            for chart_spec in dashboard_spec.get("charts", []):
                if "header" in chart_spec:
                    # Layout-only HEADER component, not a chart.
                    items.append({"header": chart_spec["header"], "header_size": chart_spec.get("header_size", "MEDIUM_HEADER")})
                    continue
                try:
                    canonical_viz_type = validate_chart_spec(chart_spec)
                    table = get_table(chart_spec["database"], chart_spec["table"])
                    if required := chart_spec.get("required_columns"):
                        ensure_columns(table, required)
                    params = build_params(chart_spec)
                    chart = upsert_chart(chart_spec["name"], canonical_viz_type, table, params)
                except (RuntimeError, NoSuchTableError) as ex:
                    print(
                        f"[seed-dashboard] Skipping chart '{chart_spec.get('name', '<unnamed>')}' "
                        f"for dataset '{chart_spec.get('database', '<unknown>')}.{chart_spec.get('table', '<unknown>')}' "
                        f"because: {ex}"
                    )
                    continue
                items.append(
                    {
                        "slice": chart,
                        "table": chart_spec["table"],
                        "width": chart_spec.get("width", 6),
                        "height": chart_spec.get("height", 36),
                        "spec": chart_spec,
                    }
                )

            chart_items = [item for item in items if "slice" in item]
            native_filters = build_native_filter_configuration(chart_items, dashboard_spec.get("native_filters", []))
            upsert_dashboard(title, slug, items, native_filters)
            db.session.commit()
            print(f"[seed-dashboard] Done — '{title}' ({len(chart_items)} charts).")


if __name__ == "__main__":
    main()
