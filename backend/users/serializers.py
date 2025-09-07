from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db.utils import IntegrityError
from django.db import transaction
from rest_framework import serializers

from .models import User, UserChannel, UserVideo, ChannelTag


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("email", "username", "password", "password_confirm", "first_name", "last_name")

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError("Passwords don't match")
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        user = User.objects.create_user(**validated_data)
        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, attrs):
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


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "username", "first_name", "last_name", "is_staff", "created_at")
        read_only_fields = ("id", "created_at")


class ChannelTagSerializer(serializers.ModelSerializer):
    channel_count = serializers.SerializerMethodField()

    class Meta:
        model = ChannelTag
        fields = ("id", "name", "color", "description", "channel_count", "created_at")
        read_only_fields = ("id", "created_at")

    def get_channel_count(self, obj):
        return obj.channel_assignments.count()

    def create(self, validated_data):
        try:
            with transaction.atomic():
                return super().create(validated_data)
        except IntegrityError:
            raise serializers.ValidationError({"name": ["Tag with this name already exists."]})


class UserChannelSerializer(serializers.ModelSerializer):
    channel_title = serializers.CharField(source="channel.title", read_only=True)
    channel_id = serializers.CharField(source="channel.channel_id", read_only=True)
    tags = ChannelTagSerializer(source="channel_tags.tag", many=True, read_only=True)

    class Meta:
        model = UserChannel
        fields = ("id", "channel", "channel_title", "channel_id", "is_active", "tags", "subscribed_at", "created_at")
        read_only_fields = ("id", "created_at", "subscribed_at")


class UserVideoSerializer(serializers.ModelSerializer):
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
