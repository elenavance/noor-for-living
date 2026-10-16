from django.conf import settings
from django.db import models


class AppRating(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="app_ratings")
    rating = models.PositiveSmallIntegerField()
    feedback = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.CheckConstraint(condition=models.Q(rating__gte=1, rating__lte=5), name="app_rating_between_1_and_5")]

    def __str__(self):
        return f"NOOR app rating: {self.rating}/5"


class QuranBookmark(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quran_bookmarks")
    surah_number = models.PositiveSmallIntegerField()
    ayah_number = models.PositiveSmallIntegerField()
    surah_name = models.CharField(max_length=120)
    arabic_text = models.TextField()
    translation_text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["surah_number", "ayah_number"]
        constraints = [models.UniqueConstraint(fields=["user", "surah_number", "ayah_number"], name="unique_user_quran_bookmark")]

    def __str__(self):
        return f"{self.user} — {self.surah_name} {self.ayah_number}"


class DailyWorshipLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="daily_worship_logs")
    date = models.DateField()
    fajr = models.BooleanField(default=False)
    dhuhr = models.BooleanField(default=False)
    asr = models.BooleanField(default=False)
    maghrib = models.BooleanField(default=False)
    isha = models.BooleanField(default=False)
    quran_reading = models.BooleanField(default=False)
    dhikr = models.BooleanField(default=False)
    gratitude = models.BooleanField(default=False)
    reflection = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(fields=["user", "date"], name="unique_user_worship_log_date")
        ]

    @property
    def completed_count(self):
        return sum(bool(getattr(self, field)) for field in (
            "fajr", "dhuhr", "asr", "maghrib", "isha",
            "quran_reading", "dhikr", "gratitude",
        ))

    @property
    def progress_percent(self):
        return round(self.completed_count / 8 * 100)

    def __str__(self):
        return f"{self.user} — {self.date}"


class QuranReadingProgress(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quran_reading_progress",
    )
    surah_number = models.PositiveSmallIntegerField()
    ayah_number = models.PositiveSmallIntegerField(default=1)
    surah_name = models.CharField(max_length=120, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user} — {self.surah_name or 'Surah ' + str(self.surah_number)} {self.ayah_number}"
