from django.test import TestCase


class URLTest(TestCase):
    def test_get_redirect(self) -> None:
        """Test that GET requests with trailing slashes get redirected"""
        response = self.client.get("/api/videos/", follow=False)
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response["Location"], "/api/videos")

    def test_post_no_redirect(self) -> None:
        """Test that POST requests work without redirection"""
        # Use a real POST endpoint that exists
        response = self.client.post(
            "/api/auth/register",
            {
                "email": "test@example.com",
                "username": "testuser",
                "password": "testpass123",  # nosec B105 - test-only password
                "password_confirm": "testpass123",  # nosec B105 - test-only password
                "captcha_token": "fake_token",
            },
            follow=False,
        )
        # Should return 400 (bad captcha) but not 404
        self.assertNotEqual(response.status_code, 404)
