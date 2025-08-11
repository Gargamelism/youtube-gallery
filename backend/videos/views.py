from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Channel, Video
from .serializers import ChannelSerializer, VideoSerializer, VideoListSerializer


from rest_framework.exceptions import ValidationError
from .services.youtube import YouTubeService

from .utils.viewset_mixins import KebabCaseEndpointsMixin

class ChannelViewSet(KebabCaseEndpointsMixin, viewsets.ModelViewSet):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['channel_id']
    search_fields = ['title', 'description']
    ordering_fields = ['title', 'created_at']
    ordering = ['title']

    @action(detail=False, methods=['post'], url_path='fetch-from-youtube')
    def fetch_from_youtube(self, request):
        """Fetch a channel and all its videos from YouTube"""
        channel_id = request.data.get('channel_id')
        if not channel_id:
            raise ValidationError({'channel_id': 'This field is required.'})

        try:
            youtube_service = YouTubeService()
            channel = youtube_service.fetch_channel(channel_id)
            
            if not channel:
                return Response(
                    {'error': 'Channel not found on YouTube'}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = self.get_serializer(channel)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
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

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        channel = self.get_object()
        total_videos = channel.videos.count()
        watched_videos = channel.videos.filter(is_watched=True).count()
        unwatched_videos = total_videos - watched_videos
        
        return Response({
            'total_videos': total_videos,
            'watched_videos': watched_videos,
            'unwatched_videos': unwatched_videos,
            'title': channel.title,
            'channel_id': channel.channel_id,
            'description': channel.description
        })


class VideoViewSet(KebabCaseEndpointsMixin, viewsets.ModelViewSet):
    queryset = Video.objects.select_related('channel').all()
    serializer_class = VideoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['channel', 'is_watched', 'privacy_status']
    search_fields = ['title', 'description']
    ordering_fields = ['title', 'published_at', 'view_count', 'like_count']
    ordering = ['-published_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return VideoListSerializer
        return VideoSerializer

    @action(detail=True, methods=['post'])
    def mark_as_watched(self, request, pk=None):
        video = self.get_object()
        video.is_watched = True
        video.save()
        return Response({'status': 'marked as watched'})

    @action(detail=True, methods=['post'])
    def mark_as_unwatched(self, request, pk=None):
        video = self.get_object()
        video.is_watched = False
        video.save()
        return Response({'status': 'marked as unwatched'})

    @action(detail=False, methods=['get'])
    def unwatched(self, request):
        videos = self.queryset.filter(is_watched=False)
        page = self.paginate_queryset(videos)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(videos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def watched(self, request):
        videos = self.queryset.filter(is_watched=True)
        page = self.paginate_queryset(videos)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(videos, many=True)
        return Response(serializer.data)

