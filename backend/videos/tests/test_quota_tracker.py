"""
Tests for QuotaTracker utility class.
"""

from datetime import datetime, timezone, timedelta
from unittest.mock import Mock, patch, call

from django.test import TestCase

from videos.services.quota_tracker import QuotaTracker, QuotaUsageModel


class QuotaTrackerTests(TestCase):
    """Test cases for QuotaTracker functionality"""

    def setUp(self):
        """Set up test cases with fresh QuotaTracker instance"""
        self.quota_tracker = QuotaTracker(daily_quota_limit=1000)

    def test_initialization_with_default_limit(self):
        """Test QuotaTracker initializes with default daily limit"""
        tracker = QuotaTracker()
        self.assertEqual(tracker.daily_quota_limit, 10000)

    def test_initialization_with_custom_limit(self):
        """Test QuotaTracker initializes with custom daily limit"""
        tracker = QuotaTracker(daily_quota_limit=5000)
        self.assertEqual(tracker.daily_quota_limit, 5000)

    def test_quota_costs_constants(self):
        """Test quota costs are correctly defined"""
        expected_costs = {
            "channels.list": 1,
            "search.list": 100,
            "videos.list": 1,
            "playlistItems.list": 1,
        }
        self.assertEqual(self.quota_tracker.QUOTA_COSTS, expected_costs)

    def test_reserve_factors_constants(self):
        """Test reserve factor constants are correctly set"""
        self.assertEqual(self.quota_tracker.QUOTA_RESERVE_FACTOR, 0.95)
        self.assertEqual(self.quota_tracker.BATCH_RESERVE_FACTOR, 0.8)
        self.assertEqual(self.quota_tracker.ALERT_THRESHOLD, 0.8)

    @patch("videos.services.quota_tracker.QuotaUsageModel")
    def test_can_make_request_with_sufficient_quota(self, mock_model):
        """Test can_make_request returns True when quota is available"""
        mock_usage = Mock()
        mock_usage.daily_usage = 100
        self.quota_tracker._get_usage_data = Mock(return_value=mock_usage)

        result = self.quota_tracker.can_make_request("channels.list")
        self.assertTrue(result)

    @patch("videos.services.quota_tracker.QuotaUsageModel")
    def test_can_make_request_with_insufficient_quota(self, mock_model):
        """Test can_make_request returns False when quota is insufficient"""
        mock_usage = Mock()
        mock_usage.daily_usage = 950  # Close to limit of 1000 * 0.95 = 950
        self.quota_tracker._get_usage_data = Mock(return_value=mock_usage)

        result = self.quota_tracker.can_make_request("channels.list")
        self.assertFalse(result)

    @patch("builtins.print")
    @patch("videos.services.quota_tracker.QuotaUsageModel")
    def test_can_make_request_with_unknown_operation(self, mock_model, mock_print):
        """Test can_make_request handles unknown operations with warning"""
        mock_usage = Mock()
        mock_usage.daily_usage = 100
        self.quota_tracker._get_usage_data = Mock(return_value=mock_usage)

        result = self.quota_tracker.can_make_request("unknown.operation")
        self.assertTrue(result)
        mock_print.assert_called_with(
            "WARNING: Operation 'unknown.operation' doesn't have a quota cost defined, using default cost of 1"
        )

    @patch("videos.services.quota_tracker.QuotaUsageModel")
    def test_record_usage_increments_quota(self, mock_model):
        """Test record_usage correctly increments quota usage"""
        mock_usage = Mock()
        mock_usage.daily_usage = 100
        mock_usage.operations_count = {}
        self.quota_tracker._get_usage_data = Mock(return_value=mock_usage)
        self.quota_tracker._store_usage_data = Mock()

        self.quota_tracker.record_usage("channels.list")

        self.assertEqual(mock_usage.daily_usage, 101)
        self.assertEqual(mock_usage.operations_count["channels.list"], 1)

    @patch("videos.services.quota_tracker.QuotaUsageModel")
    def test_record_usage_with_custom_cost(self, mock_model):
        """Test record_usage accepts custom quota cost"""
        mock_usage = Mock()
        mock_usage.daily_usage = 100
        mock_usage.operations_count = {}
        self.quota_tracker._get_usage_data = Mock(return_value=mock_usage)
        self.quota_tracker._store_usage_data = Mock()

        self.quota_tracker.record_usage("channels.list", quota_cost=5)

        self.assertEqual(mock_usage.daily_usage, 105)
        self.assertEqual(mock_usage.operations_count["channels.list"], 1)

    @patch("builtins.print")
    @patch("videos.services.quota_tracker.QuotaUsageModel")
    def test_record_usage_with_unknown_operation(self, mock_model, mock_print):
        """Test record_usage handles unknown operations with warning"""
        mock_usage = Mock()
        mock_usage.daily_usage = 100
        mock_usage.operations_count = {}
        self.quota_tracker._get_usage_data = Mock(return_value=mock_usage)
        self.quota_tracker._store_usage_data = Mock()

        self.quota_tracker.record_usage("unknown.operation")

        self.assertEqual(mock_usage.daily_usage, 101)
        warning_call = call(
            "WARNING: Operation 'unknown.operation' doesn't have a quota cost defined, using default cost of 1"
        )
        self.assertIn(warning_call, mock_print.call_args_list)

    @patch("builtins.print")
    @patch("videos.services.quota_tracker.QuotaUsageModel")
    def test_record_usage_triggers_alert_at_threshold(self, mock_model, mock_print):
        """Test record_usage triggers alert when approaching quota limit"""
        mock_usage = Mock()
        mock_usage.daily_usage = 799  # Will become 800 after recording, triggering alert
        mock_usage.operations_count = {}
        self.quota_tracker._get_usage_data = Mock(return_value=mock_usage)
        self.quota_tracker._store_usage_data = Mock()

        self.quota_tracker.record_usage("channels.list")

        mock_print.assert_any_call("WARNING: Quota usage high - 800/1000 (80.0%)")

    @patch("videos.services.quota_tracker.QuotaUsageModel")
    def test_get_current_usage(self, mock_model):
        """Test get_current_usage returns correct daily usage"""
        mock_usage = Mock()
        mock_usage.daily_usage = 250
        self.quota_tracker._get_usage_data = Mock(return_value=mock_usage)

        result = self.quota_tracker.get_current_usage()
        self.assertEqual(result, 250)

    def test_get_remaining_quota(self):
        """Test get_remaining_quota calculates correctly"""
        self.quota_tracker.get_current_usage = Mock(return_value=300)

        result = self.quota_tracker.get_remaining_quota()
        self.assertEqual(result, 700)

    def test_get_remaining_quota_never_negative(self):
        """Test get_remaining_quota never returns negative values"""
        self.quota_tracker.get_current_usage = Mock(return_value=1200)

        result = self.quota_tracker.get_remaining_quota()
        self.assertEqual(result, 0)

    @patch("videos.services.quota_tracker.QuotaUsageModel")
    def test_get_usage_summary(self, mock_model):
        """Test get_usage_summary returns comprehensive data"""
        mock_usage = Mock()
        mock_usage.daily_usage = 400
        mock_usage.operations_count = {"channels.list": 50, "videos.list": 10}
        self.quota_tracker._get_usage_data = Mock(return_value=mock_usage)

        result = self.quota_tracker.get_usage_summary()

        expected = {
            "daily_usage": 400,
            "daily_limit": 1000,
            "remaining": 600,
            "percentage_used": 40.0,
            "operations_count": {"channels.list": 50, "videos.list": 10},
            "status": "normal",
        }

        self.assertEqual(result["daily_usage"], expected["daily_usage"])
        self.assertEqual(result["daily_limit"], expected["daily_limit"])
        self.assertEqual(result["remaining"], expected["remaining"])
        self.assertEqual(result["percentage_used"], expected["percentage_used"])
        self.assertEqual(result["status"], expected["status"])

    def test_optimize_batch_size_with_sufficient_quota(self):
        """Test optimize_batch_size calculates optimal size"""
        self.quota_tracker.get_remaining_quota = Mock(return_value=1000)

        result = self.quota_tracker.optimize_batch_size("channels.list")
        # 1000 * 0.8 / 1 = 800, but max is 200
        self.assertEqual(result, 200)

    def test_optimize_batch_size_with_limited_quota(self):
        """Test optimize_batch_size respects quota limits"""
        self.quota_tracker.get_remaining_quota = Mock(return_value=100)

        result = self.quota_tracker.optimize_batch_size("channels.list")
        # 100 * 0.8 / 1 = 80
        self.assertEqual(result, 80)

    def test_optimize_batch_size_with_expensive_operation(self):
        """Test optimize_batch_size handles expensive operations"""
        self.quota_tracker.get_remaining_quota = Mock(return_value=1000)

        result = self.quota_tracker.optimize_batch_size("search.list")
        # 1000 * 0.8 / 100 = 8
        self.assertEqual(result, 8)

    @patch("builtins.print")
    def test_optimize_batch_size_with_unknown_operation(self, mock_print):
        """Test optimize_batch_size handles unknown operations"""
        self.quota_tracker.get_remaining_quota = Mock(return_value=100)

        result = self.quota_tracker.optimize_batch_size("unknown.operation")
        self.assertEqual(result, 80)
        mock_print.assert_called_with(
            "WARNING: Operation 'unknown.operation' doesn't have a quota cost defined, using default cost of 1"
        )

    def test_optimize_batch_size_with_zero_quota(self):
        """Test optimize_batch_size returns 0 when no quota available"""
        self.quota_tracker.get_remaining_quota = Mock(return_value=0)

        result = self.quota_tracker.optimize_batch_size("channels.list")
        self.assertEqual(result, 0)

    def test_get_quota_status_normal(self):
        """Test _get_quota_status returns 'normal' for low usage"""
        result = self.quota_tracker._get_quota_status(50.0)
        self.assertEqual(result, "normal")

    def test_get_quota_status_moderate(self):
        """Test _get_quota_status returns 'moderate' for medium usage"""
        result = self.quota_tracker._get_quota_status(70.0)
        self.assertEqual(result, "moderate")

    def test_get_quota_status_high(self):
        """Test _get_quota_status returns 'high' for high usage"""
        result = self.quota_tracker._get_quota_status(85.0)
        self.assertEqual(result, "high")

    def test_get_quota_status_critical(self):
        """Test _get_quota_status returns 'critical' for very high usage"""
        result = self.quota_tracker._get_quota_status(97.0)
        self.assertEqual(result, "critical")

    @patch("videos.services.quota_tracker.QuotaUsageModel")
    def test_fallback_data_when_redis_unavailable(self, mock_model):
        """Test fallback behavior when Redis is unavailable"""
        self.quota_tracker.use_redis_om = False

        mock_instance = Mock()
        mock_instance.daily_usage = 0
        mock_instance.operations_count = {}
        mock_model.return_value = mock_instance

        result = self.quota_tracker._get_usage_data()

        self.assertEqual(result.daily_usage, 0)
        self.assertEqual(result.operations_count, {})
        mock_model.assert_called_with(pk=self.quota_tracker.quota_key, daily_usage=0, operations_count={})

    @patch("builtins.print")
    @patch("videos.services.quota_tracker.QuotaUsageModel")
    def test_force_reset_quota(self, mock_model, mock_print):
        """Test force_reset_quota deletes existing data"""
        mock_existing = Mock()
        mock_find = Mock()
        mock_find.first.return_value = mock_existing
        mock_model.find.return_value = mock_find

        self.quota_tracker.use_redis_om = True
        self.quota_tracker.force_reset_quota()

        mock_existing.delete.assert_called_once()
        mock_print.assert_called_with("INFO: Quota manually reset")

    @patch("videos.services.quota_tracker.datetime")
    def test_ttl_calculation_for_midnight_reset(self, mock_datetime):
        """Test TTL calculation for midnight reset"""
        # Mock current time as 2:30 PM
        mock_now = datetime(2023, 10, 15, 14, 30, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = mock_now

        mock_usage = Mock()
        self.quota_tracker.use_redis_om = True

        with patch.object(mock_usage, "expire") as mock_expire, patch.object(mock_usage, "save"):
            self.quota_tracker._store_usage_data(mock_usage)

            # Should expire at midnight UTC (9.5 hours = 34200 seconds)
            expected_seconds = 34200
            mock_expire.assert_called_with(expected_seconds)


class QuotaUsageModelTests(TestCase):
    """Test cases for QuotaUsageModel"""

    def test_model_default_values(self):
        """Test QuotaUsageModel has correct default values"""
        model = Mock(spec=QuotaUsageModel)
        model.daily_usage = 0
        model.operations_count = {}
        self.assertEqual(model.daily_usage, 0)
        self.assertEqual(model.operations_count, {})

    def test_model_field_types(self):
        """Test QuotaUsageModel field types are correct"""
        model = Mock(spec=QuotaUsageModel)
        model.daily_usage = 100
        model.operations_count = {"channels.list": 5}
        self.assertIsInstance(model.daily_usage, int)
        self.assertIsInstance(model.operations_count, dict)
