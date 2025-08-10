from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Channel, Video
from .serializers import ChannelSerializer, VideoSerializer, VideoListSerializer


class ChannelViewSet(viewsets.ModelViewSet):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['channel_id']
    search_fields = ['title', 'description']
    ordering_fields = ['title', 'created_at']
    ordering = ['title']


class VideoViewSet(viewsets.ModelViewSet):
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

