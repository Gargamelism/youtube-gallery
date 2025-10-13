from django.db import migrations, models
import uuid


def create_default_frequencies(apps, schema_editor):
    """Create default update frequency records"""
    UpdateFrequency = apps.get_model("videos", "UpdateFrequency")

    frequencies = [
        {"name": "daily", "interval_hours": 24, "description": "Update daily"},
        {"name": "weekly", "interval_hours": 168, "description": "Update weekly"},
        {"name": "monthly", "interval_hours": 720, "description": "Update monthly"},
    ]

    for freq_data in frequencies:
        UpdateFrequency.objects.get_or_create(name=freq_data["name"], defaults=freq_data)


def reverse_create_default_frequencies(apps, schema_editor):
    """Remove default frequency records"""
    UpdateFrequency = apps.get_model("videos", "UpdateFrequency")
    UpdateFrequency.objects.filter(name__in=["daily", "weekly", "monthly"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("videos", "0003_remove_video_is_watched"),
    ]

    operations = [
        # Create UpdateFrequency model first
        migrations.CreateModel(
            name="UpdateFrequency",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=20, unique=True)),
                ("interval_hours", models.IntegerField()),
                ("description", models.CharField(blank=True, max_length=100, null=True)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "db_table": "update_frequencies",
                "verbose_name_plural": "update frequencies",
            },
            bases=(models.Model,),
        ),
        # Create default frequency records
        migrations.RunPython(create_default_frequencies, reverse_code=reverse_create_default_frequencies),
        migrations.AddField(
            model_name="channel",
            name="last_updated",
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name="channel",
            name="update_frequency",
            field=models.ForeignKey(to="videos.UpdateFrequency", on_delete=models.PROTECT, null=True, blank=True),
        ),
        migrations.AddField(
            model_name="channel",
            name="subscriber_count",
            field=models.IntegerField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name="channel",
            name="video_count",
            field=models.IntegerField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name="channel",
            name="view_count",
            field=models.BigIntegerField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name="channel",
            name="is_available",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="channel",
            name="is_deleted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="channel",
            name="failed_update_count",
            field=models.IntegerField(default=0),
        ),
        migrations.AddIndex(
            model_name="channel",
            index=models.Index(
                fields=["update_frequency", "is_available", "failed_update_count", "last_updated"],
                name="channel_update_query_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="channel",
            index=models.Index(fields=["is_deleted", "is_available"], name="channel_status_idx"),
        ),
    ]
