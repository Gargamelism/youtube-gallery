from django.contrib.auth import get_user_model
from django.test import TestCase

from users.models import ChannelTag, UserChannel, UserChannelTag
from users.services.channel_search import ChannelSearchService
from videos.models import Channel
from videos.validators import TagMode

User = get_user_model()


class ChannelSearchServiceTests(TestCase):
    """Unit tests for ChannelSearchService"""

    @classmethod
    def setUpTestData(cls):
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )  # nosec B105 - test-only password
        cls.user2 = User.objects.create_user(
            username="testuser2", email="test2@example.com", password="testpass123"
        )  # nosec B105 - test-only password

        cls.channel1 = Channel.objects.create(
            channel_id="UC1", title="Python Programming", description="Learn Python programming"
        )
        cls.channel2 = Channel.objects.create(
            channel_id="UC2", title="JavaScript Tutorials", description="JavaScript basics"
        )
        cls.channel3 = Channel.objects.create(
            channel_id="UC3", title="Web Development", description="Full stack web development"
        )
        cls.channel4 = Channel.objects.create(channel_id="UC4", title="Data Science", description="Machine learning")
        cls.channel5 = Channel.objects.create(
            channel_id="UC5", title="Programming Tips", description="General programming tips"
        )

        cls.user_channel1 = UserChannel.objects.create(user=cls.user, channel=cls.channel1, is_active=True)
        cls.user_channel2 = UserChannel.objects.create(user=cls.user, channel=cls.channel2, is_active=True)
        cls.user_channel3 = UserChannel.objects.create(user=cls.user, channel=cls.channel3, is_active=True)
        cls.user_channel4 = UserChannel.objects.create(user=cls.user, channel=cls.channel4, is_active=False)

        cls.tag_programming = ChannelTag.objects.create(user=cls.user, name="Programming")
        cls.tag_tutorial = ChannelTag.objects.create(user=cls.user, name="Tutorial")
        cls.tag_web = ChannelTag.objects.create(user=cls.user, name="Web")

        UserChannelTag.objects.create(user_channel=cls.user_channel1, tag=cls.tag_programming)
        UserChannelTag.objects.create(user_channel=cls.user_channel1, tag=cls.tag_tutorial)

        UserChannelTag.objects.create(user_channel=cls.user_channel2, tag=cls.tag_tutorial)

        UserChannelTag.objects.create(user_channel=cls.user_channel3, tag=cls.tag_web)
        UserChannelTag.objects.create(user_channel=cls.user_channel3, tag=cls.tag_programming)

    def test_search_user_channels_no_filters(self):
        """Test searching user channels without filters returns all active channels"""
        service = ChannelSearchService(self.user)
        channels = service.search_user_channels()

        self.assertEqual(channels.count(), 3)
        channel_titles = [uc.channel.title for uc in channels]
        self.assertIn("Python Programming", channel_titles)
        self.assertIn("JavaScript Tutorials", channel_titles)
        self.assertIn("Web Development", channel_titles)
        self.assertNotIn("Data Science", channel_titles)

    def test_search_user_channels_by_title(self):
        """Test searching user channels by title"""
        service = ChannelSearchService(self.user)
        channels = service.search_user_channels(search_query="Python")

        self.assertEqual(channels.count(), 1)
        self.assertEqual(channels.first().channel.title, "Python Programming")

    def test_search_user_channels_by_channel_id(self):
        """Test searching user channels by channel ID"""
        service = ChannelSearchService(self.user)
        channels = service.search_user_channels(search_query="UC2")

        self.assertEqual(channels.count(), 1)
        self.assertEqual(channels.first().channel.channel_id, "UC2")

    def test_search_user_channels_by_description(self):
        """Test searching user channels by description"""
        service = ChannelSearchService(self.user)
        channels = service.search_user_channels(search_query="web development")

        self.assertEqual(channels.count(), 1)
        self.assertEqual(channels.first().channel.title, "Web Development")

    def test_search_user_channels_case_insensitive(self):
        """Test that search is case insensitive"""
        service = ChannelSearchService(self.user)
        channels = service.search_user_channels(search_query="python")

        self.assertEqual(channels.count(), 1)
        self.assertEqual(channels.first().channel.title, "Python Programming")

    def test_filter_by_single_tag_any_mode(self):
        """Test filtering by single tag in ANY mode"""
        service = ChannelSearchService(self.user)
        channels = service.search_user_channels(tag_names=["Programming"], tag_mode=TagMode.ANY)

        self.assertEqual(channels.count(), 2)
        channel_titles = [uc.channel.title for uc in channels]
        self.assertIn("Python Programming", channel_titles)
        self.assertIn("Web Development", channel_titles)

    def test_filter_by_multiple_tags_any_mode(self):
        """Test filtering by multiple tags in ANY mode"""
        service = ChannelSearchService(self.user)
        channels = service.search_user_channels(tag_names=["Programming", "Tutorial"], tag_mode=TagMode.ANY)

        self.assertEqual(channels.count(), 3)

    def test_filter_by_multiple_tags_all_mode(self):
        """Test filtering by multiple tags in ALL mode"""
        service = ChannelSearchService(self.user)
        channels = service.search_user_channels(tag_names=["Programming", "Tutorial"], tag_mode=TagMode.ALL)

        self.assertEqual(channels.count(), 1)
        self.assertEqual(channels.first().channel.title, "Python Programming")

    def test_filter_by_tags_all_mode_no_matches(self):
        """Test filtering by tags in ALL mode with no matches"""
        service = ChannelSearchService(self.user)
        channels = service.search_user_channels(tag_names=["Programming", "Web", "Tutorial"], tag_mode=TagMode.ALL)

        self.assertEqual(channels.count(), 0)

    def test_combined_search_and_tag_filter(self):
        """Test combining search query and tag filtering"""
        service = ChannelSearchService(self.user)
        channels = service.search_user_channels(
            search_query="Programming", tag_names=["Tutorial"], tag_mode=TagMode.ANY
        )

        self.assertEqual(channels.count(), 1)
        self.assertEqual(channels.first().channel.title, "Python Programming")

    def test_search_available_channels_no_filters(self):
        """Test searching available channels without filters"""
        service = ChannelSearchService(self.user)
        channels = service.search_available_channels()

        self.assertEqual(channels.count(), 2)
        channel_titles = [ch.title for ch in channels]
        self.assertIn("Data Science", channel_titles)
        self.assertIn("Programming Tips", channel_titles)

    def test_search_available_channels_excludes_active_subscriptions(self):
        """Test that available channels excludes active user subscriptions"""
        service = ChannelSearchService(self.user)
        channels = service.search_available_channels()

        channel_ids = [ch.channel_id for ch in channels]
        self.assertNotIn("UC1", channel_ids)
        self.assertNotIn("UC2", channel_ids)
        self.assertNotIn("UC3", channel_ids)

    def test_search_available_channels_includes_inactive_subscriptions(self):
        """Test that available channels includes inactive user subscriptions"""
        service = ChannelSearchService(self.user)
        channels = service.search_available_channels()

        channel_ids = [ch.channel_id for ch in channels]
        self.assertIn("UC4", channel_ids)

    def test_search_available_channels_by_title(self):
        """Test searching available channels by title"""
        service = ChannelSearchService(self.user)
        channels = service.search_available_channels(search_query="Data")

        self.assertEqual(channels.count(), 1)
        self.assertEqual(channels.first().title, "Data Science")

    def test_search_available_channels_by_description(self):
        """Test searching available channels by description"""
        service = ChannelSearchService(self.user)
        channels = service.search_available_channels(search_query="Machine")

        self.assertEqual(channels.count(), 1)
        self.assertEqual(channels.first().title, "Data Science")

    def test_user_isolation(self):
        """Test that users only see their own channels"""
        UserChannel.objects.create(user=self.user2, channel=self.channel5, is_active=True)

        service = ChannelSearchService(self.user)
        channels = service.search_user_channels()

        self.assertEqual(channels.count(), 3)
        channel_ids = [uc.channel.channel_id for uc in channels]
        self.assertNotIn("UC5", channel_ids)

    def test_ordering_user_channels(self):
        """Test that user channels are ordered by channel title"""
        service = ChannelSearchService(self.user)
        channels = list(service.search_user_channels())

        self.assertEqual(channels[0].channel.title, "JavaScript Tutorials")
        self.assertEqual(channels[1].channel.title, "Python Programming")
        self.assertEqual(channels[2].channel.title, "Web Development")

    def test_ordering_available_channels(self):
        """Test that available channels are ordered by title"""
        service = ChannelSearchService(self.user)
        channels = list(service.search_available_channels())

        self.assertEqual(channels[0].title, "Data Science")
        self.assertEqual(channels[1].title, "Programming Tips")

    def test_query_optimization_with_tags(self):
        """Test that tag prefetching is optimized"""
        service = ChannelSearchService(self.user)

        with self.assertNumQueries(2):
            channels = list(service.search_user_channels())
            for channel in channels:
                list(channel.channel_tags.all())

    def test_search_with_empty_string(self):
        """Test that empty search string returns all results"""
        service = ChannelSearchService(self.user)
        channels = service.search_user_channels(search_query="")

        self.assertEqual(channels.count(), 3)

    def test_search_with_no_results(self):
        """Test search with query that matches no channels"""
        service = ChannelSearchService(self.user)
        channels = service.search_user_channels(search_query="NonexistentChannel")

        self.assertEqual(channels.count(), 0)

    def test_filter_by_nonexistent_tag(self):
        """Test filtering by tag that doesn't exist"""
        service = ChannelSearchService(self.user)
        channels = service.search_user_channels(tag_names=["Nonexistent"], tag_mode=TagMode.ANY)

        self.assertEqual(channels.count(), 0)

    def test_available_channels_respects_is_available_flag(self):
        """Test that unavailable channels are excluded from available channels"""
        channel_unavailable = Channel.objects.create(
            channel_id="UC_UNAVAIL", title="Unavailable Channel", is_available=False
        )

        service = ChannelSearchService(self.user)
        channels = service.search_available_channels()

        channel_ids = [ch.channel_id for ch in channels]
        self.assertNotIn("UC_UNAVAIL", channel_ids)

    def test_available_channels_respects_is_deleted_flag(self):
        """Test that deleted channels are excluded from available channels"""
        channel_deleted = Channel.objects.create(channel_id="UC_DELETED", title="Deleted Channel", is_deleted=True)

        service = ChannelSearchService(self.user)
        channels = service.search_available_channels()

        channel_ids = [ch.channel_id for ch in channels]
        self.assertNotIn("UC_DELETED", channel_ids)
