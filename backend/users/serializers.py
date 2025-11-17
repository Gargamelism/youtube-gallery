from __future__ import annotations

from typing import Any
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db.utils import IntegrityError
from django.db import transaction
from rest_framework import serializers

from .models import User, UserChannel, UserVideo, ChannelTag, UserWatchPreferences


class UserRegistrationSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("email", "username", "password", "password_confirm", "first_name", "last_name")

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError("Passwords don't match")
        return attrs

    def create(self, validated_data: dict[str, Any]) -> User:
        validated_data.pop("password_confirm")
        user = User.objects.create_user(**validated_data)
        return user


class UserLoginSerializer(serializers.Serializer):  # type: ignore[type-arg]
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        email = attrs.get("email")
        password = attrs.get("password")

        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError("Invalid credentials")
            if not user.is_active:
                raise serializers.ValidationError("User account is disabled")
            attrs["user"] = user
            return attrs
        else:
            raise serializers.ValidationError("Email and password are required")


class UserSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    class Meta:
        model = User
        fields = ("id", "email", "username", "first_name", "last_name", "is_staff", "created_at")
        read_only_fields = ("id", "created_at")


class ChannelTagSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    channel_count = serializers.SerializerMethodField()

    class Meta:
        model = ChannelTag
        fields = ("id", "name", "color", "description", "channel_count", "created_at")
        read_only_fields = ("id", "created_at")

    def get_channel_count(self, obj: ChannelTag) -> int:
        return obj.channel_assignments.count()

    def create(self, validated_data: dict[str, Any]) -> ChannelTag:
        try:
            with transaction.atomic():
                return super().create(validated_data)  # type: ignore[no-any-return]
        except IntegrityError:
            raise serializers.ValidationError({"name": ["Tag with this name already exists."]})


class UserChannelSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    channel_title = serializers.CharField(source="channel.title", read_only=True)
    channel_id = serializers.CharField(source="channel.channel_id", read_only=True)
    tags = serializers.SerializerMethodField()

    class Meta:
        model = UserChannel
        fields = ("id", "channel", "channel_title", "channel_id", "is_active", "tags", "subscribed_at", "created_at")
        read_only_fields = ("id", "created_at", "subscribed_at")

    def get_tags(self, user_channel: UserChannel) -> list[dict[str, Any]]:
        user_channel_tags = user_channel.channel_tags.select_related("tag").all()
        tag_objects = [user_channel_tag.tag for user_channel_tag in user_channel_tags]
        return ChannelTagSerializer(tag_objects, many=True).data  # type: ignore[return-value]


class UserVideoSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    video_title = serializers.CharField(source="video.title", read_only=True)
    video_id = serializers.CharField(source="video.video_id", read_only=True)

    class Meta:
        model = UserVideo
        fields = (
            "id",
            "video",
            "video_title",
            "video_id",
            "is_watched",
            "watched_at",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class UserWatchPreferencesSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    auto_mark_threshold = serializers.SerializerMethodField()

    class Meta:
        model = UserWatchPreferences
        fields = (
            "auto_mark_watched_enabled",
            "auto_mark_threshold",
        )

    def get_auto_mark_threshold(self, obj: UserWatchPreferences) -> int:
        return obj.get_threshold()
