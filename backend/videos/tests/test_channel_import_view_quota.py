"""
Tests for channel import view integration with UserQuotaTracker.
"""

from unittest.mock import Mock, patch
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from videos.models import Channel
from videos.services.user_quota_tracker import UserQuotaTracker
from videos.exceptions import UserQuotaExceededError

User = get_user_model()


class ChannelImportViewQuotaTests(TestCase):
    """Tests for quota tracking in channel import views"""

    def setUp(self) -> None:
        """Set up test cases with authenticated user"""
        self.user = User.objects.create_user(username="testuser", email="test@example.com", password="testpassword")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @patch("videos.views.UserQuotaTracker")
    @patch("videos.views.YouTubeService")
    def test_fetch_from_youtube_creates_user_quota_tracker(
        self, mock_youtube_service_class, mock_user_quota_tracker_class
    ):
        """Test that fetch_from_youtube endpoint creates and uses UserQuotaTracker"""
        # Mock the quota tracker instance
        mock_quota_tracker = Mock()
        mock_user_quota_tracker_class.return_value = mock_quota_tracker

        # Mock the YouTube service instance
        mock_youtube_service = Mock()
        mock_channel = Channel.objects.create(
            channel_id="UC123456", title="Test Channel", description="Test Description", url="https://youtube.com/test"
        )
        mock_youtube_service.import_or_create_channel.return_value = mock_channel
        mock_youtube_service_class.return_value = mock_youtube_service

        # Mock credentials in request
        with patch("videos.decorators.youtube_auth_required") as mock_decorator:

            def mock_wrapper(func):
                def wrapper(self, request, *args, **kwargs):
                    request.youtube_credentials = Mock()
                    return func(self, request, *args, **kwargs)

                return wrapper

            mock_decorator.return_value = mock_wrapper

            response = self.client.post("/api/channels/fetch-from-youtube/", {"channel_id": "UC123456"})

            self.assertEqual(response.status_code, status.HTTP_200_OK)

            # Verify QuotaTracker was created
            mock_user_quota_tracker_class.assert_called_once_with(user=self.user)

            # Verify YouTubeService was created with quota tracker
            mock_youtube_service_class.assert_called_once()
            call_args = mock_youtube_service_class.call_args
            self.assertIn("quota_tracker", call_args.kwargs)
            self.assertEqual(call_args.kwargs["quota_tracker"], mock_quota_tracker)

    @patch("videos.views.UserQuotaTracker")
    @patch("videos.views.YouTubeService")
    def test_fetch_from_youtube_handles_user_quota_exceeded(
        self, mock_youtube_service_class, mock_user_quota_tracker_class
    ):
        """Test that view handles UserQuotaExceededError gracefully"""
        # Mock user quota exceeded error
        quota_info = {
            "daily_usage": 950,
            "daily_limit": 1000,
            "remaining": 50,
            "percentage_used": 95.0,
            "operations_count": {"channels.list": 950},
            "status": "critical",
        }
        mock_user_quota_tracker_class.side_effect = UserQuotaExceededError(
            "Daily user quota limit exceeded", quota_info=quota_info
        )

        # Mock credentials in request
        with patch("videos.decorators.youtube_auth_required") as mock_decorator:

            def mock_wrapper(func):
                def wrapper(self, request, *args, **kwargs):
                    request.youtube_credentials = Mock()
                    return func(self, request, *args, **kwargs)

                return wrapper

            mock_decorator.return_value = mock_wrapper

            response = self.client.post("/api/channels/fetch-from-youtube/", {"channel_id": "UC123456"})

            self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
            self.assertIn("error", response.data)
            self.assertEqual(response.data["error"], "Daily quota limit exceeded")
            self.assertIn("quota_info", response.data)
            self.assertEqual(response.data["quota_info"], quota_info)

    @patch("videos.views.UserQuotaTracker")
    @patch("videos.views.YouTubeService")
    def test_fetch_from_youtube_quota_tracker_integration_flow(
        self, mock_youtube_service_class, mock_user_quota_tracker_class
    ):
        """Test complete integration flow with quota tracking"""
        # Mock the quota tracker with specific behavior
        mock_quota_tracker = Mock()
        mock_quota_tracker.can_make_request.return_value = True
        mock_quota_tracker.get_current_usage.return_value = 25
        mock_quota_tracker.get_remaining_quota.return_value = 75
        mock_user_quota_tracker_class.return_value = mock_quota_tracker

        # Mock successful channel import
        mock_youtube_service = Mock()
        mock_channel = Channel.objects.create(
            channel_id="UC123456", title="Test Channel", description="Test Description", url="https://youtube.com/test"
        )
        mock_youtube_service.import_or_create_channel.return_value = mock_channel
        mock_youtube_service_class.return_value = mock_youtube_service

        # Mock credentials in request
        with patch("videos.decorators.youtube_auth_required") as mock_decorator:

            def mock_wrapper(func):
                def wrapper(self, request, *args, **kwargs):
                    request.youtube_credentials = Mock()
                    return func(self, request, *args, **kwargs)

                return wrapper

            mock_decorator.return_value = mock_wrapper

            response = self.client.post("/api/channels/fetch-from-youtube/", {"channel_id": "UC123456"})

            self.assertEqual(response.status_code, status.HTTP_200_OK)

            # Verify the complete flow
            mock_user_quota_tracker_class.assert_called_once_with(user=self.user)
            mock_youtube_service_class.assert_called_once_with(
                credentials=mock_youtube_service_class.call_args.kwargs["credentials"], quota_tracker=mock_quota_tracker
            )
            mock_youtube_service.import_or_create_channel.assert_called_once_with("UC123456")

    def test_fetch_from_youtube_requires_channel_id(self) -> None:
        """Test that endpoint validates channel_id parameter"""
        # Mock credentials in request
        with patch("videos.decorators.youtube_auth_required") as mock_decorator:

            def mock_wrapper(func):
                def wrapper(self, request, *args, **kwargs):
                    request.youtube_credentials = Mock()
                    return func(self, request, *args, **kwargs)

                return wrapper

            mock_decorator.return_value = mock_wrapper

            response = self.client.post("/api/channels/fetch-from-youtube/", {})

            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("channel_id", response.data)

    @patch("videos.views.UserQuotaTracker")
    @patch("videos.views.YouTubeService")
    def test_user_quota_tracker_passed_to_youtube_service_constructor(
        self, mock_youtube_service_class, mock_user_quota_tracker_class
    ):
        """Test that UserQuotaTracker is properly passed to YouTubeService constructor"""
        # Create specific mock instances
        mock_quota_tracker = Mock(spec=UserQuotaTracker)
        mock_user_quota_tracker_class.return_value = mock_quota_tracker

        mock_youtube_service = Mock()
        mock_channel = Channel.objects.create(
            channel_id="UC123456", title="Test Channel", description="Test Description", url="https://youtube.com/test"
        )
        mock_youtube_service.import_or_create_channel.return_value = mock_channel
        mock_youtube_service_class.return_value = mock_youtube_service

        # Mock credentials in request
        with patch("videos.decorators.youtube_auth_required") as mock_decorator:

            def mock_wrapper(func):
                def wrapper(self, request, *args, **kwargs):
                    request.youtube_credentials = Mock()
                    return func(self, request, *args, **kwargs)

                return wrapper

            mock_decorator.return_value = mock_wrapper

            response = self.client.post("/api/channels/fetch-from-youtube/", {"channel_id": "UC123456"})

            self.assertEqual(response.status_code, status.HTTP_200_OK)

            # Verify QuotaTracker constructor was called
            mock_user_quota_tracker_class.assert_called_once_with(user=self.user)

            # Verify YouTubeService was called with the quota tracker
            mock_youtube_service_class.assert_called_once()
            call_kwargs = mock_youtube_service_class.call_args.kwargs

            self.assertIn("credentials", call_kwargs)
            self.assertIn("quota_tracker", call_kwargs)
            self.assertEqual(call_kwargs["quota_tracker"], mock_quota_tracker)
