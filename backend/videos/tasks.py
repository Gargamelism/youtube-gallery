from typing import Any, Optional
from celery import shared_task, Task
from django.conf import settings

from videos.models import Channel
from videos.services.channel_updater import ChannelUpdateService
from videos.services.youtube import YouTubeService
from videos.services.quota_tracker import QuotaTracker
from videos.services.channel_cleanup import ChannelCleanupService

# Task retry configuration
MAX_RETRIES = 3
BASE_BACKOFF_SECONDS = 60


def calculate_exponential_backoff(retry_count: int, base_seconds: int = BASE_BACKOFF_SECONDS) -> int:
    """Calculate exponential backoff delay for task retries"""
    result: int = base_seconds * (2**retry_count)
    return result


@shared_task(bind=True)
def debug_celery_task(self: Task) -> dict[str, Any]:  # type: ignore[type-arg]
    """Simple debug task to test Celery worker connectivity"""
    print(f"Debug task executed with request: {self.request}")
    return {"status": "success", "message": "Celery is working!", "task_id": self.request.id}


@shared_task(bind=True, name="videos.tasks.update_single_channel")
def update_single_channel(self: Task, channel_uuid: str) -> dict[str, Any]:  # type: ignore[type-arg]
    """Update a single channel with error recovery and retry logic"""
    try:
        try:
            channel = Channel.objects.get(uuid=channel_uuid)
        except Channel.DoesNotExist:
            return {
                "status": "error",
                "message": f"Channel {channel_uuid} not found",
                "task_id": self.request.id,
                "error_type": "channel_not_found",
            }

        youtube_service = YouTubeService(api_key=settings.YOUTUBE_API_KEY)
        quota_tracker = QuotaTracker()
        channel_updater = ChannelUpdateService(youtube_service, quota_tracker)

        result = channel_updater.update_channel(channel)

        return {
            "status": "success" if result.success else "failed",
            "channel_uuid": result.channel_uuid,
            "changes_made": result.changes_made,
            "new_videos_added": result.new_videos_added,
            "quota_used": result.quota_used,
            "error_message": result.error_message,
            "task_id": self.request.id,
        }

    except Exception as exc:
        if isinstance(exc, (ConnectionError, TimeoutError)):
            raise self.retry(
                exc=exc, countdown=calculate_exponential_backoff(self.request.retries), max_retries=MAX_RETRIES
            )

        return {
            "status": "error",
            "message": str(exc),
            "task_id": self.request.id,
            "error_type": "unexpected_error",
            "channel_uuid": channel_uuid,
        }


@shared_task(bind=True, name="videos.tasks.update_channels_batch")
def update_channels_batch(self: Task, channel_uuids: Optional[list[str]] = None) -> dict[str, Any]:  # type: ignore[type-arg]
    """Batch update channels with quota management and dynamic sizing"""
    try:
        if not channel_uuids:
            channels = Channel.objects.filter(is_available=True)
        else:
            channels = Channel.objects.filter(uuid__in=channel_uuids, is_available=True)

        youtube_service = YouTubeService(api_key=settings.YOUTUBE_API_KEY)
        quota_tracker = QuotaTracker()
        channel_updater = ChannelUpdateService(youtube_service, quota_tracker)

        result = channel_updater.update_channels_batch(channels)

        return {
            "status": "success",
            "task_id": self.request.id,
            "channels_processed": result["processed"],
            "successful_updates": result["successful"],
            "failed_updates": result["failed"],
            "quota_used": result["quota_used"],
            "stopped_due_to_quota": result["stopped_due_to_quota"],
            "quota_summary": result["quota_summary"],
        }

    except Exception as exc:
        if isinstance(exc, (ConnectionError, TimeoutError)):
            raise self.retry(
                exc=exc, countdown=calculate_exponential_backoff(self.request.retries), max_retries=MAX_RETRIES
            )

        return {"status": "error", "message": str(exc), "task_id": self.request.id, "error_type": "unexpected_error"}


@shared_task(bind=True, name="videos.tasks.update_priority_channels_async")
def update_priority_channels_async(self: Task, max_channels: int = 50) -> dict[str, Any]:  # type: ignore[type-arg]
    """Update high-priority channels based on user engagement and subscriber count"""
    try:
        youtube_service = YouTubeService(api_key=settings.YOUTUBE_API_KEY)
        quota_tracker = QuotaTracker()
        channel_updater = ChannelUpdateService(youtube_service, quota_tracker)

        channels = Channel.objects.filter(is_available=True)

        channel_priorities = []
        for channel in channels:
            priority = channel_updater.determine_update_priority(channel)
            if priority > 0:
                channel_priorities.append((channel, priority))

        priority_channels = sorted(channel_priorities, key=lambda channel_priority: channel_priority[1], reverse=True)
        top_channels = [channel for channel, _ in priority_channels[:max_channels]]

        if not top_channels:
            return {
                "status": "success",
                "task_id": self.request.id,
                "message": "No priority channels found",
                "channels_processed": 0,
            }

        result = channel_updater.update_channels_batch(top_channels)

        return {
            "status": "success",
            "task_id": self.request.id,
            "channels_processed": result["processed"],
            "successful_updates": result["successful"],
            "failed_updates": result["failed"],
            "quota_used": result["quota_used"],
            "stopped_due_to_quota": result["stopped_due_to_quota"],
            "max_channels_requested": max_channels,
            "quota_summary": result["quota_summary"],
        }

    except Exception as exc:
        if isinstance(exc, (ConnectionError, TimeoutError)):
            raise self.retry(
                exc=exc, countdown=calculate_exponential_backoff(self.request.retries), max_retries=MAX_RETRIES
            )

        return {"status": "error", "message": str(exc), "task_id": self.request.id, "error_type": "unexpected_error"}


@shared_task(bind=True, name="videos.tasks.retry_unavailable_channels")
def retry_unavailable_channels(self: Task, max_channels: int = 10) -> dict[str, Any]:  # type: ignore[type-arg]
    """
    Retry updating channels that were previously marked as unavailable

    This task attempts to re-verify channels that may have been incorrectly marked
    as unavailable due to temporary API issues, quota limitations, or transient errors.

    Args:
        max_channels: Maximum number of unavailable channels to retry (default: 10)

    Returns:
        Dictionary with retry operation results
    """
    try:
        youtube_service = YouTubeService(api_key=settings.YOUTUBE_API_KEY)
        quota_tracker = QuotaTracker()
        channel_updater = ChannelUpdateService(youtube_service, quota_tracker)

        unavailable_channels = Channel.objects.filter(is_available=False, is_deleted=False).order_by(
            "failed_update_count", "last_updated"
        )[:max_channels]

        if not unavailable_channels:
            return {
                "status": "success",
                "task_id": self.request.id,
                "message": "No unavailable channels to retry",
                "channels_processed": 0,
            }

        result = channel_updater.update_channels_batch(unavailable_channels)

        return {
            "status": "success",
            "task_id": self.request.id,
            "channels_processed": result["processed"],
            "successful_updates": result["successful"],
            "failed_updates": result["failed"],
            "quota_used": result["quota_used"],
            "stopped_due_to_quota": result["stopped_due_to_quota"],
            "max_channels_requested": max_channels,
            "quota_summary": result["quota_summary"],
        }

    except Exception as exc:
        if isinstance(exc, (ConnectionError, TimeoutError)):
            raise self.retry(
                exc=exc, countdown=calculate_exponential_backoff(self.request.retries), max_retries=MAX_RETRIES
            )

        return {"status": "error", "message": str(exc), "task_id": self.request.id, "error_type": "unexpected_error"}


@shared_task(bind=True, name="videos.tasks.cleanup_orphaned_channels")
def cleanup_orphaned_channels(self: Task, max_channels: int = 50) -> dict[str, Any]:  # type: ignore[type-arg]
    """
    Clean up orphaned channels with selective video preservation based on user interaction

    Args:
        max_channels: Maximum number of channels to clean up in one batch (default: 50)

    Returns:
        Dictionary with cleanup operation results
    """
    try:
        cleanup_service = ChannelCleanupService()
        result = cleanup_service.cleanup_orphaned_channels(max_channels=max_channels)

        return {
            "status": "success" if result["success"] else "failed",
            "task_id": self.request.id,
            "channels_processed": result["channels_processed"],
            "soft_deletions": result["soft_deletions"],
            "hard_deletions": result["hard_deletions"],
            "failed_cleanups": result["failed_cleanups"],
            "total_videos_preserved": result["total_videos_preserved"],
            "total_videos_deleted": result["total_videos_deleted"],
            "total_user_videos_deleted": result["total_user_videos_deleted"],
            "cleanup_timestamp": result["cleanup_timestamp"],
            "error_message": result.get("error_message"),
        }

    except Exception as exc:
        if isinstance(exc, (ConnectionError, TimeoutError)):
            raise self.retry(
                exc=exc, countdown=calculate_exponential_backoff(self.request.retries), max_retries=MAX_RETRIES
            )

        return {"status": "error", "message": str(exc), "task_id": self.request.id, "error_type": "unexpected_error"}
