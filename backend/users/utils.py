from google.auth.transport.requests import Request

from .models import UserYouTubeCredentials


def get_youtube_credentials(user):
    """
    Retrieve a valid Google (YouTube) credentials object for the given user, refreshing and persisting it if necessary.
    
    Parameters:
        user: The user model instance whose YouTube credentials should be fetched.
    
    Returns:
        credentials: A Google credentials object usable with Google APIs if available; `None` if no credentials exist or they cannot be obtained.
    """
    try:
        user_credentials = UserYouTubeCredentials.objects.get(user=user)
        credentials = user_credentials.to_google_credentials()

        if credentials.valid:
            return credentials
        elif credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            user_credentials.update_from_credentials(credentials)
            return credentials

    except UserYouTubeCredentials.DoesNotExist:
        return None
    except Exception:
        return None

    return None
