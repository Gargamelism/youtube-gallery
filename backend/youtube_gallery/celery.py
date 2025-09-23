import os
from celery import Celery
from celery.schedules import crontab
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "youtube_gallery.settings")

app = Celery("youtube_gallery")

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Configure Redis as broker with persistence
app.conf.update(
    # Broker settings
    broker_url=f"redis://:{settings.REDIS_PASSWORD}@{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
    result_backend=f"redis://:{settings.REDIS_PASSWORD}@{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
    broker_connection_retry_on_startup=True,
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=settings.TIME_ZONE,
    enable_utc=True,
    # Worker settings
    worker_concurrency=2,  # Reduced since each worker handles concurrency internally
    task_time_limit=600,  # 10 minute timeout for larger async batches
    task_soft_time_limit=540,  # 9 minute soft timeout
    # Task routing for priority queues
    task_routes={
        "videos.tasks.update_priority_channels_async": {"queue": "priority"},
        "videos.tasks.update_channels_batch_async": {"queue": "bulk"},
        "videos.tasks.cleanup_orphaned_channels": {"queue": "maintenance"},
    },
    # Retry settings
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    # Beat scheduler - using DatabaseScheduler for persistent scheduling
    beat_scheduler="django_celery_beat.schedulers:DatabaseScheduler",
)


@app.task(bind=True)
def debug_task(self):
    """Debug task for testing Celery worker connectivity"""
    print(f"Request: {self.request!r}")
    return "Celery is working!"
