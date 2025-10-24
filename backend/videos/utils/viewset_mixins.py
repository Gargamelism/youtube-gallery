from __future__ import annotations

from rest_framework.viewsets import ViewSetMixin


class KebabCaseEndpointsMixin(ViewSetMixin):
    """
    Mixin that converts snake_case action names to kebab-case URLs.
    To be used with ViewSet classes.

    Examples:
    - fetch_from_youtube -> fetch-from-youtube
    - mark_as_watched -> mark-as-watched
    """

    def get_url_map(self) -> dict[str, str]:
        """
        Convert action names from snake_case to kebab-case in URLs.
        """
        url_map = super().get_url_map()  # type: ignore[misc]
        return {action: self._to_kebab_case(url_name) for action, url_name in url_map.items()}

    def _to_kebab_case(self, value: str) -> str:
        """Convert snake_case to kebab-case."""
        # Simply replace underscores with hyphens and ensure lowercase
        return value.replace("_", "-").lower()
