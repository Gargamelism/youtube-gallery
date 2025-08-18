from django.urls import path
from . import views

urlpatterns = [
    path('register', views.register_view, name='register'),
    path('login', views.login_view, name='login'),
    path('logout', views.logout_view, name='logout'),
    path('profile', views.profile_view, name='profile'),
    path('channels', views.UserChannelListCreateView.as_view(), name='user-channels'),
    path('channels/<uuid:pk>', views.UserChannelDetailView.as_view(), name='user-channel-detail'),
    path('videos', views.UserVideoListCreateView.as_view(), name='user-videos'),
    path('videos/<uuid:pk>', views.UserVideoDetailView.as_view(), name='user-video-detail'),
]