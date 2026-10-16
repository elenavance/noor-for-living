import django.conf
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0001_initial"),
        migrations.swappable_dependency(django.conf.settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="DailyWorshipLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField()),
                ("fajr", models.BooleanField(default=False)),
                ("dhuhr", models.BooleanField(default=False)),
                ("asr", models.BooleanField(default=False)),
                ("maghrib", models.BooleanField(default=False)),
                ("isha", models.BooleanField(default=False)),
                ("quran_reading", models.BooleanField(default=False)),
                ("dhikr", models.BooleanField(default=False)),
                ("gratitude", models.BooleanField(default=False)),
                ("reflection", models.CharField(blank=True, max_length=500)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="daily_worship_logs", to=django.conf.settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-date"]},
        ),
        migrations.AddConstraint(
            model_name="dailyworshiplog",
            constraint=models.UniqueConstraint(fields=("user", "date"), name="unique_user_worship_log_date"),
        ),
    ]
