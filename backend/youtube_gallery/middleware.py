from typing import Any, Callable

from django.http import HttpRequest, HttpResponse, HttpResponsePermanentRedirect


class SlashlessMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # If URL ends with / but isn't the root, redirect to non-slash version
        if request.path != "/" and request.path.endswith("/"):
            new_path = request.path[:-1]
            if request.method in ("GET", "HEAD"):
                return HttpResponsePermanentRedirect(new_path)

            request.path = request.path[:-1]  # Remove trailing slash
            request.path_info = request.path

        return self.get_response(request)
