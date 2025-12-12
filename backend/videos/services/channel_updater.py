"""
Service for updating channel metadata from YouTube API.
"""

from dataclasses import dataclass
from typing import Any, Dict, Iterable, Optional

from django.utils import timezone
from googleapiclient.errors import HttpError
from rest_framework import status

from videos.exceptions import (
    APIRateLimitError,
    APIServerError,
    ChannelAccessDeniedError,
    ChannelNotFoundError,
    ChannelUpdateError,
    InvalidChannelDataError,
    QuotaExceededError,
)
from videos.models import Channel, Video
from videos.services.youtube import YouTubeService
from videos.services.quota_tracker import QuotaTracker
from videos.utils.retry import retry_transient_failures

# Priority calculation constants
PRIORITY_HIGH_SUBSCRIBER_THRESHOLD = 1000000
PRIORITY_MEDIUM_SUBSCRIBER_THRESHOLD = 100000
PRIORITY_LOW_SUBSCRIBER_THRESHOLD = 10000

PRIORITY_HIGH_SUBSCRIBER_BONUS = 100
PRIORITY_MEDIUM_SUBSCRIBER_BONUS = 50
PRIORITY_LOW_SUBSCRIBER_BONUS = 25
PRIORITY_USER_SUBSCRIPTION_MULTIPLIER = 10
PRIORITY_FAILURE_PENALTY = 5
PRIORITY_NEVER_UPDATED_BONUS = 200

# Channel update behavior constants
MAX_FAILED_ATTEMPTS_BEFORE_UNAVAILABLE = 5


@dataclass
class ChannelUpdateResult:
    """Result container for channel update operations"""

    channel_uuid: str
    success: bool
    changes_made: Dict[str, Any]
    error_message: Optional[str] = None
    quota_used: int = 0
    new_videos_added: int = 0


class ChannelUpdateService:
    """Service for updating channel metadata from YouTube API"""

    def __init__(self, youtube_service: YouTubeService, quota_tracker: Optional[QuotaTracker] = None):
        self.youtube_service = youtube_service
        self.quota_tracker = quota_tracker or QuotaTracker()

    def update_channel(self, channel: Channel) -> ChannelUpdateResult:
        """Update a single channel's metadata and fetch new videos"""
        if not self.quota_tracker.can_make_request("channels.list"):
            return ChannelUpdateResult(
                channel_uuid=str(channel.uuid),
                success=False,
                changes_made={},
                error_message="Insufficient quota for channel update",
                quota_used=0,
            )

        try:
            channel_data = self._fetch_channel_data(channel.channel_id)
            self.quota_tracker.record_usage("channels.list")

            changes_made = self._apply_channel_updates(channel, channel_data)

            new_videos_count = self._fetch_new_videos(channel)
            if new_videos_count > 0:
                changes_made["new_videos"] = {"count": new_videos_count}

            self._log_update_success(channel, changes_made, new_videos_count)

            return ChannelUpdateResult(
                channel_uuid=str(channel.uuid),
                success=True,
                changes_made=changes_made,
                quota_used=1 + (1 if new_videos_count > 0 else 0),
                new_videos_added=new_videos_count,
            )

        except Exception as e:
            return self._handle_update_error(channel, e)

    @retry_transient_failures()
    def _fetch_channel_data(self, channel_id: str) -> Dict[str, Any]:
        """Fetch channel data with specific error handling for YouTube API responses"""
        try:
            channel_details = self.youtube_service.get_channel_details(channel_id)

            if not channel_details:
                print(f"WARNING: get_channel_details returned None for channel {channel_id}")
                raise ChannelNotFoundError(f"Channel {channel_id} not found")

            request = self.youtube_service.youtube.channels().list(part="snippet,statistics", id=channel_id)
            response = request.execute()

            if not response or "items" not in response:
                raise InvalidChannelDataError(f"Empty response for channel {channel_id}")

            if not response["items"]:
                raise ChannelNotFoundError(f"Channel {channel_id} not found")

            channel_data = response["items"][0]

            required_fields = ["snippet", "statistics"]
            for field in required_fields:
                if field not in channel_data:
                    raise InvalidChannelDataError(f"Missing {field} in channel data")

            return channel_data  # type: ignore[no-any-return]

        except HttpError as e:
            error_details = e.error_details[0] if e.error_details else {}
            reason = error_details.get("reason", "unknown")

            if e.resp.status == status.HTTP_403_FORBIDDEN:
                if reason == "quotaExceeded":
                    raise QuotaExceededError("YouTube API quota exceeded")
                elif reason == "rateLimitExceeded":
                    raise APIRateLimitError("YouTube API rate limit exceeded")
                else:
                    raise ChannelAccessDeniedError(f"Access denied: {reason}")

            elif e.resp.status == status.HTTP_404_NOT_FOUND:
                raise ChannelNotFoundError(f"Channel {channel_id} not found")

            elif e.resp.status >= status.HTTP_500_INTERNAL_SERVER_ERROR:
                raise APIServerError(f"YouTube API server error: {e.resp.status}")

            else:
                raise ChannelUpdateError(f"YouTube API error: {reason}")

    def _apply_channel_updates(self, channel: Channel, channel_data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply updates to channel model and track changes using django-dirtyfields"""
        snippet = channel_data.get("snippet", {})
        statistics = channel_data.get("statistics", {})

        # Update channel fields
        if snippet.get("title"):
            channel.title = snippet["title"]

        if snippet.get("description"):
            channel.description = snippet["description"]

        if statistics.get("subscriberCount"):
            channel.subscriber_count = int(statistics["subscriberCount"])

        if statistics.get("videoCount"):
            channel.video_count = int(statistics["videoCount"])

        if statistics.get("viewCount"):
            channel.view_count = int(statistics["viewCount"])

        # Check what changed using django-dirtyfields
        if channel.is_dirty() or channel.last_updated is None:
            # Get dirty fields before saving
            dirty_fields = channel.get_dirty_fields()

            # Always update these fields on successful update
            channel.last_updated = timezone.now()
            channel.failed_update_count = 0
            channel.is_available = True

            channel.save()

            # Format changes for logging (convert to old/new format)
            changes_made = {}
            for field, old_value in dirty_fields.items():
                if field not in ["last_updated", "failed_update_count", "is_available"]:
                    changes_made[field] = {"old": old_value, "new": getattr(channel, field)}

            return changes_made

        return {}

    def _fetch_new_videos(self, channel: Channel) -> int:
        """Fetch new videos for the channel, stopping at first existing video for efficiency"""
        try:
            if not self.quota_tracker.can_make_request("playlistItems.list"):
                print(f"WARNING: Insufficient quota for video fetching for channel {channel.uuid}")
                return 0

            channel_details = self.youtube_service.get_channel_details(channel.channel_id)
            if not channel_details or "uploads_playlist_id" not in channel_details:
                print(f"INFO: No uploads playlist found for channel {channel.uuid}")
                return 0

            uploads_playlist_id = channel_details["uploads_playlist_id"]

            existing_video_ids = set(Video.objects.filter(channel=channel).values_list("video_id", flat=True))

            videos_created = 0
            videos_generator = self.youtube_service.get_channel_videos(uploads_playlist_id)

            for page_videos in videos_generator:
                self.quota_tracker.record_usage("playlistItems.list")

                if page_videos:
                    self.quota_tracker.record_usage("videos.list")

                found_existing_video = False

                for video_data in page_videos:
                    if video_data["video_id"] in existing_video_ids:
                        found_existing_video = True
                        break

                    Video.objects.update_or_create(
                        video_id=video_data["video_id"], defaults={**video_data, "channel": channel}
                    )
                    videos_created += 1

                if found_existing_video:
                    break

            print(f"INFO: Added {videos_created} new videos for channel {channel.uuid}")
            return videos_created

        except Exception as e:
            print(f"WARNING: Failed to fetch new videos for channel {channel.uuid}: {str(e)}")
            return 0

    def _handle_update_error(self, channel: Channel, error: Exception) -> ChannelUpdateResult:
        """Centralized error handling with specific recovery strategies"""
        if isinstance(error, QuotaExceededError):
            self._log_update_failure(channel, "quota_exceeded", str(error))
            return ChannelUpdateResult(
                channel_uuid=str(channel.uuid),
                success=False,
                changes_made={},
                error_message="API quota exceeded - retry scheduled",
                quota_used=0,
            )

        elif isinstance(error, ChannelNotFoundError):
            old_status = channel.is_available
            channel.is_available = False
            channel.failed_update_count += 1
            channel.save()

            self._log_update_failure(channel, "channel_not_found", str(error))
            if old_status != channel.is_available:
                self._log_channel_status_change(
                    channel, old_status, channel.is_available, "Channel not found on YouTube"
                )

            return ChannelUpdateResult(
                channel_uuid=str(channel.uuid),
                success=False,
                changes_made={"is_available": False},
                error_message="Channel no longer available on YouTube",
            )

        elif isinstance(error, (APIRateLimitError, APIServerError)):
            error_type = "rate_limited" if isinstance(error, APIRateLimitError) else "server_error"
            self._log_update_failure(channel, error_type, str(error))
            return ChannelUpdateResult(
                channel_uuid=str(channel.uuid),
                success=False,
                changes_made={},
                error_message=f"Transient error: {str(error)}",
                quota_used=0,
            )

        elif isinstance(error, ChannelAccessDeniedError):
            old_status = channel.is_available
            channel.failed_update_count += 1
            if channel.failed_update_count >= MAX_FAILED_ATTEMPTS_BEFORE_UNAVAILABLE:
                channel.is_available = False
            channel.save()

            self._log_update_failure(channel, "access_denied", str(error))
            if old_status != channel.is_available:
                self._log_channel_status_change(
                    channel,
                    old_status,
                    channel.is_available,
                    f"Too many failed attempts ({channel.failed_update_count})",
                )

            return ChannelUpdateResult(
                channel_uuid=str(channel.uuid),
                success=False,
                changes_made={},
                error_message="Channel access denied - privacy settings may have changed",
            )

        elif isinstance(error, InvalidChannelDataError):
            channel.failed_update_count += 1
            channel.save()

            self._log_update_failure(channel, "invalid_data", str(error))

            return ChannelUpdateResult(
                channel_uuid=str(channel.uuid),
                success=False,
                changes_made={},
                error_message="Invalid channel data received from API",
            )

        else:
            channel.failed_update_count += 1
            channel.save()

            self._log_update_failure(channel, "unknown_error", str(error))

            return ChannelUpdateResult(
                channel_uuid=str(channel.uuid),
                success=False,
                changes_made={},
                error_message=f"Unexpected error: {str(error)}",
            )

    def _log_update_success(self, channel: Channel, changes_made: Dict[str, Any], new_videos_count: int) -> None:
        """Log successful update with structured change tracking"""
        change_summary = ", ".join(
            [
                f"{field}: {change['old']} -> {change['new']}"
                for field, change in changes_made.items()
                if field != "new_videos"
            ]
        )

        print(f"[CHANNEL_UPDATE_SUCCESS] Channel: {channel.uuid} ({channel.title})")
        print(f"  - Changes: {len(changes_made)} fields updated")
        if change_summary:
            print(f"  - Details: {change_summary}")
        if new_videos_count > 0:
            print(f"  - New videos: {new_videos_count} added")

    def _log_update_failure(self, channel: Channel, error_type: str, error_message: str) -> None:
        """Log failed update with comprehensive error categorization"""
        error_categories = {
            "channel_not_found": "PERMANENT_FAILURE",
            "access_denied": "PERMISSION_FAILURE",
            "invalid_data": "DATA_INTEGRITY_FAILURE",
            "quota_exceeded": "QUOTA_FAILURE",
            "rate_limited": "RATE_LIMIT_FAILURE",
            "server_error": "TRANSIENT_FAILURE",
            "unknown_error": "UNKNOWN_FAILURE",
        }

        category = error_categories.get(error_type, "UNKNOWN_FAILURE")

        print(f"[CHANNEL_UPDATE_FAILURE] Channel: {channel.uuid} ({channel.title})")
        print(f"  - Error Type: {error_type}")
        print(f"  - Category: {category}")
        print(f"  - Message: {error_message}")
        print(f"  - Failed Attempts: {channel.failed_update_count}")
        print(f"  - Available: {channel.is_available}")

    def _log_channel_status_change(self, channel: Channel, old_status: bool, new_status: bool, reason: str) -> None:
        """Log channel availability status changes"""
        status_change = "ENABLED" if new_status else "DISABLED"
        print(f"[CHANNEL_STATUS_CHANGE] Channel: {channel.uuid} ({channel.title})")
        print(f"  - Status: {old_status} -> {new_status} ({status_change})")
        print(f"  - Reason: {reason}")

    def determine_update_priority(self, channel: Channel) -> int:
        """Calculate channel update priority based on user engagement"""
        priority = 0

        if channel.subscriber_count:
            if channel.subscriber_count >= PRIORITY_HIGH_SUBSCRIBER_THRESHOLD:
                priority += PRIORITY_HIGH_SUBSCRIBER_BONUS
            elif channel.subscriber_count >= PRIORITY_MEDIUM_SUBSCRIBER_THRESHOLD:
                priority += PRIORITY_MEDIUM_SUBSCRIBER_BONUS
            elif channel.subscriber_count >= PRIORITY_LOW_SUBSCRIBER_THRESHOLD:
                priority += PRIORITY_LOW_SUBSCRIBER_BONUS

        user_subscription_count = channel.user_subscriptions.filter(is_active=True).count()
        priority += user_subscription_count * PRIORITY_USER_SUBSCRIPTION_MULTIPLIER

        priority -= channel.failed_update_count * PRIORITY_FAILURE_PENALTY

        if channel.last_updated is None:
            priority += PRIORITY_NEVER_UPDATED_BONUS

        return max(0, priority)

    def update_channels_batch(self, channels: Iterable[Channel]) -> Dict[str, Any]:
        """Update multiple channels with quota optimization"""
        if not channels:
            return {
                "processed": 0,
                "successful": 0,
                "failed": 0,
                "quota_used": 0,
                "stopped_due_to_quota": False,
                "results": [],
            }

        optimal_batch_size = self.quota_tracker.optimize_batch_size("channels.list")
        channels_list = list(channels)
        channels_to_process = channels_list[:optimal_batch_size] if optimal_batch_size > 0 else []

        successful_updates = 0
        failed_updates = 0
        total_quota_used = 0
        results = []
        stopped_due_to_quota = len(channels_to_process) < len(channels_list)

        for channel in channels_to_process:
            if not self.quota_tracker.can_make_request("channels.list"):
                stopped_due_to_quota = True
                break

            result = self.update_channel(channel)
            results.append(result)

            if result.success:
                successful_updates += 1
            else:
                failed_updates += 1

            total_quota_used += result.quota_used

        return {
            "processed": len(results),
            "successful": successful_updates,
            "failed": failed_updates,
            "quota_used": total_quota_used,
            "stopped_due_to_quota": stopped_due_to_quota,
            "results": results,
            "quota_summary": self.quota_tracker.get_usage_summary(),
        }
