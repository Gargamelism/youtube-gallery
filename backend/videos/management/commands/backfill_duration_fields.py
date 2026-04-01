from django.core.management.base import BaseCommand

from videos.models import Video
from videos.services.youtube import check_is_short_via_redirect


class Command(BaseCommand):
    help = "Backfill duration_seconds and is_short for existing videos"

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size",
            type=int,
            default=50,
            help="Number of videos to process per batch (default: 50)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-check videos that already have is_short set",
        )

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        queryset = Video.objects.all() if options["force"] else Video.objects.filter(is_short__isnull=True)
        total = queryset.count()

        if total == 0:
            self.stdout.write(self.style.SUCCESS("No videos to process."))
            return

        self.stdout.write(f"Processing {total} videos in batches of {batch_size}...")
        processed = 0

        for offset in range(0, total, batch_size):
            batch = list(queryset[offset : offset + batch_size])
            for video in batch:
                raw_seconds = video.get_duration_seconds()
                video.duration_seconds = raw_seconds if raw_seconds else None
                video.is_short = check_is_short_via_redirect(video.video_id)

            Video.objects.bulk_update(batch, ["duration_seconds", "is_short"])
            processed += len(batch)
            self.stdout.write(f"Processed {processed}/{total}...")

        self.stdout.write(self.style.SUCCESS(f"Done. Updated {total} videos."))
