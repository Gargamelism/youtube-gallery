import requests


class TimeoutSession(requests.Session):
    def __init__(self, timeout=10):
        super().__init__()
        self._timeout = timeout

    def request(self, *args, **kwargs):
        if "timeout" not in kwargs:
            kwargs["timeout"] = self._timeout
        return super().request(*args, **kwargs)


# Singleton instance (optional)
http = TimeoutSession()
