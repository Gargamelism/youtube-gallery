import uuid
from datetime import datetime, timedelta
from cryptography.fernet import Fernet

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from google.oauth2.credentials import Credentials
from videos.services.youtube import YOUTUBE_SCOPES, YouTubeService


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

    def __str__(self):
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

    def __str__(self):
        return f"{self.user_channel} -> {self.tag}"

    class Meta:
        db_table = "user_channel_tags"
        unique_together = ("user_channel", "tag")


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

    def encrypt_token(self, token_value):
        """
        Encrypt a plaintext OAuth token using the configured YouTube encryption key.
        
        Parameters:
            token_value (str | None): The plaintext token to encrypt. If falsy, no encryption is performed.
        
        Returns:
            str | None: The encrypted token as a UTF-8 string, or `None` if `token_value` is falsy.
        """
        if not token_value:
            return None

        fernet = Fernet(settings.YOUTUBE_ENCRYPTION_TOKEN.encode())
        return fernet.encrypt(token_value.encode()).decode()

    def decrypt_token(self, encrypted_token):
        """
        Return the decrypted token string for a stored encrypted token.
        
        Parameters:
            encrypted_token (str | None): The encrypted token value to decrypt. If falsy, no decryption is performed.
        
        Returns:
            str | None: The decrypted token string, or `None` if `encrypted_token` is falsy.
        """
        if not encrypted_token:
            return None

        fernet = Fernet(settings.YOUTUBE_ENCRYPTION_TOKEN.encode())
        return fernet.decrypt(encrypted_token.encode()).decode()

    def set_access_token(self, token):
        """
        Store the user's access token in the model's encrypted_access_token field.
        
        Parameters:
            token (str | None): The raw access token to store. If `token` is falsy, the stored encrypted value will be cleared.
        """
        self.encrypted_access_token = self.encrypt_token(token)

    def get_access_token(self):
        """
        Return the decrypted access token for this credential record.
        
        Returns:
            str or None: Decrypted access token if stored, otherwise None.
        """
        return self.decrypt_token(self.encrypted_access_token)

    def set_refresh_token(self, token):
        """
        Store the user's refresh token in encrypted form.
        
        Parameters:
            token (str | None): Plaintext refresh token to encrypt and store on the model; if falsy, the stored encrypted value will be cleared.
        """
        self.encrypted_refresh_token = self.encrypt_token(token)

    def get_refresh_token(self):
        """
        Return the user's decrypted YouTube refresh token.
        
        Returns:
            The decrypted refresh token as a string, or None if no refresh token is stored.
        """
        return self.decrypt_token(self.encrypted_refresh_token)

    def get_tz_unaware_expiry(self):
        """
        Return the token expiry as a timezone-unaware datetime for compatibility.
        
        Returns:
            datetime.datetime or None: The expiry with tzinfo removed if set, otherwise None.
        """
        if self.token_expiry:
            return self.token_expiry.replace(tzinfo=None)
        return None

    def to_google_credentials(self):
        """
        Construct a google.oauth2.credentials.Credentials object populated from this model's stored YouTube OAuth data.
        
        Returns:
            Credentials: A Credentials instance with token, refresh_token, token_uri, client_id, client_secret, scopes, and expiry (expiry is a timezone-naive datetime or `None` when not set).
        """
        client_config = YouTubeService.get_client_config()

        return Credentials(
            token=self.get_access_token(),
            refresh_token=self.get_refresh_token(),
            token_uri=self.token_uri,
            client_id=self.client_id or client_config.get("client_id"),
            client_secret=client_config.get("client_secret"),
            scopes=self.scopes,
            expiry=self.get_tz_unaware_expiry(),
        )

    def update_from_credentials(self, credentials):
        """
        Refresh stored token fields from a Google Credentials object and persist the model.
        
        Parameters:
            credentials (google.oauth2.credentials.Credentials): Credentials instance whose `token`, optional `refresh_token`, and `expiry` will be stored on this model.
        """
        self.set_access_token(credentials.token)
        if credentials.refresh_token:
            self.set_refresh_token(credentials.refresh_token)
        self.token_expiry = credentials.expiry
        self.save()

    @classmethod
    def from_credentials_data(cls, user, credentials_data):
        """
        Create or update a user's YouTube OAuth credentials from a Credentials object or raw token data.
        
        If a credentials record for the user does not exist, one is created with defaults. The function accepts either a google.oauth2.credentials.Credentials instance or a raw dict containing OAuth fields (accepted keys: "access_token" or "token", "refresh_token", "expires_in" or "expiry", "scopes", "client_id"). Access and refresh tokens are stored encrypted, token expiry, scopes, and client_id are set or updated, and the record is saved.
        
        Parameters:
            user (User): The user to associate the credentials with.
            credentials_data (Credentials | dict): Either a Credentials instance or a dict with OAuth token data.
        
        Returns:
            UserYouTubeCredentials: The created or updated credentials instance for the given user.
        """
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
                expiry = datetime.now() + timedelta(seconds=credentials_data["expires_in"])
            elif "expiry" in credentials_data:
                expiry = (
                    datetime.fromisoformat(credentials_data["expiry"])
                    if isinstance(credentials_data["expiry"], str)
                    else credentials_data["expiry"]
                )
            else:
                expiry = None

            scopes = credentials_data.get("scopes", YOUTUBE_SCOPES)
            client_id = credentials_data.get("client_id", client_config.get("client_id"))

        # Create or update user credentials
        user_credentials, created = cls.objects.get_or_create(
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

    def __str__(self):
        """
        Human-readable representation of the user's YouTube credentials.
        
        Returns:
            str: A string in the form "YouTube credentials for {user.email}".
        """
        return f"YouTube credentials for {self.user.email}"
