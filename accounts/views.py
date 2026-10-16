from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.shortcuts import redirect, render

from .forms import SignUpForm
from core.models import QuranReadingProgress


def signup(request):
    if request.user.is_authenticated:
        return redirect("dashboard")
    form = SignUpForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        user = form.save()
        login(request, user)
        messages.success(request, "Welcome to NOOR FOR LIVING. Your account is ready.")
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
    reading_progress = QuranReadingProgress.objects.filter(user=request.user).first()
    return render(request, "accounts/dashboard.html", {"reading_progress": reading_progress})
