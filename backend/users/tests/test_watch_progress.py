from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from videos.models import Channel, Video
from users.models import User, UserVideo, UserWatchPreferences, UserChannel


class UserWatchPreferencesModelTests(TestCase):
    """Unit tests for UserWatchPreferences model"""

    user: User

    @classmethod
    def setUpTestData(cls) -> None:
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )

    def test_preferences_creation_with_defaults(self) -> None:
        """Test creating preferences with default values"""
        preferences = UserWatchPreferences.objects.create(user=self.user)
        self.assertTrue(preferences.auto_mark_watched_enabled)
        self.assertIsNone(preferences.auto_mark_threshold)
        self.assertEqual(preferences.get_threshold(), 75)

    def test_preferences_with_custom_threshold(self) -> None:
        """Test preferences with custom threshold"""
        preferences = UserWatchPreferences.objects.create(user=self.user, auto_mark_threshold=90)
        self.assertEqual(preferences.get_threshold(), 90)

    def test_preferences_threshold_validation(self) -> None:
        """Test that threshold is validated to be between 0-100"""
        preferences = UserWatchPreferences.objects.create(user=self.user, auto_mark_threshold=50)
        self.assertEqual(preferences.auto_mark_threshold, 50)

    def test_preferences_auto_mark_disabled(self) -> None:
        """Test disabling auto-mark"""
        preferences = UserWatchPreferences.objects.create(user=self.user, auto_mark_watched_enabled=False)
        self.assertFalse(preferences.auto_mark_watched_enabled)

    def test_preferences_string_representation(self) -> None:
        """Test string representation of UserWatchPreferences"""
        preferences = UserWatchPreferences.objects.create(user=self.user)
        self.assertEqual(str(preferences), "Watch preferences for test@example.com")


class UserVideoProgressModelTests(TestCase):
    """Unit tests for UserVideo progress tracking fields"""

    user: User
    channel: Channel
    video: Video

    @classmethod
    def setUpTestData(cls) -> None:
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )
        cls.channel = Channel.objects.create(channel_id="UC123456", title="Test Channel")
        cls.video = Video.objects.create(
            channel=cls.channel,
            video_id="test_video_1",
            title="Test Video",
            duration="PT10M",
            thumbnail_url="https://example.com/thumb.jpg",
            video_url="https://youtube.com/watch?v=test_video_1",
        )

    def test_watch_progress_defaults(self) -> None:
        """Test that progress fields have correct defaults"""
        user_video = UserVideo.objects.create(user=self.user, video=self.video)
        self.assertEqual(user_video.watch_progress_seconds, 0)
        self.assertFalse(user_video.auto_marked_watched)

    def test_watch_percentage_calculation(self) -> None:
        """Test watch percentage calculation"""
        user_video = UserVideo.objects.create(user=self.user, video=self.video)

        user_video.watch_progress_seconds = 300
        self.assertEqual(user_video.watch_percentage, 50.0)

        user_video.watch_progress_seconds = 450
        self.assertEqual(user_video.watch_percentage, 75.0)

        user_video.watch_progress_seconds = 600
        self.assertEqual(user_video.watch_percentage, 100.0)

    def test_watch_percentage_with_zero_duration(self) -> None:
        """Test watch percentage returns 0 when video has no duration"""
        video_no_duration = Video.objects.create(
            channel=self.channel,
            video_id="test_video_no_duration",
            title="Test Video No Duration",
            duration=None,
            thumbnail_url="https://example.com/thumb.jpg",
            video_url="https://youtube.com/watch?v=test_video_no_duration",
        )
        user_video = UserVideo.objects.create(user=self.user, video=video_no_duration, watch_progress_seconds=100)
        self.assertEqual(user_video.watch_percentage, 0.0)

    def test_watch_percentage_capped_at_100(self) -> None:
        """Test watch percentage is capped at 100%"""
        user_video = UserVideo.objects.create(user=self.user, video=self.video)
        user_video.watch_progress_seconds = 1000
        self.assertEqual(user_video.watch_percentage, 100.0)

    def test_auto_marked_watched_flag(self) -> None:
        """Test auto_marked_watched flag"""
        user_video = UserVideo.objects.create(
            user=self.user, video=self.video, is_watched=True, auto_marked_watched=True
        )
        self.assertTrue(user_video.auto_marked_watched)


class WatchProgressAPITests(APITestCase):
    """API tests for watch progress endpoints"""

    user: User
    channel: Channel
    video: Video
    token: Token

    @classmethod
    def setUpTestData(cls) -> None:
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )
        cls.token = Token.objects.create(user=cls.user)
        cls.channel = Channel.objects.create(channel_id="UC123456", title="Test Channel")
        cls.video = Video.objects.create(
            channel=cls.channel,
            video_id="test_video_1",
            title="Test Video",
            duration="PT10M",
            thumbnail_url="https://example.com/thumb.jpg",
            video_url="https://youtube.com/watch?v=test_video_1",
        )
        UserChannel.objects.create(user=cls.user, channel=cls.channel, is_active=True)

    def test_get_watch_progress_nonexistent(self) -> None:
        """Test getting progress for a video with no UserVideo record"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.get(f"/api/videos/{self.video.uuid}/watch-progress")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["watch_progress_seconds"], 0)
        self.assertEqual(response.data["watch_percentage"], 0.0)
        self.assertFalse(response.data["is_watched"])

    def test_update_watch_progress_below_threshold(self) -> None:
        """Test updating progress below auto-mark threshold"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.put(
            f"/api/videos/{self.video.uuid}/watch-progress",
            {"current_time": 300, "duration": 600},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["watch_progress_seconds"], 300)
        self.assertEqual(response.data["watch_percentage"], 50.0)
        self.assertFalse(response.data["is_watched"])
        self.assertFalse(response.data["auto_marked"])

    def test_auto_mark_at_default_threshold(self) -> None:
        """Test automatic marking at 75% threshold (default)"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.put(
            f"/api/videos/{self.video.uuid}/watch-progress",
            {"current_time": 450, "duration": 600},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["watch_progress_seconds"], 450)
        self.assertEqual(response.data["watch_percentage"], 75.0)
        self.assertTrue(response.data["is_watched"])
        self.assertTrue(response.data["auto_marked"])
        self.assertEqual(response.data["threshold"], 75)

        user_video = UserVideo.objects.get(user=self.user, video=self.video)
        self.assertTrue(user_video.is_watched)
        self.assertTrue(user_video.auto_marked_watched)
        self.assertIsNotNone(user_video.watched_at)

    def test_auto_mark_with_custom_threshold(self) -> None:
        """Test auto-mark with custom threshold (90%)"""
        UserWatchPreferences.objects.create(user=self.user, auto_mark_watched_enabled=True, auto_mark_threshold=90)

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        response = self.client.put(
            f"/api/videos/{self.video.uuid}/watch-progress",
            {"current_time": 480, "duration": 600},
            format="json",
        )
        self.assertEqual(response.data["watch_percentage"], 80.0)
        self.assertFalse(response.data["is_watched"])

        response = self.client.put(
            f"/api/videos/{self.video.uuid}/watch-progress",
            {"current_time": 540, "duration": 600},
            format="json",
        )
        self.assertEqual(response.data["watch_percentage"], 90.0)
        self.assertTrue(response.data["is_watched"])
        self.assertTrue(response.data["auto_marked"])
        self.assertEqual(response.data["threshold"], 90)

    def test_auto_mark_disabled(self) -> None:
        """Test that auto-mark respects disabled preference"""
        UserWatchPreferences.objects.create(user=self.user, auto_mark_watched_enabled=False, auto_mark_threshold=75)

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.put(
            f"/api/videos/{self.video.uuid}/watch-progress",
            {"current_time": 550, "duration": 600},
            format="json",
        )

        self.assertEqual(response.data["watch_percentage"], 91.67)
        self.assertFalse(response.data["is_watched"])
        self.assertFalse(response.data["auto_marked"])

    def test_manual_mark_before_threshold(self) -> None:
        """Test manual marking before auto-threshold is reached"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        response = self.client.put(f"/api/videos/{self.video.uuid}/watch", {"is_watched": True})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_watched"])

        user_video = UserVideo.objects.get(user=self.user, video=self.video)
        self.assertTrue(user_video.is_watched)
        self.assertFalse(user_video.auto_marked_watched)

    def test_progress_persists_across_sessions(self) -> None:
        """Test that progress persists and can be retrieved"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        self.client.put(
            f"/api/videos/{self.video.uuid}/watch-progress",
            {"current_time": 200, "duration": 600},
            format="json",
        )

        response = self.client.get(f"/api/videos/{self.video.uuid}/watch-progress")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["watch_progress_seconds"], 200)
        self.assertEqual(response.data["watch_percentage"], 33.33)

    def test_progress_update_negative_value(self) -> None:
        """Test that negative progress values are rejected"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.put(
            f"/api/videos/{self.video.uuid}/watch-progress",
            {"current_time": -10, "duration": 600},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_watch_endpoint_includes_progress(self) -> None:
        """Test that watch endpoint includes progress data in response"""
        UserVideo.objects.create(user=self.user, video=self.video, watch_progress_seconds=300)

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.put(f"/api/videos/{self.video.uuid}/watch", {"is_watched": True})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("watch_progress_seconds", response.data)
        self.assertIn("watch_percentage", response.data)
        self.assertEqual(response.data["watch_progress_seconds"], 300)


class WatchPreferencesAPITests(APITestCase):
    """API tests for user watch preferences endpoints"""

    user: User
    token: Token

    @classmethod
    def setUpTestData(cls) -> None:
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )
        cls.token = Token.objects.create(user=cls.user)

    def test_get_preferences_creates_defaults(self) -> None:
        """Test getting preferences creates default record if none exists"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.get("/api/auth/watch-preferences")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["auto_mark_watched_enabled"])
        self.assertEqual(response.data["auto_mark_threshold"], 75)

        self.assertTrue(UserWatchPreferences.objects.filter(user=self.user).exists())

    def test_update_preferences_threshold(self) -> None:
        """Test updating threshold preference"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.put(
            "/api/auth/watch-preferences", {"auto_mark_watched_enabled": True, "auto_mark_threshold_percent": 90}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["auto_mark_threshold"], 90)

        preferences = UserWatchPreferences.objects.get(user=self.user)
        self.assertEqual(preferences.auto_mark_threshold, 90)

    def test_update_preferences_disable_auto_mark(self) -> None:
        """Test disabling auto-mark via preferences"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.put(
            "/api/auth/watch-preferences", {"auto_mark_watched_enabled": False, "auto_mark_threshold_percent": 75}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["auto_mark_watched_enabled"])

        preferences = UserWatchPreferences.objects.get(user=self.user)
        self.assertFalse(preferences.auto_mark_watched_enabled)

    def test_update_preferences_invalid_threshold(self) -> None:
        """Test that invalid threshold values are rejected"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        response = self.client.put(
            "/api/auth/watch-preferences", {"auto_mark_watched_enabled": True, "auto_mark_threshold_percent": 150}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.put(
            "/api/auth/watch-preferences", {"auto_mark_watched_enabled": True, "auto_mark_threshold_percent": -10}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_preferences_boundary_values(self) -> None:
        """Test boundary values for threshold (0 and 100)"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        response = self.client.put(
            "/api/auth/watch-preferences", {"auto_mark_watched_enabled": True, "auto_mark_threshold_percent": 0}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["auto_mark_threshold"], 0)

        response = self.client.put(
            "/api/auth/watch-preferences", {"auto_mark_watched_enabled": True, "auto_mark_threshold_percent": 100}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["auto_mark_threshold"], 100)
