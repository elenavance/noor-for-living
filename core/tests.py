from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse


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


class AccountFlowTests(TestCase):
    def test_signup_creates_user_and_logs_them_in(self):
        response = self.client.post(reverse("signup"), {
            "first_name": "Amina",
            "username": "amina_test",
            "email": "amina@example.com",
            "password1": "SecureTestPass_482!",
            "password2": "SecureTestPass_482!",
        })
        self.assertRedirects(response, reverse("dashboard"))
        self.assertTrue(User.objects.filter(username="amina_test", first_name="Amina").exists())
        self.assertIn("_auth_user_id", self.client.session)

    def test_dashboard_requires_login(self):
        response = self.client.get(reverse("dashboard"))
        self.assertRedirects(response, f"{reverse('login')}?next={reverse('dashboard')}")

    def test_login_with_valid_credentials(self):
        User.objects.create_user(username="member", password="SecureTestPass_482!")
        response = self.client.post(reverse("login"), {
            "username": "member",
            "password": "SecureTestPass_482!",
        })
        self.assertRedirects(response, reverse("dashboard"))
