from typing import List, Dict, Any, Tuple
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from celery.utils.log import get_task_logger

from videos.models import Channel, Video
from users.models import UserVideo


class ChannelCleanupService:
    """Service for detecting and cleaning up orphaned channels with selective video preservation"""

    def __init__(self):
        self.logger = get_task_logger(__name__)

    def find_orphaned_channels(self) -> List[Channel]:
        """
        Find channels that have no active user subscriptions

        Returns:
            List of Channel objects that are orphaned (no active UserChannel relationships)
        """
        self.logger.info("Starting orphaned channel detection")

        # Single query to find channels that either:
        # 1. Have no UserChannel entries at all, OR
        # 2. Have only inactive UserChannel entries
        orphaned_channels = (
            Channel.objects.filter(
                Q(user_subscriptions__isnull=True)  # No subscriptions at all
                | Q(user_subscriptions__is_active=False),  # Has subscriptions but all inactive
                is_deleted=False,
            )
            .exclude(user_subscriptions__is_active=True)  # Exclude any with active subscriptions
            .distinct()
        )

        self.logger.info(f"Found {orphaned_channels.count()} orphaned channels")
        return list(orphaned_channels)

    def analyze_channel_videos(self, channel: Channel) -> Dict[str, List[Video]]:
        """
        Categorize channel videos by preservation value based on user interaction

        Args:
            channel: Channel to analyze

        Returns:
            Dictionary with 'high_value' and 'low_value' video lists
        """
        all_videos = channel.videos.all()
        high_value_videos = []
        low_value_videos = []

        for video in all_videos:
            # Check if any UserVideo entry exists for this video with meaningful interaction
            user_videos = UserVideo.objects.filter(video=video)

            has_high_value_interaction = False
            for user_video in user_videos:
                if user_video.is_watched or (user_video.notes and user_video.notes.strip()):
                    has_high_value_interaction = True
                    break

            if has_high_value_interaction:
                high_value_videos.append(video)
            else:
                low_value_videos.append(video)

        self.logger.info(
            f"Channel {channel.channel_id} analysis: "
            f"{len(high_value_videos)} high-value, {len(low_value_videos)} low-value videos"
        )

        return {"high_value": high_value_videos, "low_value": low_value_videos}

    def delete_low_value_videos(self, videos: List[Video]) -> Tuple[int, int]:
        """
        Delete videos and their associated UserVideo entries

        Args:
            videos: List of Video objects to delete

        Returns:
            Tuple of (videos_deleted, user_videos_deleted)
        """
        if not videos:
            return (0, 0)

        video_ids = [video.uuid for video in videos]

        # Delete UserVideo entries first (foreign key constraint)
        user_videos_deleted = UserVideo.objects.filter(video__uuid__in=video_ids).delete()[0]

        # Delete the videos themselves
        videos_deleted = Video.objects.filter(uuid__in=video_ids).delete()[0]

        self.logger.info(f"Deleted {videos_deleted} videos and {user_videos_deleted} UserVideo entries")
        return (videos_deleted, user_videos_deleted)

    def cleanup_channel_selectively(self, channel: Channel) -> Dict[str, Any]:
        """
        Selectively clean up channel based on video preservation value

        Strategy:
        - Channels with high-value videos: Soft delete channel, preserve high-value videos
        - Channels with only low-value videos: Hard delete everything

        Args:
            channel: Channel object to clean up

        Returns:
            Dictionary with cleanup operation results
        """
        cleanup_result = {
            "channel_uuid": str(channel.uuid),
            "channel_id": channel.channel_id,
            "cleanup_type": None,  # 'soft_delete' or 'hard_delete'
            "videos_preserved": 0,
            "videos_deleted": 0,
            "user_video_entries_deleted": 0,
            "cleanup_timestamp": timezone.now(),
            "success": False,
            "error_message": None,
        }

        try:
            with transaction.atomic():
                # Analyze videos in this channel
                video_analysis = self.analyze_channel_videos(channel)
                high_value_videos = video_analysis["high_value"]
                low_value_videos = video_analysis["low_value"]

                if high_value_videos:
                    # Soft delete approach: Preserve channel and high-value videos
                    cleanup_result["cleanup_type"] = "soft_delete"

                    # Delete only low-value videos
                    videos_deleted, user_videos_deleted = self.delete_low_value_videos(low_value_videos)

                    # Mark channel as deleted but keep record for high-value videos
                    channel.is_deleted = True
                    channel.is_available = False
                    channel.save(update_fields=["is_deleted", "is_available", "updated_at"])

                    cleanup_result.update(
                        {
                            "videos_preserved": len(high_value_videos),
                            "videos_deleted": videos_deleted,
                            "user_video_entries_deleted": user_videos_deleted,
                            "success": True,
                        }
                    )

                    self.logger.info(
                        f"Soft cleanup of channel {channel.channel_id}: "
                        f"preserved {len(high_value_videos)} videos, deleted {videos_deleted} videos"
                    )

                else:
                    # Hard delete approach: Remove everything
                    cleanup_result["cleanup_type"] = "hard_delete"

                    # Delete all videos (this also deletes associated UserVideo entries)
                    videos_deleted, user_videos_deleted = self.delete_low_value_videos(low_value_videos)

                    # Delete the channel itself
                    channel.delete()

                    cleanup_result.update(
                        {
                            "videos_deleted": videos_deleted,
                            "user_video_entries_deleted": user_videos_deleted,
                            "success": True,
                        }
                    )

                    self.logger.info(
                        f"Hard cleanup of channel {channel.channel_id}: "
                        f"deleted {videos_deleted} videos, {user_videos_deleted} UserVideo entries, and channel record"
                    )

        except Exception as e:
            self.logger.error(f"Error cleaning up channel {channel.channel_id}: {str(e)}")
            cleanup_result.update({"success": False, "error_message": str(e)})

        return cleanup_result

    def cleanup_orphaned_channels(self, max_channels: int = 50) -> Dict[str, Any]:
        """
        Clean up multiple orphaned channels in a batch operation

        Args:
            max_channels: Maximum number of channels to clean up in one batch

        Returns:
            Dictionary with batch cleanup results
        """
        self.logger.info(f"Starting batch cleanup of up to {max_channels} orphaned channels")

        batch_result = {
            "cleanup_timestamp": timezone.now(),
            "channels_processed": 0,
            "soft_deletions": 0,
            "hard_deletions": 0,
            "failed_cleanups": 0,
            "total_videos_preserved": 0,
            "total_videos_deleted": 0,
            "total_user_videos_deleted": 0,
            "cleanup_details": [],
            "success": True,
            "error_message": None,
        }

        try:
            # Find orphaned channels
            orphaned_channels = self.find_orphaned_channels()[:max_channels]

            if not orphaned_channels:
                self.logger.info("No orphaned channels found")
                return batch_result

            # Process each orphaned channel
            for channel in orphaned_channels:
                cleanup_result = self.cleanup_channel_selectively(channel)
                batch_result["cleanup_details"].append(cleanup_result)
                batch_result["channels_processed"] += 1

                if cleanup_result["success"]:
                    if cleanup_result["cleanup_type"] == "soft_delete":
                        batch_result["soft_deletions"] += 1
                        batch_result["total_videos_preserved"] += cleanup_result["videos_preserved"]
                    else:
                        batch_result["hard_deletions"] += 1

                    batch_result["total_videos_deleted"] += cleanup_result["videos_deleted"]
                    batch_result["total_user_videos_deleted"] += cleanup_result["user_video_entries_deleted"]
                else:
                    batch_result["failed_cleanups"] += 1

            self.logger.info(
                "Batch cleanup completed: {} soft deletions, {} hard deletions, {} failed out of {} total".format(
                    batch_result["soft_deletions"],
                    batch_result["hard_deletions"],
                    batch_result["failed_cleanups"],
                    batch_result["channels_processed"],
                )
            )

        except Exception as e:
            self.logger.error(f"Error in batch cleanup operation: {str(e)}")
            batch_result.update({"success": False, "error_message": str(e)})

        return batch_result

    def get_cleanup_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about channels eligible for cleanup

        Returns:
            Dictionary with cleanup statistics
        """
        total_channels = Channel.objects.filter(is_deleted=False).count()
        orphaned_channels_count = len(self.find_orphaned_channels())

        active_channels_with_subs = (
            Channel.objects.filter(user_subscriptions__is_active=True, is_deleted=False).distinct().count()
        )

        return {
            "total_channels": total_channels,
            "orphaned_channels": orphaned_channels_count,
            "active_channels_with_subscriptions": active_channels_with_subs,
            "cleanup_eligible_percentage": (
                (orphaned_channels_count / total_channels * 100) if total_channels > 0 else 0
            ),
            "timestamp": timezone.now(),
        }
