from typing import List, Optional
from django.db.models import QuerySet, Count, Q, Exists, OuterRef

from ..models import Video
from ..validators import TagMode, WatchStatus
from users.models import User, UserChannel, UserVideo, UserChannelTag


class VideoSearchService:
    """Service for complex video search and filtering operations using single optimized queries"""

    def __init__(self, user: User):
        self.user = user

    def search_videos(
        self,
        tag_names: Optional[List[str]] = None,
        tag_mode: TagMode = TagMode.ANY,
        watch_status: Optional[WatchStatus] = None,
    ) -> QuerySet[Video]:
        """
        Search videos with complex filtering using a single optimized query

        Args:
            tag_names: List of validated tag names that belong to the user
            tag_mode: TagMode enum for AND/OR logic
            watch_status: WatchStatus enum for filtering by watch status

        Returns:
            QuerySet of filtered videos (single DB call when evaluated)
        """
        # Start with base queryset
        queryset = Video.objects.select_related("channel")

        # Apply base subscription filter
        queryset = self._apply_subscription_filter(queryset)

        # Apply tag filtering if provided
        if tag_names:
            queryset = self._apply_tag_filter(queryset, tag_names, tag_mode)

        # Apply watch status filtering if provided
        if watch_status:
            queryset = self._apply_watch_status_filter(queryset, watch_status)

        return queryset.distinct()

    def _apply_subscription_filter(self, queryset: QuerySet[Video]) -> QuerySet[Video]:
        """Filter to only videos from user's active subscribed channels"""
        return queryset.filter(channel__user_subscriptions__user=self.user, channel__user_subscriptions__is_active=True)

    def _apply_tag_filter(self, queryset: QuerySet[Video], tag_names: List[str], tag_mode: TagMode) -> QuerySet[Video]:
        """Apply tag-based filtering using optimized single query approach"""
        match tag_mode:
            case TagMode.ALL:
                # Channel must have ALL specified tags - use single annotation with count
                return queryset.annotate(
                    matching_tag_count=Count(
                        "channel__user_subscriptions__channel_tags__tag",
                        filter=Q(
                            channel__user_subscriptions__user=self.user,
                            channel__user_subscriptions__channel_tags__tag__name__in=tag_names,
                            channel__user_subscriptions__channel_tags__tag__user=self.user,
                        ),
                        distinct=True,
                    )
                ).filter(matching_tag_count=len(tag_names))

            case TagMode.ANY:
                # Channel must have ANY of the specified tags - single EXISTS with array
                tag_exists = UserChannelTag.objects.filter(
                    user_channel__channel=OuterRef("channel"),
                    user_channel__user=self.user,
                    tag__name__in=tag_names,
                    tag__user=self.user,
                )
                return queryset.filter(Exists(tag_exists))

    def _apply_watch_status_filter(self, queryset: QuerySet[Video], watch_status: WatchStatus) -> QuerySet[Video]:
        """Apply watch status filtering using EXISTS subquery"""
        match watch_status:
            case WatchStatus.WATCHED:
                watched_exists = UserVideo.objects.filter(user=self.user, video=OuterRef("uuid"), is_watched=True)
                return queryset.filter(Exists(watched_exists))

            case WatchStatus.UNWATCHED:
                watched_exists = UserVideo.objects.filter(user=self.user, video=OuterRef("uuid"), is_watched=True)
                return queryset.filter(~Exists(watched_exists))

            case WatchStatus.ALL:
                # No filtering needed for "all"
                return queryset

    def get_video_stats(self) -> dict:
        """Get video statistics using a single query with annotations"""
        base_queryset = Video.objects.filter(
            channel__user_subscriptions__user=self.user, channel__user_subscriptions__is_active=True
        )

        # Use single query with conditional counting
        stats = base_queryset.aggregate(
            total_videos=Count("uuid", distinct=True),
            watched_videos=Count(
                "uuid", filter=Q(user_videos__user=self.user, user_videos__is_watched=True), distinct=True
            ),
        )

        total = stats["total_videos"]
        watched = stats["watched_videos"]
        unwatched = total - watched

        return {
            "total": total,
            "watched": watched,
            "unwatched": unwatched,
        }
