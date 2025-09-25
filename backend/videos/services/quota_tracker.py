"""
YouTube API quota tracking and management utility.

This module provides functionality to track and manage YouTube API quota usage
using Redis-OM for persistence and daily quota limits.
"""

import warnings

# Suppress Redis-OM/Pydantic pk field shadowing warnings
warnings.filterwarnings("ignore", message='Field name "pk" shadows an attribute in parent', category=UserWarning)

from datetime import datetime, timezone, timedelta
from typing import Dict, Optional

from django.conf import settings
from redis_om import Field, JsonModel, Migrator, get_redis_connection

THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60


class DailyQuotaUsage(JsonModel):
    date: str = Field(index=True)
    daily_usage: int = Field(default=0)
    operations_count: Dict[str, int] = Field(default_factory=dict)

    class Meta:
        global_key_prefix = "quota"
        database = get_redis_connection(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            username=settings.REDIS_USER,
            password=settings.REDIS_PASSWORD,
            decode_responses=True,
        )

    def save(self, **kwargs):
        """Save with automatic TTL of 30 days"""
        result = super().save(**kwargs)
        try:
            self.db().expire(self.key(), THIRTY_DAYS_IN_SECONDS)
        except Exception as e:
            print(f"WARNING: Failed to set TTL on quota record: {e}")
        return result


class QuotaTracker:
    """Track and manage YouTube API quota usage with Redis-OM storage"""

    QUOTA_RESERVE_FACTOR = 0.95
    BATCH_RESERVE_FACTOR = 0.8
    ALERT_THRESHOLD = 0.8

    QUOTA_COSTS = {
        "channels.list": 1,
        "search.list": 100,
        "videos.list": 1,
        "playlistItems.list": 1,
    }

    def __init__(self, daily_quota_limit: int = 10000):
        self.daily_quota_limit = daily_quota_limit

        try:
            Migrator().run()
            self.use_redis_om = True
        except Exception as e:
            print(f"WARNING: Redis-OM initialization failed: {e}")
            self.use_redis_om = False

    def _get_today_key(self) -> str:
        """Get current date as string key"""
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def can_make_request(self, operation: str = "channels.list") -> bool:
        quota_cost = self.QUOTA_COSTS.get(operation)
        if quota_cost is None:
            print(f"WARNING: Operation '{operation}' doesn't have a quota cost defined, using default cost of 1")
            quota_cost = 1
        current_usage = self.get_current_usage()

        effective_limit = int(self.daily_quota_limit * self.QUOTA_RESERVE_FACTOR)
        can_proceed = (current_usage + quota_cost) <= effective_limit

        if not can_proceed:
            print(f"WARNING: Quota check failed - current={current_usage}, cost={quota_cost}, limit={effective_limit}")

        return can_proceed

    def record_usage(self, operation: str = "channels.list", quota_cost: Optional[int] = None) -> None:
        if quota_cost is None:
            quota_cost = self.QUOTA_COSTS.get(operation)
            if quota_cost is None:
                print(f"WARNING: Operation '{operation}' doesn't have a quota cost defined, using default cost of 1")
                quota_cost = 1

        usage_data = self._get_usage_data()
        usage_data.daily_usage += quota_cost

        if operation not in usage_data.operations_count:
            usage_data.operations_count[operation] = 0
        usage_data.operations_count[operation] += 1

        self._store_usage_data(usage_data)

        if usage_data.daily_usage >= (self.daily_quota_limit * self.ALERT_THRESHOLD):
            percentage = usage_data.daily_usage / self.daily_quota_limit * 100
            print(f"WARNING: Quota usage high - {usage_data.daily_usage}/{self.daily_quota_limit} ({percentage:.1f}%)")

    def get_current_usage(self) -> int:
        usage_data = self._get_usage_data()
        return usage_data.daily_usage

    def get_remaining_quota(self) -> int:
        return max(0, self.daily_quota_limit - self.get_current_usage())

    def get_usage_summary(self) -> Dict:
        usage_data = self._get_usage_data()
        percentage_used = (usage_data.daily_usage / self.daily_quota_limit) * 100

        return {
            "daily_usage": usage_data.daily_usage,
            "daily_limit": self.daily_quota_limit,
            "remaining": self.get_remaining_quota(),
            "percentage_used": round(percentage_used, 2),
            "operations_count": usage_data.operations_count.copy(),
            "status": self._get_quota_status(percentage_used),
        }

    def optimize_batch_size(self, operation: str = "channels.list") -> int:
        available_quota = self.get_remaining_quota()
        quota_cost = self.QUOTA_COSTS.get(operation)
        if quota_cost is None:
            print(f"WARNING: Operation '{operation}' doesn't have a quota cost defined, using default cost of 1")
            quota_cost = 1

        if quota_cost == 0:
            return 200

        usable_quota = int(available_quota * self.BATCH_RESERVE_FACTOR)
        optimal_size = min(usable_quota // quota_cost, 200)

        return max(0, optimal_size)

    def force_reset_quota(self) -> None:
        """Reset today's quota usage"""
        if self.use_redis_om:
            try:
                today = self._get_today_key()
                existing_quota = DailyQuotaUsage.find(DailyQuotaUsage.date == today).first()
                if existing_quota:
                    existing_quota.delete()
            except Exception as e:
                print(f"WARNING: Failed to delete quota data: {e}")

    def _get_usage_data(self) -> DailyQuotaUsage:
        """Get or create today's quota usage record"""
        if not self.use_redis_om:
            return self._get_fallback_data()

        today = self._get_today_key()

        try:
            existing_quota = DailyQuotaUsage.find(DailyQuotaUsage.date == today).first()
            if existing_quota:
                return existing_quota
        except Exception as e:
            print(f"WARNING: Failed to retrieve quota data from Redis-OM: {e}")
            return self._get_fallback_data()

        # Create new record for today
        try:
            new_quota = DailyQuotaUsage(date=today, daily_usage=0, operations_count={})
            new_quota.save()
            return new_quota
        except Exception as e:
            print(f"ERROR: Failed to create/save new quota record: {e}")
            return self._get_fallback_data()

    def _store_usage_data(self, usage_data: DailyQuotaUsage) -> None:
        """Store updated quota data"""
        if not self.use_redis_om:
            return

        try:
            usage_data.save()
        except Exception as e:
            print(f"ERROR: Failed to store quota data: {e}")

    def _get_quota_status(self, percentage_used: float) -> str:
        """Get human-readable quota status"""
        if percentage_used >= 95:
            return "critical"
        elif percentage_used >= 80:
            return "high"
        elif percentage_used >= 60:
            return "moderate"
        else:
            return "normal"

    def _get_fallback_data(self) -> DailyQuotaUsage:
        """Fallback quota data when Redis-OM is unavailable"""
        today = self._get_today_key()
        return DailyQuotaUsage(date=today, daily_usage=0, operations_count={})
