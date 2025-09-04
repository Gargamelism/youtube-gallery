from django.test import TestCase
from django.urls import reverse


class URLTest(TestCase):
    def test_get_redirect(self):
        response = self.client.get("/about/", follow=False)
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response["Location"], "/about")

    def test_post_no_redirect(self):
        response = self.client.post("/contact/", {"name": "Test"}, follow=False)
        self.assertEqual(response.status_code, 200)  # or 302 if redirecting after POST
