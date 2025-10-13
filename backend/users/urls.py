from django.urls import path, include

from videos.utils.router import KebabCaseRouter
from . import views

# Router for ViewSets
router = KebabCaseRouter(trailing_slash=False)
router.register(r"tags", views.ChannelTagViewSet, basename="channel-tags")
router.register(r"channels", views.UserChannelViewSet, basename="user-channels")
router.register(r"videos", views.UserVideoViewSet, basename="user-videos")

urlpatterns = [
    # Function-based views
    path("register", views.register_view, name="register"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("profile", views.profile_view, name="profile"),
    path("quota-usage", views.quota_usage_view, name="quota-usage"),
    path("youtube-url", views.youtube_auth_url, name="youtube-auth-url"),
    path("youtube/callback", views.youtube_auth_callback, name="youtube-auth-callback"),
    # ViewSets through router
    path("", include(router.urls)),
]
