from __future__ import annotations

import secrets
from datetime import timedelta
from typing import Any, cast
from urllib.parse import unquote, urlparse

from django.conf import settings
from django.db.models import QuerySet
from django.http import HttpResponse, HttpRequest
from django.shortcuts import redirect
from django.utils import timezone
from django.utils import timezone as dj_tz

from rest_framework import permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer

from users.models import User, UserChannel
from users.utils import get_youtube_credentials
from videos.services.youtube import YouTubeAuthenticationError, YouTubeService
from videos.services.user_quota_tracker import UserQuotaTracker

from .authentication import CookieTokenAuthentication
from .models import UserVideo, ChannelTag, UserChannelTag, UserYouTubeCredentials
from .serializers import (
    ChannelTagSerializer,
    UserChannelSerializer,
    UserLoginSerializer,
    UserRegistrationSerializer,
    UserSerializer,
    UserVideoSerializer,
)
from .services.channel_search import ChannelSearchService
from videos.validators import ChannelSearchParams, TagAssignmentParams
from videos.serializers import ChannelSerializer
from youtube_gallery.utils.http import http


def _is_safe_url(url: str, request: HttpRequest) -> bool:
    """
    Validate that a redirect URL is safe to prevent open redirect attacks
    """
    try:
        parsed_url = urlparse(url)
        # Allow same-origin URLs
        if not parsed_url.netloc:
            return True
        # Allow frontend URL from settings
        frontend_parsed = urlparse(settings.FRONTEND_URL)
        return parsed_url.netloc == frontend_parsed.netloc
    except Exception:
        return False


def validate_recaptcha_v3(token: str | None, action: str, threshold: float = 0.5) -> bool:
    """
    Validate reCAPTCHA v3 token

    Args:
        token: The reCAPTCHA token from the frontend
        action: The action that was specified when executing reCAPTCHA (e.g., 'login', 'register')
        threshold: Minimum score to consider valid (0.0 to 1.0, default 0.5)

    Returns:
        bool: True if validation passes, False otherwise
    """
    data = {"secret": settings.CAPTCHA_PRIVATE_KEY, "response": token}

    try:
        response = http.post("https://www.google.com/recaptcha/api/siteverify", data=data, timeout=10)
        result = response.json()

        # Check if request was successful
        if not result.get("success", False):
            return False

        # Check if the action matches (optional but recommended)
        if result.get("action") != action:
            return False

        # Check if the score meets the threshold
        score = result.get("score", 0.0)
        return score >= threshold

    except Exception as e:
        # Log the error in production
        print(f"reCAPTCHA validation error: {e}")
        return False


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register_view(request: Request) -> Response:
    if not hasattr(request, "data"):
        return Response({"error": "Invalid request"}, status=status.HTTP_400_BAD_REQUEST)

    captcha_token = request.data.get("captcha_token")
    if not validate_recaptcha_v3(captcha_token, "register"):
        return Response({"error": "Invalid captcha"}, status=status.HTTP_400_BAD_REQUEST)

    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)

        response = Response(
            {"user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )

        auth = CookieTokenAuthentication()
        auth.set_auth_cookie(response, token.key)

        return response
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request: Request) -> Response:
    captcha_token = request.data.get("captcha_token")
    if not validate_recaptcha_v3(captcha_token, "login"):
        return Response({"error": "Invalid captcha"}, status=status.HTTP_400_BAD_REQUEST)

    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data["user"]
        token, created = Token.objects.get_or_create(user=user)

        response = Response({"user": UserSerializer(user).data})

        auth = CookieTokenAuthentication()
        auth.set_auth_cookie(response, token.key)

        return response
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request: Request) -> Response:
    user = cast(User, request.user)
    try:
        user.auth_token.delete()
    except Exception:
        pass

    response = Response({"message": "Successfully logged out"})

    auth = CookieTokenAuthentication()
    auth.clear_auth_cookie(response)

    return response


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def profile_view(request: Request) -> Response:
    return Response(UserSerializer(request.user).data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def quota_usage_view(request: Request) -> Response:
    """Get current user's quota usage information"""
    user_quota_tracker = UserQuotaTracker(user=request.user)
    usage_info = user_quota_tracker.get_user_usage_summary()

    now = dj_tz.now()
    next_midnight_utc = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)

    return Response(
        {
            "daily_limit": usage_info["daily_limit"],
            "used": usage_info["daily_usage"],
            "remaining": usage_info["remaining"],
            "percentage_used": usage_info["percentage_used"],
            "status": usage_info["status"],
            "operations_breakdown": usage_info["operations_count"],
            "resets_at": next_midnight_utc.isoformat(),
        }
    )


class UserChannelViewSet(viewsets.ModelViewSet):  # type: ignore[type-arg]
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
    serializer_class = UserChannelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[UserChannel]:
        search_params = ChannelSearchParams.from_request(self.request)
        user = cast(User, self.request.user)
        search_service = ChannelSearchService(user)
        return search_service.search_user_channels(
            tag_names=search_params.tags,
            tag_mode=search_params.tag_mode,
            search_query=search_params.search_query,
        )

    def perform_create(self, serializer: BaseSerializer[Any]) -> None:
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="available")
    def available_channels(self, request: Request) -> Response:
        """Get paginated list of available (non-subscribed) channels"""
        search_params = ChannelSearchParams.from_request(request)
        user = cast(User, request.user)
        search_service = ChannelSearchService(user)
        channels = search_service.search_available_channels(
            search_query=search_params.search_query,
        )

        page = self.paginate_queryset(channels)
        if page is not None:
            serializer = ChannelSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)

        serializer = ChannelSerializer(channels, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get", "put"], url_path="tags")
    def channel_tags(self, request: Request, pk: Any = None) -> Response:
        """Get or assign tags for a channel"""
        user_channel = self.get_object()

        if request.method == "GET":
            tags = ChannelTag.objects.filter(channel_assignments__user_channel=user_channel)
            serializer = ChannelTagSerializer(tags, many=True)
            return Response(serializer.data)

        elif request.method == "PUT":
            params = TagAssignmentParams.from_request(request)  # type: ignore[no-untyped-call]
            UserChannelTag.objects.filter(user_channel=user_channel).delete()
            user = cast(User, request.user)
            tags = ChannelTag.objects.filter(user=user, id__in=params.tag_ids)
            tag_assignments = [UserChannelTag(user_channel=user_channel, tag=tag) for tag in tags]
            UserChannelTag.objects.bulk_create(tag_assignments)
            channel_serializer: UserChannelSerializer = cast(UserChannelSerializer, self.get_serializer(user_channel))
            return Response(channel_serializer.data)

        return Response({"error": "Method not allowed"}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


class UserVideoViewSet(viewsets.ModelViewSet):  # type: ignore[type-arg]
    serializer_class = UserVideoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[UserVideo]:
        user = cast(User, self.request.user)
        return UserVideo.objects.filter(user=user)

    def perform_create(self, serializer: BaseSerializer[Any]) -> None:
        serializer.save(user=self.request.user)

    def perform_update(self, serializer: BaseSerializer[Any]) -> None:
        instance = serializer.instance
        if serializer.validated_data.get("is_watched") and instance and not instance.watched_at:
            serializer.save(watched_at=timezone.now())
        else:
            serializer.save()


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def youtube_auth_url(request: Request) -> Response:
    """Get YouTube OAuth URL for authenticated user"""
    # Check if user already has valid credentials
    existing_credentials = get_youtube_credentials(request.user)  # type: ignore[no-untyped-call]
    if existing_credentials:
        return Response({"message": "Already authenticated", "authenticated": True})

    # Store return URL in session for post-auth redirect
    return_url = request.GET.get("return_url")
    if return_url and _is_safe_url(return_url, request._request):
        request.session["auth_return_url"] = return_url

    redirect_uri = request.GET.get("redirect_uri")
    if not redirect_uri:
        redirect_uri = f"{request.scheme}://{request.get_host()}/api/auth/youtube/callback"
    else:
        redirect_uri = unquote(redirect_uri)

    # CSRF protection state
    request.session["oauth_redirect_uri"] = redirect_uri
    state = secrets.token_urlsafe(32)
    request.session["oauth_state"] = state
    request.session.save()

    try:
        auth_url = YouTubeService._generate_oauth_url(redirect_uri=redirect_uri, state=state)
        if not auth_url:
            return Response(
                {"error": "Failed to generate authentication URL"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        return Response({"auth_url": auth_url, "authenticated": False})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def youtube_auth_callback(request: Request) -> HttpResponse:
    """Handle OAuth callback and store credentials in database"""
    # Validate state parameter for CSRF protection
    state = request.GET.get("state")
    expected_state = request.session.get("oauth_state", None)
    if not state or not expected_state or state != expected_state:
        return HttpResponse("Invalid state parameter", status=status.HTTP_400_BAD_REQUEST)

    authorization_code = request.GET.get("code")
    if not authorization_code:
        return HttpResponse("Authorization failed: No code provided", status=status.HTTP_400_BAD_REQUEST)

    redirect_uri = request.session.pop(
        "oauth_redirect_uri", f"{request.scheme}://{request.get_host()}/api/auth/youtube/callback"
    )

    try:
        credentials = YouTubeService.handle_oauth_callback(authorization_code, redirect_uri)
        UserYouTubeCredentials.from_credentials_data(request.user, credentials)  # type: ignore[no-untyped-call]
    except YouTubeAuthenticationError as e:
        return HttpResponse(f"Authentication failed: {str(e)}", status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return HttpResponse(f"An error occurred: {str(e)}", status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    redirect_url = request.session.pop("auth_return_url", settings.FRONTEND_URL)
    return redirect(redirect_url)


class ChannelTagViewSet(viewsets.ModelViewSet):  # type: ignore[type-arg]
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
    serializer_class = ChannelTagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[ChannelTag]:
        user = cast(User, self.request.user)
        return ChannelTag.objects.filter(user=user).prefetch_related("channel_assignments")

    def perform_create(self, serializer: BaseSerializer[Any]) -> None:
        serializer.save(user=self.request.user)
