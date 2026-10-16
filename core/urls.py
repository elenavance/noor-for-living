from django.urls import path
from . import views

urlpatterns = [
    path("rate-app/", views.submit_app_rating, name="submit_app_rating"),
    path("prayer-times/", views.prayer_times, name="prayer_times"),
    path("qibla/", views.qibla, name="qibla"),
    path("islamic-calendar/", views.islamic_calendar, name="islamic_calendar"),
    path("daily-remembrance/", views.daily_remembrance, name="daily_remembrance"),
    path("my-journey/", views.worship_tracker, name="worship_tracker"),
    path("quran/", views.quran_reader, name="quran_reader"),
    path("ask-noor/", views.ask_noor_view, name="ask_noor"),
    path("quran/progress/", views.save_quran_progress, name="save_quran_progress"),
    path("my-bookmarks/", views.my_bookmarks, name="my_bookmarks"),
    path("my-bookmarks/<int:bookmark_id>/delete/", views.delete_bookmark, name="delete_bookmark"),
    path("quran/bookmark/toggle/", views.toggle_bookmark, name="toggle_bookmark"),
]
