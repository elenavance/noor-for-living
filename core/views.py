from django.conf import settings
from datetime import timedelta

from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST

from .models import AppRating, DailyWorshipLog, QuranBookmark, QuranReadingProgress
from .ai_learning import LearningServiceError, ask_noor
from django.core.cache import cache
import os


# Canonical Quran verse counts by surah, used to reject impossible references.
SURAH_AYAH_COUNTS = (
    7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
    111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30,
    73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
    60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52,
    52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17,
    19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4,
    7, 3, 6, 3, 5, 4, 5, 6,
)


def valid_quran_reference(surah_number, ayah_number):
    return (
        1 <= surah_number <= len(SURAH_AYAH_COUNTS)
        and 1 <= ayah_number <= SURAH_AYAH_COUNTS[surah_number - 1]
    )


def home(request):
    return render(request, "home.html")


@require_POST
def submit_app_rating(request):
    try:
        rating = int(request.POST.get("rating", ""))
    except (TypeError, ValueError):
        return redirect("/?rated=0#rate-noor")
    if rating < 1 or rating > 5:
        return redirect("/?rated=0#rate-noor")
    feedback = request.POST.get("feedback", "").strip()[:1000]
    AppRating.objects.create(user=request.user if request.user.is_authenticated else None, rating=rating, feedback=feedback)
    return redirect("/?rated=1#rate-noor")


def manifest(request):
    manifest_data = {"id": "/", "name": "NOOR FOR LIVING", "short_name": "Noor", "description": "Your Daily Islamic Companion", "start_url": "/", "scope": "/", "display": "standalone", "background_color": "#f8f5ed", "theme_color": "#123c32", "lang": "en", "icons": [{"src": "/static/images/noor-app-icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any"}]}
    return JsonResponse(manifest_data, content_type="application/manifest+json")


def service_worker(request):
    worker_path = settings.BASE_DIR / "static" / "js" / "service-worker.js"
    if not worker_path.exists():
        return HttpResponse("// Service worker is not installed yet.", content_type="application/javascript")
    response = HttpResponse(worker_path.read_text(encoding="utf-8"), content_type="application/javascript")
    response["Service-Worker-Allowed"] = "/"
    response["Cache-Control"] = "no-cache"
    return response


def prayer_times(request):
    return render(request, "worship/prayer_times.html")


def qibla(request):
    return render(request, "worship/qibla.html")


def islamic_calendar(request):
    return render(request, "calendar.html")



def daily_remembrance(request):
    remembrances = [
        {"id":"rabbana-atina","category":"Guidance","kind":"dua","title":"Good in this life and the next","arabic":"رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ","transliteration":"Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina adhaban-nar.","translation":"Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.","source":"Quran 2:201","note":"A comprehensive supplication asking for good in both lives."},
        {"id":"rabbi-zidni","category":"Learning","kind":"dua","title":"Ask for beneficial knowledge","arabic":"رَبِّ زِدْنِي عِلْمًا","transliteration":"Rabbi zidni ilma.","translation":"My Lord, increase me in knowledge.","source":"Quran 20:114","note":"A short supplication when seeking knowledge."},
        {"id":"rabbi-shrah","category":"Guidance","kind":"dua","title":"Ease and clarity","arabic":"رَبِّ اشْرَحْ لِي صَدْرِي ۝ وَيَسِّرْ لِي أَمْرِي ۝ وَاحْلُلْ عُقْدَةً مِنْ لِسَانِي ۝ يَفْقَهُوا قَوْلِي","transliteration":"Rabbishrah li sadri, wa yassir li amri, wahlul uqdatan min lisani, yafqahu qawli.","translation":"My Lord, expand for me my chest, ease for me my task, and untie the knot from my tongue so that they may understand my speech.","source":"Quran 20:25–28","note":"The supplication of Prophet Musa when preparing to speak."},
        {"id":"la-tuzigh","category":"Steadfastness","kind":"dua","title":"Keep the heart steadfast","arabic":"رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً إِنَّكَ أَنْتَ الْوَهَّابُ","transliteration":"Rabbana la tuzigh qulubana bada idh hadaytana wa hab lana min ladunka rahmah, innaka antal-Wahhab.","translation":"Our Lord, let not our hearts deviate after You have guided us and grant us from Yourself mercy. Indeed, You are the Bestower.","source":"Quran 3:8","note":"A supplication for guidance and steadfastness."},
        {"id":"parents","category":"Family","kind":"dua","title":"Pray for your parents and the believers","arabic":"رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ","transliteration":"Rabbanaghfir li wa liwalidayya wa lil-mu'minina yawma yaqumul-hisab.","translation":"Our Lord, forgive me, my parents, and the believers on the Day the account is established.","source":"Quran 14:41","note":"A prayer for forgiveness for oneself, one's parents, and the believers."},
        {"id":"hasbunallah","category":"Trust","kind":"dua","title":"Place your trust in Allah","arabic":"حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ","transliteration":"Hasbunallahu wa ni'mal-wakil.","translation":"Sufficient for us is Allah, and He is the best Disposer of affairs.","source":"Quran 3:173","note":"A declaration of reliance upon Allah."},
        {"id":"subhanallah","category":"Remembrance","kind":"dhikr","title":"Glory and praise","arabic":"سُبْحَانَ اللَّهِ وَبِحَمْدِهِ","transliteration":"SubhanAllahi wa bihamdihi.","translation":"Glory be to Allah and praise be to Him.","source":"Sahih al-Bukhari 6405","note":"A well-known phrase of remembrance."},
        {"id":"istighfar","category":"Forgiveness","kind":"dhikr","title":"Seek forgiveness","arabic":"أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ","transliteration":"Astaghfirullaha wa atubu ilayh.","translation":"I seek forgiveness from Allah and repent to Him.","source":"Sahih al-Bukhari 6307","note":"A phrase of seeking forgiveness and repentance."},
        {"id":"hawqala","category":"Trust","kind":"dhikr","title":"Strength comes through Allah","arabic":"لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ","transliteration":"La hawla wa la quwwata illa billah.","translation":"There is no power and no strength except through Allah.","source":"Sahih al-Bukhari 6384","note":"A phrase acknowledging dependence upon Allah."},
    ]
    categories = sorted({item["category"] for item in remembrances})
    return render(request, "worship/daily_remembrance.html", {"remembrances": remembrances, "categories": categories})



@login_required
def worship_tracker(request):
    today = timezone.localdate()
    log, _ = DailyWorshipLog.objects.get_or_create(user=request.user, date=today)
    if request.method == "POST":
        fields = ("fajr", "dhuhr", "asr", "maghrib", "isha", "quran_reading", "dhikr", "gratitude")
        for field in fields:
            setattr(log, field, field in request.POST)
        log.reflection = request.POST.get("reflection", "").strip()[:500]
        log.save()
        return redirect("worship_tracker")

    week_start = today - timedelta(days=6)
    saved_logs = {
        item.date: item
        for item in DailyWorshipLog.objects.filter(user=request.user, date__gte=week_start, date__lte=today)
    }
    week = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        day_log = saved_logs.get(day)
        week.append({
            "date": day,
            "label": day.strftime("%a"),
            "completed": day_log.completed_count if day_log else 0,
            "percent": day_log.progress_percent if day_log else 0,
            "is_today": day == today,
        })
    completed_total = sum(day["completed"] for day in week)
    week_percent = round(completed_total / 56 * 100)
    streak = 0
    check_day = today
    if not saved_logs.get(today) or saved_logs[today].completed_count == 0:
        check_day = today - timedelta(days=1)
    while check_day in saved_logs and saved_logs[check_day].completed_count > 0:
        streak += 1
        check_day -= timedelta(days=1)

    return render(request, "worship/tracker.html", {
        "log": log,
        "today": today,
        "week": week,
        "week_percent": week_percent,
        "streak": streak,
        "completed_total": completed_total,
        "activity_fields": (
            ("fajr", "Fajr", "Dawn prayer"),
            ("dhuhr", "Dhuhr", "Midday prayer"),
            ("asr", "Asr", "Afternoon prayer"),
            ("maghrib", "Maghrib", "Sunset prayer"),
            ("isha", "Isha", "Night prayer"),
            ("quran_reading", "Quran reading", "Read or reflect on the Quran"),
            ("dhikr", "Dhikr", "Make time for remembrance"),
            ("gratitude", "Gratitude", "Name something you are grateful for"),
        ),
    })



@login_required
def ask_noor_view(request):
    context = {"assistant_enabled": bool(os.getenv("OPENAI_API_KEY", "").strip())}
    if request.method == "POST":
        question = request.POST.get("question", "").strip()
        context["question"] = question[:1200]
        if not question:
            context["error"] = "Please enter a question first."
        elif len(question) > 1200:
            context["error"] = "Please keep your question under 1,200 characters."
        else:
            # Limit API spending to five questions per account per minute.
            cache_key = f"ask-noor-rate:{request.user.pk}"
            if not cache.add(cache_key, 1, timeout=60):
                try:
                    count = cache.incr(cache_key)
                except ValueError:
                    cache.set(cache_key, 2, timeout=60)
                    count = 2
            else:
                count = 1
            if count > 5:
                context["error"] = "You've asked several questions recently. Please wait a minute before asking again."
            else:
                try:
                    context["result"] = ask_noor(question)
                except LearningServiceError as exc:
                    context["error"] = str(exc)
    return render(request, "learning/ask_noor.html", context)



@require_POST
def prepare_guest_bookmark(request):
    """Hold one intentionally selected public verse while the reader signs up."""
    try:
        surah_number = int(request.POST.get("surah_number", ""))
        ayah_number = int(request.POST.get("ayah_number", ""))
    except (TypeError, ValueError):
        return JsonResponse({"ok": False, "error": "Invalid verse reference."}, status=400)

    if not valid_quran_reference(surah_number, ayah_number):
        return JsonResponse({"ok": False, "error": "That verse does not exist in the selected surah."}, status=400)

    surah_name = request.POST.get("surah_name", "").strip()[:120]
    arabic_text = request.POST.get("arabic_text", "").strip()
    translation_text = request.POST.get("translation_text", "").strip()
    if not surah_name or not arabic_text or len(arabic_text) > 4000 or len(translation_text) > 4000:
        return JsonResponse({"ok": False, "error": "Verse details are missing or too long. Please reload the reader."}, status=400)

    request.session["pending_quran_bookmark"] = {
        "surah_number": surah_number,
        "ayah_number": ayah_number,
        "surah_name": surah_name,
        "arabic_text": arabic_text,
        "translation_text": translation_text,
    }
    request.session.set_expiry(3600)
    return JsonResponse({"ok": True, "signup_url": reverse("signup")})


def quran_reader(request):
    bookmarks = set()
    reading_progress = None
    if request.user.is_authenticated:
        bookmarks = set(request.user.quran_bookmarks.values_list("surah_number", "ayah_number"))
        reading_progress = QuranReadingProgress.objects.filter(user=request.user).first()
    return render(request, "quran/reader.html", {
        "saved_bookmarks": [f"{surah}:{ayah}" for surah, ayah in bookmarks],
        "reading_progress": reading_progress,
    })


@login_required
@require_POST
def save_quran_progress(request):
    try:
        surah_number = int(request.POST.get("surah_number", ""))
        ayah_number = int(request.POST.get("ayah_number", ""))
    except (TypeError, ValueError):
        return JsonResponse({"ok": False, "error": "Invalid verse reference."}, status=400)

    if not valid_quran_reference(surah_number, ayah_number):
        return JsonResponse({"ok": False, "error": "That verse does not exist in the selected surah."}, status=400)

    surah_name = request.POST.get("surah_name", "").strip()[:120]
    progress, _ = QuranReadingProgress.objects.get_or_create(
        user=request.user,
        defaults={
            "surah_number": surah_number,
            "ayah_number": ayah_number,
            "surah_name": surah_name,
        },
    )
    progress.surah_number = surah_number
    progress.ayah_number = ayah_number
    progress.surah_name = surah_name
    progress.save(update_fields=["surah_number", "ayah_number", "surah_name", "updated_at"])

    # Reading the Quran also completes today's Quran-reading intention in the tracker.
    daily_log, _ = DailyWorshipLog.objects.get_or_create(
        user=request.user,
        date=timezone.localdate(),
    )
    if not daily_log.quran_reading:
        daily_log.quran_reading = True
        daily_log.save(update_fields=["quran_reading", "updated_at"])

    return JsonResponse({
        "ok": True,
        "surah_number": progress.surah_number,
        "ayah_number": progress.ayah_number,
        "surah_name": progress.surah_name,
    })


@login_required
def my_bookmarks(request):
    return render(request, "quran/bookmarks.html", {"bookmarks": request.user.quran_bookmarks.all()})


@login_required
@require_POST
def toggle_bookmark(request):
    try:
        surah_number = int(request.POST.get("surah_number", ""))
        ayah_number = int(request.POST.get("ayah_number", ""))
    except (TypeError, ValueError):
        return JsonResponse({"ok": False, "error": "Invalid verse reference."}, status=400)
    if not valid_quran_reference(surah_number, ayah_number):
        return JsonResponse({"ok": False, "error": "That verse does not exist in the selected surah."}, status=400)
    surah_name = request.POST.get("surah_name", "").strip()[:120]
    arabic_text = request.POST.get("arabic_text", "").strip()
    translation_text = request.POST.get("translation_text", "").strip()
    if not surah_name or not arabic_text:
        return JsonResponse({"ok": False, "error": "Verse text is missing. Please reload the reader."}, status=400)
    bookmark, created = QuranBookmark.objects.get_or_create(
        user=request.user, surah_number=surah_number, ayah_number=ayah_number,
        defaults={"surah_name": surah_name, "arabic_text": arabic_text, "translation_text": translation_text},
    )
    if not created:
        bookmark.delete()
        return JsonResponse({"ok": True, "saved": False})
    return JsonResponse({"ok": True, "saved": True})


@login_required
@require_POST
def delete_bookmark(request, bookmark_id):
    bookmark = get_object_or_404(QuranBookmark, id=bookmark_id, user=request.user)
    bookmark.delete()
    return redirect("my_bookmarks")
