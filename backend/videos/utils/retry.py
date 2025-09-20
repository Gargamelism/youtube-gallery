"""
Retry utilities for YouTube API operations.
"""
import time
from functools import wraps
from typing import Callable

from videos.exceptions import APIRateLimitError, APIServerError

# Retry logic constants
MAX_RETRY_ATTEMPTS = 3
RETRY_EXPONENTIAL_BASE = 2
RETRY_INITIAL_DELAY = 1.0
MAX_RETRY_DELAY = 60.0


def is_transient_error(exception: Exception) -> bool:
    """Determine if an error is transient and should be retried"""
    return isinstance(exception, (APIRateLimitError, APIServerError))


def retry_transient_failures(max_attempts: int = MAX_RETRY_ATTEMPTS) -> Callable:
    """Decorator to retry functions on transient failures with exponential backoff"""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e

                    if not is_transient_error(e):
                        raise e

                    if attempt == max_attempts - 1:
                        raise e

                    delay = min(
                        RETRY_INITIAL_DELAY * (RETRY_EXPONENTIAL_BASE ** attempt),
                        MAX_RETRY_DELAY
                    )

                    print(f"INFO: Retrying after {delay}s due to transient error: {str(e)}")
                    time.sleep(delay)

            if last_exception:
                raise last_exception

        return wrapper
    return decorator