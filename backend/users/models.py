import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


class TimestampMixin(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class User(AbstractUser, TimestampMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)

    # Use email as the username field
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"


class UserChannel(TimestampMixin):
    """Many-to-many relationship between users and channels they follow"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_channels")
    channel = models.ForeignKey("videos.Channel", on_delete=models.CASCADE, related_name="user_subscriptions")
    subscribed_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "user_channels"
        unique_together = ("user", "channel")


class UserVideo(TimestampMixin):
    """Track user-specific data for videos (watch status, notes, etc.)"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_videos")
    video = models.ForeignKey("videos.Video", on_delete=models.CASCADE, related_name="user_videos")
    is_watched = models.BooleanField(default=False)
    watched_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "user_videos"
        unique_together = ("user", "video")


class ChannelTag(TimestampMixin):
    """User-defined tags for organizing channels"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="channel_tags")
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default="#3B82F6")  # Hex color code
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = "channel_tags"
        unique_together = ("user", "name")
        ordering = ["name"]


class UserChannelTag(TimestampMixin):
    """Many-to-many relationship between user channels and tags"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_channel = models.ForeignKey("UserChannel", on_delete=models.CASCADE, related_name="channel_tags")
    tag = models.ForeignKey("ChannelTag", on_delete=models.CASCADE, related_name="channel_assignments")
    
    class Meta:
        db_table = "user_channel_tags"
        unique_together = ("user_channel", "tag")
