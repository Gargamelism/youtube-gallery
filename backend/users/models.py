from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, TypeVar

from cryptography.fernet import Fernet
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Prefetch, QuerySet
from django.utils import timezone as dj_tz
from google.oauth2.credentials import Credentials

from videos.services.youtube import YOUTUBE_SCOPES, YouTubeService

T = TypeVar("T", bound=models.Model)


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


class UserChannelQuerySet(QuerySet["UserChannel"]):
    def with_user_tags(self, user: "User") -> "QuerySet[UserChannel]":
        """Prefetch channel tags filtered by user"""
        from users.models import UserChannelTag

        return self.prefetch_related(
            Prefetch(
                "channel_tags",
                queryset=UserChannelTag.objects.select_related("tag").filter(tag__user=user),
            )
        )


class UserChannel(TimestampMixin):
    """Many-to-many relationship between users and channels they follow"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_channels")
    channel = models.ForeignKey("videos.Channel", on_delete=models.CASCADE, related_name="user_subscriptions")
    subscribed_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    objects = UserChannelQuerySet.as_manager()

    class Meta:
        db_table = "user_channels"
        unique_together = ("user", "channel")


class UserWatchPreferences(TimestampMixin):
    """User preferences for automatic watch tracking"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="watch_preferences")

    auto_mark_watched_enabled = models.BooleanField(
        default=True, help_text="Enable automatic marking of videos as watched"
    )
    auto_mark_threshold = models.IntegerField(
        default=None,
        null=True,
        blank=True,
        help_text="Percentage threshold for auto-marking (0-100), uses DEFAULT_AUTO_MARK_THRESHOLD if null",
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )

    class Meta:
        db_table = "user_watch_preferences"
        verbose_name_plural = "user watch preferences"

    def get_threshold(self) -> int:
        """Get the threshold, falling back to settings default if not set"""
        if self.auto_mark_threshold is not None:
            return self.auto_mark_threshold
        return settings.DEFAULT_AUTO_MARK_THRESHOLD

    def __str__(self) -> str:
        return f"Watch preferences for {self.user.email}"


class UserVideo(TimestampMixin):
    """Track user-specific data for videos (watch status, notes, etc.)"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_videos")
    video = models.ForeignKey("videos.Video", on_delete=models.CASCADE, related_name="user_videos")
    is_watched = models.BooleanField(default=False)
    watched_at = models.DateTimeField(null=True, blank=True)
    is_not_interested = models.BooleanField(null=True, blank=True, default=None)
    not_interested_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    # Progress tracking fields
    watch_progress_seconds = models.IntegerField(default=0, help_text="Current playback position in seconds")
    auto_marked_watched = models.BooleanField(
        default=False, help_text="True if automatically marked as watched via threshold"
    )

    class Meta:
        db_table = "user_videos"
        unique_together = ("user", "video")
        indexes = [
            models.Index(fields=["user", "is_not_interested"], name="user_not_interested_idx"),
            models.Index(fields=["user", "watch_progress_seconds"], name="user_watch_progress_idx"),
        ]

    @property
    def watch_percentage(self) -> float:
        """Calculate watch percentage based on video duration and current progress"""
        if not self.video or not self.video.duration:
            return 0.0

        duration_seconds = self.video.duration.total_seconds()
        if duration_seconds <= 0:
            return 0.0

        return min((self.watch_progress_seconds / duration_seconds) * 100, 100.0)


class ChannelTag(TimestampMixin):
    """User-defined tags for organizing channels"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="channel_tags")
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default="#3B82F6")  # Hex color code
    description = models.TextField(blank=True, null=True)

    def __str__(self) -> str:
        return self.name

    class Meta:
        db_table = "channel_tags"
        unique_together = ("user", "name")
        ordering = ["name"]


class UserChannelTag(TimestampMixin):
    """Many-to-many relationship between user channels and tags"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_channel = models.ForeignKey("UserChannel", on_delete=models.CASCADE, related_name="channel_tags")
    tag = models.ForeignKey("ChannelTag", on_delete=models.CASCADE, related_name="channel_assignments")

    def __str__(self) -> str:
        return f"{self.user_channel} -> {self.tag}"

    class Meta:
        db_table = "user_channel_tags"
        unique_together = ("user_channel", "tag")


class UserDailyQuota(TimestampMixin):
    """Track daily quota usage per user"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="daily_quotas")
    date = models.DateField(default=dj_tz.now)
    quota_used = models.IntegerField(default=0)
    operations_count = models.JSONField(default=dict)  # Track operation types

    class Meta:
        db_table = "user_daily_quotas"
        unique_together = ("user", "date")
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["date"]),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(quota_used__gte=0), name="user_daily_quota_used_gte_0"),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.date}: {self.quota_used} quota used"


class UserYouTubeCredentials(TimestampMixin):
    """Store encrypted YouTube OAuth credentials for each user"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="youtube_credentials")

    # Encrypted token fields
    encrypted_access_token = models.TextField(null=True, blank=True)
    encrypted_refresh_token = models.TextField(null=True, blank=True)

    # Token metadata
    token_expiry = models.DateTimeField(null=True, blank=True)
    scopes = models.JSONField(default=list)

    # OAuth client info (for credential reconstruction)
    client_id = models.TextField(null=True, blank=True)
    token_uri = models.URLField(default="https://oauth2.googleapis.com/token")

    class Meta:
        db_table = "user_youtube_credentials"

    def encrypt_token(self, token_value: str | None) -> str | None:
        """Encrypt a token value using key from settings"""
        if not token_value:
            return None

        fernet = Fernet(settings.YOUTUBE_ENCRYPTION_TOKEN.encode())
        return fernet.encrypt(token_value.encode()).decode()

    def decrypt_token(self, encrypted_token: str | None) -> str | None:
        """Decrypt a token value using key from settings"""
        if not encrypted_token:
            return None

        fernet = Fernet(settings.YOUTUBE_ENCRYPTION_TOKEN.encode())
        return fernet.decrypt(encrypted_token.encode()).decode()

    def set_access_token(self, token: str | None) -> None:
        """Set encrypted access token"""
        self.encrypted_access_token = self.encrypt_token(token)

    def get_access_token(self) -> str | None:
        """Get decrypted access token"""
        return self.decrypt_token(self.encrypted_access_token)

    def set_refresh_token(self, token: str | None) -> None:
        """Set encrypted refresh token"""
        self.encrypted_refresh_token = self.encrypt_token(token)

    def get_refresh_token(self) -> str | None:
        """Get decrypted refresh token"""
        return self.decrypt_token(self.encrypted_refresh_token)

    def get_tz_unaware_expiry(self) -> datetime | None:
        """Return timezone-unaware expiry for compatibility"""
        if not self.token_expiry:
            return None

        if dj_tz.is_aware(self.token_expiry):
            return dj_tz.make_naive(self.token_expiry)

        return self.token_expiry

    def to_google_credentials(self) -> Any:
        """Build Google Credentials object from this database model"""
        client_config = YouTubeService.get_client_config()

        return Credentials(  # type: ignore[no-untyped-call]
            token=self.get_access_token(),
            refresh_token=self.get_refresh_token(),
            token_uri=self.token_uri,
            client_id=self.client_id or client_config.get("client_id"),
            client_secret=client_config.get("client_secret"),
            scopes=self.scopes,
            expiry=self.get_tz_unaware_expiry(),
        )

    def update_from_credentials(self, credentials: Any) -> None:
        """Update this model with refreshed credentials"""
        self.set_access_token(credentials.token)
        if credentials.refresh_token:
            self.set_refresh_token(credentials.refresh_token)
        self.token_expiry = credentials.expiry
        self.save()

    @classmethod
    def from_credentials_data(cls, user: User, credentials_data: dict[str, Any] | Any) -> "UserYouTubeCredentials":
        """Create or update user credentials from OAuth data"""
        client_config = YouTubeService.get_client_config()

        # Handle both raw OAuth response and Credentials object
        if isinstance(credentials_data, Credentials):
            access_token = credentials_data.token
            refresh_token = credentials_data.refresh_token
            expiry = credentials_data.expiry
            scopes = list(credentials_data.scopes) if credentials_data.scopes else YOUTUBE_SCOPES
            client_id = credentials_data.client_id
        else:
            # Raw OAuth response
            access_token = credentials_data.get("access_token") or credentials_data.get("token")
            refresh_token = credentials_data.get("refresh_token")

            # Calculate expiry from expires_in
            if "expires_in" in credentials_data:
                expiry = dj_tz.now() + timedelta(seconds=credentials_data["expires_in"])
            elif "expiry" in credentials_data:
                expiry = (
                    datetime.fromisoformat(credentials_data["expiry"])
                    if isinstance(credentials_data["expiry"], str)
                    else credentials_data["expiry"]
                )
                if expiry and dj_tz.is_naive(expiry):
                    expiry = dj_tz.make_aware(expiry, timezone.utc)
            else:
                expiry = None

            scopes = credentials_data.get("scopes") or credentials_data.get("scope") or YOUTUBE_SCOPES
            if isinstance(scopes, str):
                scopes = scopes.split()
            client_id = credentials_data.get("client_id", client_config.get("client_id"))

        # Create or update user credentials
        user_credentials, _ = cls.objects.get_or_create(
            user=user,
            defaults={
                "client_id": client_id,
                "token_uri": "https://oauth2.googleapis.com/token",
                "scopes": scopes,
            },
        )

        user_credentials.set_access_token(access_token)
        user_credentials.set_refresh_token(refresh_token)
        user_credentials.token_expiry = expiry
        user_credentials.scopes = scopes
        user_credentials.client_id = client_id
        user_credentials.save()

        return user_credentials

    def __str__(self) -> str:
        return f"YouTube credentials for {self.user.email}"
