"""
Exceptions for channel updating and management operations.
"""


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