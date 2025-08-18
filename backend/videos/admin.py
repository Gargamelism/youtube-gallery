from django.contrib import admin
from .models import Channel, Video


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display = ['title', 'channel_id', 'created_at']
    search_fields = ['title', 'channel_id', 'description']
    list_filter = ['created_at']
    readonly_fields = ['uuid', 'created_at', 'updated_at']


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ['title', 'channel', 'published_at', 'view_count']
    list_filter = ['published_at', 'channel']
    search_fields = ['title', 'description', 'video_id']
    readonly_fields = ['uuid', 'created_at', 'updated_at']

