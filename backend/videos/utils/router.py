from rest_framework.routers import DefaultRouter

class KebabCaseRouter(DefaultRouter):
    """
    Router that converts URLs from snake_case to kebab-case.
    
    Examples:
    - fetch_from_youtube -> fetch-from-youtube
    - mark_as_watched -> mark-as-watched
    - update_video_status -> update-video-status
    """
    def get_urls(self):
        urls = super().get_urls()

        # Convert URLs to kebab-case
        for url in urls:
            if hasattr(url, 'pattern'):
                # Convert the URL pattern to kebab-case
                url.pattern._route = self._to_kebab_case(url.pattern._route)
        return urls

    def _to_kebab_case(self, value):
        """Convert snake_case to kebab-case."""
        # Simply replace underscores with hyphens and ensure lowercase
        return value.replace('_', '-').lower()
