# Generated migration for performance optimization indexes

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0002_channeltag_userchanneltag"),
    ]

    operations = [
        # Index for UserChannel queries - most common filtering pattern
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_user_channels_user_active ON user_channels (user_id, is_active);",
            reverse_sql="DROP INDEX IF EXISTS idx_user_channels_user_active;",
        ),
        # Index for UserVideo watch status queries
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_user_videos_user_watched ON user_videos (user_id, is_watched);",
            reverse_sql="DROP INDEX IF EXISTS idx_user_videos_user_watched;",
        ),
        # Index for UserChannelTag queries - tag filtering
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_user_channel_tags_user_channel ON user_channel_tags (user_channel_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_user_channel_tags_user_channel;",
        ),
        # Index for ChannelTag user queries
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_channel_tags_user_name ON channel_tags (user_id, name);",
            reverse_sql="DROP INDEX IF EXISTS idx_channel_tags_user_name;",
        ),
        # Composite index for tag filtering optimization
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_user_channel_tags_tag_user ON user_channel_tags (tag_id) INCLUDE (user_channel_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_user_channel_tags_tag_user;",
        ),
        # Index for timestamp-based queries
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_user_videos_watched_at ON user_videos (watched_at) WHERE watched_at IS NOT NULL;",
            reverse_sql="DROP INDEX IF EXISTS idx_user_videos_watched_at;",
        ),
    ]
