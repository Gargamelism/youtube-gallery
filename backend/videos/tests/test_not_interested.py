from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from users.models import User, UserChannel, UserVideo
from videos.models import Channel, Video


class NotInterestedEndpointTests(TestCase):
    """Test the not-interested endpoint"""

    def setUp(self) -> None:
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"  # nosec B105 - test-only password
        )
        self.client.force_authenticate(user=self.user)

        self.channel = Channel.objects.create(channel_id="UC123", title="Test Channel")
        UserChannel.objects.create(user=self.user, channel=self.channel)
        self.video = Video.objects.create(channel=self.channel, video_id="video123", title="Test Video")

    def test_mark_video_not_interested(self) -> None:
        """Test marking a video as not interested"""
        url = f"/api/videos/{self.video.uuid}/not-interested"
        response = self.client.put(url, {"is_not_interested": True}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")
        self.assertTrue(response.data["is_not_interested"])
        self.assertIsNotNone(response.data["not_interested_at"])

        user_video = UserVideo.objects.get(user=self.user, video=self.video)
        self.assertTrue(user_video.is_not_interested)
        self.assertIsNotNone(user_video.not_interested_at)

    def test_undo_not_interested(self) -> None:
        """Test unmarking a video as not interested"""
        UserVideo.objects.create(
            user=self.user, video=self.video, is_not_interested=True, not_interested_at=timezone.now()
        )

        url = f"/api/videos/{self.video.uuid}/not-interested"
        response = self.client.put(url, {"is_not_interested": False}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_not_interested"])
        self.assertIsNone(response.data["not_interested_at"])

        user_video = UserVideo.objects.get(user=self.user, video=self.video)
        self.assertFalse(user_video.is_not_interested)
        self.assertIsNone(user_video.not_interested_at)

    def test_idempotency(self) -> None:
        """Test repeated calls with same value"""
        url = f"/api/videos/{self.video.uuid}/not-interested"

        response1 = self.client.put(url, {"is_not_interested": True}, format="json")
        first_timestamp = response1.data["not_interested_at"]

        response2 = self.client.put(url, {"is_not_interested": True}, format="json")

        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertTrue(response2.data["is_not_interested"])

        user_video = UserVideo.objects.get(user=self.user, video=self.video)
        self.assertTrue(user_video.is_not_interested)

    def test_get_or_create_behavior(self) -> None:
        """Test UserVideo creation on first call"""
        self.assertFalse(UserVideo.objects.filter(user=self.user, video=self.video).exists())

        url = f"/api/videos/{self.video.uuid}/not-interested"
        response = self.client.put(url, {"is_not_interested": True}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(UserVideo.objects.filter(user=self.user, video=self.video).exists())

    def test_invalid_video_id(self) -> None:
        """Test with non-existent video"""
        url = "/api/videos/00000000-0000-0000-0000-000000000000/not-interested"
        response = self.client.put(url, {"is_not_interested": True}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_default_value_true(self) -> None:
        """Test that is_not_interested defaults to True when not provided"""
        url = f"/api/videos/{self.video.uuid}/not-interested"
        response = self.client.put(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_not_interested"])

    def test_requires_authentication(self) -> None:
        """Test that endpoint requires authentication"""
        self.client.force_authenticate(user=None)
        url = f"/api/videos/{self.video.uuid}/not-interested"
        response = self.client.put(url, {"is_not_interested": True}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
