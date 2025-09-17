import unittest
import pytest

from rest_framework import viewsets
from rest_framework.decorators import action
from videos.utils.router import KebabCaseRouter


# Test ViewSet for router testing
class DummyViewSet(viewsets.ViewSet):
    """A dummy ViewSet for testing URL patterns"""

    def list(self):
        pass

    def create(self):
        pass

    def retrieve(self):
        pass

    def update(self):
        pass

    def partial_update(self):
        pass

    def destroy(self):
        pass

    @action(detail=True, methods=["post"])
    def custom_action_name(self):
        pass

    @action(detail=True, methods=["post"])
    def another_custom_action(self):
        pass

    @action(detail=False, methods=["get"])
    def list_something_special(self):
        pass


class TestKebabCaseRouter(unittest.TestCase):
    """Unit tests for the KebabCaseRouter"""

    def setUp(self):
        """Set up the router and register test viewset"""
        self.router = KebabCaseRouter()
        # Register with explicit basename to avoid queryset requirement
        self.router.register(r"test-resource", DummyViewSet, basename="test-resource")

    def test_action_conversion(self):
        """Test that action method names are converted to kebab-case"""
        # Get the routes and substitute the placeholder values
        routes = self.router.get_routes(DummyViewSet)
        patterns = []

        for route in routes:
            # Replace the placeholders with our test values
            url = route.url
            url = url.replace("{prefix}", "test-resource")
            url = url.replace("{lookup}", "(?P<pk>[^/.]+)")
            url = url.replace("{trailing_slash}", "/")
            patterns.append(url)

        # Verify expected URL patterns
        expected_patterns = {
            "^test-resource/$",  # list
            "^test-resource/(?P<pk>[^/.]+)/$",  # detail
            "^test-resource/list-something-special/$",
            "^test-resource/(?P<pk>[^/.]+)/custom-action-name/$",
            "^test-resource/(?P<pk>[^/.]+)/another-custom-action/$",
        }

        # Check that all expected patterns are present
        for pattern in expected_patterns:
            self.assertIn(pattern, patterns)

        # Check that no snake_case versions exist
        combined_patterns = " ".join(patterns)
        self.assertNotIn("list_something_special", combined_patterns)
        self.assertNotIn("custom_action_name", combined_patterns)
        self.assertNotIn("another_custom_action", combined_patterns)

    @pytest.mark.parametrize("input_str,expected", [
        ("snake_case_string", "snake-case-string"),
        ("already-kebab-case", "already-kebab-case"),
        ("mixedCamelCase", "mixedcamelcase"),
        ("with_numbers_123", "with-numbers-123"),
        ("UPPERCASE_STRING", "uppercase-string"),
        ("multiple__underscores", "multiple-underscores"),
        ("ends_with_underscore_", "ends-with-underscore"),
        ("_starts_with_underscore", "starts-with-underscore"),
    ])
    def test_to_kebab_case_method(self, input_str, expected):
        """Test the internal _to_kebab_case method directly"""
        actual = self.router._to_kebab_case(input_str)
        self.assertEqual(
            actual,
            expected,
            f"Failed to convert '{input_str}' to kebab-case. Expected '{expected}', got '{actual}'",
        )
