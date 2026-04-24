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

from flask import Response, request
from flask_appbuilder.api import expose, protect, safe
from superset_core.rest_api.api import RestApi
from superset_core.rest_api.decorators import api


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

        # Placeholder implementation; replace with LLM + retrieval pipeline.
        return self.response(
            200,
            result={
                "answer": f"Received question: {question}",
                "next_step": (
                    "Wire this endpoint to your approved chatbot backend."
                ),
            },
        )
