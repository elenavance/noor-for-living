from datetime import timedelta

from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils import timezone
from django.utils.http import url_has_allowed_host_and_scheme

from .forms import SignUpForm
from core.models import DailyWorshipLog, QuranBookmark, QuranReadingProgress


def signup(request):
    if request.user.is_authenticated:
        return redirect("dashboard")
    if request.method == "GET":
        next_url = request.GET.get("next", "")
        if url_has_allowed_host_and_scheme(
            next_url,
            allowed_hosts={request.get_host()},
            require_https=request.is_secure(),
        ):
            request.session["signup_next"] = next_url
    form = SignUpForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        user = form.save()
        pending = request.session.get("pending_quran_bookmark")
        saved_verse = None
        if isinstance(pending, dict):
            try:
                surah_number = int(pending["surah_number"])
                ayah_number = int(pending["ayah_number"])
                surah_name = str(pending["surah_name"])[:120]
                arabic_text = str(pending["arabic_text"])
                translation_text = str(pending.get("translation_text", ""))
                valid_reference = (
                    1 <= surah_number <= 114
                    and 1 <= ayah_number <= 286
                    and bool(surah_name and arabic_text)
                    and len(arabic_text) <= 4000
                    and len(translation_text) <= 4000
                )
                if valid_reference:
                    QuranBookmark.objects.get_or_create(
                        user=user,
                        surah_number=surah_number,
                        ayah_number=ayah_number,
                        defaults={
                            "surah_name": surah_name,
                            "arabic_text": arabic_text,
                            "translation_text": translation_text,
                        },
                    )
                    saved_verse = (surah_number, ayah_number)
                    request.session.pop("pending_quran_bookmark", None)
            except (KeyError, TypeError, ValueError):
                request.session.pop("pending_quran_bookmark", None)
        login(request, user)
        messages.success(request, "Welcome to NOOR FOR LIVING. Your account is ready.")
        if saved_verse:
            return redirect(
                f"{reverse('quran_reader')}?surah={saved_verse[0]}#ayah-{saved_verse[1]}"
            )
        next_url = request.session.pop("signup_next", "")
        if next_url and url_has_allowed_host_and_scheme(
            next_url,
            allowed_hosts={request.get_host()},
            require_https=request.is_secure(),
        ):
            return redirect(next_url)
        return redirect("dashboard")
    return render(request, "accounts/signup.html", {"form": form})


def login_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")
    form = AuthenticationForm(request, data=request.POST or None)
    if request.method == "POST" and form.is_valid():
        login(request, form.get_user())
        messages.success(request, "Welcome back.")
        return redirect(request.GET.get("next") or "dashboard")
    return render(request, "accounts/login.html", {"form": form})


@login_required
def dashboard(request):
    today = timezone.localdate()
    reading_progress = QuranReadingProgress.objects.filter(user=request.user).first()
    today_log = DailyWorshipLog.objects.filter(user=request.user, date=today).first()
    week_start = today - timedelta(days=6)
    logs = {
        item.date: item
        for item in DailyWorshipLog.objects.filter(
            user=request.user, date__gte=week_start, date__lte=today
        )
    }
    week = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        log = logs.get(day)
        week.append({
            "date": day,
            "label": day.strftime("%a"),
            "completed": log.completed_count if log else 0,
            "percent": log.progress_percent if log else 0,
            "is_today": day == today,
        })
    completed_total = sum(day["completed"] for day in week)
    active_days = sum(1 for day in week if day["completed"] > 0)
    streak = 0
    check_day = today if logs.get(today) and logs[today].completed_count else today - timedelta(days=1)
    while check_day in logs and logs[check_day].completed_count > 0:
        streak += 1
        check_day -= timedelta(days=1)
    bookmarks = QuranBookmark.objects.filter(user=request.user)
    return render(request, "accounts/dashboard.html", {
        "reading_progress": reading_progress,
        "today_log": today_log,
        "today_percent": today_log.progress_percent if today_log else 0,
        "today_completed": today_log.completed_count if today_log else 0,
        "week": week,
        "week_percent": round(completed_total / 56 * 100),
        "active_days": active_days,
        "streak": streak,
        "bookmark_count": bookmarks.count(),
        "recent_bookmarks": bookmarks[:3],
    })
