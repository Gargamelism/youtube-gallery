from __future__ import annotations

from enum import Enum
from typing import List, Optional

from django.db.models import Count, Exists, OuterRef, Q, QuerySet

from users.models import User, UserChannel, UserChannelTag
from videos.models import Channel
from videos.validators import TagMode


class ChannelFieldPrefix(str, Enum):
    """Field prefixes for channel search queries"""

    DIRECT = ""
    USER_CHANNEL = "channel__"


class ChannelSearchService:
    """Service for channel search and filtering operations using optimized queries"""

    def __init__(self, user: User):
        self.user = user

    def search_user_channels(
        self,
        tag_names: Optional[List[str]] = None,
        tag_mode: TagMode = TagMode.ANY,
        search_query: Optional[str] = None,
    ) -> QuerySet[UserChannel]:
        """
        Search user's subscribed channels with filtering

        Returns QuerySet of UserChannel objects with optimized prefetching
        """
        queryset = (
            UserChannel.objects.filter(user=self.user, is_active=True)
            .select_related("channel")
            .with_user_tags(self.user)
        )

        if search_query:
            queryset = self._apply_search_filter(queryset, search_query, ChannelFieldPrefix.USER_CHANNEL)

        if tag_names:
            queryset = self._apply_tag_filter(queryset, tag_names, tag_mode)

        return queryset.order_by("channel__title")

    def search_available_channels(
        self,
        search_query: Optional[str] = None,
    ) -> QuerySet[Channel]:
        """
        Search available (non-subscribed) channels with text search only

        Note: Tag filtering not applicable as available channels don't have user-specific tags

        Returns QuerySet of Channel objects
        """
        queryset = Channel.objects.filter(is_available=True, is_deleted=False).exclude(
            user_subscriptions__user=self.user, user_subscriptions__is_active=True
        )

        if search_query:
            queryset = self._apply_search_filter(queryset, search_query, ChannelFieldPrefix.DIRECT)  # type: ignore[assignment]

        return queryset.order_by("title")

    def _apply_search_filter(
        self, queryset: QuerySet[UserChannel] | QuerySet[Channel], search_query: str, prefix: ChannelFieldPrefix
    ) -> QuerySet[UserChannel] | QuerySet[Channel]:
        """Apply search query filter to queryset"""
        prefix_str = prefix.value
        return queryset.filter(
            Q(**{f"{prefix_str}title__icontains": search_query})
            | Q(**{f"{prefix_str}channel_id__icontains": search_query})
            | Q(**{f"{prefix_str}description__icontains": search_query})
        )

    def _apply_tag_filter(
        self, queryset: QuerySet[UserChannel], tag_names: List[str], tag_mode: TagMode
    ) -> QuerySet[UserChannel]:
        """Apply tag-based filtering to UserChannel queryset"""
        match tag_mode:
            case TagMode.ALL:
                queryset = queryset.annotate(
                    matching_tag_count=Count(
                        "channel_tags__tag",
                        filter=Q(
                            channel_tags__tag__name__in=tag_names,
                            channel_tags__tag__user=self.user,
                        ),
                        distinct=True,
                    )
                ).filter(matching_tag_count=len(tag_names))

            case TagMode.ANY:
                tag_exists = UserChannelTag.objects.filter(
                    user_channel=OuterRef("pk"),
                    tag__name__in=tag_names,
                    tag__user=self.user,
                )
                queryset = queryset.filter(Exists(tag_exists))

            case TagMode.EXCEPT:
                tag_exists = UserChannelTag.objects.filter(
                    user_channel=OuterRef("pk"),
                    tag__name__in=tag_names,
                    tag__user=self.user,
                )
                queryset = queryset.filter(~Exists(tag_exists))

            case _:
                pass

        return queryset
