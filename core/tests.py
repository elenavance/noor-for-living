from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from core.models import QuranBookmark


class PublicPageTests(TestCase):
    def test_homepage_loads_in_english(self):
        response = self.client.get(reverse("home"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "NOOR FOR LIVING")
        self.assertContains(response, 'lang="en"')
        self.assertNotContains(response, 'id="language"')

    def test_manifest_loads_in_english(self):
        response = self.client.get(reverse("manifest"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "NOOR FOR LIVING")
        self.assertEqual(response.json()["lang"], "en")

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


class AccountFlowTests(TestCase):
    def test_signup_creates_user_and_logs_them_in(self):
        response = self.client.post(reverse("signup"), {"first_name":"Amina","username":"amina_test","email":"amina@example.com","password1":"SecureTestPass_482!","password2":"SecureTestPass_482!"})
        self.assertRedirects(response, reverse("dashboard"))
        self.assertTrue(User.objects.filter(username="amina_test", first_name="Amina").exists())
        self.assertIn("_auth_user_id", self.client.session)

    def test_dashboard_requires_login(self):
        response = self.client.get(reverse("dashboard"))
        self.assertRedirects(response, f"{reverse('login')}?next={reverse('dashboard')}")

    def test_login_with_valid_credentials(self):
        User.objects.create_user(username="member", password="SecureTestPass_482!")
        response = self.client.post(reverse("login"), {"username":"member","password":"SecureTestPass_482!"})
        self.assertRedirects(response, reverse("dashboard"))

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
