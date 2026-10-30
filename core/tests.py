from django.contrib.auth.models import User
from django.test import TestCase
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from unittest.mock import patch
from core.models import AppRating, DailyWorshipLog, QuranBookmark, QuranReadingProgress


class PublicPageTests(TestCase):
    def test_homepage_loads_in_english(self):
        response = self.client.get(reverse("home"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "NOOR FOR LIVING")
        self.assertContains(response, 'lang="en"')
        self.assertNotContains(response, 'id="language"')

    def test_homepage_contains_app_rating_form(self):
        response = self.client.get(reverse("home"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "How would you rate")
        self.assertContains(response, 'name="rating"')

    def test_submit_app_rating_saves_valid_rating(self):
        response = self.client.post(reverse("submit_app_rating"), {"rating": "4", "feedback": "Looks lovely."})
        self.assertRedirects(response, "/?rated=1#rate-noor")
        rating = AppRating.objects.get()
        self.assertEqual(rating.rating, 4)
        self.assertEqual(rating.feedback, "Looks lovely.")
        self.assertIsNone(rating.user)

    def test_submit_app_rating_rejects_invalid_rating(self):
        response = self.client.post(reverse("submit_app_rating"), {"rating": "9"})
        self.assertRedirects(response, "/?rated=0#rate-noor")
        self.assertEqual(AppRating.objects.count(), 0)

    def test_manifest_loads_in_english(self):
        response = self.client.get(reverse("manifest"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "NOOR FOR LIVING")
        self.assertEqual(response.json()["lang"], "en")
        self.assertEqual(response.json()["icons"][0]["src"], "/static/images/noor-app-icon.svg")

    def test_service_worker_is_javascript(self):
        response = self.client.get(reverse("service_worker"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("javascript", response["Content-Type"])

    def test_prayer_times_page_loads_without_requesting_location(self):
        response = self.client.get(reverse("prayer_times"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Prayer times")
        self.assertContains(response, "Your location is only requested when you tap the button.")

    def test_qibla_page_loads_without_requesting_location(self):
        response = self.client.get(reverse("qibla"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Find your")
        self.assertContains(response, "Location is requested only when you tap the button.")

    def test_daily_remembrance_page_loads_with_references(self):
        response = self.client.get(reverse("daily_remembrance"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Words for")
        self.assertContains(response, "Quran 2:201")
        self.assertContains(response, "Sahih al-Bukhari 6405")
        self.assertContains(response, "Search the collection")

    def test_quran_reader_page_loads(self):
        response = self.client.get(reverse("quran_reader"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Words to")
        self.assertContains(response, "notranslate")

    def test_quran_reader_resumes_saved_position_for_signed_in_user(self):
        user = User.objects.create_user(username="quran_reader_member", password="SecureTestPass_482!")
        QuranReadingProgress.objects.create(user=user, surah_number=2, ayah_number=17, surah_name="Al-Baqarah")
        self.client.force_login(user)
        response = self.client.get(reverse("quran_reader"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["reading_progress"].surah_number, 2)
        self.assertContains(response, "initialProgress")
        self.assertEqual(response.context["reading_progress"].surah_name, "Al-Baqarah")


class AccountFlowTests(TestCase):
    def test_signup_creates_user_and_logs_them_in(self):
        response = self.client.post(reverse("signup"), {"first_name":"Amina","username":"amina_test","email":"amina@example.com","password1":"SecureTestPass_482!","password2":"SecureTestPass_482!"})
        self.assertRedirects(response, reverse("dashboard"))
        self.assertTrue(User.objects.filter(username="amina_test", first_name="Amina").exists())
        self.assertIn("_auth_user_id", self.client.session)

    def test_dashboard_requires_login(self):
        response = self.client.get(reverse("dashboard"))
        self.assertRedirects(response, f"{reverse('login')}?next={reverse('dashboard')}")

    def test_dashboard_shows_personal_progress_and_recent_bookmarks(self):
        user = User.objects.create_user(username="dashboard_member", first_name="Amina", password="SecureTestPass_482!")
        today = timezone.localdate()
        DailyWorshipLog.objects.create(user=user, date=today, fajr=True, dhikr=True)
        QuranBookmark.objects.create(
            user=user, surah_number=1, ayah_number=1, surah_name="Al-Fatihah",
            arabic_text="بِسْمِ اللَّهِ", translation_text="In the name of Allah."
        )
        QuranReadingProgress.objects.create(user=user, surah_number=1, ayah_number=1, surah_name="Al-Fatihah")
        self.client.force_login(user)
        response = self.client.get(reverse("dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["today_completed"], 2)
        self.assertEqual(response.context["today_percent"], 25)
        self.assertEqual(response.context["active_days"], 1)
        self.assertEqual(response.context["bookmark_count"], 1)
        self.assertEqual(len(response.context["recent_bookmarks"]), 1)
        self.assertContains(response, "Welcome,")
        self.assertContains(response, "Your last seven days")
        self.assertContains(response, "Recently saved verses")

    def test_login_with_valid_credentials(self):
        User.objects.create_user(username="member", password="SecureTestPass_482!")
        response = self.client.post(reverse("login"), {"username":"member","password":"SecureTestPass_482!"})
        self.assertRedirects(response, reverse("dashboard"))

    def test_worship_tracker_requires_login(self):
        response = self.client.get(reverse("worship_tracker"))
        self.assertRedirects(response, f"{reverse('login')}?next={reverse('worship_tracker')}")

    def test_worship_tracker_saves_private_daily_progress(self):
        user = User.objects.create_user(username="tracker_member", password="SecureTestPass_482!")
        self.client.force_login(user)
        response = self.client.get(reverse("worship_tracker"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Your daily intentions")
        response = self.client.post(reverse("worship_tracker"), {
            "fajr": "on", "quran_reading": "on", "reflection": "Grateful for today."
        })
        self.assertRedirects(response, reverse("worship_tracker"))
        log = DailyWorshipLog.objects.get(user=user)
        self.assertTrue(log.fajr)
        self.assertTrue(log.quran_reading)
        self.assertFalse(log.isha)
        self.assertEqual(log.reflection, "Grateful for today.")
        self.assertEqual(log.completed_count, 2)

    def test_worship_logs_are_separate_per_user(self):
        first = User.objects.create_user(username="first_tracker", password="SecureTestPass_482!")
        second = User.objects.create_user(username="second_tracker", password="SecureTestPass_482!")
        DailyWorshipLog.objects.create(user=first, date=timezone.localdate(), fajr=True)
        self.client.force_login(second)
        response = self.client.get(reverse("worship_tracker"))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.context["log"].fajr)

    def test_bookmarks_page_requires_login(self):
        response = self.client.get(reverse("my_bookmarks"))
        self.assertRedirects(response, f"{reverse('login')}?next={reverse('my_bookmarks')}")

    def test_bookmark_saved_to_signed_in_user(self):
        user = User.objects.create_user(username="member", password="SecureTestPass_482!")
        self.client.force_login(user)
        response = self.client.post(reverse("toggle_bookmark"), {"surah_number":"1","ayah_number":"1","surah_name":"Al-Fatihah","arabic_text":"بِسْمِ اللَّهِ","translation_text":"In the name of Allah."})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["saved"])
        self.assertTrue(QuranBookmark.objects.filter(user=user, surah_number=1, ayah_number=1).exists())

    def test_user_cannot_delete_another_users_bookmark(self):
        owner = User.objects.create_user(username="owner", password="SecureTestPass_482!")
        other = User.objects.create_user(username="other", password="SecureTestPass_482!")
        bookmark = QuranBookmark.objects.create(user=owner, surah_number=1, ayah_number=1, surah_name="Al-Fatihah", arabic_text="text")
        self.client.force_login(other)
        response = self.client.post(reverse("delete_bookmark", args=[bookmark.id]))
        self.assertEqual(response.status_code, 404)
        self.assertTrue(QuranBookmark.objects.filter(id=bookmark.id).exists())

    def test_quran_progress_requires_login(self):
        response = self.client.post(reverse("save_quran_progress"), {
            "surah_number": "2", "ayah_number": "17", "surah_name": "Al-Baqarah"
        })
        self.assertRedirects(response, f"{reverse('login')}?next={reverse('save_quran_progress')}")

    def test_quran_progress_is_saved_per_user(self):
        user = User.objects.create_user(username="quran_progress_member", password="SecureTestPass_482!")
        self.client.force_login(user)
        response = self.client.post(reverse("save_quran_progress"), {
            "surah_number": "2", "ayah_number": "17", "surah_name": "Al-Baqarah"
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["ok"], True)
        progress = QuranReadingProgress.objects.get(user=user)
        self.assertEqual(progress.surah_number, 2)
        self.assertEqual(progress.ayah_number, 17)
        self.assertEqual(progress.surah_name, "Al-Baqarah")
        today_log = DailyWorshipLog.objects.get(user=user, date=timezone.localdate())
        self.assertTrue(today_log.quran_reading)

    def test_quran_progress_rejects_invalid_reference(self):
        user = User.objects.create_user(username="quran_progress_invalid", password="SecureTestPass_482!")
        self.client.force_login(user)
        response = self.client.post(reverse("save_quran_progress"), {
            "surah_number": "115", "ayah_number": "1", "surah_name": "Invalid"
        })
        self.assertEqual(response.status_code, 400)
        self.assertFalse(QuranReadingProgress.objects.filter(user=user).exists())

    def test_quran_progress_rejects_ayah_beyond_selected_surah(self):
        user = User.objects.create_user(username="quran_progress_bad_ayah", password="SecureTestPass_482!")
        self.client.force_login(user)
        response = self.client.post(reverse("save_quran_progress"), {
            "surah_number": "1", "ayah_number": "8", "surah_name": "Al-Fatihah"
        })
        self.assertEqual(response.status_code, 400)
        self.assertFalse(QuranReadingProgress.objects.filter(user=user).exists())

    def test_bookmark_rejects_ayah_beyond_selected_surah(self):
        user = User.objects.create_user(username="bookmark_bad_ayah", password="SecureTestPass_482!")
        self.client.force_login(user)
        response = self.client.post(reverse("toggle_bookmark"), {
            "surah_number": "1", "ayah_number": "8", "surah_name": "Al-Fatihah",
            "arabic_text": "Invalid", "translation_text": "Invalid"
        })
        self.assertEqual(response.status_code, 400)
        self.assertFalse(QuranBookmark.objects.filter(user=user).exists())



class AskNoorTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="ask_noor_member",
            password="SecureTestPass_482!",
        )
        self.client.force_login(self.user)
        cache.delete(f"ask-noor-rate:{self.user.pk}")

    def test_ask_noor_page_requires_login(self):
        self.client.logout()
        response = self.client.get(reverse("ask_noor"))
        self.assertRedirects(response, f"{reverse('login')}?next={reverse('ask_noor')}")

    def test_ask_noor_page_explains_safeguards(self):
        response = self.client.get(reverse("ask_noor"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Knowledge with humility")
        self.assertContains(response, "not as a replacement for qualified scholarly guidance")
        self.assertContains(response, "external AI service")
        self.assertContains(response, "does not save questions or answers")

    def test_ask_noor_handles_missing_api_configuration(self):
        with patch.dict("os.environ", {"OPENAI_API_KEY": ""}):
            response = self.client.post(reverse("ask_noor"), {
                "question": "What does the Quran teach about patience?"
            })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "not connected yet")
        self.assertContains(response, "AI answers are not enabled yet")
        self.assertContains(response, "disabled title=\"Ask Noor requires administrator setup\"")
        self.assertNotContains(response, "Your answer")

    def test_ask_noor_rejects_oversized_questions(self):
        response = self.client.post(reverse("ask_noor"), {"question": "x" * 1201})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "under 1,200 characters")

    @patch("core.views.ask_noor", return_value={"answer": "General learning answer.", "citations": []})
    def test_ask_noor_limits_questions_per_account(self, mock_ask):
        for _ in range(5):
            response = self.client.post(reverse("ask_noor"), {"question": "A general learning question"})
            self.assertEqual(response.status_code, 200)
            self.assertContains(response, "Your answer")
        response = self.client.post(reverse("ask_noor"), {"question": "One more question"})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "wait a minute")
        self.assertEqual(mock_ask.call_count, 5)



class AskNoorServiceTests(TestCase):
    @patch.dict("os.environ", {"OPENAI_API_KEY": "test-key", "OPENAI_MODEL": "test-model"})
    @patch("core.ai_learning.urlopen")
    def test_service_returns_answer_and_only_allowlisted_https_citations(self, mock_urlopen):
        import io
        import json
        payload = {
            "output": [{
                "type": "message",
                "content": [{
                    "type": "output_text",
                    "text": "A careful educational answer.",
                    "annotations": [
                        {"type": "url_citation", "url": "https://quran.com/2/286", "title": "Quran 2:286"},
                        {"type": "url_citation", "url": "https://example.com/fake-source", "title": "Unverified"},
                        {"type": "url_citation", "url": "http://sunnah.com/example", "title": "Insecure URL"},
                        {"type": "url_citation", "url": "https://notquran.com/2/286", "title": "Lookalike domain"},
                    ],
                }],
            }],
        }
        mock_urlopen.return_value = io.BytesIO(json.dumps(payload).encode("utf-8"))
        from core.ai_learning import ask_noor
        result = ask_noor("What does the Quran say about patience?")
        self.assertEqual(result["answer"], "A careful educational answer.")
        self.assertEqual(result["citations"], [{"title": "Quran 2:286", "url": "https://quran.com/2/286"}])
        request = mock_urlopen.call_args.args[0]
        self.assertEqual(request.full_url, "https://api.openai.com/v1/responses")
        self.assertEqual(request.get_header("Authorization"), "Bearer test-key")

    @patch.dict("os.environ", {"OPENAI_API_KEY": ""})
    def test_service_never_calls_api_without_key(self):
        from core.ai_learning import LearningServiceError, ask_noor
        with self.assertRaises(LearningServiceError):
            ask_noor("A general question")
