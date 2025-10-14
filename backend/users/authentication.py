from django.conf import settings
from rest_framework.authentication import TokenAuthentication
from rest_framework import exceptions
from django.contrib.auth import get_user_model
from django.http import HttpResponse

User = get_user_model()


class CookieTokenAuthentication(TokenAuthentication):
    """
    Token authentication using HTTP-only cookies instead of Authorization header.

    Clients should set the token in an HTTP-only cookie. The cookie name is configurable
    via the AUTH_COOKIE_NAME setting.
    This provides better security against XSS attacks compared to localStorage.
    """

    @property
    def cookie_name(self):
        return settings.AUTH_COOKIE_NAME

    def authenticate(self, request):
        """
        Authenticate user using token from HTTP-only cookie.

        Returns:
            tuple: (user, token) if authentication successful, None otherwise
        """
        # Try cookie authentication first
        token = self.get_token_from_cookie(request)

        if token:
            return self.authenticate_credentials(token)

        # Fallback to header authentication for backward compatibility
        return super().authenticate(request)

    def get_token_from_cookie(self, request):
        """
        Extract authentication token from HTTP-only cookie.

        Returns:
            str: Token string or None if not found
        """
        return request.COOKIES.get(self.cookie_name)

    def authenticate_credentials(self, key):
        """
        Authenticate the given token key.

        Args:
            key (str): The token key to authenticate

        Returns:
            tuple: (user, token) if successful

        Raises:
            AuthenticationFailed: If token is invalid or user inactive
        """
        model = self.get_model()
        try:
            token = model.objects.select_related("user").get(key=key)
        except model.DoesNotExist:
            raise exceptions.AuthenticationFailed("Invalid token.")

        if not token.user.is_active:
            raise exceptions.AuthenticationFailed("User inactive or deleted.")

        return (token.user, token)

    def set_auth_cookie(self, response: HttpResponse, token: str, max_age: int = 7 * 24 * 60 * 60) -> None:
        """
        Set authentication token as HTTP-only cookie.

        Args:
            response: Django HttpResponse object
            token: Authentication token string
            max_age: Cookie max age in seconds (default: 7 days)
        """
        response.set_cookie(
            self.cookie_name,
            token,
            max_age=max_age,
            httponly=True,
            secure=not settings.DEBUG,  # Only over HTTPS in production
            samesite="Lax",  # CSRF protection while allowing normal navigation
        )

    def clear_auth_cookie(self, response: HttpResponse) -> None:
        """
        Clear the authentication cookie.

        Args:
            response: Django HttpResponse object
        """
        response.delete_cookie(self.cookie_name, samesite="Lax")
