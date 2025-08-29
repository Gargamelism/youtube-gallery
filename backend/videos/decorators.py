from functools import wraps
from rest_framework import status
from rest_framework.response import Response
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import json
from datetime import datetime, timedelta
from videos.services.youtube import YouTubeService, YOUTUBE_SCOPES, GoogleCredentialsData


def youtube_auth_required(view_func):
    @wraps(view_func)
    def wrapper(self, request, *args, **kwargs):
        credentials_data = request.session.get("google_credentials")

        if not credentials_data:
            return Response(
                {
                    "error": "YouTube authentication required",
                    "message": "Please authenticate with Google to access YouTube features",
                    "youtube_auth_required": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            credentials = YouTubeService.create_credentials(credentials_data)

            if not credentials.valid:
                if credentials.expired and credentials.refresh_token:
                    credentials.refresh(Request())
                    store_google_credentials(request.session, credentials)
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
        except (json.JSONDecodeError, KeyError, TypeError):
            return Response(
                {
                    "error": "Invalid authentication data",
                    "message": "Corrupted session data, please re-authenticate",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            return Response(
                {
                    "error": "Authentication validation failed",
                    "message": "Unable to validate YouTube credentials",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return view_func(self, request, *args, **kwargs)

    return wrapper


def store_google_credentials(session, credentials):
    if isinstance(credentials, Credentials):
        # Store from Credentials object
        credentials_data = {
            "token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": list(credentials.scopes) if credentials.scopes else [],
            "expiry": credentials.expiry.isoformat() if credentials.expiry else None,
        }
    else:
        # Store from raw Google OAuth response
        credentials_data = credentials.copy()
        if "expires_in" in credentials_data:
            expires_in = credentials_data.pop("expires_in")
            expiry = datetime.now() + timedelta(seconds=expires_in)
            credentials_data["expiry"] = expiry.isoformat()
        
        # Map Google OAuth field names to our expected field names
        if "access_token" in credentials_data:
            credentials_data["token"] = credentials_data.pop("access_token")
    
    session["google_credentials"] = json.dumps(credentials_data)
    session.save()


def get_youtube_credentials(session):
    credentials_data = session.get("google_credentials")
    if not credentials_data:
        return None

    try:
        credentials = YouTubeService.create_credentials(credentials_data)

        if credentials.valid:
            return credentials
        elif credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            store_google_credentials(session, credentials)
            return credentials

    except Exception:
        return None

    return None
