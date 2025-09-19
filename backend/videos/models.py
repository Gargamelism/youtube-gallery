import uuid

from django.db import models
from django.utils import timezone

from .fields import YouTubeDurationField


class TimestampMixin(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UpdateFrequency(TimestampMixin):
    name = models.CharField(max_length=20, unique=True)
    interval_hours = models.IntegerField()
    description = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "update_frequencies"
        verbose_name_plural = "update frequencies"


class Channel(TimestampMixin):
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel_id = models.CharField(max_length=255, unique=True)
    title = models.CharField(max_length=500, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    url = models.URLField(blank=True, null=True)

    last_updated = models.DateTimeField(null=True, blank=True)
    update_frequency = models.ForeignKey(
        UpdateFrequency,
        on_delete=models.PROTECT,
        null=True,
        blank=True
    )
    subscriber_count = models.IntegerField(null=True, blank=True)
    video_count = models.IntegerField(null=True, blank=True)
    view_count = models.BigIntegerField(null=True, blank=True)
    is_available = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    failed_update_count = models.IntegerField(default=0)

    def __str__(self):
        return self.title or self.channel_id

    class Meta:
        db_table = "channels"
        indexes = [
            models.Index(
                fields=['update_frequency', 'is_available', 'failed_update_count', 'last_updated'],
                name='channel_update_query_idx'
            ),
            models.Index(
                fields=['is_deleted', 'is_available'],
                name='channel_status_idx'
            ),
        ]


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
    upload_status = models.CharField(max_length=20, blank=True, null=True)
    tags = models.TextField(blank=True, null=True)
    thumbnail_url = models.CharField(max_length=500, blank=True, null=True)
    video_url = models.URLField(blank=True, null=True)

    # relationships
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="videos")

    # custom fields
    duration = YouTubeDurationField(blank=True, null=True)

    def __str__(self):
        return self.title or self.video_id

    class Meta:
        db_table = "videos"
        ordering = ["-published_at"]
