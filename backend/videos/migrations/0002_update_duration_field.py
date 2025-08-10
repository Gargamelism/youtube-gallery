from django.db import migrations, models
import videos.fields


class Migration(migrations.Migration):

    dependencies = [
        ('videos', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='video',
            name='duration',
            field=videos.fields.YouTubeDurationField(blank=True, null=True),
        ),
    ]
