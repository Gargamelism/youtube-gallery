import uuid
from django.db import models
from django.utils import timezone
from .fields import YouTubeDurationField


class TimestampMixin(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Channel(TimestampMixin):
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel_id = models.CharField(max_length=255, unique=True)
    title = models.CharField(max_length=500, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    url = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.title or self.channel_id

    class Meta:
        db_table = 'channels'


class Video(TimestampMixin):
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    video_id = models.CharField(max_length=255, unique=True)
    title = models.CharField(max_length=500, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    published_at = models.DateTimeField(blank=True, null=True)
    view_count = models.IntegerField(blank=True, null=True)
    like_count = models.IntegerField(blank=True, null=True)
    comment_count = models.IntegerField(blank=True, null=True)
    category_id = models.CharField(max_length=50, blank=True, null=True)
    default_language = models.CharField(max_length=10, blank=True, null=True)
    privacy_status = models.CharField(max_length=20, blank=True, null=True)
    upload_status = models.CharField(max_length=20, blank=True, null=True)
    tags = models.TextField(blank=True, null=True)
    thumbnail_path = models.CharField(max_length=500, blank=True, null=True)
    video_url = models.URLField(blank=True, null=True)
    is_watched = models.BooleanField(default=False)
    
    # relationships
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='videos')
    duration = YouTubeDurationField(blank=True, null=True)

    # custom fields

    def __str__(self):
        return self.title or self.video_id

    class Meta:
        db_table = 'videos'
        ordering = ['-published_at']

