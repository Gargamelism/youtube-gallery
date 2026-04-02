from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("videos", "0006_video_is_available"),
    ]

    operations = [
        migrations.AddField(
            model_name="video",
            name="duration_seconds",
            field=models.IntegerField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="video",
            name="is_short",
            field=models.BooleanField(blank=True, db_index=True, null=True),
        ),
    ]
