"""
Per-user YouTube API quota tracking and management.

Extends the existing global QuotaTracker with per-user daily limits.
"""

from typing import Dict, Optional
from django.db import transaction
from django.utils import timezone as dj_tz

from .quota_tracker import QuotaTracker
from ..exceptions import UserQuotaExceededError
from users.models import UserDailyQuota


class UserQuotaTracker(QuotaTracker):
    """Per-user quota tracking with daily limits"""

    DEFAULT_USER_DAILY_LIMIT = 1000  # Conservative per-user limit

    def __init__(self, user, user_daily_limit: Optional[int] = None):
        super().__init__(daily_quota_limit=10000)  # Keep global limit
        self.user = user
        self.user_daily_limit = user_daily_limit or self.DEFAULT_USER_DAILY_LIMIT

    def can_make_request(self, operation: str = "channels.list") -> bool:
        """Check both global and user quota before allowing request"""
        global_ok = super().can_make_request(operation)
        user_ok = self._can_user_make_request(operation)
        return global_ok and user_ok

    def record_usage(self, operation: str = "channels.list", quota_cost: int = None):
        """Record both global and user usage"""
        super().record_usage(operation, quota_cost)
        self._record_user_usage(operation, quota_cost)

    def get_user_usage_summary(self) -> Dict:
        """Get comprehensive user quota usage information"""
        user_quota_record = self._get_or_create_user_quota()
        percentage_used = (user_quota_record.quota_used / self.user_daily_limit) * 100

        return {
            "daily_usage": user_quota_record.quota_used,
            "daily_limit": self.user_daily_limit,
            "remaining": max(0, self.user_daily_limit - user_quota_record.quota_used),
            "percentage_used": round(percentage_used, 2),
            "operations_count": user_quota_record.operations_count.copy(),
            "status": super().get_quota_status(percentage_used),
        }

    def _can_user_make_request(self, operation: str) -> bool:
        """Check if user has sufficient quota for the operation"""
        quota_cost = self.QUOTA_COSTS.get(operation, 1)
        user_quota_record = self._get_or_create_user_quota()

        effective_limit = int(self.user_daily_limit * self.QUOTA_RESERVE_FACTOR)
        can_proceed = (user_quota_record.quota_used + quota_cost) <= effective_limit

        if not can_proceed:
            quota_info = self.get_user_usage_summary()
            raise UserQuotaExceededError(
                f"Daily user quota limit exceeded. Used {quota_info['daily_usage']}/{quota_info['daily_limit']} units.",
                quota_info=quota_info,
            )

        return can_proceed

    def _record_user_usage(self, operation: str, quota_cost: Optional[int] = None):
        """Record quota usage for the user"""
        if quota_cost is None:
            quota_cost = self.QUOTA_COSTS.get(operation, 1)

        with transaction.atomic():
            user_quota_record = self._get_or_create_user_quota()
            user_quota_record.quota_used += quota_cost

            # Update operation count
            if operation not in user_quota_record.operations_count:
                user_quota_record.operations_count[operation] = 0
            user_quota_record.operations_count[operation] += 1

            user_quota_record.save()

        # Alert if usage is high
        if user_quota_record.quota_used >= (self.user_daily_limit * self.ALERT_THRESHOLD):
            percentage = user_quota_record.quota_used / self.user_daily_limit * 100
            print(
                f"WARNING: User {self.user.email} quota usage high - {user_quota_record.quota_used}/{self.user_daily_limit} ({percentage:.1f}%)"
            )

    def _get_or_create_user_quota(self) -> UserDailyQuota:
        """Get or create today's user quota record atomically"""
        today = dj_tz.now().date()

        user_quota_record, _ = UserDailyQuota.objects.get_or_create(
            user=self.user, date=today, defaults={"quota_used": 0, "operations_count": {}}
        )

        return user_quota_record
