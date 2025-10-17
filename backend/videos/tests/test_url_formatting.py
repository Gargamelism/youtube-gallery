from __future__ import annotations

import unittest
import pytest
from typing import Any

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.routers import Route
from videos.utils.router import KebabCaseRouter


# Test ViewSet for router testing
class DummyViewSet(viewsets.ViewSet):
    """A dummy ViewSet for testing URL patterns"""

    def list(self, request: Request) -> None:
        pass

    def create(self, request: Request) -> None:
        pass

    def retrieve(self, request: Request, pk: Any = None) -> None:
        pass

    def update(self, request: Request, pk: Any = None) -> None:
        pass

    def partial_update(self, request: Request, pk: Any = None) -> None:
        pass

    def destroy(self, request: Request, pk: Any = None) -> None:
        pass

    @action(detail=True, methods=["post"])
    def custom_action_name(self, request: Request, pk: Any = None) -> Response:
        return Response()

    @action(detail=True, methods=["post"])
    def another_custom_action(self, request: Request, pk: Any = None) -> Response:
        return Response()

    @action(detail=False, methods=["get"])
    def list_something_special(self, request: Request) -> Response:
        return Response()


class TestKebabCaseRouter(unittest.TestCase):
    """Unit tests for the KebabCaseRouter"""

    def setUp(self) -> None:
        """Set up the router and register test viewset"""
        self.router = KebabCaseRouter()
        # Register with explicit basename to avoid queryset requirement
        self.router.register(r"test-resource", DummyViewSet, basename="test-resource")

    def test_action_conversion(self) -> None:
        """Test that action method names are converted to kebab-case"""
        # Get the routes and substitute the placeholder values
        routes: list[Route] = self.router.get_routes(DummyViewSet)
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

    @pytest.mark.parametrize(
        "input_str,expected",
        [
            ("snake_case_string", "snake-case-string"),
            ("already-kebab-case", "already-kebab-case"),
            ("mixedCamelCase", "mixedcamelcase"),
            ("with_numbers_123", "with-numbers-123"),
            ("UPPERCASE_STRING", "uppercase-string"),
            ("multiple__underscores", "multiple-underscores"),
            ("ends_with_underscore_", "ends-with-underscore"),
            ("_starts_with_underscore", "starts-with-underscore"),
        ],
    )
    def test_to_kebab_case_method(self, input_str: str, expected: str) -> None:
        """Test the internal _to_kebab_case method directly"""
        actual = self.router._to_kebab_case(input_str)
        self.assertEqual(
            actual,
            expected,
            f"Failed to convert '{input_str}' to kebab-case. Expected '{expected}', got '{actual}'",
        )
