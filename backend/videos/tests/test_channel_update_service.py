"""
Comprehensive unit tests for ChannelUpdateService.
"""

from unittest.mock import Mock, patch, MagicMock
from django.test import TestCase
from django.utils import timezone
from googleapiclient.errors import HttpError

from videos.models import Channel, Video, UpdateFrequency
from videos.services.channel_updater import ChannelUpdateService, ChannelUpdateResult
from videos.services.youtube import YouTubeService
from videos.exceptions import (
    ChannelNotFoundError,
    QuotaExceededError,
    APIRateLimitError,
    ChannelAccessDeniedError,
    InvalidChannelDataError,
)


class ChannelUpdateServiceTests(TestCase):
    """Unit tests for ChannelUpdateService core functionality"""

    def setUp(self):
        """Set up test data for each test"""
        self.mock_youtube_service = Mock(spec=YouTubeService)
        self.service = ChannelUpdateService(self.mock_youtube_service)

        self.daily_frequency, _ = UpdateFrequency.objects.get_or_create(
            name="daily", defaults={"interval_hours": 24, "description": "Daily updates"}
        )

        self.channel = Channel.objects.create(
            channel_id="UC_test123",
            title="Test Channel",
            description="Original description",
            subscriber_count=1000,
            video_count=50,
            view_count=100000,
            update_frequency=self.daily_frequency,
        )

    def _mock_successful_api_response(self, updates=None):
        """Helper to mock successful API responses"""
        default_data = {
            "title": "Test Channel",
            "description": "Original description",
            "subscriberCount": "1000",
            "videoCount": "50",
            "viewCount": "100000",
        }
        if updates:
            default_data.update(updates)

        self.mock_youtube_service.get_channel_details.return_value = {"uploads_playlist_id": "UU_test123"}

        mock_youtube_api = Mock()
        mock_youtube_api.channels().list().execute.return_value = {
            "items": [
                {
                    "snippet": {"title": default_data["title"], "description": default_data["description"]},
                    "statistics": {
                        "subscriberCount": default_data["subscriberCount"],
                        "videoCount": default_data["videoCount"],
                        "viewCount": default_data["viewCount"],
                    },
                }
            ]
        }
        self.mock_youtube_service.youtube = mock_youtube_api
        self.mock_youtube_service.get_channel_videos.return_value = iter([])

    def test_channel_title_update(self):
        """Test channel title field update"""
        self._mock_successful_api_response({"title": "New Title"})
        result = self.service.update_channel(self.channel)

        self.assertTrue(result.success)
        self.assertEqual(len(result.changes_made), 1)
        self.assertIn("title", result.changes_made)

        self.channel.refresh_from_db()
        self.assertIsNotNone(self.channel.last_updated)
        self.assertEqual(self.channel.failed_update_count, 0)

    def test_channel_subscriber_count_update(self):
        """Test channel subscriber count field update"""
        self._mock_successful_api_response({"subscriberCount": "2000"})
        result = self.service.update_channel(self.channel)

        self.assertTrue(result.success)
        self.assertEqual(len(result.changes_made), 1)
        self.assertIn("subscriber_count", result.changes_made)

        self.channel.refresh_from_db()
        self.assertIsNotNone(self.channel.last_updated)
        self.assertEqual(self.channel.failed_update_count, 0)

    def test_channel_video_count_update(self):
        """Test channel video count field update"""
        self._mock_successful_api_response({"videoCount": "60"})
        result = self.service.update_channel(self.channel)

        self.assertTrue(result.success)
        self.assertEqual(len(result.changes_made), 1)
        self.assertIn("video_count", result.changes_made)

    def test_channel_view_count_update(self):
        """Test channel view count field update"""
        self._mock_successful_api_response({"viewCount": "150000"})
        result = self.service.update_channel(self.channel)

        self.assertTrue(result.success)
        self.assertEqual(len(result.changes_made), 1)
        self.assertIn("view_count", result.changes_made)

    def test_channel_multiple_fields_update(self):
        """Test updating multiple channel fields at once"""
        self._mock_successful_api_response({"title": "New Title", "subscriberCount": "2000"})
        result = self.service.update_channel(self.channel)

        self.assertTrue(result.success)
        self.assertEqual(len(result.changes_made), 2)
        self.assertIn("title", result.changes_made)
        self.assertIn("subscriber_count", result.changes_made)

    def test_channel_no_changes_same_title(self):
        """Test no changes when title remains the same"""
        self._mock_successful_api_response({"title": "Test Channel"})
        result = self.service.update_channel(self.channel)

        self.assertTrue(result.success)
        self.assertEqual(len(result.changes_made), 0)

    def test_channel_no_changes_same_subscriber_count(self):
        """Test no changes when subscriber count remains the same"""
        self._mock_successful_api_response({"subscriberCount": "1000"})
        result = self.service.update_channel(self.channel)

        self.assertTrue(result.success)
        self.assertEqual(len(result.changes_made), 0)

    def test_youtube_api_quota_exceeded_error(self):
        """Test handling of YouTube API quota exceeded error"""
        mock_error = HttpError(resp=Mock(status=403), content=b"", uri="test")
        mock_error.error_details = [{"reason": "quotaExceeded"}]
        self.mock_youtube_service.get_channel_details.side_effect = mock_error

        result = self.service.update_channel(self.channel)

        self.assertFalse(result.success)
        self.assertIn("API quota exceeded", result.error_message)

    def test_youtube_api_rate_limit_error(self):
        """Test handling of YouTube API rate limit error"""
        mock_error = HttpError(resp=Mock(status=403), content=b"", uri="test")
        mock_error.error_details = [{"reason": "rateLimitExceeded"}]
        self.mock_youtube_service.get_channel_details.side_effect = mock_error

        result = self.service.update_channel(self.channel)

        self.assertFalse(result.success)
        self.assertIn("Rate limited", result.error_message)

    def test_youtube_api_access_denied_error(self):
        """Test handling of YouTube API access denied error"""
        mock_error = HttpError(resp=Mock(status=403), content=b"", uri="test")
        mock_error.error_details = [{"reason": "forbidden"}]
        self.mock_youtube_service.get_channel_details.side_effect = mock_error

        result = self.service.update_channel(self.channel)

        self.assertFalse(result.success)
        self.assertIn("Channel access denied", result.error_message)

        self.channel.refresh_from_db()
        self.assertEqual(self.channel.failed_update_count, 1)

    def test_youtube_api_not_found_error(self):
        """Test handling of YouTube API not found error"""
        mock_error = HttpError(resp=Mock(status=404), content=b"", uri="test")
        mock_error.error_details = [{"reason": "notFound"}]
        self.mock_youtube_service.get_channel_details.side_effect = mock_error

        result = self.service.update_channel(self.channel)

        self.assertFalse(result.success)
        self.assertIn("Channel no longer available", result.error_message)

        self.channel.refresh_from_db()
        self.assertFalse(self.channel.is_available)
        self.assertEqual(self.channel.failed_update_count, 1)

    def test_youtube_api_server_error_500(self):
        """Test handling of YouTube API server error (500)"""
        mock_error = HttpError(resp=Mock(status=500), content=b"", uri="test")
        mock_error.error_details = [{"reason": "internalError"}]
        self.mock_youtube_service.get_channel_details.side_effect = mock_error

        result = self.service.update_channel(self.channel)

        self.assertFalse(result.success)
        self.assertIn("Rate limited", result.error_message)

    def test_youtube_api_server_error_502(self):
        """Test handling of YouTube API server error (502)"""
        mock_error = HttpError(resp=Mock(status=502), content=b"", uri="test")
        mock_error.error_details = [{"reason": "badGateway"}]
        self.mock_youtube_service.get_channel_details.side_effect = mock_error

        result = self.service.update_channel(self.channel)

        self.assertFalse(result.success)
        self.assertIn("Rate limited", result.error_message)

    def test_youtube_api_server_error_503(self):
        """Test handling of YouTube API server error (503)"""
        mock_error = HttpError(resp=Mock(status=503), content=b"", uri="test")
        mock_error.error_details = [{"reason": "serviceUnavailable"}]
        self.mock_youtube_service.get_channel_details.side_effect = mock_error

        result = self.service.update_channel(self.channel)

        self.assertFalse(result.success)
        self.assertIn("Rate limited", result.error_message)

    def test_priority_calculation_high_subscriber_threshold(self):
        """Test priority calculation for high subscriber count (1M+)"""
        for count in [2000000, 1500000, 1000000]:
            test_channel = Channel.objects.create(
                channel_id=f"UC_test_{count}",
                title="Test Channel",
                subscriber_count=count,
                last_updated=timezone.now(),  # Avoid never-updated bonus
            )
            priority = self.service.determine_update_priority(test_channel)
            self.assertEqual(priority, 100, f"High threshold test failed for {count}")

    def test_priority_calculation_medium_subscriber_threshold(self):
        """Test priority calculation for medium subscriber count (100K-1M)"""
        for count in [999999, 500000, 100000]:
            test_channel = Channel.objects.create(
                channel_id=f"UC_test_{count}",
                title="Test Channel",
                subscriber_count=count,
                last_updated=timezone.now(),  # Avoid never-updated bonus
            )
            priority = self.service.determine_update_priority(test_channel)
            self.assertEqual(priority, 50, f"Medium threshold test failed for {count}")

    def test_priority_calculation_low_subscriber_threshold(self):
        """Test priority calculation for low subscriber count (10K-100K)"""
        for count in [99999, 50000, 10000]:
            test_channel = Channel.objects.create(
                channel_id=f"UC_test_{count}",
                title="Test Channel",
                subscriber_count=count,
                last_updated=timezone.now(),  # Avoid never-updated bonus
            )
            priority = self.service.determine_update_priority(test_channel)
            self.assertEqual(priority, 25, f"Low threshold test failed for {count}")

    def test_priority_calculation_below_threshold(self):
        """Test priority calculation for subscriber count below all thresholds"""
        for count in [9999, 5000, 0]:
            test_channel = Channel.objects.create(
                channel_id=f"UC_test_{count}",
                title="Test Channel",
                subscriber_count=count,
                last_updated=timezone.now(),  # Avoid never-updated bonus
            )
            priority = self.service.determine_update_priority(test_channel)
            self.assertEqual(priority, 0, f"Below threshold test failed for {count}")

    def test_priority_calculation_no_subscriber_count(self):
        """Test priority calculation when no subscriber count is available"""
        test_channel = Channel.objects.create(
            channel_id="UC_test_none",
            title="Test Channel",
            subscriber_count=None,
            last_updated=timezone.now(),  # Avoid never-updated bonus
        )
        priority = self.service.determine_update_priority(test_channel)
        self.assertEqual(priority, 0)

    def test_priority_calculation_no_failure_penalty(self):
        """Test no priority penalty with zero failures"""
        test_channel = Channel.objects.create(
            channel_id="UC_fail_0",
            title="Test Channel",
            failed_update_count=0,
            subscriber_count=100000,  # Medium tier = 50 base priority
            last_updated=timezone.now(),  # Avoid never-updated bonus
        )
        priority = self.service.determine_update_priority(test_channel)
        self.assertEqual(priority, 50)  # No penalty

    def test_priority_calculation_single_failure_penalty(self):
        """Test priority penalty with one failure"""
        test_channel = Channel.objects.create(
            channel_id="UC_fail_1",
            title="Test Channel",
            failed_update_count=1,
            subscriber_count=100000,  # Medium tier = 50 base priority
            last_updated=timezone.now(),  # Avoid never-updated bonus
        )
        priority = self.service.determine_update_priority(test_channel)
        self.assertEqual(priority, 45)  # 50 - 5

    def test_priority_calculation_multiple_failures_penalty(self):
        """Test priority penalty with multiple failures"""
        test_channel = Channel.objects.create(
            channel_id="UC_fail_3",
            title="Test Channel",
            failed_update_count=3,
            subscriber_count=100000,  # Medium tier = 50 base priority
            last_updated=timezone.now(),  # Avoid never-updated bonus
        )
        priority = self.service.determine_update_priority(test_channel)
        self.assertEqual(priority, 35)  # 50 - 15

    def test_priority_calculation_high_failures_penalty(self):
        """Test priority penalty with high failure count"""
        test_channel = Channel.objects.create(
            channel_id="UC_fail_10",
            title="Test Channel",
            failed_update_count=10,
            subscriber_count=100000,  # Medium tier = 50 base priority
            last_updated=timezone.now(),  # Avoid never-updated bonus
        )
        priority = self.service.determine_update_priority(test_channel)
        self.assertEqual(priority, 0)  # max(0, 50 - 50)

    def test_priority_calculation_never_updated_bonus(self):
        """Test priority bonus for never-updated channels"""
        test_channel = Channel.objects.create(
            channel_id="UC_update_test_never", title="Test Channel", last_updated=None
        )
        priority = self.service.determine_update_priority(test_channel)
        self.assertEqual(priority, 200)  # Never updated bonus

    def test_priority_calculation_recently_updated_no_bonus(self):
        """Test no priority bonus for recently updated channels"""
        test_channel = Channel.objects.create(
            channel_id="UC_update_test_recent", title="Test Channel", last_updated=timezone.now()
        )
        priority = self.service.determine_update_priority(test_channel)
        self.assertEqual(priority, 0)  # No bonus for recently updated

    def test_invalid_channel_data_missing_snippet(self):
        """Test handling of channel data missing snippet section"""
        self.mock_youtube_service.get_channel_details.return_value = {"uploads_playlist_id": "UU_test123"}

        mock_youtube_api = Mock()
        mock_youtube_api.channels().list().execute.return_value = {
            "items": [{"statistics": {"subscriberCount": "1000"}}]
        }
        self.mock_youtube_service.youtube = mock_youtube_api

        result = self.service.update_channel(self.channel)

        self.assertFalse(result.success)
        self.assertIn("Invalid channel data received from API", result.error_message)

        self.channel.refresh_from_db()
        self.assertEqual(self.channel.failed_update_count, 1)
        self.assertTrue(self.channel.is_available)

    def test_invalid_channel_data_missing_statistics(self):
        """Test handling of channel data missing statistics section"""
        self.mock_youtube_service.get_channel_details.return_value = {"uploads_playlist_id": "UU_test123"}

        mock_youtube_api = Mock()
        mock_youtube_api.channels().list().execute.return_value = {"items": [{"snippet": {"title": "Test"}}]}
        self.mock_youtube_service.youtube = mock_youtube_api

        result = self.service.update_channel(self.channel)

        self.assertFalse(result.success)
        self.assertIn("Invalid channel data received from API", result.error_message)

        self.channel.refresh_from_db()
        self.assertEqual(self.channel.failed_update_count, 1)
        self.assertTrue(self.channel.is_available)

    def test_invalid_channel_data_empty_items(self):
        """Test handling of empty items in API response"""
        self.mock_youtube_service.get_channel_details.return_value = {"uploads_playlist_id": "UU_test123"}

        mock_youtube_api = Mock()
        mock_youtube_api.channels().list().execute.return_value = {"pageInfo": {"totalResults": 0}}
        self.mock_youtube_service.youtube = mock_youtube_api

        result = self.service.update_channel(self.channel)

        self.assertFalse(result.success)
        self.assertIn("Invalid channel data received from API", result.error_message)

        self.channel.refresh_from_db()
        self.assertEqual(self.channel.failed_update_count, 1)
        self.assertTrue(self.channel.is_available)

    def test_invalid_channel_data_completely_empty(self):
        """Test handling of completely empty API response"""
        self.mock_youtube_service.get_channel_details.return_value = {"uploads_playlist_id": "UU_test123"}

        mock_youtube_api = Mock()
        mock_youtube_api.channels().list().execute.return_value = {}
        self.mock_youtube_service.youtube = mock_youtube_api

        result = self.service.update_channel(self.channel)

        self.assertFalse(result.success)
        self.assertIn("Invalid channel data received from API", result.error_message)

    def test_access_denied_first_failure(self):
        """Test first access denied failure doesn't mark channel unavailable"""
        self.channel.failed_update_count = 0
        self.channel.save()

        mock_error = HttpError(resp=Mock(status=403), content=b"", uri="test")
        mock_error.error_details = [{"reason": "forbidden"}]
        self.mock_youtube_service.get_channel_details.side_effect = mock_error

        result = self.service.update_channel(self.channel)

        self.assertFalse(result.success)
        self.channel.refresh_from_db()
        self.assertEqual(self.channel.failed_update_count, 1)
        self.assertTrue(self.channel.is_available)

    def test_access_denied_fourth_failure(self):
        """Test fourth access denied failure doesn't mark channel unavailable yet"""
        self.channel.failed_update_count = 3
        self.channel.save()

        mock_error = HttpError(resp=Mock(status=403), content=b"", uri="test")
        mock_error.error_details = [{"reason": "forbidden"}]
        self.mock_youtube_service.get_channel_details.side_effect = mock_error

        result = self.service.update_channel(self.channel)

        self.assertFalse(result.success)
        self.channel.refresh_from_db()
        self.assertEqual(self.channel.failed_update_count, 4)
        self.assertTrue(self.channel.is_available)

    def test_access_denied_fifth_failure_marks_unavailable(self):
        """Test fifth access denied failure marks channel as unavailable"""
        self.channel.failed_update_count = 4
        self.channel.save()

        mock_error = HttpError(resp=Mock(status=403), content=b"", uri="test")
        mock_error.error_details = [{"reason": "forbidden"}]
        self.mock_youtube_service.get_channel_details.side_effect = mock_error

        result = self.service.update_channel(self.channel)

        self.assertFalse(result.success)
        self.channel.refresh_from_db()
        self.assertEqual(self.channel.failed_update_count, 5)
        self.assertFalse(self.channel.is_available)

    def test_access_denied_after_threshold_stays_unavailable(self):
        """Test channels stay unavailable after crossing threshold"""
        self.channel.failed_update_count = 6
        self.channel.is_available = False
        self.channel.save()

        mock_error = HttpError(resp=Mock(status=403), content=b"", uri="test")
        mock_error.error_details = [{"reason": "forbidden"}]
        self.mock_youtube_service.get_channel_details.side_effect = mock_error

        result = self.service.update_channel(self.channel)

        self.assertFalse(result.success)
        self.channel.refresh_from_db()
        self.assertEqual(self.channel.failed_update_count, 7)
        self.assertFalse(self.channel.is_available)

    def test_video_fetching_with_playlist_no_videos(self):
        """Test video fetching when playlist exists but no new videos"""
        self.mock_youtube_service.get_channel_details.return_value = {"uploads_playlist_id": "UU_test123"}
        self.mock_youtube_service.get_channel_videos.return_value = iter([])

        mock_youtube_api = Mock()
        mock_youtube_api.channels().list().execute.return_value = {
            "items": [
                {
                    "snippet": {"title": "Test Channel", "description": "Description"},
                    "statistics": {"subscriberCount": "1000", "videoCount": "50", "viewCount": "100000"},
                }
            ]
        }
        self.mock_youtube_service.youtube = mock_youtube_api

        result = self.service.update_channel(self.channel)

        self.assertTrue(result.success)
        self.assertEqual(result.new_videos_added, 0)

    def test_video_fetching_no_uploads_playlist(self):
        """Test video fetching when no uploads playlist is available"""
        # Track calls to distinguish between channel fetch and video fetch
        call_count = 0

        def mock_get_channel_details(channel_id):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                # First call for main channel update - return valid response
                return {"channel_id": channel_id}
            else:
                # Second call for video fetching - return empty dict (no uploads playlist)
                return {}

        self.mock_youtube_service.get_channel_details.side_effect = mock_get_channel_details

        mock_youtube_api = Mock()
        mock_youtube_api.channels().list().execute.return_value = {
            "items": [
                {
                    "snippet": {"title": "Test Channel", "description": "Description"},
                    "statistics": {"subscriberCount": "1000", "videoCount": "50", "viewCount": "100000"},
                }
            ]
        }
        self.mock_youtube_service.youtube = mock_youtube_api

        with patch("videos.services.channel_updater.print") as mock_print:
            result = self.service.update_channel(self.channel)

        # Debug the failure
        if not result.success:
            print(f"Test failed - Error: {result.error_message}")
            print(f"Changes made: {result.changes_made}")

        self.assertTrue(result.success)
        self.assertEqual(result.new_videos_added, 0)
        mock_print.assert_any_call(f"INFO: No uploads playlist found for channel {self.channel.uuid}")

    def test_successful_update_with_new_videos(self):
        """Test channel update that includes new videos"""
        self.mock_youtube_service.get_channel_details.return_value = {"uploads_playlist_id": "UU_test123"}

        # Mock successful channel API response
        mock_youtube_api = Mock()
        mock_youtube_api.channels().list().execute.return_value = {
            "items": [
                {
                    "snippet": {"title": "Test Channel", "description": "Original description"},
                    "statistics": {"subscriberCount": "1000", "videoCount": "50", "viewCount": "100000"},
                }
            ]
        }
        self.mock_youtube_service.youtube = mock_youtube_api

        # Mock new videos
        new_videos = [
            {
                "video_id": "new_video_1",
                "title": "New Video 1",
                "description": "Description 1",
                "published_at": timezone.now(),
                "view_count": 100,
                "like_count": 10,
                "comment_count": 5,
                "duration": "PT5M30S",
                "thumbnail_url": "http://example.com/thumb1.jpg",
                "video_url": "https://www.youtube.com/watch?v=new_video_1",
                "category_id": "22",
                "default_language": "en",
                "tags": "tag1,tag2",
            }
        ]
        self.mock_youtube_service.get_channel_videos.return_value = iter([new_videos])

        result = self.service.update_channel(self.channel)

        self.assertTrue(result.success)
        self.assertEqual(result.new_videos_added, 1)
        self.assertEqual(result.quota_used, 2)  # Channel + videos
        self.assertIn("new_videos", result.changes_made)

        # Verify video was created
        video = Video.objects.get(video_id="new_video_1")
        self.assertEqual(video.channel, self.channel)
        self.assertEqual(video.title, "New Video 1")

    def test_video_fetching_stops_at_existing(self):
        """Test that video fetching stops when encountering existing video"""
        # Create existing video
        Video.objects.create(channel=self.channel, video_id="existing_video", title="Existing Video")

        self.mock_youtube_service.get_channel_details.return_value = {"uploads_playlist_id": "UU_test123"}

        # Mock successful channel API response
        mock_youtube_api = Mock()
        mock_youtube_api.channels().list().execute.return_value = {
            "items": [
                {
                    "snippet": {"title": "Test Channel", "description": "Original description"},
                    "statistics": {"subscriberCount": "1000", "videoCount": "50", "viewCount": "100000"},
                }
            ]
        }
        self.mock_youtube_service.youtube = mock_youtube_api

        # Mock videos: new video first, then existing video
        page1_videos = [
            {
                "video_id": "new_video_1",
                "title": "New Video 1",
                "description": "Description 1",
                "published_at": timezone.now(),
                "view_count": 100,
                "like_count": 10,
                "comment_count": 5,
                "duration": "PT5M30S",
                "thumbnail_url": "http://example.com/thumb1.jpg",
                "video_url": "https://www.youtube.com/watch?v=new_video_1",
                "category_id": "22",
                "default_language": "en",
                "tags": "tag1,tag2",
            },
            {
                "video_id": "existing_video",
                "title": "Existing Video Updated",
                "description": "Updated description",
                "published_at": timezone.now(),
                "view_count": 50,
                "like_count": 5,
                "comment_count": 2,
                "duration": "PT3M20S",
                "thumbnail_url": "http://example.com/thumb2.jpg",
                "video_url": "https://www.youtube.com/watch?v=existing_video",
                "category_id": "22",
                "default_language": "en",
                "tags": "tag3,tag4",
            },
        ]

        # This page should not be processed
        page2_videos = [
            {
                "video_id": "should_not_process",
                "title": "Should Not Process",
                "description": "Should not be processed",
                "published_at": timezone.now(),
                "view_count": 25,
                "like_count": 2,
                "comment_count": 1,
                "duration": "PT2M10S",
                "thumbnail_url": "http://example.com/thumb3.jpg",
                "video_url": "https://www.youtube.com/watch?v=should_not_process",
                "category_id": "22",
                "default_language": "en",
                "tags": "tag5",
            }
        ]

        self.mock_youtube_service.get_channel_videos.return_value = iter([page1_videos, page2_videos])

        result = self.service.update_channel(self.channel)

        # Verify only new video was added (stopped at existing)
        self.assertEqual(result.new_videos_added, 1)
        self.assertTrue(Video.objects.filter(video_id="new_video_1").exists())
        self.assertFalse(Video.objects.filter(video_id="should_not_process").exists())

    def test_no_changes_detected(self):
        """Test that no save occurs when no changes are detected"""
        # Set an initial last_updated time so the channel isn't considered "never updated"
        initial_time = timezone.now()
        self.channel.last_updated = initial_time
        self.channel.save()

        # Mock API to return same data
        self._mock_successful_api_response()

        result = self.service.update_channel(self.channel)

        self.assertTrue(result.success)
        self.assertEqual(len(result.changes_made), 0)

        # Verify last_updated was not changed (no save occurred)
        self.channel.refresh_from_db()
        self.assertEqual(self.channel.last_updated, initial_time)
