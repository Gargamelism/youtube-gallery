from django.urls import path, include
from .utils.router import KebabCaseRouter
from .views import ChannelViewSet, VideoViewSet

router = KebabCaseRouter(trailing_slash=False)
router.register(r'channels', ChannelViewSet)
router.register(r'videos', VideoViewSet, basename='video')

urlpatterns = [
    path('', include(router.urls)),
]

