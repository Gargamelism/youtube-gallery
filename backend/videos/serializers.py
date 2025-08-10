from rest_framework import serializers
from .models import Channel, Video


class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = '__all__'


class VideoSerializer(serializers.ModelSerializer):
    channel = ChannelSerializer(read_only=True)
    channel_uuid = serializers.UUIDField(write_only=True)

    class Meta:
        model = Video
        fields = '__all__'

    def create(self, validated_data):
        channel_uuid = validated_data.pop('channel_uuid')
        try:
            channel = Channel.objects.get(uuid=channel_uuid)
        except Channel.DoesNotExist:
            raise serializers.ValidationError("Channel not found")
        
        validated_data['channel'] = channel
        return super().create(validated_data)


class VideoListSerializer(serializers.ModelSerializer):
    channel_title = serializers.CharField(source='channel.title', read_only=True)
    
    class Meta:
        model = Video
        fields = [
            'uuid', 'video_id', 'title', 'description', 'published_at',
            'duration', 'view_count', 'like_count', 'comment_count',
            'thumbnail_path', 'video_url', 'is_watched', 'channel_title'
        ]

