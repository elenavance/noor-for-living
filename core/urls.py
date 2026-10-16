from django.urls import path

from . import views

urlpatterns = [
    path("prayer-times/", views.prayer_times, name="prayer_times"),
    path("qibla/", views.qibla, name="qibla"),
]
