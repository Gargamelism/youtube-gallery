import os
import sqlite3

from dateutil import parser
from django.core.management.base import BaseCommand
from videos.models import Channel, Video


class Command(BaseCommand):
    help = "Migrate data from existing SQLite database to PostgreSQL"

    def add_arguments(self, parser):
        parser.add_argument(
            "--sqlite-db",
            type=str,
            default="../scripts/youtube_gallery.db",
            help="Path to SQLite database file",
        )

    def handle(self, *args, **options):
        sqlite_db_path = options["sqlite_db"]

        if not os.path.exists(sqlite_db_path):
            self.stdout.write(self.style.ERROR(f"SQLite database not found: {sqlite_db_path}"))
            return

        self.stdout.write("Starting SQLite to PostgreSQL migration...")

        conn = sqlite3.connect(sqlite_db_path)
        cursor = conn.cursor()

        self.migrate_channels(cursor)

        self.migrate_videos(cursor)

        conn.close()
        self.stdout.write(self.style.SUCCESS("Migration completed successfully!"))

    def migrate_channels(self, cursor):
        self.stdout.write("Migrating channels...")

        cursor.execute("SELECT * FROM channels")
        channels_data = cursor.fetchall()

        for row in channels_data:
            # Assuming columns: uuid, channel_id, title, description, url, created_at, updated_at
            channel, created = Channel.objects.get_or_create(
                channel_id=row[1],  # channel_id
                defaults={
                    "title": row[2] or "",  # title
                    "description": row[3] or "",  # description
                    "url": row[4] or "",  # url
                },
            )

            if created:
                self.stdout.write(f"Created channel: {channel.title}")
            else:
                self.stdout.write(f"Channel already exists: {channel.title}")

    def migrate_videos(self, cursor):
        self.stdout.write("Migrating videos...")

        cursor.execute("SELECT * FROM videos")
        videos_data = cursor.fetchall()

        for row in videos_data:
            # Assuming columns: uuid, video_id, channel_uuid, title, description, published_at,
            # duration, view_count, like_count, comment_count, category_id, default_language,
            # upload_status, tags, thumbnail_url, video_url, is_watched, created_at, updated_at

            # Get channel by UUID
            try:
                channel = Channel.objects.get(uuid=row[2])  # channel_uuid
            except Channel.DoesNotExist:
                self.stdout.write(f"Channel not found for video {row[1]}, skipping...")
                continue

            # Parse published date
            published_at = None
            if row[5]:  # published_at
                try:
                    published_at = parser.parse(row[5])
                except (ValueError, TypeError, AttributeError):
                    pass

            video, created = Video.objects.get_or_create(
                video_id=row[1],  # video_id
                defaults={
                    "channel": channel,
                    "title": row[3] or "",  # title
                    "description": row[4] or "",  # description
                    "published_at": published_at,
                    "duration": row[6] or "",  # duration
                    "view_count": row[7],  # view_count
                    "like_count": row[8],  # like_count
                    "comment_count": row[9],  # comment_count
                    "category_id": row[10] or "",  # category_id
                    "default_language": row[11] or "",  # default_language
                    "upload_status": row[13] or "",  # upload_status
                    "tags": row[14] or "",  # tags
                    "thumbnail_url": row[15] or "",  # thumbnail_url
                    "video_url": row[16] or "",  # video_url
                    "is_watched": bool(row[17]),  # is_watched
                },
            )

            if created:
                self.stdout.write(f"Created video: {video.title}")
            else:
                self.stdout.write(f"Video already exists: {video.title}")
