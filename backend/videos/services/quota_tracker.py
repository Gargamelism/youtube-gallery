"""
YouTube API quota tracking and management utility.

This module provides functionality to track and manage YouTube API quota usage
using Redis-OM for persistence and daily quota limits.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Optional

from django.conf import settings
from redis_om import Field, JsonModel, Migrator, get_redis_connection


class QuotaUsageModel(JsonModel):
    daily_usage: int = Field(default=0, index=True)
    operations_count: Dict[str, int] = Field(default_factory=dict)

    class Meta:
        database = get_redis_connection(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            username=settings.REDIS_USER,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )


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
        self.quota_key = "youtube_api_quota"

        try:
            Migrator().run()
            self.use_redis_om = True
            print("INFO: QuotaTracker initialized with Redis-OM storage")
        except Exception as e:
            print(f"WARNING: Redis-OM initialization failed: {e}")
            self.use_redis_om = False

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

        print(
            f"INFO: Recorded quota usage - {operation} cost={quota_cost}, total_usage={usage_data.daily_usage}/{self.daily_quota_limit}"
        )

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
        if self.use_redis_om:
            try:
                existing_quota = QuotaUsageModel.find(QuotaUsageModel.pk == self.quota_key).first()
                if existing_quota:
                    existing_quota.delete()
            except Exception as e:
                print(f"WARNING: Failed to delete quota data: {e}")
        print("INFO: Quota manually reset")

    def _get_usage_data(self) -> QuotaUsageModel:
        if not self.use_redis_om:
            return self._get_fallback_data()

        try:
            existing_quota = QuotaUsageModel.find(QuotaUsageModel.pk == self.quota_key).first()
            if existing_quota:
                return existing_quota
        except Exception as e:
            print(f"WARNING: Failed to retrieve quota data from Redis-OM: {e}")

        return QuotaUsageModel(pk=self.quota_key, daily_usage=0, operations_count={})

    def _store_usage_data(self, usage_data: QuotaUsageModel) -> None:
        if not self.use_redis_om:
            return

        try:
            now = datetime.now(timezone.utc)
            midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            seconds_until_midnight = int((midnight - now).total_seconds())

            usage_data.expire(seconds_until_midnight)
            usage_data.save()
        except Exception as e:
            print(f"ERROR: Failed to store quota data: {e}")

    def _get_quota_status(self, percentage_used: float) -> str:
        match percentage_used:
            case used if used >= 95:
                return "critical"
            case used if used >= 80:
                return "high"
            case used if used >= 60:
                return "moderate"
            case _:
                return "normal"

    def _get_fallback_data(self) -> QuotaUsageModel:
        return QuotaUsageModel(pk=self.quota_key, daily_usage=0, operations_count={})
