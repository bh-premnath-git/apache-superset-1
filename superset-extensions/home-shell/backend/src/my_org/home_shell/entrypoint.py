"""Backend entrypoint for the India Segmentation Home Shell extension.

Mounts at ``/extensions/my-org/home-shell/...``. Today this is a stub: the
frontend renders dummy data inline and does not call any backend endpoint.
The ``/health`` endpoint exists so operators can verify the extension is
loaded; future routes will serve segmentation aggregates and the choropleth
GeoJSON for the prevalence map.
"""

from __future__ import annotations

from flask import Response
from flask_appbuilder.api import expose, protect, safe
from superset_core.rest_api.api import RestApi
from superset_core.rest_api.decorators import api


@api(
    id="home_shell_api",
    name="Home Shell API",
    description="Endpoints for the India Segmentation Home Shell extension.",
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
