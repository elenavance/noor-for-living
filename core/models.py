from django.conf import settings
from django.db import models


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
