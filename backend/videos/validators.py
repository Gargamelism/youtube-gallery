import uuid
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, ConfigDict, field_validator
from rest_framework.exceptions import ValidationError as DRFValidationError

from users.models import User, ChannelTag


class TagMode(str, Enum):
    ANY = "any"
    ALL = "all"


class WatchStatus(str, Enum):
    WATCHED = "watched"
    UNWATCHED = "unwatched"
    ALL = "all"


class VideoSearchParams(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    tags: Optional[List[str]] = None
    tag_mode: TagMode = TagMode.ANY
    watch_status: Optional[WatchStatus] = None
    user: Optional[User] = None

    @field_validator("tags")
    @classmethod
    def validate_tags_belong_to_user(cls, tags, info):
        if not tags or not info.context or not info.context.get("user"):
            return tags

        user = info.context["user"]
        user_tag_names = set(ChannelTag.objects.filter(user=user).values_list("name", flat=True))

        invalid_tags = set(tags) - user_tag_names
        if invalid_tags:
            raise ValueError(f"Invalid tags not owned by user: {list(invalid_tags)}")

        return tags

    @classmethod
    def from_request(cls, request):
        """Create VideoSearchParams from Django request with proper error handling"""
        tags_param = request.query_params.get("tags")
        tags = None
        if tags_param:
            tags = [tag.strip() for tag in tags_param.split(",") if tag.strip()]

        # Use enum values as fallbacks for invalid inputs
        tag_mode_param = request.query_params.get("tag_mode", TagMode.ANY)
        try:
            tag_mode = TagMode(tag_mode_param)
        except ValueError:
            tag_mode = TagMode.ANY  # Fallback to default enum value

        watch_status_param = request.query_params.get("watch_status")
        watch_status = None
        if watch_status_param:
            try:
                watch_status = WatchStatus(watch_status_param)
            except ValueError:
                watch_status = None  # Fallback to None for invalid values

        try:
            return cls.model_validate(
                {
                    "tags": tags,
                    "tag_mode": tag_mode,
                    "watch_status": watch_status,
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
    def validate_tag_ids_format(cls, tag_ids):
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
    def validate_tags_belong_to_user(cls, tag_ids, info):
        if not tag_ids or not info.context or not info.context.get("user"):
            return tag_ids

        user = info.context["user"]
        user_tag_ids = set(ChannelTag.objects.filter(user=user).values_list("id", flat=True))

        invalid_tag_ids = set(tag_ids) - {str(tag_id) for tag_id in user_tag_ids}
        if invalid_tag_ids:
            raise ValueError(f"Invalid tag IDs not owned by user: {list(invalid_tag_ids)}")

        return tag_ids

    @classmethod
    def from_request(cls, request):
        """Create TagAssignmentParams from Django request with proper error handling"""
        try:
            return cls.model_validate(
                {"tag_ids": request.data.get("tag_ids", []), "user": request.user}, context={"user": request.user}
            )
        except Exception as e:
            raise DRFValidationError({"request_data": str(e)})
