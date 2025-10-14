"""
Integration tests for QuotaTracker with YouTubeService channel import functionality.
"""

from unittest.mock import Mock, patch
from django.test import TestCase
from videos.models import Channel
from videos.services.youtube import YouTubeService
from videos.services.quota_tracker import QuotaTracker


class YouTubeImportQuotaIntegrationTests(TestCase):
    """Integration tests for QuotaTracker with YouTubeService import functionality"""

    def setUp(self):
        """Set up test cases with mocked credentials and services"""
        self.mock_credentials = Mock()
        self.quota_tracker = QuotaTracker(daily_quota_limit=100)

    def test_youtube_service_accepts_quota_tracker(self):
        """Test that YouTubeService properly accepts and stores QuotaTracker"""
        with patch("videos.services.youtube.build") as mock_build:
            mock_build.return_value = Mock()

            youtube_service = YouTubeService(credentials=self.mock_credentials, quota_tracker=self.quota_tracker)

            self.assertEqual(youtube_service.quota_tracker, self.quota_tracker)

    def test_youtube_service_creates_default_quota_tracker(self):
        """Test that YouTubeService creates default QuotaTracker when none provided"""
        with patch("videos.services.youtube.build") as mock_build:
            mock_build.return_value = Mock()

            youtube_service = YouTubeService(credentials=self.mock_credentials)

            self.assertIsInstance(youtube_service.quota_tracker, QuotaTracker)

    def test_get_channels_by_ids_checks_quota(self):
        """Test that _get_channels_by_ids checks quota before making API call"""
        with patch("videos.services.youtube.build") as mock_build:
            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            # Mock quota tracker to deny request
            self.quota_tracker.can_make_request = Mock(return_value=False)

            youtube_service = YouTubeService(credentials=self.mock_credentials, quota_tracker=self.quota_tracker)

            with self.assertRaises(Exception) as context:
                youtube_service._get_channels_by_ids("UC123456")

            self.assertIn("Insufficient quota", str(context.exception))
            self.quota_tracker.can_make_request.assert_called_with("channels.list")

    def test_get_channels_by_ids_records_quota_usage(self):
        """Test that _get_channels_by_ids records quota usage after successful API call"""
        with patch("videos.services.youtube.build") as mock_build:
            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            # Mock successful API response
            mock_request = Mock()
            mock_response = {"items": [{"id": "UC123456", "snippet": {"title": "Test Channel"}}]}
            mock_request.execute.return_value = mock_response
            mock_youtube.channels().list.return_value = mock_request

            # Mock quota tracker to allow request
            self.quota_tracker.can_make_request = Mock(return_value=True)
            self.quota_tracker.record_usage = Mock()

            youtube_service = YouTubeService(credentials=self.mock_credentials, quota_tracker=self.quota_tracker)

            result = youtube_service._get_channels_by_ids("UC123456")

            self.assertEqual(result[0]["id"], "UC123456")
            self.quota_tracker.record_usage.assert_called_with("channels.list")

    def test_get_channel_by_handle_checks_quota(self):
        """Test that _get_channel_by_handle checks quota before making API call"""
        with patch("videos.services.youtube.build") as mock_build:
            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            # Mock quota tracker to deny request
            self.quota_tracker.can_make_request = Mock(return_value=False)

            youtube_service = YouTubeService(credentials=self.mock_credentials, quota_tracker=self.quota_tracker)

            with self.assertRaises(Exception) as context:
                youtube_service._get_channel_by_handle("testuser")

            self.assertIn("Insufficient quota", str(context.exception))
            self.quota_tracker.can_make_request.assert_called_with("channels.list")

    def test_search_channel_by_handle_checks_quota(self):
        """Test that _search_channel_by_handle checks quota before making API call"""
        with patch("videos.services.youtube.build") as mock_build:
            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            # Mock quota tracker to deny request
            self.quota_tracker.can_make_request = Mock(return_value=False)

            youtube_service = YouTubeService(credentials=self.mock_credentials, quota_tracker=self.quota_tracker)

            with self.assertRaises(Exception) as context:
                youtube_service._search_channel_by_handle("testuser")

            self.assertIn("Insufficient quota", str(context.exception))
            self.quota_tracker.can_make_request.assert_called_with("search.list")

    def test_search_channel_records_quota_usage(self):
        """Test that _search_channel_by_handle records quota usage correctly"""
        with patch("videos.services.youtube.build") as mock_build:
            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            # Mock successful API response
            mock_request = Mock()
            mock_response = {"items": [{"snippet": {"channelId": "UC123456"}}]}
            mock_request.execute.return_value = mock_response
            mock_youtube.search().list.return_value = mock_request

            # Mock quota tracker to allow request
            self.quota_tracker.can_make_request = Mock(return_value=True)
            self.quota_tracker.record_usage = Mock()

            youtube_service = YouTubeService(credentials=self.mock_credentials, quota_tracker=self.quota_tracker)

            result = youtube_service._search_channel_by_handle("testuser")

            self.assertEqual(result, "UC123456")
            self.quota_tracker.record_usage.assert_called_with("search.list")

    def test_get_channel_videos_checks_quota_for_playlist_items(self):
        """Test that get_channel_videos checks quota for playlistItems.list calls"""
        with patch("videos.services.youtube.build") as mock_build:
            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            # Mock quota tracker to deny playlistItems.list request
            self.quota_tracker.can_make_request = Mock(return_value=False)

            youtube_service = YouTubeService(credentials=self.mock_credentials, quota_tracker=self.quota_tracker)

            with patch("builtins.print") as mock_print:
                videos = list(youtube_service.get_channel_videos("UU123456"))

                self.assertEqual(len(videos), 0)
                mock_print.assert_called_with("WARNING: Insufficient quota for playlistItems.list API call")

    def test_get_channel_videos_checks_quota_for_videos_list(self):
        """Test that get_channel_videos checks quota for videos.list calls"""
        with patch("videos.services.youtube.build") as mock_build:
            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            # Mock playlist response with video IDs
            mock_playlist_request = Mock()
            mock_playlist_response = {"items": [{"contentDetails": {"videoId": "video123"}}], "nextPageToken": None}
            mock_playlist_request.execute.return_value = mock_playlist_response
            mock_youtube.playlistItems().list.return_value = mock_playlist_request

            # Mock quota tracker to allow playlistItems but deny videos.list
            def mock_can_request(operation):
                return operation == "playlistItems.list"

            self.quota_tracker.can_make_request = Mock(side_effect=mock_can_request)
            self.quota_tracker.record_usage = Mock()

            youtube_service = YouTubeService(credentials=self.mock_credentials, quota_tracker=self.quota_tracker)

            with patch("builtins.print") as mock_print:
                videos = list(youtube_service.get_channel_videos("UU123456"))

                self.assertEqual(len(videos), 0)
                mock_print.assert_called_with("WARNING: Insufficient quota for videos.list API call")

    def test_get_channel_videos_records_quota_usage(self):
        """Test that get_channel_videos records quota usage for both API calls"""
        with patch("videos.services.youtube.build") as mock_build:
            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            # Mock playlist response
            mock_playlist_request = Mock()
            mock_playlist_response = {"items": [{"contentDetails": {"videoId": "video123"}}], "nextPageToken": None}
            mock_playlist_request.execute.return_value = mock_playlist_response
            mock_youtube.playlistItems().list.return_value = mock_playlist_request

            # Mock videos response
            mock_videos_request = Mock()
            mock_videos_response = {
                "items": [
                    {
                        "id": "video123",
                        "snippet": {
                            "title": "Test Video",
                            "publishedAt": "2023-01-01T00:00:00Z",
                            "thumbnails": {"high": {"url": "https://example.com/thumb.jpg"}},
                        },
                        "contentDetails": {"duration": "PT5M"},
                        "statistics": {"viewCount": "1000", "likeCount": "50", "commentCount": "10"},
                    }
                ]
            }
            mock_videos_request.execute.return_value = mock_videos_response
            mock_youtube.videos().list.return_value = mock_videos_request

            # Mock quota tracker to allow all requests
            self.quota_tracker.can_make_request = Mock(return_value=True)
            self.quota_tracker.record_usage = Mock()

            youtube_service = YouTubeService(credentials=self.mock_credentials, quota_tracker=self.quota_tracker)

            videos = list(youtube_service.get_channel_videos("UU123456"))

            self.assertEqual(len(videos), 1)
            self.assertEqual(videos[0][0]["video_id"], "video123")

            # Verify both API calls recorded quota usage
            expected_calls = [Mock.call("playlistItems.list"), Mock.call("videos.list")]
            self.quota_tracker.record_usage.assert_has_calls(expected_calls)

    def test_import_or_create_channel_with_quota_tracking(self):
        """Test complete channel import flow with quota tracking"""
        with patch("videos.services.youtube.build") as mock_build:
            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            # Mock successful channel details response
            mock_channel_request = Mock()
            mock_channel_response = {
                "items": [
                    {
                        "id": "UC123456",
                        "snippet": {"title": "Test Channel", "description": "Test Description"},
                        "contentDetails": {"relatedPlaylists": {"uploads": "UU123456"}},
                    }
                ]
            }
            mock_channel_request.execute.return_value = mock_channel_response
            mock_youtube.channels().list.return_value = mock_channel_request

            # Mock empty video response
            mock_playlist_request = Mock()
            mock_playlist_response = {"items": [], "nextPageToken": None}
            mock_playlist_request.execute.return_value = mock_playlist_response
            mock_youtube.playlistItems().list.return_value = mock_playlist_request

            # Mock quota tracker to allow all requests
            self.quota_tracker.can_make_request = Mock(return_value=True)
            self.quota_tracker.record_usage = Mock()

            youtube_service = YouTubeService(credentials=self.mock_credentials, quota_tracker=self.quota_tracker)

            channel = youtube_service.import_or_create_channel("UC123456")

            self.assertIsInstance(channel, Channel)
            self.assertEqual(channel.channel_id, "UC123456")
            self.assertEqual(channel.title, "Test Channel")

            # Verify quota was tracked for channel details and video fetching
            expected_calls = [
                Mock.call("channels.list"),  # For channel details
                Mock.call("playlistItems.list"),  # For video fetching
            ]
            self.quota_tracker.record_usage.assert_has_calls(expected_calls)

    def test_channel_import_falls_back_when_quota_exhausted(self):
        """Test that channel import falls back to basic channel creation when quota is exhausted"""
        with patch("videos.services.youtube.build") as mock_build:
            mock_youtube = Mock()
            mock_build.return_value = mock_youtube

            # Mock quota tracker to deny all requests
            self.quota_tracker.can_make_request = Mock(return_value=False)

            youtube_service = YouTubeService(credentials=self.mock_credentials, quota_tracker=self.quota_tracker)

            channel = youtube_service.import_or_create_channel("UC123456")

            # Should create basic channel without API calls
            self.assertIsInstance(channel, Channel)
            self.assertEqual(channel.channel_id, "UC123456")
            self.assertTrue(channel.title.startswith("Channel UC123456"))
            self.assertIn("Imported channel", channel.description)
