"""Backend entrypoint for the dashboard chatbot extension.

Superset's extension loader auto-discovers this module, imports it inside an
``extension_context``, and the ``@api`` decorator (provided at runtime by the
host) registers the class under
``/extensions/<publisher>/<name>/...``. For this extension the full mount
point is ``/extensions/my-org/dashboard-chatbot/`` (see ``extension.json`` and
the manifest in the ``.supx`` bundle). Using a plain Flask ``Blueprint`` does
NOT register routes against the host app — that was the cause of the 404 on
``POST /ask`` when the floating chatbot UI called the backend.
"""

from __future__ import annotations

import json
import os
import re
import socket
import time
import urllib.error
import urllib.request
from typing import Any

from flask import Response, request
from flask_appbuilder.api import expose, protect, safe
from superset_core.rest_api.api import RestApi
from superset_core.rest_api.decorators import api


SEARCH_LIMIT = int(os.getenv("DASHBOARD_CHATBOT_SEARCH_LIMIT", "5"))
INTENTS = ("database", "dataset", "chart", "dashboard")
MCP_BASE_URL = os.getenv("DASHBOARD_CHATBOT_MCP_BASE_URL", "http://mcp:5008").strip()
MCP_TIMEOUT_SECONDS = int(os.getenv("DASHBOARD_CHATBOT_MCP_TIMEOUT_SECONDS", "15"))
MCP_RETRIES = int(os.getenv("DASHBOARD_CHATBOT_MCP_RETRIES", "3"))
MCP_RETRY_BACKOFF_SECONDS = float(
    os.getenv("DASHBOARD_CHATBOT_MCP_RETRY_BACKOFF_SECONDS", "1")
)


def _infer_intent_with_llm(question: str) -> str | None:
    endpoint = os.getenv("DASHBOARD_CHATBOT_LLM_ENDPOINT", "").strip()
    if not endpoint:
        return None

    model = os.getenv("DASHBOARD_CHATBOT_LLM_MODEL", "").strip()
    api_key = os.getenv("DASHBOARD_CHATBOT_LLM_API_KEY", "").strip()
    timeout = int(os.getenv("DASHBOARD_CHATBOT_LLM_TIMEOUT_SECONDS", "15"))

    prompt = (
        "Classify the user request into exactly one label: "
        "database, dataset, chart, dashboard. "
        "Respond with JSON only: {\"intent\":\"<label>\"}.\n"
        f"User query: {question}"
    )

    payload = {
        "messages": [
            {"role": "system", "content": "You classify Superset search intents."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0,
    }
    if model:
        payload["model"] = model

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = json.loads(resp.read().decode("utf-8") or "{}")
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        return None

    content = ""
    try:
        content = (
            raw.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
    except Exception:
        return None

    if not content:
        return None

    try:
        parsed = json.loads(content)
        intent = str(parsed.get("intent", "")).strip().lower()
    except ValueError:
        intent = content.lower().strip()

    return intent if intent in INTENTS else None


def _infer_intent(question: str) -> str:
    llm_intent = _infer_intent_with_llm(question)
    if llm_intent:
        return llm_intent

    q = question.lower()
    if any(token in q for token in ("dashboard", "board", "slug")):
        return "dashboard"
    if any(token in q for token in ("chart", "visual", "viz", "graph", "plot")):
        return "chart"
    if any(token in q for token in ("dataset", "table", "view", "metric", "column")):
        return "dataset"
    if any(token in q for token in ("database", "db", "connection", "schema")):
        return "database"
    return "dashboard"


def _extract_search_term(question: str) -> str:
    q = question.lower().strip()
    stopwords = {
        "find",
        "search",
        "show",
        "list",
        "lookup",
        "get",
        "for",
        "me",
        "the",
        "a",
        "an",
        "all",
        "please",
        "dashboard",
        "dashboards",
        "chart",
        "charts",
        "dataset",
        "datasets",
        "database",
        "databases",
    }
    words = [w for w in re.findall(r"[a-z0-9_\-]+", q) if w not in stopwords]
    if words:
        return " ".join(words)
    return q


def _mcp_post_json(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    url = f"{MCP_BASE_URL.rstrip('/')}{path}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        },
        method="POST",
    )
    attempts = max(1, MCP_RETRIES)
    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(req, timeout=MCP_TIMEOUT_SECONDS) as resp:
                raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as ex:
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
            time.sleep(MCP_RETRY_BACKOFF_SECONDS * attempt)
    raise RuntimeError("timed out")


def _mcp_rpc(method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
    }
    if params is not None:
        payload["params"] = params
    last_error: Exception | None = None
    for path in ("/mcp", "/"):
        try:
            response = _mcp_post_json(path, payload)
            if response.get("error"):
                raise RuntimeError(str(response["error"]))
            return response.get("result", {})
        except Exception as ex:
            last_error = ex
    raise RuntimeError(f"MCP call failed for method '{method}': {last_error}")


def _mcp_list_tools() -> list[str]:
    result = _mcp_rpc("tools/list")
    tools = result.get("tools") or []
    names: list[str] = []
    for tool in tools:
        if isinstance(tool, dict) and tool.get("name"):
            names.append(str(tool["name"]))
    return names


def _pick_tool_name(intent: str, tool_names: list[str]) -> str | None:
    preferred: dict[str, tuple[str, ...]] = {
        "dashboard": ("list_dashboards", "search_dashboards", "get_dashboard_info"),
        "chart": ("list_charts", "search_charts", "get_chart_info"),
        "dataset": ("list_datasets", "search_datasets", "get_dataset_info"),
        "database": ("list_databases", "search_databases", "get_database_info"),
    }
    for candidate in preferred.get(intent, ()):
        if candidate in tool_names:
            return candidate
    intent_token = f"{intent}s"
    for name in tool_names:
        lowered = name.lower()
        if lowered.startswith("list_") and intent_token in lowered:
            return name
    for name in tool_names:
        lowered = name.lower()
        if lowered.startswith("search_") and intent_token in lowered:
            return name
    return None


def _extract_results_from_tool_payload(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    if not isinstance(payload, dict):
        return []
    for key in ("result", "results", "items", "dashboards", "charts", "datasets", "databases"):
        value = payload.get(key)
        if isinstance(value, list):
            return [row for row in value if isinstance(row, dict)]
    if all(k in payload for k in ("id", "name")):
        return [payload]
    return []


def _normalize_mcp_content(result: dict[str, Any]) -> list[dict[str, Any]]:
    content = result.get("content") or []
    for block in content:
        if not isinstance(block, dict):
            continue
        if block.get("type") == "json":
            rows = _extract_results_from_tool_payload(block.get("json"))
            if rows:
                return rows
        if block.get("type") == "text":
            text_payload = str(block.get("text", "")).strip()
            if not text_payload:
                continue
            try:
                parsed = json.loads(text_payload)
            except ValueError:
                continue
            rows = _extract_results_from_tool_payload(parsed)
            if rows:
                return rows
    rows = _extract_results_from_tool_payload(result)
    return rows


def _search_via_mcp(intent: str, query: str, limit: int = SEARCH_LIMIT) -> list[dict[str, Any]]:
    tool_names = _mcp_list_tools()
    tool_name = _pick_tool_name(intent, tool_names)
    if not tool_name:
        raise RuntimeError(f"no MCP tool found for intent '{intent}'")

    candidate_args: list[dict[str, Any]] = [
        {"page": 1, "page_size": limit, "search": query},
        {"page": 1, "page_size": limit, "q": query},
        {"search": query, "limit": limit},
        {"q": query, "limit": limit},
        {"query": query, "limit": limit},
        {"limit": limit},
        {},
    ]
    for args in candidate_args:
        try:
            result = _mcp_rpc("tools/call", {"name": tool_name, "arguments": args})
            rows = _normalize_mcp_content(result)
            if not rows and args not in ({}, {"limit": limit}):
                continue
            if not query:
                return rows[:limit]
            filtered = [
                row
                for row in rows
                if query.lower() in json.dumps(row, default=str).lower()
            ]
            return (filtered or rows)[:limit]
        except Exception:
            continue
    raise RuntimeError(f"MCP search failed via tool '{tool_name}'")


def _build_answer(intent: str, search_term: str, results: list[dict[str, Any]]) -> str:
    if not results:
        return f"I searched {intent}s for '{search_term}' but found no matches."

    top = ", ".join(str(r.get("name", "")) for r in results[:3])
    if len(results) > 3:
        top = f"{top}, and {len(results) - 3} more"
    return f"I found {len(results)} {intent}(s) for '{search_term}': {top}."


@api(
    id="dashboard_chatbot_api",
    name="Dashboard Chatbot API",
    description="Endpoints that power the dashboard chat assistant.",
)
class DashboardChatbotAPI(RestApi):
    openapi_spec_tag = "Dashboard Chatbot"
    class_permission_name = "dashboard_chatbot"

    @expose("/health", methods=("GET",))
    @protect()
    @safe
    def health(self) -> Response:
        return self.response(
            200,
            result={"status": "ok", "extension": "dashboard_chatbot"},
        )

    @expose("/ask", methods=("POST",))
    @protect()
    @safe
    def ask(self) -> Response:
        payload = request.get_json(silent=True) or {}
        question = str(payload.get("question", "")).strip()
        if not question:
            return self.response_400(message="question is required")

        intent = _infer_intent(question)
        search_term = _extract_search_term(question)
        try:
            results = _search_via_mcp(intent, search_term)
        except Exception as ex:
            return self.response_500(message=f"search failed: {ex}")

        return self.response(
            200,
            result={
                "answer": _build_answer(intent, search_term, results),
                "intent": intent,
                "search_term": search_term,
                "results": results,
            },
        )
