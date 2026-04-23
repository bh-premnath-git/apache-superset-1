"""Backend entrypoint for the dashboard chatbot extension scaffold."""

from flask import Blueprint, jsonify, request

blueprint = Blueprint("dashboard_chatbot", __name__)


@blueprint.get("/health")
def health() -> tuple[dict[str, str], int]:
    return {"status": "ok", "extension": "dashboard_chatbot"}, 200


@blueprint.post("/ask")
def ask() -> tuple[dict[str, object], int]:
    payload = request.get_json(silent=True) or {}
    question = str(payload.get("question", "")).strip()
    if not question:
        return {"message": "question is required"}, 400

    # Placeholder implementation; replace with LLM + retrieval pipeline.
    return {
        "answer": f"Received question: {question}",
        "next_step": "Wire this endpoint to your approved chatbot backend.",
    }, 200
