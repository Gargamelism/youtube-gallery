from django.core.management.base import BaseCommand
from videos.tasks import debug_celery_task


class Command(BaseCommand):
    help = "Verify Celery worker setup and connectivity for development debugging"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Verifying Celery worker setup..."))

        # Test synchronous execution
        try:
            result = debug_celery_task.delay()
            self.stdout.write(f"Task ID: {result.id}")
            self.stdout.write(f"Task Status: {result.status}")

            # Wait for result (with timeout)
            task_result = result.get(timeout=10)
            self.stdout.write(self.style.SUCCESS(f"Task Result: {task_result}"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Celery verification failed: {str(e)}"))
            self.stdout.write("Make sure Redis and Celery worker are running.")
            return

        self.stdout.write(self.style.SUCCESS("Celery worker setup verification completed successfully!"))
