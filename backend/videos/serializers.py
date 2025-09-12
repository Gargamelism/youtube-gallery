from rest_framework import serializers
from users.models import UserChannel, UserVideo, ChannelTag, UserChannelTag

from .models import Channel, Video


class ChannelSerializer(serializers.ModelSerializer):
    total_videos = serializers.SerializerMethodField()
    watched_videos = serializers.SerializerMethodField()
    unwatched_videos = serializers.SerializerMethodField()
    is_subscribed = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = "__all__"

    def get_total_videos(self, obj):
        return obj.videos.count()

    def get_watched_videos(self, obj):
        user = self.context["request"].user
        return UserVideo.objects.filter(user=user, video__channel=obj, is_watched=True).count()

    def get_unwatched_videos(self, obj):
        user = self.context["request"].user
        total_videos = obj.videos.count()
        watched_count = self.get_watched_videos(obj)
        return total_videos - watched_count

    def get_is_subscribed(self, obj):
        user = self.context["request"].user
        return UserChannel.objects.filter(user=user, channel=obj, is_active=True).exists()


class VideoSerializer(serializers.ModelSerializer):
    channel = ChannelSerializer(read_only=True)
    channel_uuid = serializers.UUIDField(write_only=True)

    class Meta:
        model = Video
        fields = "__all__"

    def create(self, validated_data):
        channel_uuid = validated_data.pop("channel_uuid")
        try:
            channel = Channel.objects.get(uuid=channel_uuid)
        except Channel.DoesNotExist:
            raise serializers.ValidationError("Channel not found")

        validated_data["channel"] = channel
        return super().create(validated_data)


class VideoListSerializer(serializers.ModelSerializer):
    channel_title = serializers.CharField(source="channel.title", read_only=True)
    is_watched = serializers.SerializerMethodField()
    watched_at = serializers.SerializerMethodField()
    notes = serializers.SerializerMethodField()
    channel_tags = serializers.SerializerMethodField()

    class Meta:
        model = Video
        fields = [
            "uuid",
            "video_id",
            "title",
            "description",
            "published_at",
            "duration",
            "view_count",
            "like_count",
            "comment_count",
            "thumbnail_url",
            "video_url",
            "is_watched",
            "watched_at",
            "notes",
            "channel_title",
            "channel_tags",
        ]

    def get_is_watched(self, obj):
        user_video = obj.user_videos.first()
        return user_video.is_watched if user_video else False

    def get_watched_at(self, obj):
        user_video = obj.user_videos.first()
        return user_video.watched_at if user_video else None

    def get_notes(self, obj):
        user_video = obj.user_videos.first()
        return user_video.notes if user_video else None

    def get_channel_tags(self, obj):
        tags = []
        user_subscription = obj.channel.user_subscriptions.first()
        if user_subscription:
            for channel_tag in user_subscription.channel_tags.all():
                tag = channel_tag.tag
                tags.append({
                    "id": str(tag.id),
                    "name": tag.name,
                    "color": tag.color
                })
        return tags
