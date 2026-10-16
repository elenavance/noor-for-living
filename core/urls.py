from django.urls import path
from . import views

urlpatterns = [
    path("prayer-times/", views.prayer_times, name="prayer_times"),
    path("qibla/", views.qibla, name="qibla"),
    path("quran/", views.quran_reader, name="quran_reader"),
    path("my-bookmarks/", views.my_bookmarks, name="my_bookmarks"),
    path("my-bookmarks/<int:bookmark_id>/delete/", views.delete_bookmark, name="delete_bookmark"),
    path("quran/bookmark/toggle/", views.toggle_bookmark, name="toggle_bookmark"),
]
