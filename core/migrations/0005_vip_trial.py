# One explicitly activated, non-renewing VIP trial per account.
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0004_apprating"),
    ]

    operations = [
        migrations.CreateModel(
            name="VipTrial",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("started_at", models.DateTimeField()),
                ("ends_at", models.DateTimeField()),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="noor_vip_trial", to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
