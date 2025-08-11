from django.urls import path, include
from .utils.router import KebabCaseRouter
from .views import ChannelViewSet, VideoViewSet

router = KebabCaseRouter()
router.register(r'channels', ChannelViewSet)
router.register(r'videos', VideoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

