from __future__ import annotations

from typing import Any, cast

from django.db.models import QuerySet
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer
from users.models import User, UserVideo, UserWatchPreferences

from .decorators import youtube_auth_required
from .models import Channel, Video
from .serializers import ChannelSerializer, VideoListSerializer, VideoSerializer
from .services.search import VideoSearchService
from .services.user_quota_tracker import UserQuotaTracker
from .services.youtube import YouTubeAuthenticationError, YouTubeService
from .exceptions import UserQuotaExceededError
from .validators import VideoSearchParams, WatchStatus, WatchProgressUpdateParams


class ChannelViewSet(viewsets.ModelViewSet):  # type: ignore[type-arg]
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["channel_id"]
    search_fields = ["title", "description"]
    ordering_fields = ["title", "created_at"]
    ordering = ["title"]

    @action(detail=False, methods=["post"])
    @youtube_auth_required
    def fetch_from_youtube(self, request: Request) -> Response:
        """Import channel from YouTube with per-user quota limits"""
        channel_id = request.data.get("channel_id")
        if not channel_id:
            raise ValidationError({"channel_id": "This field is required."})

        try:
            user = cast(User, request.user)
            user_quota_tracker = UserQuotaTracker(user=user)
            youtube_service = YouTubeService(credentials=request.youtube_credentials, quota_tracker=user_quota_tracker)
            channel = youtube_service.import_or_create_channel(channel_id)
            serializer = self.get_serializer(channel, context={"request": request})
            return Response(serializer.data)

        except UserQuotaExceededError as e:
            quota_info = e.quota_info or {}
            daily_usage = quota_info.get("daily_usage")
            daily_limit = quota_info.get("daily_limit")
            message = e.args[0]

            if daily_usage is not None and daily_limit is not None:
                message = f"You've used {daily_usage}/{daily_limit} quota units today"

            return Response(
                {
                    "error": "Daily quota limit exceeded",
                    "quota_info": quota_info,
                    "message": message,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        except YouTubeAuthenticationError:
            return Response(
                {
                    "error": "YouTube authentication failed",
                    "youtube_auth_required": True,
                    "message": "Please re-authenticate with Google",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        except Exception as e:
            print(f"Error importing channel: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["get"])
    def videos(self, request: Request, pk: Any = None) -> Response:
        channel = self.get_object()
        videos = Video.objects.filter(channel=channel)
        page = self.paginate_queryset(videos)

        # Use VideoListSerializer for consistent video list representation
        serializer_class = VideoListSerializer

        if page is not None:
            serializer = serializer_class(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = serializer_class(videos, many=True)
        return Response(serializer.data)


class VideoViewSet(viewsets.ModelViewSet):  # type: ignore[type-arg]
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["channel"]
    search_fields = ["title", "description"]
    ordering_fields = ["title", "published_at", "view_count", "like_count"]
    ordering = ["-published_at"]

    def get_queryset(self) -> QuerySet[Video]:
        search_params = VideoSearchParams.from_request(self.request)

        user = cast(User, self.request.user)
        search_service = VideoSearchService(user)
        return search_service.search_videos(
            tag_names=search_params.tags,
            tag_mode=search_params.tag_mode,
            watch_status=search_params.watch_status,
            not_interested_filter=search_params.not_interested_filter,
        )

    def get_serializer_class(self) -> type[BaseSerializer[Any]]:
        if self.action in ["list", "watched", "unwatched"]:
            return VideoListSerializer
        return VideoSerializer

    @action(detail=True, methods=["put"])
    def watch(self, request: Request, pk: Any = None) -> Response:
        video = self.get_object()
        user = cast(User, request.user)

        is_watched = request.data.get("is_watched", True)
        notes = request.data.get("notes", "")

        user_video, created = UserVideo.objects.get_or_create(
            user=user, video=video, defaults={"is_watched": is_watched, "notes": notes}
        )

        if not created:
            user_video.is_watched = is_watched
            user_video.notes = notes
            if is_watched and not user_video.watched_at:
                user_video.watched_at = timezone.now()
            user_video.save()
        elif is_watched:
            user_video.watched_at = timezone.now()
            user_video.save()

        return Response(
            {
                "status": "success",
                "is_watched": user_video.is_watched,
                "watched_at": user_video.watched_at,
                "notes": user_video.notes,
                "watch_progress_seconds": user_video.watch_progress_seconds,
                "watch_percentage": user_video.watch_percentage,
            }
        )

    @action(detail=True, methods=["put"], url_path="not-interested")
    def not_interested(self, request: Request, pk: Any = None) -> Response:
        video = self.get_object()
        user = cast(User, request.user)

        is_not_interested = request.data.get("is_not_interested", True)

        user_video, _ = UserVideo.objects.get_or_create(
            user=user,
            video=video,
        )

        user_video.is_not_interested = is_not_interested
        user_video.not_interested_at = timezone.now() if is_not_interested else None
        user_video.save()

        return Response(
            {
                "status": "success",
                "is_not_interested": user_video.is_not_interested,
                "not_interested_at": user_video.not_interested_at,
            }
        )

    @action(detail=False, methods=["get"])
    def unwatched(self, request: Request) -> Response:
        search_params = VideoSearchParams.from_request(self.request)

        user = cast(User, self.request.user)
        search_service = VideoSearchService(user)
        videos = search_service.search_videos(
            tag_names=search_params.tags,
            tag_mode=search_params.tag_mode,
            watch_status=WatchStatus.UNWATCHED,
            not_interested_filter=search_params.not_interested_filter,
        )

        page = self.paginate_queryset(videos)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(videos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def watched(self, request: Request) -> Response:
        search_params = VideoSearchParams.from_request(self.request)

        user = cast(User, self.request.user)
        search_service = VideoSearchService(user)
        videos = search_service.search_videos(
            tag_names=search_params.tags,
            tag_mode=search_params.tag_mode,
            watch_status=WatchStatus.WATCHED,
            not_interested_filter=search_params.not_interested_filter,
        )

        page = self.paginate_queryset(videos)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(videos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def stats(self, request: Request) -> Response:
        # Use search service for stats calculation
        user = cast(User, self.request.user)
        search_service = VideoSearchService(user)
        stats = search_service.get_video_stats()

        return Response(stats)

    @action(detail=True, methods=["get", "put"], url_path="watch-progress")
    def watch_progress(self, request: Request, pk: Any = None) -> Response:
        """Get or update video watch progress with auto-mark based on user preferences"""
        video = self.get_object()
        user = cast(User, request.user)

        user_video, _ = UserVideo.objects.get_or_create(user=user, video=video)

        if request.method == "GET":
            return Response(
                {
                    "watch_progress_seconds": user_video.watch_progress_seconds,
                    "watch_percentage": user_video.watch_percentage,
                    "is_watched": user_video.is_watched,
                    "auto_marked_watched": user_video.auto_marked_watched,
                }
            )

        params = WatchProgressUpdateParams.model_validate(request.data)

        preferences, _ = UserWatchPreferences.objects.get_or_create(
            user=user,
            defaults={
                "auto_mark_watched_enabled": True,
                "auto_mark_threshold": None,
            },
        )

        user_video.watch_progress_seconds = int(params.current_time)
        current_percentage = (params.current_time / params.duration) * 100 if params.duration > 0 else 0

        auto_marked = False
        if (
            params.auto_mark
            and preferences.auto_mark_watched_enabled
            and not user_video.is_watched
            and current_percentage >= preferences.get_threshold()
        ):
            user_video.is_watched = True
            user_video.watched_at = timezone.now()
            user_video.auto_marked_watched = True
            auto_marked = True

        user_video.save()

        threshold = preferences.get_threshold()
        return Response(
            {
                "status": "success",
                "watch_progress_seconds": user_video.watch_progress_seconds,
                "watch_percentage": round(user_video.watch_percentage, 2),
                "is_watched": user_video.is_watched,
                "auto_marked": auto_marked,
                "threshold": threshold,
                "message": (
                    f"Video automatically marked as watched at {threshold}%" if auto_marked else "Progress updated"
                ),
            }
        )
