from typing import Any
import requests


class TimeoutSession(requests.Session):
    def __init__(self, timeout: int = 10) -> None:
        super().__init__()
        self._timeout = timeout

    def request(self, *args: Any, **kwargs: Any) -> requests.Response:
        if "timeout" not in kwargs:
            kwargs["timeout"] = self._timeout
        return super().request(*args, **kwargs)


# Singleton instance (optional)
http = TimeoutSession()
