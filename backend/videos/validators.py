import uuid
from typing import List, Optional, Self
from enum import Enum
from pydantic import BaseModel, ConfigDict, field_validator, model_validator, ValidationInfo, Field
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.request import Request

from users.models import User, ChannelTag


MAX_SEARCH_QUERY_LENGTH = 50


class TagMode(str, Enum):
    ANY = "any"
    ALL = "all"

    @classmethod
    def from_param(cls, value: Optional[str]) -> "TagMode":
        """Parse tag mode from parameter with fallback to ANY"""
        try:
            return cls(value)
        except (ValueError, TypeError):
            return cls.ANY


class WatchStatus(str, Enum):
    WATCHED = "watched"
    UNWATCHED = "unwatched"
    ALL = "all"

    @classmethod
    def from_param(cls, value: Optional[str]) -> Optional[Self]:
        """Parse watch status from parameter with fallback to None"""
        try:
            return cls(value)
        except (ValueError, TypeError):
            return None


class NotInterestedFilter(str, Enum):
    ONLY = "only"
    EXCLUDE = "exclude"
    INCLUDE = "include"

    @classmethod
    def from_param(cls, value: Optional[str]) -> "NotInterestedFilter":
        """Parse filter from parameter with default to EXCLUDE"""
        try:
            return cls(value)
        except (ValueError, TypeError):
            return cls.EXCLUDE


class VideoSearchParams(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    tags: Optional[List[str]] = None
    tag_mode: TagMode = TagMode.ANY
    watch_status: Optional[WatchStatus] = None
    not_interested_filter: NotInterestedFilter = NotInterestedFilter.EXCLUDE
    user: Optional[User] = None

    @field_validator("tags")
    @classmethod
    def validate_tags_belong_to_user(cls, tags: Optional[List[str]], info: ValidationInfo) -> Optional[List[str]]:
        if not tags or not info.context or not info.context.get("user"):
            return tags

        user = info.context["user"]
        user_tag_names = set(ChannelTag.objects.filter(user=user).values_list("name", flat=True))

        invalid_tags = set(tags) - user_tag_names
        if invalid_tags:
            raise ValueError(f"Invalid tags not owned by user: {list(invalid_tags)}")

        return tags

    @classmethod
    def from_request(cls, request: Request) -> Self:
        """Create VideoSearchParams from Django request with proper error handling"""
        tags_param = request.query_params.get("tags")
        tags = None
        if tags_param:
            tags = [tag.strip() for tag in tags_param.split(",") if tag.strip()]

        tag_mode = TagMode.from_param(request.query_params.get("tag_mode"))
        watch_status = WatchStatus.from_param(request.query_params.get("watch_status"))
        not_interested_filter = NotInterestedFilter.from_param(request.query_params.get("not_interested_filter"))

        try:
            return cls.model_validate(
                {
                    "tags": tags,
                    "tag_mode": tag_mode,
                    "watch_status": watch_status,
                    "not_interested_filter": not_interested_filter,
                    "user": request.user,
                },
                context={"user": request.user},
            )
        except Exception as e:
            raise DRFValidationError({"query_params": str(e)})


class ChannelSearchParams(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    tags: Optional[List[str]] = None
    tag_mode: TagMode = TagMode.ANY
    search_query: Optional[str] = None
    user: User

    @model_validator(mode="after")
    def validate_tags_belong_to_user(self) -> Self:
        if not self.tags:
            return self

        user_tag_names = set(ChannelTag.objects.filter(user=self.user).values_list("name", flat=True))

        invalid_tags = set(self.tags) - user_tag_names
        if invalid_tags:
            raise ValueError(f"Invalid tags not owned by user: {list(invalid_tags)}")

        return self

    @field_validator("search_query")
    @classmethod
    def validate_search_query_length(cls, search_query: Optional[str]) -> Optional[str]:
        if not search_query:
            return None

        search_query = search_query.strip()
        if len(search_query) > MAX_SEARCH_QUERY_LENGTH:
            raise ValueError(f"Search query must be less than {MAX_SEARCH_QUERY_LENGTH} characters")

        return search_query

    @classmethod
    def from_request(cls, request: Request) -> Self:
        """Create ChannelSearchParams from Django request with proper error handling"""
        tags_param = request.query_params.get("tags")
        tags = None
        if tags_param:
            tags = [tag.strip() for tag in tags_param.split(",") if tag.strip()]

        tag_mode = TagMode.from_param(request.query_params.get("tag_mode"))
        search_query = request.query_params.get("search")

        try:
            return cls.model_validate(
                {
                    "tags": tags,
                    "tag_mode": tag_mode,
                    "search_query": search_query,
                    "user": request.user,
                },
                context={"user": request.user},
            )
        except Exception as e:
            raise DRFValidationError({"query_params": str(e)})


class TagAssignmentParams(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    tag_ids: List[str]
    user: Optional[User] = None

    @field_validator("tag_ids")
    @classmethod
    def validate_tag_ids_format(cls, tag_ids: List[str]) -> List[str]:
        if not isinstance(tag_ids, list):
            raise ValueError("tag_ids must be an array")

        for tag_id in tag_ids:
            try:
                uuid.UUID(tag_id)
            except ValueError:
                raise ValueError(f"Invalid UUID format for tag ID: {tag_id}")

        return tag_ids

    @field_validator("tag_ids")
    @classmethod
    def validate_tags_belong_to_user(cls, tag_ids: List[str], info: ValidationInfo) -> List[str]:
        if not tag_ids or not info.context or not info.context.get("user"):
            return tag_ids

        user = info.context["user"]
        user_tag_ids = set(ChannelTag.objects.filter(user=user).values_list("id", flat=True))

        invalid_tag_ids = set(tag_ids) - {str(tag_id) for tag_id in user_tag_ids}
        if invalid_tag_ids:
            raise ValueError(f"Invalid tag IDs not owned by user: {list(invalid_tag_ids)}")

        return tag_ids

    @classmethod
    def from_request(cls, request: Request) -> Self:
        """Create TagAssignmentParams from Django request with proper error handling"""
        try:
            return cls.model_validate(
                {"tag_ids": request.data.get("tag_ids", []), "user": request.user}, context={"user": request.user}
            )
        except Exception as e:
            raise DRFValidationError({"request_data": str(e)})
        

class WatchProgressUpdateParams(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    current_time: float = Field(..., ge=0, description="Current playback position in seconds")
    duration: float = Field(..., gt=0, description="Total video duration in seconds")
    auto_mark: bool = Field(default=True, description="Auto-mark as watched at threshold")
    

class WatchPreferencesParams(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    auto_mark_watched: bool = True
    auto_mark_threshold_percent: int

    @field_validator("auto_mark_threshold_percent")
    @classmethod
    def validate_threshold_percent(cls, percent: int) -> int:
        if not (0 <= percent <= 100):
            raise ValueError("auto_mark_threshold_percent must be between 0 and 100")
        return percent    
