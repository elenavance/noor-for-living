from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render


def home(request):
    return render(request, "home.html")


def manifest(request):
    manifest_data = {
        "id": "/",
        "name": "NOOR FOR LIVING",
        "short_name": "Noor",
        "description": "Your Daily Islamic Companion",
        "start_url": "/",
        "scope": "/",
        "display": "standalone",
        "background_color": "#f8f5ed",
        "theme_color": "#123c32",
        "lang": "en",
        "icons": [],
    }
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
