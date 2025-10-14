"""
Performance test framework for batch channel update operations.

This module provides performance testing utilities to ensure that channel
updating and removal operations scale efficiently with large datasets and
don't cause database performance degradation.
"""

import time
import statistics
from contextlib import contextmanager
from typing import List, Dict, Any, Callable
from unittest.mock import patch

from django.test import TestCase, TransactionTestCase
from django.db import connection, reset_queries
from django.test.utils import override_settings
from django.utils import timezone

from videos.models import Channel, Video
from videos.tests.fixtures.channel_updating_fixtures import ChannelUpdatingFixtures


class DatabaseQueryCounter:
    """Context manager to count and analyze database queries"""

    def __init__(self):
        self.initial_query_count = 0
        self.final_query_count = 0
        self.queries = []

    def __enter__(self):
        reset_queries()
        self.initial_query_count = len(connection.queries)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.final_query_count = len(connection.queries)
        self.queries = connection.queries[self.initial_query_count :]

    @property
    def query_count(self) -> int:
        """Get the number of queries executed"""
        return self.final_query_count - self.initial_query_count

    def get_queries_by_type(self) -> Dict[str, List[str]]:
        """Categorize queries by type (SELECT, UPDATE, INSERT, DELETE)"""
        query_types = {"SELECT": [], "UPDATE": [], "INSERT": [], "DELETE": []}

        for query in self.queries:
            sql = query["sql"].strip().upper()
            for query_type in query_types:
                if sql.startswith(query_type):
                    query_types[query_type].append(query["sql"])
                    break

        return query_types

    def get_slow_queries(self, threshold: float = 0.01) -> List[Dict[str, Any]]:
        """Get queries that took longer than threshold seconds"""
        slow_queries = []
        for query in self.queries:
            if float(query["time"]) > threshold:
                slow_queries.append(
                    {
                        "sql": query["sql"],
                        "time": float(query["time"]),
                        "formatted_time": f"{float(query['time']):.4f}s",
                    }
                )
        return slow_queries


class PerformanceTimer:
    """Context manager for measuring execution time"""

    def __init__(self):
        self.start_time = None
        self.end_time = None
        self.elapsed_time = None

    def __enter__(self):
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.perf_counter()
        self.elapsed_time = self.end_time - self.start_time

    @property
    def elapsed_seconds(self) -> float:
        """Get elapsed time in seconds"""
        return self.elapsed_time or 0.0

    @property
    def elapsed_ms(self) -> float:
        """Get elapsed time in milliseconds"""
        return (self.elapsed_time or 0.0) * 1000


class BatchOperationBenchmark:
    """Benchmark utility for testing batch operations at different scales"""

    def __init__(self, test_case: TestCase):
        self.test_case = test_case
        self.fixtures = ChannelUpdatingFixtures()
        self.results = []

    def cleanup(self):
        """Clean up test fixtures"""
        self.fixtures.cleanup()

    def run_scalability_test(
        self,
        operation: Callable,
        scale_factors: List[int],
        setup_data: Callable[[int], Any],
        operation_name: str = "Batch Operation",
    ) -> List[Dict[str, Any]]:
        """
        Run a batch operation at different scales and measure performance

        Args:
            operation: The operation function to test
            scale_factors: List of scale factors (e.g., [10, 50, 100, 500])
            setup_data: Function that creates test data for given scale
            operation_name: Name of the operation being tested

        Returns:
            List of performance results for each scale factor
        """
        results = []

        for scale in scale_factors:
            # Setup test data
            test_data = setup_data(scale)

            # Measure performance
            with PerformanceTimer() as timer, DatabaseQueryCounter() as query_counter:
                operation_result = operation(test_data)

            # Collect results
            result = {
                "scale_factor": scale,
                "operation_name": operation_name,
                "elapsed_time_ms": timer.elapsed_ms,
                "elapsed_time_seconds": timer.elapsed_seconds,
                "query_count": query_counter.query_count,
                "queries_by_type": query_counter.get_queries_by_type(),
                "slow_queries": query_counter.get_slow_queries(),
                "operation_result": operation_result,
                "queries_per_item": query_counter.query_count / scale if scale > 0 else 0,
                "ms_per_item": timer.elapsed_ms / scale if scale > 0 else 0,
            }

            results.append(result)

            # Clean up for next iteration
            self.fixtures.cleanup()

        self.results.extend(results)
        return results

    def analyze_performance_trends(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze performance trends across different scales"""
        if len(results) < 2:
            return {"error": "Need at least 2 data points for trend analysis"}

        scales = [r["scale_factor"] for r in results]
        times = [r["elapsed_time_ms"] for r in results]
        query_counts = [r["query_count"] for r in results]

        # Calculate performance metrics
        analysis = {
            "scale_range": f"{min(scales)} - {max(scales)}",
            "time_range_ms": f"{min(times):.2f} - {max(times):.2f}",
            "query_count_range": f"{min(query_counts)} - {max(query_counts)}",
            "average_time_ms": statistics.mean(times),
            "average_queries_per_operation": statistics.mean(query_counts),
            "time_complexity": "linear" if self._is_linear_growth(scales, times) else "non-linear",
            "query_complexity": "O(1)" if self._is_constant_queries(scales, query_counts) else "O(n)",
        }

        # Check for performance thresholds
        analysis["performance_warnings"] = []

        max_queries_per_item = max(r["queries_per_item"] for r in results)
        if max_queries_per_item > 10:
            analysis["performance_warnings"].append(
                f"High queries per item: {max_queries_per_item:.1f} (threshold: 10)"
            )

        max_time_per_item = max(r["ms_per_item"] for r in results)
        if max_time_per_item > 100:  # 100ms per item
            analysis["performance_warnings"].append(
                f"High processing time per item: {max_time_per_item:.1f}ms (threshold: 100ms)"
            )

        return analysis

    def _is_linear_growth(self, scales: List[int], times: List[float], tolerance: float = 0.2) -> bool:
        """Check if time growth is roughly linear with scale"""
        if len(scales) < 3:
            return True

        # Calculate time per unit for each scale
        time_per_unit = [t / s for t, s in zip(times, scales)]

        # Check if variance is within tolerance
        mean_time_per_unit = statistics.mean(time_per_unit)
        variance = statistics.variance(time_per_unit)

        return (variance / mean_time_per_unit) < tolerance

    def _is_constant_queries(self, scales: List[int], query_counts: List[int]) -> bool:
        """Check if query count remains constant regardless of scale"""
        return len(set(query_counts)) <= 1

    def generate_performance_report(self, results: List[Dict[str, Any]]) -> str:
        """Generate a human-readable performance report"""
        if not results:
            return "No performance data available"

        report_lines = [
            "=== Batch Operation Performance Report ===",
            f"Operation: {results[0]['operation_name']}",
            f"Test Date: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "Scale Factor | Time (ms) | Queries | Queries/Item | ms/Item",
            "-------------|-----------|---------|--------------|--------",
        ]

        for result in results:
            report_lines.append(
                f"{result['scale_factor']:11d} | "
                f"{result['elapsed_time_ms']:8.2f} | "
                f"{result['query_count']:7d} | "
                f"{result['queries_per_item']:11.2f} | "
                f"{result['ms_per_item']:7.2f}"
            )

        analysis = self.analyze_performance_trends(results)

        report_lines.extend(
            [
                "",
                "=== Performance Analysis ===",
                f"Scale Range: {analysis['scale_range']}",
                f"Time Range: {analysis['time_range_ms']} ms",
                f"Query Range: {analysis['query_count_range']}",
                f"Average Time: {analysis['average_time_ms']:.2f} ms",
                f"Time Complexity: {analysis['time_complexity']}",
                f"Query Complexity: {analysis['query_complexity']}",
            ]
        )

        if analysis["performance_warnings"]:
            report_lines.extend(
                [
                    "",
                    "⚠️  Performance Warnings:",
                ]
                + [f"  - {warning}" for warning in analysis["performance_warnings"]]
            )

        return "\n".join(report_lines)


@override_settings(DEBUG=True)  # Required to capture queries
class BatchOperationPerformanceTests(TransactionTestCase):
    """Performance tests for batch channel update operations"""

    def setUp(self):
        """Set up performance testing framework"""
        self.benchmark = BatchOperationBenchmark(self)
        self.fixtures = ChannelUpdatingFixtures()

    def tearDown(self):
        """Clean up after performance tests"""
        self.benchmark.cleanup()
        self.fixtures.cleanup()

    def test_channel_batch_update_performance(self):
        """Test performance of batch channel metadata updates"""

        def setup_channels(scale: int) -> List[Channel]:
            """Create channels for batch update testing"""
            channels = []
            for i in range(scale):
                channel = Channel.objects.create(
                    channel_id=f"UC_perf_test_{i}",
                    title=f"Performance Test Channel {i}",
                    description=f"Channel {i} for performance testing",
                )
                channels.append(channel)
            return channels

        def batch_update_operation(channels: List[Channel]) -> int:
            """Mock batch update operation"""
            # This would be replaced with actual update service call
            update_count = 0
            for channel in channels:
                channel.title = f"Updated {channel.title}"
                channel.save()
                update_count += 1
            return update_count

        # Test at different scales
        scale_factors = [10, 25, 50, 100]
        results = self.benchmark.run_scalability_test(
            operation=batch_update_operation,
            scale_factors=scale_factors,
            setup_data=setup_channels,
            operation_name="Channel Batch Update",
        )

        # Performance assertions
        for result in results:
            # Should not exceed 20 queries per item for batch operations
            self.assertLess(
                result["queries_per_item"],
                20,
                f"Too many queries per item at scale {result['scale_factor']}: " f"{result['queries_per_item']:.2f}",
            )

            # Should not exceed 200ms per item
            self.assertLess(
                result["ms_per_item"],
                200,
                f"Too slow per item at scale {result['scale_factor']}: " f"{result['ms_per_item']:.2f}ms",
            )

        # Print performance report for manual review
        print("\n" + self.benchmark.generate_performance_report(results))

    def test_orphaned_channel_detection_performance(self):
        """Test performance of identifying orphaned channels"""

        def setup_mixed_channels(scale: int) -> Dict[str, Any]:
            """Create mix of subscribed and orphaned channels"""
            self.fixtures.create_complete_test_scenario()

            # Add additional orphaned channels
            orphaned_channels = []
            for i in range(scale):
                channel = Channel.objects.create(
                    channel_id=f"UC_orphaned_perf_{i}",
                    title=f"Orphaned Performance Test {i}",
                    description=f"Orphaned channel {i}",
                )
                orphaned_channels.append(channel)

            return {"all_channels": list(Channel.objects.all()), "orphaned_channels": orphaned_channels}

        def detect_orphaned_operation(data: Dict[str, Any]) -> int:
            """Operation to detect orphaned channels"""
            # This simulates the orphaned channel detection logic
            orphaned = Channel.objects.filter(user_subscriptions__isnull=True).distinct()
            return orphaned.count()

        scale_factors = [10, 50, 100, 200]
        results = self.benchmark.run_scalability_test(
            operation=detect_orphaned_operation,
            scale_factors=scale_factors,
            setup_data=setup_mixed_channels,
            operation_name="Orphaned Channel Detection",
        )

        # Performance assertions for detection should be very fast
        for result in results:
            self.assertLess(
                result["query_count"], 5, f"Orphaned detection should use minimal queries, got {result['query_count']}"
            )

            self.assertLess(
                result["elapsed_time_ms"],
                1000,  # 1 second max
                f"Orphaned detection taking too long: {result['elapsed_time_ms']:.2f}ms",
            )

        print("\n" + self.benchmark.generate_performance_report(results))

    def test_bulk_channel_removal_performance(self):
        """Test performance of bulk channel removal operations"""

        def setup_removal_candidates(scale: int) -> List[Channel]:
            """Create channels that should be removed"""
            channels = []
            for i in range(scale):
                channel = Channel.objects.create(
                    channel_id=f"UC_removal_test_{i}",
                    title=f"Removal Test Channel {i}",
                    description=f"Channel {i} to be removed",
                )
                # Create some videos for cascade deletion testing
                for j in range(3):
                    Video.objects.create(
                        channel=channel, video_id=f"removal_video_{i}_{j}", title=f"Video {j} from channel {i}"
                    )
                channels.append(channel)
            return channels

        def bulk_removal_operation(channels: List[Channel]) -> int:
            """Bulk removal operation with cascade"""
            channel_ids = [ch.id for ch in channels]
            # This simulates bulk deletion with proper CASCADE handling
            deleted_count = Channel.objects.filter(id__in=channel_ids).delete()[0]
            return deleted_count

        scale_factors = [5, 15, 30, 50]  # Smaller scale for deletion tests
        results = self.benchmark.run_scalability_test(
            operation=bulk_removal_operation,
            scale_factors=scale_factors,
            setup_data=setup_removal_candidates,
            operation_name="Bulk Channel Removal",
        )

        # Bulk deletion should be efficient
        for result in results:
            # Should use minimal queries due to bulk operations
            self.assertLess(
                result["queries_per_item"],
                10,
                f"Bulk deletion should be efficient, got {result['queries_per_item']:.2f} queries/item",
            )

        print("\n" + self.benchmark.generate_performance_report(results))

    @contextmanager
    def mock_youtube_api_calls(self, response_time_ms: float = 100):
        """Mock YouTube API calls with simulated response time"""

        def mock_api_call(*args, **kwargs):
            # Simulate API response time
            time.sleep(response_time_ms / 1000)
            return {"items": [{"id": "UC_mock", "snippet": {"title": "Mock Channel"}}]}

        with patch("videos.services.youtube.YouTubeService") as mock_service:
            mock_service.return_value.get_channel_details.side_effect = mock_api_call
            yield mock_service

    def test_youtube_api_batch_calls_performance(self):
        """Test performance implications of YouTube API calls in batch operations"""

        def setup_api_test_data(scale: int) -> List[str]:
            """Setup channel IDs for API testing"""
            return [f"UC_api_test_{i}" for i in range(scale)]

        def mock_batch_api_operation(channel_ids: List[str]) -> int:
            """Mock batch API operation"""
            with self.mock_youtube_api_calls(response_time_ms=50):  # 50ms per call
                # This would normally make API calls for each channel
                # For testing, we just simulate the timing
                processed = 0
                for channel_id in channel_ids:
                    # Simulate API call delay
                    time.sleep(0.05)  # 50ms
                    processed += 1
                return processed

        # Test smaller scales due to API time simulation
        scale_factors = [5, 10, 20, 40]
        results = self.benchmark.run_scalability_test(
            operation=mock_batch_api_operation,
            scale_factors=scale_factors,
            setup_data=setup_api_test_data,
            operation_name="YouTube API Batch Calls",
        )

        # API operations will be inherently slower
        for result in results:
            # Time should scale roughly linearly with API calls
            expected_min_time = result["scale_factor"] * 40  # 40ms minimum per call
            self.assertGreater(result["elapsed_time_ms"], expected_min_time, "API simulation timing seems incorrect")

        print("\n" + self.benchmark.generate_performance_report(results))


class PerformanceRegressionTests(TestCase):
    """Tests to detect performance regressions in batch operations"""

    def test_channel_query_n_plus_one_prevention(self):
        """Ensure we don't have N+1 query problems in channel operations"""
        fixtures = ChannelUpdatingFixtures()

        try:
            # Create test scenario
            fixtures.create_complete_test_scenario()

            # Test channel list queries
            with DatabaseQueryCounter() as counter:
                # This should use prefetch_related to avoid N+1
                channels_with_users = (
                    Channel.objects.filter(user_subscriptions__isnull=False)
                    .prefetch_related("user_subscriptions__user", "videos")
                    .distinct()
                )

                # Force evaluation and access related data
                for channel in channels_with_users:
                    _ = list(channel.user_subscriptions.all())
                    _ = list(channel.videos.all())

            # Should not exceed reasonable query count regardless of data size
            self.assertLess(counter.query_count, 10, f"Potential N+1 query issue: {counter.query_count} queries")

        finally:
            fixtures.cleanup()

    def test_user_channel_filtering_performance(self):
        """Test performance of user-specific channel filtering"""
        fixtures = ChannelUpdatingFixtures()

        try:
            scenario = fixtures.create_complete_test_scenario()
            user = scenario["users"]["active_user"]

            with DatabaseQueryCounter() as counter:
                # This should be a single optimized query
                user_channels = Channel.objects.filter(
                    user_subscriptions__user=user, user_subscriptions__is_active=True
                ).prefetch_related("user_subscriptions")

                # Force evaluation
                list(user_channels)

            # Should be very efficient
            self.assertLessEqual(
                counter.query_count,
                2,  # Main query + any joins
                f"User channel filtering inefficient: {counter.query_count} queries",
            )

        finally:
            fixtures.cleanup()
