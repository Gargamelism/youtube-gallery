from django.test import TestCase
from rest_framework.test import APITestCase
from django.urls import reverse
from rest_framework import viewsets
from ..utils.router import KebabCaseRouter
from ..utils.viewset_mixins import KebabCaseEndpointsMixin
from ..models import Video, Channel

# Test ViewSet for router testing
class DummyViewSet(viewsets.ViewSet):
    def list(self): pass
    def create(self): pass
    def retrieve(self): pass
    def update(self): pass
    def partial_update(self): pass
    def destroy(self): pass
    
    def custom_action_name(self): pass
    custom_action_name.url_path = 'custom_action_name'

class TestKebabCaseRouter(TestCase):
    def setUp(self):
        self.router = KebabCaseRouter()
        self.router.register(r'test', DummyViewSet, basename='test')
        self.urls = self.router.get_urls()

    def test_standard_actions_are_kebab_case(self):
        """Test that standard ViewSet actions are properly converted to kebab-case"""
        url_patterns = [url.pattern._route for url in self.urls]
        
        self.assertIn('test/', url_patterns)  # List/Create URL
        self.assertIn('test/{pk}/', url_patterns)  # Retrieve/Update/Delete URL
        self.assertIn('test/{pk}/custom-action-name/', url_patterns)

    def test_custom_url_paths_are_kebab_case(self):
        """Test that custom URL paths are converted to kebab-case"""
        url_patterns = [url.pattern._route for url in self.urls]
        self.assertIn('test/{pk}/custom-action-name/', url_patterns)
        self.assertNotIn('test/{pk}/custom_action_name/', url_patterns)

class TestKebabCaseEndpoints(APITestCase):
    def setUp(self):
        self.channel = Channel.objects.create(
            channel_id='test_channel',
            title='Test Channel'
        )
        self.video = Video.objects.create(
            video_id='test_video',
            title='Test Video',
            channel=self.channel
        )

    def test_fetch_from_youtube_endpoint(self):
        """Test that fetch_from_youtube endpoint uses kebab-case"""
        url = reverse('channel-fetch-from-youtube')
        self.assertTrue(url.endswith('/fetch-from-youtube/'))
        self.assertFalse('/fetch_from_youtube/' in url)

    def test_mark_as_watched_endpoint(self):
        """Test that mark_as_watched endpoint uses kebab-case"""
        url = reverse('video-mark-as-watched', kwargs={'pk': self.video.pk})
        self.assertTrue(url.endswith('/mark-as-watched/'))
        self.assertFalse('/mark_as_watched/' in url)

    def test_api_responses_include_kebab_urls(self):
        """Test that API responses include properly formatted kebab-case URLs"""
        # List channels and check URLs in response
        response = self.client.get('/api/channels/')
        self.assertEqual(response.status_code, 200)
        
        # Verify URLs in response use kebab-case
        data = response.json()
        for channel in data:
            self.assertTrue('/fetch-from-youtube' in channel['url'])
            self.assertFalse('/fetch_from_youtube' in channel['url'])
