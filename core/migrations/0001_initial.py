import django.conf
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(django.conf.settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="QuranBookmark",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("surah_number", models.PositiveSmallIntegerField()),
                ("ayah_number", models.PositiveSmallIntegerField()),
                ("surah_name", models.CharField(max_length=120)),
                ("arabic_text", models.TextField()),
                ("translation_text", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="quran_bookmarks", to=django.conf.settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["surah_number", "ayah_number"]},
        ),
        migrations.AddConstraint(
            model_name="quranbookmark",
            constraint=models.UniqueConstraint(fields=("user", "surah_number", "ayah_number"), name="unique_user_quran_bookmark"),
        ),
    ]
