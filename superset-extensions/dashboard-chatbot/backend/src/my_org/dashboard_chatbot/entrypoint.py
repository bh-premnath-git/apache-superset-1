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
import threading
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
MCP_PROTOCOL_VERSION = os.getenv(
    "DASHBOARD_CHATBOT_MCP_PROTOCOL_VERSION", "2025-06-18"
).strip()
MCP_PROTOCOL_FALLBACKS: tuple[str, ...] = (
    MCP_PROTOCOL_VERSION,
    "2025-03-26",
    "2024-11-05",
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
    return ""


class _MCPHTTPNotFound(Exception):
    """Raised when an MCP endpoint path returns 404 with no active session."""


class _MCPSessionExpired(Exception):
    """Raised when the server returns 404 for a request bearing a session id.

    Per the MCP Streamable HTTP spec, this is the signal that the session has
    been terminated and the client must re-initialize.
    """


def _parse_sse_payload(raw: str) -> dict[str, Any] | None:
    """Extract the JSON-RPC *response* from an SSE stream.

    MCP Streamable HTTP servers interleave ``notifications/message`` events
    (server-pushed log lines with no ``id``) before the actual JSON-RPC
    response (which carries the ``id`` we sent).  We must skip every
    notification and return only the response frame.
    """
    buffer: list[str] = []
    fallback: dict[str, Any] | None = None
    for line in raw.splitlines():
        if line.startswith("data:"):
            buffer.append(line[len("data:"):].lstrip())
        elif not line and buffer:
            data = "".join(buffer).strip()
            buffer.clear()
            if not data:
                continue
            try:
                msg = json.loads(data)
            except ValueError:
                continue
            if not isinstance(msg, dict):
                continue
            # A JSON-RPC response always has "id"; notifications don't.
            if "id" in msg:
                return msg
            if fallback is None:
                fallback = msg
    if buffer:
        data = "".join(buffer).strip()
        if data:
            try:
                msg = json.loads(data)
                if isinstance(msg, dict) and "id" in msg:
                    return msg
                if fallback is None:
                    fallback = msg if isinstance(msg, dict) else None
            except ValueError:
                pass
    return fallback


class _MCPSession:
    """Cached MCP Streamable HTTP client.

    Implements the official lifecycle (initialize -> notifications/initialized
    -> operate) once and reuses the resolved endpoint path, the negotiated
    protocol version, and the ``Mcp-Session-Id`` header on subsequent JSON-RPC
    calls. The session is rebuilt automatically when the server returns 404
    for a request bearing a session id, which the spec defines as the signal
    that the session has expired.
    """

    CANDIDATE_PATHS: tuple[str, ...] = ("/mcp", "/")

    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._lock = threading.Lock()
        self._endpoint_path: str | None = None
        self._session_id: str | None = None
        self._protocol_version: str = MCP_PROTOCOL_VERSION
        self._request_id = 0

    def call(self, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        with self._lock:
            for attempt in (1, 2):
                if self._endpoint_path is None:
                    self._initialize()
                try:
                    return self._request(method, params)
                except _MCPSessionExpired:
                    self._endpoint_path = None
                    self._session_id = None
                    if attempt == 2:
                        raise RuntimeError(
                            f"MCP call failed for method '{method}': "
                            "session expired and re-initialize failed"
                        )
            raise RuntimeError("unreachable")

    def _next_id(self) -> int:
        self._request_id += 1
        return self._request_id

    def _initialize(self) -> None:
        last_error: Exception | None = None
        seen_protocols: list[str] = []
        for version in MCP_PROTOCOL_FALLBACKS:
            if not version or version in seen_protocols:
                continue
            seen_protocols.append(version)
            self._protocol_version = version
            for path in self.CANDIDATE_PATHS:
                init_payload = {
                    "jsonrpc": "2.0",
                    "id": self._next_id(),
                    "method": "initialize",
                    "params": {
                        "protocolVersion": self._protocol_version,
                        "capabilities": {},
                        "clientInfo": {
                            "name": "superset-dashboard-chatbot",
                            "version": "1.0.0",
                        },
                    },
                }
                try:
                    response, headers, _ = self._post(path, init_payload)
                except _MCPHTTPNotFound as ex:
                    last_error = ex
                    continue
                except Exception as ex:
                    last_error = ex
                    continue

                if not response or response.get("error"):
                    last_error = RuntimeError(
                        str(response.get("error")) if response else "empty initialize response"
                    )
                    continue

                result = response.get("result") or {}
                negotiated = str(result.get("protocolVersion") or "").strip()
                if negotiated:
                    self._protocol_version = negotiated
                self._session_id = headers.get("mcp-session-id")
                self._endpoint_path = path

                try:
                    self._post(
                        path,
                        {"jsonrpc": "2.0", "method": "notifications/initialized"},
                    )
                except Exception as ex:
                    self._endpoint_path = None
                    self._session_id = None
                    last_error = ex
                    continue
                return

        raise RuntimeError(f"MCP initialize failed: {last_error}")

    def _request(self, method: str, params: dict[str, Any] | None) -> dict[str, Any]:
        assert self._endpoint_path is not None
        payload: dict[str, Any] = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": method,
        }
        if params is not None:
            payload["params"] = params
        response, _, _ = self._post(self._endpoint_path, payload)
        if response is None:
            raise RuntimeError(f"empty response for method '{method}'")
        if response.get("error"):
            raise RuntimeError(f"MCP call failed for method '{method}': {response['error']}")
        return response.get("result", {})

    def _post(
        self,
        path: str,
        payload: dict[str, Any],
    ) -> tuple[dict[str, Any] | None, dict[str, str], int]:
        url = f"{self._base_url}{path}"
        is_initialize = payload.get("method") == "initialize"
        body = json.dumps(payload).encode("utf-8")
        attempts = max(1, MCP_RETRIES)
        last_network_error: Exception | None = None
        for attempt in range(1, attempts + 1):
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
            }
            if not is_initialize:
                headers["MCP-Protocol-Version"] = self._protocol_version
            if self._session_id:
                headers["Mcp-Session-Id"] = self._session_id
            req = urllib.request.Request(url, data=body, headers=headers, method="POST")
            try:
                with urllib.request.urlopen(req, timeout=MCP_TIMEOUT_SECONDS) as resp:
                    status = resp.status
                    response_headers = {k.lower(): v for k, v in resp.headers.items()}
                    raw = resp.read().decode("utf-8") if status != 202 else ""
                if status == 202 or not raw:
                    return None, response_headers, status
                content_type = response_headers.get("content-type", "")
                if "text/event-stream" in content_type:
                    return _parse_sse_payload(raw), response_headers, status
                return json.loads(raw), response_headers, status
            except urllib.error.HTTPError as ex:
                if ex.code == 404:
                    if self._session_id and not is_initialize:
                        raise _MCPSessionExpired() from ex
                    raise _MCPHTTPNotFound(f"{url}: {ex.reason}") from ex
                err_body = ""
                try:
                    err_body = ex.read().decode("utf-8", errors="ignore")[:1000]
                except Exception:
                    pass
                raise RuntimeError(
                    f"MCP HTTP {ex.code} from {url}: {ex.reason} — {err_body}"
                ) from None
            except (TimeoutError, socket.timeout, urllib.error.URLError) as ex:
                timed_out = isinstance(ex, (TimeoutError, socket.timeout)) or "timed out" in str(ex).lower()
                last_network_error = ex
                if not timed_out or attempt >= attempts:
                    raise RuntimeError(f"MCP request to {url} failed: {ex}") from ex
                time.sleep(MCP_RETRY_BACKOFF_SECONDS * attempt)
        raise RuntimeError(f"MCP request to {url} failed: {last_network_error}")


_mcp_session = _MCPSession(MCP_BASE_URL)


def _mcp_rpc(method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    return _mcp_session.call(method, params)


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
    direct_rows = _extract_results_from_tool_payload(result)
    if direct_rows:
        return direct_rows

    content = result.get("content") or []
    for block in content:
        if not isinstance(block, dict):
            continue
        if block.get("type") == "json":
            json_payload = block.get("json")
            rows = _extract_results_from_tool_payload(json_payload)
            if not rows and isinstance(json_payload, dict):
                rows = _normalize_mcp_content(json_payload)
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
            if not rows and isinstance(parsed, dict):
                rows = _normalize_mcp_content(parsed)
            if rows:
                return rows
    return []


def _extract_text_blocks(result: dict[str, Any]) -> list[str]:
    content = result.get("content") or []
    texts: list[str] = []
    for block in content:
        if isinstance(block, dict) and block.get("type") == "text":
            text_payload = str(block.get("text", "")).strip()
            if text_payload:
                texts.append(text_payload)
    return texts


def _is_wrapper_mcp(tool_names: list[str]) -> bool:
    return "search_tools" in tool_names and "call_tool" in tool_names


def _discover_tool_name_via_wrapper(intent: str) -> str | None:
    result = _mcp_rpc("tools/call", {"name": "search_tools", "arguments": {"query": intent}})
    for text in _extract_text_blocks(result):
        try:
            parsed = json.loads(text)
        except ValueError:
            continue
        if not isinstance(parsed, list):
            continue
        discovered: list[str] = []
        for row in parsed:
            if isinstance(row, dict) and row.get("name"):
                discovered.append(str(row["name"]))
        candidate = _pick_tool_name(intent, discovered)
        if candidate:
            return candidate
    return None


def _search_via_mcp(intent: str, query: str, limit: int = SEARCH_LIMIT) -> list[dict[str, Any]]:
    tool_names = _mcp_list_tools()
    tool_name = _pick_tool_name(intent, tool_names)
    wrapper_mode = _is_wrapper_mcp(tool_names)
    if not tool_name and wrapper_mode:
        tool_name = _discover_tool_name_via_wrapper(intent)
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
    last_error: Exception | None = None
    for args in candidate_args:
        try:
            if wrapper_mode:
                wrapped_args = {"request": args} if args else {}
                result = _mcp_rpc(
                    "tools/call",
                    {
                        "name": "call_tool",
                        "arguments": {
                            "name": tool_name,
                            "arguments": wrapped_args,
                        },
                    },
                )
            else:
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
        except Exception as ex:
            last_error = ex
            continue
    raise RuntimeError(f"MCP search failed via tool '{tool_name}': {last_error}")


def _result_display_name(row: dict[str, Any]) -> str:
    for key in ("dashboard_title", "slice_name", "table_name", "database_name",
                "name", "title", "verbose_name"):
        val = row.get(key)
        if val:
            return str(val)
    return str(row.get("id", ""))


def _build_answer(intent: str, search_term: str, results: list[dict[str, Any]]) -> str:
    if not results:
        if search_term:
            return f"I searched {intent}s for '{search_term}' but found no matches."
        return f"No {intent}s found."

    top = ", ".join(_result_display_name(r) for r in results[:3])
    if len(results) > 3:
        top = f"{top}, and {len(results) - 3} more"
    if search_term:
        return f"I found {len(results)} {intent}(s) for '{search_term}': {top}."
    return f"I found {len(results)} {intent}(s): {top}."


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
