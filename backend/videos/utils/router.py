import re

from rest_framework.routers import DefaultRouter, Route


class KebabCaseRouter(DefaultRouter):
    """
    Router that converts URLs from snake_case to kebab-case.

    Examples:
    - fetch_from_youtube -> fetch-from-youtube
    - mark_as_watched -> mark-as-watched
    - update_video_status -> update-video-status
    """

    def get_lookup_regex(self, viewset, lookup_prefix=""):
        """
        Override to ensure lookup patterns are in kebab-case.
        Uses (?P<pk>...) for named capture groups.
        """
        lookup_url = super().get_lookup_regex(viewset, lookup_prefix)
        if not lookup_url:
            return lookup_url

        # Make sure we keep the proper named group format
        if "{pk}" in lookup_url:
            return lookup_url.replace("{pk}", "(?P<pk>[^/.]+)")
        return lookup_url

    def get_default_basename(self, viewset):
        """
        Override to convert the basename to kebab-case.
        """
        basename = super().get_default_basename(viewset)
        if not basename:
            return basename

        return self._to_kebab_case(basename)

    def get_routes(self, viewset):
        """
        Override get_routes to convert action URLs to kebab-case.
        """
        routes = super().get_routes(viewset)

        # Convert action URLs to kebab-case by creating new Route objects
        converted_routes: list[Route] = []
        for route in routes:
            if hasattr(route, "url") and route.url:
                # Convert action names in URLs to kebab-case
                url_parts = route.url.split("/")
                converted_parts: list[str] = []

                for part in url_parts:
                    # Skip empty parts
                    if not part:
                        converted_parts.append(part)
                    # Handle parts that contain template variables but also action names
                    elif "{" in part and "_" in part:
                        # Only convert underscores outside of template variables
                        # Split by template variables, convert non-template parts
                        template_parts = re.split(r"(\{[^}]+\})", part)
                        converted_template_parts: list[str] = []
                        for template_part in template_parts:
                            if template_part.startswith("{") and template_part.endswith("}"):
                                # This is a template variable, don't convert
                                converted_template_parts.append(template_part)
                            else:
                                # This is regular text, convert underscores
                                converted_template_parts.append(self._to_kebab_case(template_part))
                        converted_part = "".join(converted_template_parts)
                        converted_parts.append(converted_part)
                    elif "{" in part:
                        # Pure template variables, don't convert
                        converted_parts.append(part)
                    else:
                        # Regular parts without template variables
                        kebab_part = self._to_kebab_case(part)
                        converted_parts.append(kebab_part)

                new_url = "/".join(converted_parts)

                # Create a new Route object with the converted URL
                new_route = Route(
                    url=new_url,
                    mapping=route.mapping,
                    name=route.name,
                    detail=route.detail,
                    initkwargs=route.initkwargs,
                )
                converted_routes.append(new_route)
            else:
                converted_routes.append(route)

        return converted_routes

    def _to_kebab_case(self, value: str) -> str:
        """
        Convert snake_case to kebab-case while preserving regex patterns and URL parameters.

        Args:
            value: The string to convert from snake_case to kebab-case

        Returns:
            The converted string in kebab-case format
        """
        if not value:
            return value

        # Don't modify regex patterns or URL parameters
        if any(char in value for char in ["(", ")", "[", "]", "?", "*", "+", "\\", "{"]):
            return value

        # Convert snake_case to kebab-case
        kebab = re.sub(r"^_+", "", value)  # Remove starting underscores
        kebab = re.sub(r"_+$", "", kebab)  # Remove trailing underscores
        kebab = re.sub(r"_+", "-", kebab)  # Replace underscores with dashes
        return kebab.lower()
