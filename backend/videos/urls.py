from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChannelViewSet, VideoViewSet

router = DefaultRouter()
router.register(r'channels', ChannelViewSet)
router.register(r'videos', VideoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

