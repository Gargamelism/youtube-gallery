from functools import wraps

from google.auth.transport.requests import Request
from rest_framework import status
from rest_framework.response import Response
from users.models import UserYouTubeCredentials


def youtube_auth_required(view_func):
    """
    Decorator that ensures the requesting user has valid YouTube (Google) credentials and attaches them to the request.
    
    When applied to a DRF view method, the wrapper:
    - Retrieves per-user YouTube credentials from UserYouTubeCredentials.
    - Attempts to refresh expired credentials if a refresh token is available and updates the stored credentials.
    - Attaches the resulting Google credentials to request.youtube_credentials.
    - Returns an HTTP 403 Response with an error payload if credentials are missing, expired without refresh, or cannot be refreshed.
    
    Parameters:
        view_func (callable): The view method to wrap.
    
    Returns:
        callable: A wrapped view function that enforces YouTube authentication; the wrapper returns the original view's response when credentials are valid, or a 403 Response otherwise.
    """
    @wraps(view_func)
    def wrapper(self, request, *args, **kwargs):
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

        except Exception as refresh_error:
            return Response(
                {
                    "error": "Failed to refresh YouTube authentication",
                    "message": "Please re-authenticate with Google",
                    "youtube_auth_required": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return view_func(self, request, *args, **kwargs)

    return wrapper


