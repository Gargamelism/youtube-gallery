from django.db.models import Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from users.models import UserChannel, UserVideo, ChannelTag

from .decorators import youtube_auth_required
from .models import Channel, Video
from .serializers import ChannelSerializer, VideoListSerializer, VideoSerializer
from .services.youtube import YouTubeAuthenticationError, YouTubeService
from .services.quota_tracker import QuotaTracker
from .services.search import VideoSearchService
from .validators import VideoSearchParams, WatchStatus, TagMode


class ChannelViewSet(viewsets.ModelViewSet):
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
    def fetch_from_youtube(self, request):
        """Import channel from YouTube or create basic entry"""
        channel_id = request.data.get("channel_id")
        if not channel_id:
            raise ValidationError({"channel_id": "This field is required."})

        try:
            quota_tracker = QuotaTracker()
            youtube_service = YouTubeService(credentials=request.youtube_credentials, quota_tracker=quota_tracker)
            channel = youtube_service.import_or_create_channel(channel_id)
            serializer = self.get_serializer(channel, context={"request": request})
            return Response(serializer.data)

        except YouTubeAuthenticationError as e:
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
    def videos(self, request, pk=None):
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


class VideoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["channel"]
    search_fields = ["title", "description"]
    ordering_fields = ["title", "published_at", "view_count", "like_count"]
    ordering = ["-published_at"]

    def get_queryset(self):
        # Validate query parameters using Pydantic
        search_params = VideoSearchParams.from_request(self.request)

        # Use search service for filtering
        search_service = VideoSearchService(self.request.user)
        return search_service.search_videos(
            tag_names=search_params.tags, tag_mode=search_params.tag_mode, watch_status=search_params.watch_status
        )

    def get_serializer_class(self):
        if self.action in ["list", "watched", "unwatched"]:
            return VideoListSerializer
        return VideoSerializer

    @action(detail=True, methods=["put"])
    def watch(self, request, pk=None):
        video = self.get_object()
        user = request.user

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
            }
        )

    @action(detail=False, methods=["get"])
    def unwatched(self, request):
        # Validate query parameters and add unwatched filter
        search_params = VideoSearchParams.from_request(self.request)

        # Use search service with forced unwatched status
        search_service = VideoSearchService(self.request.user)
        videos = search_service.search_videos(
            tag_names=search_params.tags, tag_mode=search_params.tag_mode, watch_status=WatchStatus.UNWATCHED
        )

        page = self.paginate_queryset(videos)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(videos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def watched(self, request):
        # Validate query parameters and add watched filter
        search_params = VideoSearchParams.from_request(self.request)

        # Use search service with forced watched status
        search_service = VideoSearchService(self.request.user)
        videos = search_service.search_videos(
            tag_names=search_params.tags, tag_mode=search_params.tag_mode, watch_status=WatchStatus.WATCHED
        )

        page = self.paginate_queryset(videos)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(videos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        # Use search service for stats calculation
        search_service = VideoSearchService(self.request.user)
        stats = search_service.get_video_stats()

        return Response(stats)
