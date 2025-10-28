from django.test import TestCase
from django.utils import timezone
from django.db import connection
from rest_framework import status
from rest_framework.test import APIClient

from users.models import User, UserChannel, UserVideo
from videos.models import Channel, Video
from videos.services.search import VideoSearchService
from videos.validators import NotInterestedFilter


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


class NotInterestedFilteringTests(TestCase):
    """Test not interested filtering functionality"""

    def setUp(self) -> None:
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"  # nosec B105 - test-only password
        )
        self.client.force_authenticate(user=self.user)

        self.channel = Channel.objects.create(channel_id="UC123", title="Test Channel")
        UserChannel.objects.create(user=self.user, channel=self.channel, is_active=True)

        self.video1 = Video.objects.create(channel=self.channel, video_id="video1", title="Video 1")
        self.video2 = Video.objects.create(channel=self.channel, video_id="video2", title="Video 2")
        self.video3 = Video.objects.create(channel=self.channel, video_id="video3", title="Video 3")

        UserVideo.objects.create(user=self.user, video=self.video2, is_not_interested=True)

    def test_filter_exclude_not_interested(self) -> None:
        """Test that not_interested_filter=exclude excludes dismissed videos (default)"""
        response = self.client.get("/api/videos/?not_interested_filter=exclude")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]
        self.assertIn("video1", video_ids)
        self.assertNotIn("video2", video_ids)
        self.assertIn("video3", video_ids)

    def test_filter_only_not_interested(self) -> None:
        """Test that not_interested_filter=only shows only dismissed videos"""
        response = self.client.get("/api/videos/?not_interested_filter=only")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]
        self.assertNotIn("video1", video_ids)
        self.assertIn("video2", video_ids)
        self.assertNotIn("video3", video_ids)

    def test_filter_include_all(self) -> None:
        """Test that not_interested_filter=include shows all videos"""
        response = self.client.get("/api/videos/?not_interested_filter=include")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]
        self.assertIn("video1", video_ids)
        self.assertIn("video2", video_ids)
        self.assertIn("video3", video_ids)

    def test_default_behavior_excludes_not_interested(self) -> None:
        """Test that default behavior excludes not interested videos"""
        response = self.client.get("/api/videos/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]
        self.assertNotIn("video2", video_ids)

    def test_combined_with_watch_status_filter(self) -> None:
        """Test not_interested_filter works with watch_status filter"""
        UserVideo.objects.filter(user=self.user, video=self.video1).update_or_create(
            defaults={"is_watched": True}
        )

        response = self.client.get("/api/videos/?watch_status=unwatched&not_interested_filter=exclude")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]
        self.assertNotIn("video1", video_ids)
        self.assertNotIn("video2", video_ids)
        self.assertIn("video3", video_ids)

    def test_stats_include_not_interested_count(self) -> None:
        """Test that stats endpoint includes not_interested count"""
        response = self.client.get("/api/videos/stats/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("not_interested", response.data)
        self.assertEqual(response.data["not_interested"], 1)


class NotInterestedPerformanceTests(TestCase):
    """Test performance of not interested filtering"""

    def setUp(self) -> None:
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"  # nosec B105 - test-only password
        )

        self.channel = Channel.objects.create(channel_id="UC123", title="Test Channel")
        UserChannel.objects.create(user=self.user, channel=self.channel, is_active=True)

        for i in range(50):
            video = Video.objects.create(channel=self.channel, video_id=f"video{i}", title=f"Video {i}")
            if i % 3 == 0:
                UserVideo.objects.create(user=self.user, video=video, is_not_interested=True)

    def test_not_interested_filter_query_efficiency(self) -> None:
        """Test that not interested filtering uses efficient queries"""
        search_service = VideoSearchService(self.user)

        connection.queries_log.clear()

        list(search_service.search_videos(not_interested_filter=NotInterestedFilter.EXCLUDE))

        query_count = len(connection.queries)

        self.assertLess(query_count, 10, f"Not interested filter used {query_count} queries, expected <10")

    def test_not_interested_filter_only_query_efficiency(self) -> None:
        """Test that showing only not interested videos is efficient"""
        search_service = VideoSearchService(self.user)

        connection.queries_log.clear()

        results = list(search_service.search_videos(not_interested_filter=NotInterestedFilter.ONLY))

        query_count = len(connection.queries)

        self.assertLess(query_count, 10, f"Not interested ONLY filter used {query_count} queries, expected <10")
        self.assertEqual(len(results), 17)
