from django.contrib import admin
from .models import QuranBookmark


@admin.register(QuranBookmark)
class QuranBookmarkAdmin(admin.ModelAdmin):
    list_display = ("user", "surah_name", "surah_number", "ayah_number", "created_at")
    list_filter = ("surah_number", "created_at")
    search_fields = ("user__username", "user__email", "surah_name", "translation_text")
    readonly_fields = ("created_at",)
