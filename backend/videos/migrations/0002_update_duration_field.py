import videos.fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("videos", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="video",
            name="duration",
            field=videos.fields.YouTubeDurationField(blank=True, null=True),
        ),
    ]
