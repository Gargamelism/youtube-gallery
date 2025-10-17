from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import connection
from rest_framework.test import APIRequestFactory
from videos.models import Channel, Video
from videos.serializers import VideoListSerializer
from videos.services.search import VideoSearchService
from users.models import UserChannel, UserVideo, ChannelTag, UserChannelTag

User = get_user_model()


class VideoSerializerOptimizationTests(TestCase):
    """Test VideoListSerializer query optimization with prefetch_related"""

    @classmethod
    def setUpTestData(cls):
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"  # nosec B105 - test-only password
        )

        # Create channels
        cls.channel1 = Channel.objects.create(channel_id="UC1", title="Tech Channel")
        cls.channel2 = Channel.objects.create(channel_id="UC2", title="Gaming Channel")

        # Create user subscriptions
        cls.user_channel1 = UserChannel.objects.create(user=cls.user, channel=cls.channel1)
        cls.user_channel2 = UserChannel.objects.create(user=cls.user, channel=cls.channel2)

        # Create tags and assignments
        cls.tech_tag = ChannelTag.objects.create(user=cls.user, name="Tech", color="#3B82F6")
        cls.tutorial_tag = ChannelTag.objects.create(user=cls.user, name="Tutorial", color="#EF4444")

        UserChannelTag.objects.create(user_channel=cls.user_channel1, tag=cls.tech_tag)
        UserChannelTag.objects.create(user_channel=cls.user_channel1, tag=cls.tutorial_tag)
        UserChannelTag.objects.create(user_channel=cls.user_channel2, tag=cls.tech_tag)

        # Create videos
        cls.video1 = Video.objects.create(channel=cls.channel1, video_id="video1", title="Tech Tutorial")
        cls.video2 = Video.objects.create(channel=cls.channel2, video_id="video2", title="Gaming Review")

        # Create user video data
        UserVideo.objects.create(user=cls.user, video=cls.video1, is_watched=True)

    def setUp(self) -> None:
        """Reset query count for each test"""
        connection.queries_log.clear()

    def test_serializer_uses_prefetched_data(self) -> None:
        """Test that VideoListSerializer uses prefetched data efficiently"""
        # Get optimized queryset from search service
        search_service = VideoSearchService(self.user)
        videos = search_service.search_videos()

        # Create request context
        factory = APIRequestFactory()
        request = factory.get("/api/videos")
        request.user = self.user

        # Clear queries before serialization
        connection.queries_log.clear()

        # Serialize the videos
        serializer = VideoListSerializer(videos, many=True, context={"request": request})
        data = serializer.data

        # Count database queries during serialization
        query_count = len(connection.queries)

        # With proper prefetching, serialization should not trigger additional queries
        # Allow for a small number of queries (typically 0-2) but not N+1
        self.assertLess(
            query_count,
            5,
            f"Too many queries ({query_count}) during serialization. " f"Expected <5 with proper prefetching.",
        )

        # Verify data integrity
        self.assertEqual(len(data), 2)  # Should have 2 videos

        # Check that user-specific data is correctly populated
        video1_data = next(v for v in data if v["video_id"] == "video1")
        self.assertTrue(video1_data["is_watched"])
        self.assertEqual(len(video1_data["channel_tags"]), 2)  # Tech and Tutorial tags

        video2_data = next(v for v in data if v["video_id"] == "video2")
        self.assertFalse(video2_data["is_watched"])
        self.assertEqual(len(video2_data["channel_tags"]), 1)  # Tech tag only

    def test_serializer_without_optimization(self) -> None:
        """Test query count without optimization (for comparison)"""
        # Get videos without prefetching optimization
        videos = Video.objects.filter(
            channel__user_subscriptions__user=self.user, channel__user_subscriptions__is_active=True
        ).select_related("channel")

        # Create request context
        factory = APIRequestFactory()
        request = factory.get("/api/videos")
        request.user = self.user

        # Clear queries before serialization
        connection.queries_log.clear()

        # Serialize without prefetching
        serializer = VideoListSerializer(videos, many=True, context={"request": request})
        serializer.data

        # Count database queries during serialization
        query_count = len(connection.queries)

        # Without prefetching, we expect N+1 queries (many more queries)
        self.assertGreater(query_count, 5, f"Expected many queries ({query_count}) without prefetching optimization")

    def test_search_service_query_efficiency(self) -> None:
        """Test that VideoSearchService performs efficiently with complex filtering"""
        search_service = VideoSearchService(self.user)

        # Clear queries before search
        connection.queries_log.clear()

        # Perform complex search with tag filtering
        results = list(search_service.search_videos(tag_names=["Tech"], tag_mode="any", watch_status="all"))

        # Count queries for the search operation
        query_count = len(connection.queries)

        # Should be a small number of optimized queries
        self.assertLess(query_count, 10, f"Search service used {query_count} queries, expected <10")

        # Verify results
        self.assertEqual(len(results), 2)  # Both videos have Tech tag

    def test_prefetch_data_accuracy(self) -> None:
        """Test that prefetched data matches direct query results"""
        search_service = VideoSearchService(self.user)
        videos = search_service.search_videos()

        factory = APIRequestFactory()
        request = factory.get("/api/videos")
        request.user = self.user

        serializer = VideoListSerializer(videos, many=True, context={"request": request})
        data = serializer.data

        # Verify against direct database queries
        for video_data in data:
            video = Video.objects.get(video_id=video_data["video_id"])

            # Check watch status
            user_video = UserVideo.objects.filter(user=self.user, video=video).first()
            expected_watched = user_video.is_watched if user_video else False
            self.assertEqual(video_data["is_watched"], expected_watched)

            # Check channel tags
            expected_tags = ChannelTag.objects.filter(
                channel_assignments__user_channel__channel=video.channel,
                channel_assignments__user_channel__user=self.user,
            ).values("id", "name", "color")

            self.assertEqual(len(video_data["channel_tags"]), len(expected_tags))

            for tag_data in video_data["channel_tags"]:
                self.assertTrue(
                    any(str(tag["id"]) == tag_data["id"] for tag in expected_tags),
                    f"Tag {tag_data} not found in expected tags",
                )
