"""
Performance tests for channel search and filtering.

These tests analyze query performance, verify index usage, and ensure
the system meets performance requirements with large datasets.
"""

import time
from faker import Faker
from typing import List, Tuple
from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase
from django.test.utils import override_settings

from users.models import ChannelTag, UserChannel, UserChannelTag
from users.services.channel_search import ChannelSearchService
from videos.models import Channel
from videos.validators import TagMode

User = get_user_model()


class ChannelPerformanceTestCase(TestCase):
    """Performance tests for channel search with large datasets"""

    @classmethod
    def setUpTestData(cls) -> None:
        """Create test data - large dataset simulation with realistic content"""
        fake = Faker()
        Faker.seed(42)

        cls.user1 = User.objects.create_user(
            username="perfuser1",
            email="perf1@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )
        cls.user2 = User.objects.create_user(
            username="perfuser2",
            email="perf2@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )

        # YouTube channel title templates for realistic data
        title_templates = [
            lambda: f"{fake.name()}'s Channel",
            lambda: f"{fake.company()} Official",
            lambda: f"{fake.catch_phrase()}",
            lambda: f"Programming with {fake.first_name()}",
            lambda: f"{fake.word().title()} Tutorial",
            lambda: f"Tech {fake.word().title()}",
            lambda: f"{fake.job()} Vlog",
            lambda: f"{fake.bs().title()}",
        ]

        description_templates = [
            lambda: f"Welcome to my channel! {fake.catch_phrase()}. {fake.bs().capitalize()}.",
            lambda: f"{fake.paragraph(nb_sentences=2)} Subscribe for more!",
            lambda: f"Programming tutorials and coding tips. {fake.catch_phrase()}",
            lambda: f"{fake.bs().capitalize()}. {fake.paragraph(nb_sentences=1)}",
            lambda: f"Daily content about {fake.word()} and {fake.word()}. {fake.catch_phrase()}",
        ]

        # Create 1000 channels with realistic varying content
        cls.channels = []
        for i in range(1000):
            # Use faker to generate realistic titles and descriptions
            title_template = fake.random_element(title_templates)
            desc_template = fake.random_element(description_templates)

            # Add specific keywords to some channels for testing search
            if i % 10 == 0:
                title = f"Programming Tutorial {fake.word().title()}"
            elif i % 7 == 0:
                title = f"Python {fake.catch_phrase()}"
            else:
                title = title_template()

            if i % 5 == 0:
                description = f"Python programming tutorials and coding examples. {fake.paragraph(nb_sentences=1)}"
            else:
                description = desc_template()

            channel = Channel.objects.create(
                channel_id=f"UC{fake.lexify(text='?' * 22, letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')}",
                title=title,
                description=description,
                is_available=True,
                is_deleted=False,
            )
            cls.channels.append(channel)

        # User1 subscribes to 100 channels (10%)
        cls.user1_channels = []
        for i in range(0, 100):
            user_channel = UserChannel.objects.create(user=cls.user1, channel=cls.channels[i], is_active=True)
            cls.user1_channels.append(user_channel)

        # User2 subscribes to 50 different channels
        for i in range(500, 550):
            UserChannel.objects.create(user=cls.user2, channel=cls.channels[i], is_active=True)

        # Create tags for user1
        cls.tag_programming = ChannelTag.objects.create(user=cls.user1, name="Programming", color="#FF0000")
        cls.tag_tutorial = ChannelTag.objects.create(user=cls.user1, name="Tutorial", color="#00FF00")
        cls.tag_python = ChannelTag.objects.create(user=cls.user1, name="Python", color="#0000FF")

        # Tag 40% of user1's channels with programming
        for user_channel in cls.user1_channels[:40]:
            UserChannelTag.objects.create(user_channel=user_channel, tag=cls.tag_programming)

        # Tag 30% with tutorial
        for user_channel in cls.user1_channels[20:50]:
            UserChannelTag.objects.create(user_channel=user_channel, tag=cls.tag_tutorial)

        # Tag 20% with python
        for user_channel in cls.user1_channels[10:30]:
            UserChannelTag.objects.create(user_channel=user_channel, tag=cls.tag_python)

    def setUp(self) -> None:
        """Reset query tracking before each test"""
        connection.queries_log.clear()

    def _get_explain_analyze(self, queryset) -> List[Tuple[str, ...]]:
        """Get EXPLAIN ANALYZE output for a queryset"""
        sql, params = queryset.query.sql_with_params()
        # print(sql, params)

        with connection.cursor() as cursor:
            cursor.execute(f"EXPLAIN (ANALYZE, BUFFERS, VERBOSE) {sql}", params)
            explain_output = cursor.fetchall()

        return "\n".join([row[0] for row in explain_output])

    def _assert_index_used(self, explain_output: str, index_name: str) -> None:
        """Assert that a specific index was used in the query"""
        self.assertIn(
            index_name,
            explain_output,
            f"Expected index '{index_name}' not found in EXPLAIN output:\n{explain_output}",
        )

    def _assert_gin_index_used(self, explain_output: str) -> None:
        """Assert that a GIN index scan was used"""
        self.assertTrue(
            "Bitmap Index Scan" in explain_output
            and "gin_trgm_ops" in explain_output.lower()
            or "Index Scan using idx_ch_title_trgm" in explain_output
            or "Index Scan using idx_ch_desc_trgm" in explain_output,
            f"Expected GIN index scan not found in EXPLAIN output:\n{explain_output}",
        )

    def test_query_count_subscribed_channels_no_filters(self) -> None:
        """Test query count for basic subscribed channels fetch"""
        service = ChannelSearchService(self.user1)

        with self.assertNumQueries(2):
            channels = list(service.search_user_channels())

        self.assertEqual(len(channels), 100)

    def test_query_count_subscribed_channels_with_search(self) -> None:
        """Test query count with search filter"""
        service = ChannelSearchService(self.user1)

        with self.assertNumQueries(2):
            channels = list(service.search_user_channels(search_query="Programming"))

        self.assertGreater(len(channels), 0)

    def test_query_count_subscribed_channels_with_tags(self) -> None:
        """Test query count with tag filtering"""
        service = ChannelSearchService(self.user1)

        with self.assertNumQueries(2):
            channels = list(service.search_user_channels(tag_names=["Programming"], tag_mode=TagMode.ANY))

        self.assertEqual(len(channels), 40)

    def test_query_count_subscribed_channels_with_all_filters(self) -> None:
        """Test query count with search + tag filtering"""
        service = ChannelSearchService(self.user1)

        with self.assertNumQueries(2):
            channels = list(
                service.search_user_channels(
                    search_query="Channel",
                    tag_names=["Programming"],
                    tag_mode=TagMode.ANY,
                )
            )

        self.assertGreater(len(channels), 0)

    def test_query_count_available_channels(self) -> None:
        """Test query count for available channels"""
        service = ChannelSearchService(self.user1)

        with self.assertNumQueries(1):
            channels = list(service.search_available_channels())

        # Should return channels not subscribed by user1 (900 channels)
        self.assertEqual(len(channels), 900)

    def test_query_count_available_channels_with_search(self) -> None:
        """Test query count for available channels with search"""
        service = ChannelSearchService(self.user1)

        with self.assertNumQueries(1):
            channels = list(service.search_available_channels(search_query="Programming"))

        self.assertGreater(len(channels), 0)

    def test_performance_subscribed_channels_search(self) -> None:
        """Test that search queries complete in reasonable time"""
        service = ChannelSearchService(self.user1)

        start_time = time.perf_counter()
        list(service.search_user_channels(search_query="Programming"))
        end_time = time.perf_counter()

        query_time_ms = (end_time - start_time) * 1000

        self.assertLess(
            query_time_ms,
            100,
            f"Query took {query_time_ms:.2f}ms, expected < 100ms with 100 channels",
        )

    def test_performance_available_channels_large_dataset(self) -> None:
        """Test that available channels query scales well"""
        service = ChannelSearchService(self.user1)

        start_time = time.perf_counter()
        list(service.search_available_channels(search_query="Python"))
        end_time = time.perf_counter()

        query_time_ms = (end_time - start_time) * 1000

        self.assertLess(
            query_time_ms,
            200,
            f"Query took {query_time_ms:.2f}ms, expected < 200ms with 900 channels",
        )

    @override_settings(DEBUG=True)
    def test_index_usage_user_channels_composite(self) -> None:
        """Verify 2-column index is used for user channel queries"""
        service = ChannelSearchService(self.user1)

        queryset = service.search_user_channels()
        explain_output = self._get_explain_analyze(queryset)
        # print(explain_output)

        self._assert_index_used(explain_output, "idx_user_channels_user_active")

    @override_settings(DEBUG=True)
    def test_index_usage_text_search_on_title(self) -> None:
        """Verify GIN trigram index is used for title search"""
        service = ChannelSearchService(self.user1)

        queryset = service.search_user_channels(search_query="Programming")
        explain_output = self._get_explain_analyze(queryset)

        # Check that index scan is mentioned (GIN indexes may show as Bitmap Index Scan)
        self.assertTrue(
            "idx_ch_title_trgm" in explain_output or "Bitmap Index Scan" in explain_output,
            f"Expected GIN index usage not found:\n{explain_output}",
        )

    @override_settings(DEBUG=True)
    def test_index_usage_available_channels_partial(self) -> None:
        """Verify partial index is used for available channels query"""
        service = ChannelSearchService(self.user1)

        queryset = service.search_available_channels()
        explain_output = self._get_explain_analyze(queryset)

        self._assert_index_used(explain_output, "idx_ch_avail_del")

    @override_settings(DEBUG=True)
    def test_no_n_plus_one_with_tags(self) -> None:
        """Verify tag prefetch prevents N+1 queries"""
        service = ChannelSearchService(self.user1)

        with self.assertNumQueries(2):
            channels = list(service.search_user_channels())

            # Access tags for all channels - should not trigger additional queries
            for channel in channels:
                _ = list(channel.channel_tags.all())

    def test_tag_filtering_all_mode_efficiency(self) -> None:
        """Test ALL mode tag filtering query efficiency"""
        service = ChannelSearchService(self.user1)

        with self.assertNumQueries(2):
            channels = list(service.search_user_channels(tag_names=["Programming", "Tutorial"], tag_mode=TagMode.ALL))

        # Should only return channels with both tags (overlap between indices 20-40 and 20-50)
        self.assertEqual(len(channels), 20)

    def test_tag_filtering_any_mode_efficiency(self) -> None:
        """Test ANY mode tag filtering uses EXISTS subquery"""
        service = ChannelSearchService(self.user1)

        queryset = service.search_user_channels(tag_names=["Programming", "Tutorial"], tag_mode=TagMode.ANY)

        sql = str(queryset.query)

        # ANY mode should use EXISTS for efficiency
        self.assertIn("EXISTS", sql.upper())

    def test_user_isolation_performance(self) -> None:
        """Verify user isolation doesn't impact performance"""
        service1 = ChannelSearchService(self.user1)
        service2 = ChannelSearchService(self.user2)

        # Both users should have similar query times
        start_time = time.perf_counter()
        list(service1.search_user_channels())
        user1_time = time.perf_counter() - start_time

        start_time = time.perf_counter()
        list(service2.search_user_channels())
        user2_time = time.perf_counter() - start_time

        # Times should be within same order of magnitude
        ratio = max(user1_time, user2_time) / min(user1_time, user2_time)
        self.assertLess(
            ratio,
            3.0,
            f"Query time ratio too high: {user1_time:.4f}s vs {user2_time:.4f}s",
        )

    @override_settings(DEBUG=True)
    def test_explain_output_details(self) -> None:
        """Print detailed EXPLAIN ANALYZE for manual inspection"""
        service = ChannelSearchService(self.user1)

        print("\n" + "=" * 80)
        print("EXPLAIN ANALYZE: Subscribed channels with no filters")
        print("=" * 80)
        queryset = service.search_user_channels()
        print(self._get_explain_analyze(queryset))

        print("\n" + "=" * 80)
        print("EXPLAIN ANALYZE: Subscribed channels with search")
        print("=" * 80)
        queryset = service.search_user_channels(search_query="Programming")
        print(self._get_explain_analyze(queryset))

        print("\n" + "=" * 80)
        print("EXPLAIN ANALYZE: Subscribed channels with tag filter (ANY mode)")
        print("=" * 80)
        queryset = service.search_user_channels(tag_names=["Programming"], tag_mode=TagMode.ANY)
        print(self._get_explain_analyze(queryset))

        print("\n" + "=" * 80)
        print("EXPLAIN ANALYZE: Subscribed channels with tag filter (ALL mode)")
        print("=" * 80)
        queryset = service.search_user_channels(tag_names=["Programming", "Tutorial"], tag_mode=TagMode.ALL)
        print(self._get_explain_analyze(queryset))

        print("\n" + "=" * 80)
        print("EXPLAIN ANALYZE: Available channels")
        print("=" * 80)
        queryset = service.search_available_channels()
        print(self._get_explain_analyze(queryset))

        print("\n" + "=" * 80)
        print("EXPLAIN ANALYZE: Available channels with search")
        print("=" * 80)
        queryset = service.search_available_channels(search_query="Python")
        print(self._get_explain_analyze(queryset))


class ChannelPaginationPerformanceTestCase(TestCase):
    """Performance tests for pagination with large result sets"""

    @classmethod
    def setUpTestData(cls) -> None:
        """Create large dataset for pagination testing"""
        fake = Faker()
        Faker.seed(100)

        cls.user = User.objects.create_user(
            username="paginuser",
            email="pagin@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )

        # Create 500 channels with realistic content
        cls.channels = []
        for i in range(500):
            channel = Channel.objects.create(
                channel_id=f"UC{fake.lexify(text='?' * 22, letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')}",
                title=f"{fake.catch_phrase()} - Channel {i:04d}",
                description=fake.paragraph(nb_sentences=3),
                is_available=True,
                is_deleted=False,
            )
            cls.channels.append(channel)

        # User subscribes to all channels
        for channel in cls.channels:
            UserChannel.objects.create(user=cls.user, channel=channel, is_active=True)

    def test_pagination_query_consistency(self) -> None:
        """Verify query count is consistent across pages"""
        service = ChannelSearchService(self.user)

        # Test first page
        with self.assertNumQueries(2):
            page1 = list(service.search_user_channels()[:20])

        # Test middle page
        with self.assertNumQueries(2):
            page2 = list(service.search_user_channels()[100:120])

        # Test last page
        with self.assertNumQueries(2):
            page3 = list(service.search_user_channels()[480:500])

        self.assertEqual(len(page1), 20)
        self.assertEqual(len(page2), 20)
        self.assertEqual(len(page3), 20)

    def test_pagination_performance(self) -> None:
        """Verify pagination doesn't degrade with offset"""
        service = ChannelSearchService(self.user)

        # Test first page
        start_time = time.perf_counter()
        list(service.search_user_channels()[:20])
        first_page_time = time.perf_counter() - start_time

        # Test page with large offset
        start_time = time.perf_counter()
        list(service.search_user_channels()[400:420])
        late_page_time = time.perf_counter() - start_time

        # Performance shouldn't degrade significantly with offset
        ratio = late_page_time / first_page_time if first_page_time > 0 else 0
        self.assertLess(
            ratio,
            5.0,
            f"Pagination performance degraded: first page {first_page_time*1000:.2f}ms, "
            f"late page {late_page_time*1000:.2f}ms (ratio: {ratio:.2f}x)",
        )
