from functools import wraps
from typing import Callable, TypeVar, ParamSpec

from google.auth.transport.requests import Request
from rest_framework import status
from rest_framework.response import Response
from users.models import UserYouTubeCredentials

P = ParamSpec("P")
R = TypeVar("R")


def youtube_auth_required(view_func: Callable[P, R]) -> Callable[P, R | Response]:
    @wraps(view_func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R | Response:
        request = args[1] if len(args) > 1 else kwargs.get("request")

        try:
            user_credentials = UserYouTubeCredentials.objects.get(user=request.user)
        except UserYouTubeCredentials.DoesNotExist:
            return Response(
                {
                    "error": "YouTube authentication required",
                    "message": "Please authenticate with Google to access YouTube features",
                    "youtube_auth_required": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            credentials = user_credentials.to_google_credentials()

            if not credentials.valid:
                if credentials.expired and credentials.refresh_token:
                    credentials.refresh(Request())
                    user_credentials.update_from_credentials(credentials)
                else:
                    return Response(
                        {
                            "error": "YouTube authentication expired",
                            "message": "Please re-authenticate with Google",
                            "youtube_auth_required": True,
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

            request.youtube_credentials = credentials

        except Exception:
            return Response(
                {
                    "error": "Failed to refresh YouTube authentication",
                    "message": "Please re-authenticate with Google",
                    "youtube_auth_required": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return view_func(*args, **kwargs)

    return wrapper  # type: ignore[return-value]
