from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .models import QuranBookmark


def home(request):
    return render(request, "home.html")


def manifest(request):
    manifest_data = {"id": "/", "name": "NOOR FOR LIVING", "short_name": "Noor", "description": "Your Daily Islamic Companion", "start_url": "/", "scope": "/", "display": "standalone", "background_color": "#f8f5ed", "theme_color": "#123c32", "lang": "en", "icons": []}
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


def quran_reader(request):
    bookmarks = set()
    if request.user.is_authenticated:
        bookmarks = set(request.user.quran_bookmarks.values_list("surah_number", "ayah_number"))
    return render(request, "quran/reader.html", {"saved_bookmarks": [f"{surah}:{ayah}" for surah, ayah in bookmarks]})


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
    if not 1 <= surah_number <= 114 or not 1 <= ayah_number <= 286:
        return JsonResponse({"ok": False, "error": "Verse reference is out of range."}, status=400)
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
