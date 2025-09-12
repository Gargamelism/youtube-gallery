from urllib.parse import unquote, urlparse

import requests
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from videos.decorators import store_google_credentials
from videos.services.youtube import YouTubeAuthenticationError, YouTubeService

from .models import User, UserChannel, UserVideo, ChannelTag, UserChannelTag
from .serializers import (
    ChannelTagSerializer,
    UserChannelSerializer,
    UserLoginSerializer,
    UserRegistrationSerializer,
    UserSerializer,
    UserVideoSerializer,
)
from videos.validators import TagAssignmentParams


def _is_safe_url(url, request):
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


def validate_recaptcha_v3(token, action, threshold=0.5):
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
        response = requests.post("https://www.google.com/recaptcha/api/siteverify", data=data, timeout=10)
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
def register_view(request):
    captcha_token = request.data.get("captcha_token")
    if not validate_recaptcha_v3(captcha_token, "register"):
        return Response({"error": "Invalid captcha"}, status=status.HTTP_400_BAD_REQUEST)

    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        return Response(
            {"user": UserSerializer(user).data, "token": token.key},
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request):
    captcha_token = request.data.get("captcha_token")
    if not validate_recaptcha_v3(captcha_token, "login"):
        return Response({"error": "Invalid captcha"}, status=status.HTTP_400_BAD_REQUEST)

    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data["user"]
        token, created = Token.objects.get_or_create(user=user)
        return Response({"user": UserSerializer(user).data, "token": token.key})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    try:
        request.user.auth_token.delete()
    except:
        pass
    return Response({"message": "Successfully logged out"})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def profile_view(request):
    return Response(UserSerializer(request.user).data)


class UserChannelViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
    serializer_class = UserChannelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserChannel.objects.filter(user=self.request.user).select_related("channel").prefetch_related("channel_tags__tag").order_by("channel__title")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["get", "put"], url_path="tags")
    def channel_tags(self, request, pk=None):
        """Get or assign tags for a channel"""
        user_channel = self.get_object()

        if request.method == "GET":
            # Get tags assigned to a channel
            tags = ChannelTag.objects.filter(channel_assignments__user_channel=user_channel)
            serializer = ChannelTagSerializer(tags, many=True)
            return Response(serializer.data)

        elif request.method == "PUT":
            # Assign tags to a channel using Pydantic validation
            params = TagAssignmentParams.from_request(request)

            # Remove existing tag assignments
            UserChannelTag.objects.filter(user_channel=user_channel).delete()

            # Create new tag assignments
            tags = ChannelTag.objects.filter(user=request.user, id__in=params.tag_ids)
            tag_assignments = [UserChannelTag(user_channel=user_channel, tag=tag) for tag in tags]
            UserChannelTag.objects.bulk_create(tag_assignments)

            # Return updated channel data
            serializer = self.get_serializer(user_channel)
            return Response(serializer.data)


class UserVideoViewSet(viewsets.ModelViewSet):
    serializer_class = UserVideoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserVideo.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.validated_data.get("is_watched") and not serializer.instance.watched_at:
            serializer.save(watched_at=timezone.now())
        else:
            serializer.save()


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def youtube_auth_url(request):
    """Get YouTube OAuth URL for authenticated user"""
    # Store return URL in session for post-auth redirect
    return_url = request.GET.get("return_url")
    if return_url and _is_safe_url(return_url, request):
        request.session["auth_return_url"] = return_url

    redirect_uri = request.GET.get("redirect_uri")
    if not redirect_uri:
        # Construct consistent redirect URI
        redirect_uri = f"{request.scheme}://{request.get_host()}/api/auth/youtube/callback"
    else:
        # Frontend sends URL-encoded redirect URI, so decode it
        redirect_uri = unquote(redirect_uri)

    try:
        service = YouTubeService(redirect_uri=redirect_uri)
        return Response({"message": "Already authenticated", "authenticated": True})
    except YouTubeAuthenticationError as e:
        if hasattr(e, "auth_url") and e.auth_url:
            return Response({"auth_url": e.auth_url, "authenticated": False})
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def youtube_auth_callback(request):
    """Handle OAuth callback and store credentials in session"""
    authorization_code = request.GET.get("code")
    if not authorization_code:
        return HttpResponse("Authorization failed: No code provided", status=status.HTTP_400_BAD_REQUEST)

    # Use the exact same redirect URI format as sent to Google originally
    # This ensures consistency and avoids invalid_grant errors
    redirect_uri = f"{request.scheme}://{request.get_host()}/api/auth/youtube/callback"

    credentials = YouTubeService.handle_oauth_callback(authorization_code, redirect_uri)

    store_google_credentials(request.session, credentials)

    redirect_url = request.session.pop("auth_return_url", settings.FRONTEND_URL)
    return redirect(redirect_url)


class ChannelTagViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
    serializer_class = ChannelTagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ChannelTag.objects.filter(user=self.request.user).prefetch_related("channel_assignments")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
