from django.test import TestCase
from django.urls import reverse


class PublicPageTests(TestCase):
    def test_homepage_loads(self):
        response = self.client.get(reverse("home"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "NOOR FOR LIVING")

    def test_manifest_loads(self):
        response = self.client.get(reverse("manifest"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "NOOR FOR LIVING")

    def test_service_worker_is_javascript(self):
        response = self.client.get(reverse("service_worker"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("javascript", response["Content-Type"])
