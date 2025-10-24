import re
from typing import Any, Optional

from django.db import models
from django.db.backends.base.base import BaseDatabaseWrapper
from django.db.models.expressions import Expression


class YouTubeDurationField(models.CharField):  # type: ignore[type-arg]
    """
    Custom field to handle YouTube duration format (PT1H2M3S) and convert to readable format
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        kwargs["max_length"] = 20  # Enough for formatted duration
        super().__init__(*args, **kwargs)

    def from_db_value(
        self, value: Optional[str], expression: Expression, connection: BaseDatabaseWrapper
    ) -> Optional[str]:
        if value is None:
            return value
        return self.format_duration(value)

    def to_python(self, value: Any) -> Optional[str]:
        if isinstance(value, str):
            return self.format_duration(value)
        return value

    def get_prep_value(self, value: Any) -> Optional[str]:
        # Store the original YouTube format in database
        if isinstance(value, str):
            # If it's already in YouTube format, keep it
            if value.startswith("PT"):
                return value
            # If it's formatted, convert back (optional)
            return self.parse_formatted_duration(value)
        return value

    def format_duration(self, youtube_duration: Optional[str]) -> Optional[str]:
        """
        Convert YouTube duration format (PT1H2M3S) to readable format (1:02:03)
        """
        if not youtube_duration or not isinstance(youtube_duration, str):
            return youtube_duration

        # Handle YouTube format: PT1H2M3S
        match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", youtube_duration)
        if not match:
            return youtube_duration

        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)

        if hours > 0:
            return f"{hours}:{minutes:02d}:{seconds:02d}"
        else:
            return f"{minutes}:{seconds:02d}"

    def parse_formatted_duration(self, formatted_duration: Optional[str]) -> Optional[str]:
        """
        Convert readable format back to YouTube format (optional)
        """
        if not formatted_duration or not isinstance(formatted_duration, str):
            return formatted_duration

        # Parse format like "1:02:03" or "2:30"
        parts = formatted_duration.split(":")
        if len(parts) == 3:
            # HH:MM:SS format
            hours, minutes, seconds = map(int, parts)
            return f"PT{hours}H{minutes}M{seconds}S"
        elif len(parts) == 2:
            # MM:SS format
            minutes, seconds = map(int, parts)
            return f"PT{minutes}M{seconds}S"

        return formatted_duration
