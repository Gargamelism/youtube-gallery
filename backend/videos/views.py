from django.db.models import Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from users.models import UserChannel, UserVideo

from .decorators import youtube_auth_required
from .models import Channel, Video
from .serializers import ChannelSerializer, VideoListSerializer, VideoSerializer
from .services.youtube import YouTubeAuthenticationError, YouTubeService


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
            youtube_service = YouTubeService(credentials=request.youtube_credentials)
            channel = youtube_service.import_or_create_channel(channel_id)
            serializer = self.get_serializer(channel, context={"request": request})
            return Response(serializer.data)

        except YouTubeAuthenticationError as e:
            serializer = self.get_serializer(channel, context={"request": request})
            return Response(serializer.data)

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
        user = self.request.user
        # Only show videos from channels the user has subscribed to
        subscribed_channels = UserChannel.objects.filter(user=user, is_active=True).values_list("channel", flat=True)
        return Video.objects.filter(channel__in=subscribed_channels).select_related("channel")

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
        user = request.user

        # Get videos from subscribed channels that are not watched
        subscribed_channels = UserChannel.objects.filter(user=user, is_active=True).values_list("channel", flat=True)

        watched_video_ids = UserVideo.objects.filter(user=user, is_watched=True).values_list("video", flat=True)

        videos = (
            Video.objects.filter(channel__in=subscribed_channels)
            .exclude(uuid__in=watched_video_ids)
            .select_related("channel")
        )

        page = self.paginate_queryset(videos)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(videos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def watched(self, request):
        user = request.user

        watched_video_ids = UserVideo.objects.filter(user=user, is_watched=True).values_list("video", flat=True)

        videos = Video.objects.filter(uuid__in=watched_video_ids).select_related("channel")

        page = self.paginate_queryset(videos)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(videos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        user = request.user

        stats = Video.objects.filter(
            channel__user_subscriptions__user=user,
            channel__user_subscriptions__is_active=True,
        ).aggregate(
            total_videos=Count("uuid"),
            # Q object allows conditional filtering within Count aggregation
            watched_videos=Count("uuid", filter=Q(user_videos__user=user, user_videos__is_watched=True)),
        )

        total = stats["total_videos"]
        watched = stats["watched_videos"]
        unwatched = total - watched

        return Response(
            {
                "total": total,
                "watched": watched,
                "unwatched": unwatched,
            }
        )
