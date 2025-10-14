"""
Exceptions for channel updating and management operations.
"""

from typing import TypedDict, Optional, Dict


class QuotaInfo(TypedDict):
    """Type definition for quota usage information"""

    daily_usage: int
    daily_limit: int
    remaining: int
    percentage_used: float
    operations_count: Dict[str, int]
    status: str


class ChannelUpdateError(Exception):
    """Base exception for channel update errors"""

    def __init__(self, message: str, channel_uuid: str = None, retry_after: int = None):
        super().__init__(message)
        self.channel_uuid = channel_uuid
        self.retry_after = retry_after


class ChannelNotFoundError(ChannelUpdateError):
    """Channel was deleted or made private on YouTube"""

    pass


class QuotaExceededError(ChannelUpdateError):
    """YouTube API quota exceeded"""

    pass


class APIRateLimitError(ChannelUpdateError):
    """YouTube API rate limit exceeded"""

    pass


class ChannelAccessDeniedError(ChannelUpdateError):
    """Channel access denied due to privacy settings"""

    pass


class InvalidChannelDataError(ChannelUpdateError):
    """Channel data from API is invalid or corrupted"""

    pass


class APIServerError(ChannelUpdateError):
    """YouTube API server error (5xx responses)"""

    pass


class UserQuotaExceededError(Exception):
    """Raised when a user exceeds their daily quota limit"""

    def __init__(self, message: str, quota_info: Optional[QuotaInfo] = None):
        super().__init__(message)
        self.quota_info: QuotaInfo = quota_info or {
            "daily_usage": 0,
            "daily_limit": 0,
            "remaining": 0,
            "percentage_used": 0.0,
            "operations_count": {},
            "status": "unknown",
        }
