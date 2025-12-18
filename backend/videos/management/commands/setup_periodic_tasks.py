from django.conf import settings
from django.core.management.base import BaseCommand
from django_celery_beat.models import PeriodicTask, CrontabSchedule


class Command(BaseCommand):
    help = "Setup periodic tasks for channel updating in the database"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Setting up periodic tasks..."))

        # Create crontab schedules with explicit timezone
        daily_schedule, created = CrontabSchedule.objects.get_or_create(
            minute=0,
            hour=2,
            day_of_week="*",
            day_of_month="*",
            month_of_year="*",
            timezone="UTC",
        )
        if created:
            self.stdout.write("Created daily schedule (2 AM UTC)")

        weekly_schedule, created = CrontabSchedule.objects.get_or_create(
            minute=0,
            hour=3,
            day_of_week="1",  # Monday
            day_of_month="*",
            month_of_year="*",
            timezone="UTC",
        )
        if created:
            self.stdout.write("Created weekly schedule (Monday 3 AM UTC)")

        hourly_schedule, created = CrontabSchedule.objects.get_or_create(
            minute=0,
            hour="*",
            day_of_week="*",
            day_of_month="*",
            month_of_year="*",
            timezone="UTC",
        )
        if created:
            self.stdout.write("Created hourly schedule")

        every_six_hours_schedule, created = CrontabSchedule.objects.get_or_create(
            minute=30,
            hour="*/6",
            day_of_week="*",
            day_of_month="*",
            month_of_year="*",
            timezone="UTC",
        )
        if created:
            self.stdout.write("Created every-6-hours schedule (at 30 minutes past the hour)")

        # Create periodic tasks
        tasks = [
            {
                "name": "update-channels-daily",
                "task": "videos.tasks.update_channels_batch",
                "schedule": daily_schedule,
                "queue": "bulk",
                "description": "Daily batch update of all channels",
            },
            {
                "name": "cleanup-orphaned-channels-weekly",
                "task": "videos.tasks.cleanup_orphaned_channels",
                "schedule": weekly_schedule,
                "queue": "maintenance",
                "description": "Weekly cleanup of channels with no subscribers",
            },
            {
                "name": "priority-channels-hourly",
                "task": "videos.tasks.update_priority_channels_async",
                "schedule": hourly_schedule,
                "queue": "priority",
                "description": "Hourly update of priority channels",
            },
            {
                "name": "retry-unavailable-channels",
                "task": "videos.tasks.retry_unavailable_channels",
                "schedule": every_six_hours_schedule,
                "queue": "maintenance",
                "description": "Retry channels marked as unavailable every 6 hours",
            },
        ]

        for task_config in tasks:
            task, created = PeriodicTask.objects.get_or_create(
                name=task_config["name"],
                defaults={
                    "task": task_config["task"],
                    "crontab": task_config["schedule"],
                    "queue": task_config["queue"],
                    "enabled": True,
                    "description": task_config["description"],
                },
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f'Created task: {task_config["name"]}'))
            else:
                # Update existing task if needed
                task.task = task_config["task"]
                task.crontab = task_config["schedule"]
                task.queue = task_config["queue"]
                task.description = task_config["description"]
                task.save()
                self.stdout.write(f'Updated existing task: {task_config["name"]}')

        self.stdout.write(self.style.SUCCESS("Periodic tasks setup completed!"))
