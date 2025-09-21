"""
Tests for channel import view integration with QuotaTracker.
"""
from unittest.mock import Mock, patch
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from videos.models import Channel
from videos.services.quota_tracker import QuotaTracker

User = get_user_model()


class ChannelImportViewQuotaTests(TestCase):
    """Tests for quota tracking in channel import views"""

    def setUp(self):
        """Set up test cases with authenticated user"""
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @patch('videos.views.QuotaTracker')
    @patch('videos.views.YouTubeService')
    def test_fetch_from_youtube_creates_quota_tracker(self, mock_youtube_service_class, mock_quota_tracker_class):
        """Test that fetch_from_youtube endpoint creates and uses QuotaTracker"""
        # Mock the quota tracker instance
        mock_quota_tracker = Mock()
        mock_quota_tracker_class.return_value = mock_quota_tracker

        # Mock the YouTube service instance
        mock_youtube_service = Mock()
        mock_channel = Channel.objects.create(
            channel_id="UC123456",
            title="Test Channel",
            description="Test Description",
            url="https://youtube.com/test"
        )
        mock_youtube_service.import_or_create_channel.return_value = mock_channel
        mock_youtube_service_class.return_value = mock_youtube_service

        # Mock credentials in request
        with patch('videos.decorators.youtube_auth_required') as mock_decorator:
            def mock_wrapper(func):
                def wrapper(self, request, *args, **kwargs):
                    request.youtube_credentials = Mock()
                    return func(self, request, *args, **kwargs)
                return wrapper
            mock_decorator.return_value = mock_wrapper

            response = self.client.post('/api/channels/fetch-from-youtube/', {
                'channel_id': 'UC123456'
            })

            self.assertEqual(response.status_code, status.HTTP_200_OK)

            # Verify QuotaTracker was created
            mock_quota_tracker_class.assert_called_once()

            # Verify YouTubeService was created with quota tracker
            mock_youtube_service_class.assert_called_once()
            call_args = mock_youtube_service_class.call_args
            self.assertIn('quota_tracker', call_args.kwargs)
            self.assertEqual(call_args.kwargs['quota_tracker'], mock_quota_tracker)

    @patch('videos.views.QuotaTracker')
    @patch('videos.views.YouTubeService')
    def test_fetch_from_youtube_handles_quota_exhaustion(self, mock_youtube_service_class, mock_quota_tracker_class):
        """Test that view handles quota exhaustion gracefully"""
        # Mock the quota tracker instance
        mock_quota_tracker = Mock()
        mock_quota_tracker_class.return_value = mock_quota_tracker

        # Mock YouTube service to raise quota exhaustion exception
        mock_youtube_service = Mock()
        mock_youtube_service.import_or_create_channel.side_effect = Exception("Insufficient quota for channels.list API call")
        mock_youtube_service_class.return_value = mock_youtube_service

        # Mock credentials in request
        with patch('videos.decorators.youtube_auth_required') as mock_decorator:
            def mock_wrapper(func):
                def wrapper(self, request, *args, **kwargs):
                    request.youtube_credentials = Mock()
                    return func(self, request, *args, **kwargs)
                return wrapper
            mock_decorator.return_value = mock_wrapper

            with patch('builtins.print') as mock_print:
                response = self.client.post('/api/channels/fetch-from-youtube/', {
                    'channel_id': 'UC123456'
                })

                self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
                self.assertIn('error', response.data)
                mock_print.assert_called_with('Error importing channel: Insufficient quota for channels.list API call')

    @patch('videos.views.QuotaTracker')
    @patch('videos.views.YouTubeService')
    def test_fetch_from_youtube_quota_tracker_integration_flow(self, mock_youtube_service_class, mock_quota_tracker_class):
        """Test complete integration flow with quota tracking"""
        # Mock the quota tracker with specific behavior
        mock_quota_tracker = Mock()
        mock_quota_tracker.can_make_request.return_value = True
        mock_quota_tracker.get_current_usage.return_value = 25
        mock_quota_tracker.get_remaining_quota.return_value = 75
        mock_quota_tracker_class.return_value = mock_quota_tracker

        # Mock successful channel import
        mock_youtube_service = Mock()
        mock_channel = Channel.objects.create(
            channel_id="UC123456",
            title="Test Channel",
            description="Test Description",
            url="https://youtube.com/test"
        )
        mock_youtube_service.import_or_create_channel.return_value = mock_channel
        mock_youtube_service_class.return_value = mock_youtube_service

        # Mock credentials in request
        with patch('videos.decorators.youtube_auth_required') as mock_decorator:
            def mock_wrapper(func):
                def wrapper(self, request, *args, **kwargs):
                    request.youtube_credentials = Mock()
                    return func(self, request, *args, **kwargs)
                return wrapper
            mock_decorator.return_value = mock_wrapper

            response = self.client.post('/api/channels/fetch-from-youtube/', {
                'channel_id': 'UC123456'
            })

            self.assertEqual(response.status_code, status.HTTP_200_OK)

            # Verify the complete flow
            mock_quota_tracker_class.assert_called_once()
            mock_youtube_service_class.assert_called_once_with(
                credentials=mock_youtube_service_class.call_args.kwargs['credentials'],
                quota_tracker=mock_quota_tracker
            )
            mock_youtube_service.import_or_create_channel.assert_called_once_with('UC123456')

    def test_fetch_from_youtube_requires_channel_id(self):
        """Test that endpoint validates channel_id parameter"""
        # Mock credentials in request
        with patch('videos.decorators.youtube_auth_required') as mock_decorator:
            def mock_wrapper(func):
                def wrapper(self, request, *args, **kwargs):
                    request.youtube_credentials = Mock()
                    return func(self, request, *args, **kwargs)
                return wrapper
            mock_decorator.return_value = mock_wrapper

            response = self.client.post('/api/channels/fetch-from-youtube/', {})

            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('channel_id', response.data)

    @patch('videos.views.QuotaTracker')
    @patch('videos.views.YouTubeService')
    def test_quota_tracker_passed_to_youtube_service_constructor(self, mock_youtube_service_class, mock_quota_tracker_class):
        """Test that QuotaTracker is properly passed to YouTubeService constructor"""
        # Create specific mock instances
        mock_quota_tracker = Mock(spec=QuotaTracker)
        mock_quota_tracker_class.return_value = mock_quota_tracker

        mock_youtube_service = Mock()
        mock_channel = Channel.objects.create(
            channel_id="UC123456",
            title="Test Channel",
            description="Test Description",
            url="https://youtube.com/test"
        )
        mock_youtube_service.import_or_create_channel.return_value = mock_channel
        mock_youtube_service_class.return_value = mock_youtube_service

        # Mock credentials in request
        with patch('videos.decorators.youtube_auth_required') as mock_decorator:
            def mock_wrapper(func):
                def wrapper(self, request, *args, **kwargs):
                    request.youtube_credentials = Mock()
                    return func(self, request, *args, **kwargs)
                return wrapper
            mock_decorator.return_value = mock_wrapper

            response = self.client.post('/api/channels/fetch-from-youtube/', {
                'channel_id': 'UC123456'
            })

            self.assertEqual(response.status_code, status.HTTP_200_OK)

            # Verify QuotaTracker constructor was called
            mock_quota_tracker_class.assert_called_once()

            # Verify YouTubeService was called with the quota tracker
            mock_youtube_service_class.assert_called_once()
            call_kwargs = mock_youtube_service_class.call_args.kwargs

            self.assertIn('credentials', call_kwargs)
            self.assertIn('quota_tracker', call_kwargs)
            self.assertEqual(call_kwargs['quota_tracker'], mock_quota_tracker)