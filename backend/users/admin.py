from __future__ import annotations

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, UserChannel, UserVideo


@admin.register(User)
class UserAdmin(BaseUserAdmin):  # type: ignore[type-arg]
    list_display = ["email", "username", "first_name", "last_name", "is_staff", "created_at"]
    list_filter = ["is_staff", "is_superuser", "is_active", "created_at"]
    search_fields = ["email", "username", "first_name", "last_name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    ordering = ["email"]

    fieldsets = BaseUserAdmin.fieldsets + (("Timestamps", {"fields": ("created_at", "updated_at")}),)  # type: ignore[assignment,operator]


@admin.register(UserChannel)
class UserChannelAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ["user", "channel", "is_active", "subscribed_at"]
    list_filter = ["is_active", "subscribed_at"]
    search_fields = ["user__email", "channel__title", "channel__channel_id"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(UserVideo)
class UserVideoAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ["user", "video", "is_watched", "watched_at"]
    list_filter = ["is_watched", "watched_at", "created_at"]
    search_fields = ["user__email", "video__title", "video__video_id"]
    readonly_fields = ["id", "created_at", "updated_at"]
    list_editable = ["is_watched"]
