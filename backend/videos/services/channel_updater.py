"""
Service for updating channel metadata from YouTube API.
"""
from dataclasses import dataclass
from typing import Any, Dict, Optional

from django.utils import timezone
from googleapiclient.errors import HttpError
from rest_framework import status

from videos.exceptions import (
    APIRateLimitError,
    ChannelAccessDeniedError,
    ChannelNotFoundError,
    ChannelUpdateError,
    InvalidChannelDataError,
    QuotaExceededError,
)
from videos.models import Channel, Video
from videos.services.youtube import YouTubeService

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
RETRY_BASE_DELAY_SECONDS = 300
MAX_RETRY_DELAY_SECONDS = 3600


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

    def __init__(self, youtube_service: YouTubeService):
        self.youtube_service = youtube_service

    def update_channel(self, channel: Channel) -> ChannelUpdateResult:
        """Update a single channel's metadata and fetch new videos"""
        try:
            channel_data = self._fetch_channel_data(channel.channel_id)
            changes_made = self._apply_channel_updates(channel, channel_data)

            # Fetch new videos using existing YouTubeService
            new_videos_count = self._fetch_new_videos(channel)
            if new_videos_count > 0:
                changes_made['new_videos'] = {'count': new_videos_count}

            self._log_update_success(channel, changes_made, new_videos_count)

            return ChannelUpdateResult(
                channel_uuid=str(channel.uuid),
                success=True,
                changes_made=changes_made,
                quota_used=1 + (1 if new_videos_count > 0 else 0),
                new_videos_added=new_videos_count
            )

        except Exception as e:
            return self._handle_update_error(channel, e)

    def _fetch_channel_data(self, channel_id: str) -> Dict[str, Any]:
        """Fetch channel data with specific error handling for YouTube API responses"""
        try:
            channel_details = self.youtube_service.get_channel_details(channel_id)

            if not channel_details:
                raise ChannelNotFoundError(f"Channel {channel_id} not found")

            request = self.youtube_service.youtube.channels().list(
                part="snippet,statistics",
                id=channel_id
            )
            response = request.execute()

            if not response or 'items' not in response:
                raise InvalidChannelDataError(f"Empty response for channel {channel_id}")

            if not response['items']:
                raise ChannelNotFoundError(f"Channel {channel_id} not found")

            channel_data = response['items'][0]

            required_fields = ['snippet', 'statistics']
            for field in required_fields:
                if field not in channel_data:
                    raise InvalidChannelDataError(f"Missing {field} in channel data")

            return channel_data

        except HttpError as e:
            error_details = e.error_details[0] if e.error_details else {}
            reason = error_details.get('reason', 'unknown')

            if e.resp.status == status.HTTP_403_FORBIDDEN:
                if reason == 'quotaExceeded':
                    raise QuotaExceededError("YouTube API quota exceeded")
                elif reason == 'rateLimitExceeded':
                    raise APIRateLimitError("YouTube API rate limit exceeded")
                else:
                    raise ChannelAccessDeniedError(f"Access denied: {reason}")

            elif e.resp.status == status.HTTP_404_NOT_FOUND:
                raise ChannelNotFoundError(f"Channel {channel_id} not found")

            elif e.resp.status >= status.HTTP_500_INTERNAL_SERVER_ERROR:
                raise APIRateLimitError(f"YouTube API server error: {e.resp.status}")

            else:
                raise ChannelUpdateError(f"YouTube API error: {reason}")

    def _apply_channel_updates(self, channel: Channel, channel_data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply updates to channel model and track changes using django-dirtyfields"""
        snippet = channel_data.get('snippet', {})
        statistics = channel_data.get('statistics', {})

        # Update channel fields
        if snippet.get('title'):
            channel.title = snippet['title']

        if snippet.get('description'):
            channel.description = snippet['description']

        if statistics.get('subscriberCount'):
            channel.subscriber_count = int(statistics['subscriberCount'])

        if statistics.get('videoCount'):
            channel.video_count = int(statistics['videoCount'])

        if statistics.get('viewCount'):
            channel.view_count = int(statistics['viewCount'])

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
                if field not in ['last_updated', 'failed_update_count', 'is_available']:
                    changes_made[field] = {
                        'old': old_value,
                        'new': getattr(channel, field)
                    }

            return changes_made

        return {}

    def _fetch_new_videos(self, channel: Channel) -> int:
        """Fetch new videos for the channel, stopping at first existing video for efficiency"""
        try:
            channel_details = self.youtube_service.get_channel_details(channel.channel_id)
            if not channel_details or 'uploads_playlist_id' not in channel_details:
                print(f"INFO: No uploads playlist found for channel {channel.uuid}")
                return 0

            uploads_playlist_id = channel_details['uploads_playlist_id']

            existing_video_ids = set(
                Video.objects.filter(channel=channel).values_list('video_id', flat=True)
            )

            videos_created = 0
            videos_generator = self.youtube_service.get_channel_videos(uploads_playlist_id)

            for page_videos in videos_generator:
                found_existing_video = False

                for video_data in page_videos:
                    if video_data['video_id'] in existing_video_ids:
                        found_existing_video = True
                        break

                    Video.objects.update_or_create(
                        video_id=video_data['video_id'],
                        defaults={**video_data, 'channel': channel}
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
            print(f"WARNING: Quota exceeded for channel {channel.uuid}")
            return ChannelUpdateResult(
                channel_uuid=str(channel.uuid),
                success=False,
                changes_made={},
                error_message="API quota exceeded - retry scheduled",
                quota_used=0
            )

        elif isinstance(error, ChannelNotFoundError):
            channel.is_available = False
            channel.failed_update_count += 1
            channel.save()

            self._log_update_failure(channel, "channel_not_found", str(error))

            return ChannelUpdateResult(
                channel_uuid=str(channel.uuid),
                success=False,
                changes_made={'is_available': False},
                error_message="Channel no longer available on YouTube"
            )

        elif isinstance(error, APIRateLimitError):
            retry_delay = min(RETRY_BASE_DELAY_SECONDS * (2 ** channel.failed_update_count), MAX_RETRY_DELAY_SECONDS)
            print(f"INFO: Rate limited for channel {channel.uuid}, retry in {retry_delay}s")

            return ChannelUpdateResult(
                channel_uuid=str(channel.uuid),
                success=False,
                changes_made={},
                error_message=f"Rate limited - retry in {retry_delay} seconds",
                quota_used=0
            )

        elif isinstance(error, ChannelAccessDeniedError):
            channel.failed_update_count += 1
            if channel.failed_update_count >= MAX_FAILED_ATTEMPTS_BEFORE_UNAVAILABLE:
                channel.is_available = False
            channel.save()

            self._log_update_failure(channel, "access_denied", str(error))

            return ChannelUpdateResult(
                channel_uuid=str(channel.uuid),
                success=False,
                changes_made={},
                error_message="Channel access denied - privacy settings may have changed"
            )

        elif isinstance(error, InvalidChannelDataError):
            channel.failed_update_count += 1
            channel.save()

            self._log_update_failure(channel, "invalid_data", str(error))

            return ChannelUpdateResult(
                channel_uuid=str(channel.uuid),
                success=False,
                changes_made={},
                error_message="Invalid channel data received from API"
            )

        else:
            channel.failed_update_count += 1
            channel.save()

            print(f"ERROR: Unexpected error updating channel {channel.uuid}: {str(error)}")
            self._log_update_failure(channel, "unknown_error", str(error))

            return ChannelUpdateResult(
                channel_uuid=str(channel.uuid),
                success=False,
                changes_made={},
                error_message=f"Unexpected error: {str(error)}"
            )

    def _log_update_success(self, channel: Channel, changes_made: Dict[str, Any], new_videos_count: int) -> None:
        """Log successful update with change tracking"""
        print(
            f"INFO: Successfully updated channel {channel.uuid} ({channel.title}): "
            f"{len(changes_made)} changes made, {new_videos_count} new videos added"
        )

    def _log_update_failure(self, channel: Channel, error_type: str, error_message: str) -> None:
        """Log failed update with error categorization"""
        print(
            f"ERROR: Failed to update channel {channel.uuid} ({channel.title}): "
            f"{error_type} - {error_message}"
        )

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