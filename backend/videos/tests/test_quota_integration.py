"""
Integration tests for QuotaTracker with ChannelUpdateService.
"""

from unittest.mock import Mock, patch, call

from django.test import TestCase

from videos.models import Channel
from videos.services.channel_updater import ChannelUpdateService
from videos.services.quota_tracker import QuotaTracker
from videos.services.youtube import YouTubeService


class QuotaIntegrationTests(TestCase):
    """Integration tests for QuotaTracker with ChannelUpdateService"""

    def setUp(self) -> None:
        """Set up test cases with mocked services"""
        self.mock_youtube_service = Mock(spec=YouTubeService)
        self.quota_tracker = QuotaTracker(daily_quota_limit=100)
        self.channel_updater = ChannelUpdateService(
            youtube_service=self.mock_youtube_service, quota_tracker=self.quota_tracker
        )

        # Create test channel
        self.channel = Channel.objects.create(
            channel_id="UC_test123",
            title="Test Channel",
            description="Test Description",
            url="https://youtube.com/test",
        )

    def test_channel_update_checks_quota_before_request(self) -> None:
        """Test that channel update checks quota before making API calls"""
        # Set quota tracker to deny requests
        self.quota_tracker.can_make_request = Mock(return_value=False)

        result = self.channel_updater.update_channel(self.channel)

        self.assertFalse(result.success)
        self.assertEqual(result.error_message, "Insufficient quota for channel update")
        self.assertEqual(result.quota_used, 0)
        self.quota_tracker.can_make_request.assert_called_with("channels.list")

    @patch("videos.services.channel_updater.print")
    def test_channel_update_records_quota_on_success(self, mock_print) -> None:
        """Test that successful channel updates record quota usage"""
        # Mock successful API responses
        self.mock_youtube_service.get_channel_details.return_value = {"uploads_playlist_id": "UU_test123"}

        mock_youtube_api = Mock()
        mock_youtube_api.channels().list().execute.return_value = {
            "items": [{"snippet": {"title": "Updated Title"}, "statistics": {"subscriberCount": "1000"}}]
        }
        self.mock_youtube_service.youtube = mock_youtube_api
        self.mock_youtube_service.get_channel_videos.return_value = iter([])

        # Set quota tracker to allow requests
        self.quota_tracker.can_make_request = Mock(return_value=True)
        self.quota_tracker.record_usage = Mock()

        result = self.channel_updater.update_channel(self.channel)

        self.assertTrue(result.success)
        self.quota_tracker.record_usage.assert_called_with("channels.list")

    def test_video_fetching_respects_quota_limits(self) -> None:
        """Test that video fetching respects quota limits"""
        # Mock channel details but deny quota for video fetching
        self.mock_youtube_service.get_channel_details.return_value = {"uploads_playlist_id": "UU_test123"}

        with patch.object(self.quota_tracker, "can_make_request") as mock_can_request:
            # Allow channels.list but deny playlistItems.list
            mock_can_request.side_effect = lambda op: op == "channels.list"

            with patch("videos.services.channel_updater.print") as mock_print:
                videos_count = self.channel_updater._fetch_new_videos(self.channel)

                self.assertEqual(videos_count, 0)
                mock_print.assert_called_with(
                    f"WARNING: Insufficient quota for video fetching for channel {self.channel.uuid}"
                )

    def test_batch_update_optimizes_based_on_quota(self) -> None:
        """Test that batch updates use quota optimization"""
        channels = [self.channel]

        # Mock quota tracker to return specific batch size
        self.quota_tracker.optimize_batch_size = Mock(return_value=1)
        self.quota_tracker.can_make_request = Mock(return_value=True)
        self.quota_tracker.get_usage_summary = Mock(
            return_value={"daily_usage": 50, "daily_limit": 100, "remaining": 50, "percentage_used": 50.0}
        )

        # Mock successful update
        with patch.object(self.channel_updater, "update_channel") as mock_update:
            mock_result = Mock()
            mock_result.success = True
            mock_result.quota_used = 2
            mock_update.return_value = mock_result

            result = self.channel_updater.update_channels_batch(channels)

            self.quota_tracker.optimize_batch_size.assert_called_with("channels.list")
            self.assertEqual(result["processed"], 1)
            self.assertEqual(result["successful"], 1)
            self.assertEqual(result["quota_used"], 2)

    def test_batch_update_stops_when_quota_exhausted(self) -> None:
        """Test that batch update stops when quota is exhausted"""
        channels = [self.channel, self.channel]  # Two channels

        # Mock quota tracker to allow first request but deny second
        self.quota_tracker.optimize_batch_size = Mock(return_value=2)
        call_count = 0

        def mock_can_request(operation):
            nonlocal call_count
            call_count += 1
            return call_count == 1  # Only allow first call

        self.quota_tracker.can_make_request = Mock(side_effect=mock_can_request)
        self.quota_tracker.get_usage_summary = Mock(return_value={})

        # Mock successful first update
        with patch.object(self.channel_updater, "update_channel") as mock_update:
            mock_result = Mock()
            mock_result.success = True
            mock_result.quota_used = 1
            mock_update.return_value = mock_result

            result = self.channel_updater.update_channels_batch(channels)

            self.assertEqual(result["processed"], 1)  # Only one processed
            self.assertTrue(result["stopped_due_to_quota"])

    def test_batch_update_handles_empty_channel_list(self) -> None:
        """Test that batch update handles empty channel list gracefully"""
        result = self.channel_updater.update_channels_batch([])

        expected = {
            "processed": 0,
            "successful": 0,
            "failed": 0,
            "quota_used": 0,
            "stopped_due_to_quota": False,
            "results": [],
        }

        for key, value in expected.items():
            self.assertEqual(result[key], value)

    def test_batch_update_limits_channels_when_quota_low(self) -> None:
        """Test that batch update limits channels when quota is low"""
        channels = [self.channel] * 10  # Ten channels

        # Mock quota tracker to return small batch size
        self.quota_tracker.optimize_batch_size = Mock(return_value=3)
        self.quota_tracker.can_make_request = Mock(return_value=True)
        self.quota_tracker.get_usage_summary = Mock(return_value={})

        # Mock successful updates
        with patch.object(self.channel_updater, "update_channel") as mock_update:
            mock_result = Mock()
            mock_result.success = True
            mock_result.quota_used = 1
            mock_update.return_value = mock_result

            result = self.channel_updater.update_channels_batch(channels)

            self.assertEqual(result["processed"], 3)  # Limited by quota optimization
            self.assertTrue(result["stopped_due_to_quota"])

    @patch("videos.services.channel_updater.print")
    def test_integration_with_video_fetching_quota_tracking(self, mock_print) -> None:
        """Test complete integration with video fetching and quota tracking"""
        # Mock successful API responses
        self.mock_youtube_service.get_channel_details.return_value = {"uploads_playlist_id": "UU_test123"}

        mock_youtube_api = Mock()
        mock_youtube_api.channels().list().execute.return_value = {
            "items": [{"snippet": {"title": "Updated Title"}, "statistics": {"subscriberCount": "1000"}}]
        }
        self.mock_youtube_service.youtube = mock_youtube_api

        # Mock video generator with one page of videos
        mock_video_data = [{"video_id": "video_123", "title": "Test Video"}]
        self.mock_youtube_service.get_channel_videos.return_value = iter([mock_video_data])

        # Set quota tracker to allow all requests
        self.quota_tracker.can_make_request = Mock(return_value=True)
        self.quota_tracker.record_usage = Mock()

        result = self.channel_updater.update_channel(self.channel)

        self.assertTrue(result.success)

        # Verify quota was recorded for both channel and video operations
        expected_calls = [
            call("channels.list"),
            call("playlistItems.list"),
            call("videos.list"),
        ]
        self.quota_tracker.record_usage.assert_has_calls(expected_calls)

    def test_quota_tracker_initialization_in_service(self) -> None:
        """Test that ChannelUpdateService properly initializes QuotaTracker"""
        # Test with explicit quota tracker
        service_with_tracker = ChannelUpdateService(self.mock_youtube_service, self.quota_tracker)
        self.assertEqual(service_with_tracker.quota_tracker, self.quota_tracker)

        # Test with default quota tracker
        service_default = ChannelUpdateService(self.mock_youtube_service)
        self.assertIsInstance(service_default.quota_tracker, QuotaTracker)
        self.assertEqual(service_default.quota_tracker.daily_quota_limit, 10000)
