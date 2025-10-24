from typing import Any

from google.auth.transport.requests import Request

from .models import User, UserYouTubeCredentials


def get_youtube_credentials(user: User) -> Any | None:
    """Get valid YouTube credentials for a user from database"""
    try:
        user_credentials = UserYouTubeCredentials.objects.get(user=user)
        credentials = user_credentials.to_google_credentials()

        if credentials.valid:
            return credentials
        elif credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())  # type: ignore[no-untyped-call]
            user_credentials.update_from_credentials(credentials)
            return credentials

    except UserYouTubeCredentials.DoesNotExist:
        return None
    except Exception:
        return None

    return None
