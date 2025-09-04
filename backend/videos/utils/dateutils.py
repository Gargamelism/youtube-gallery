from datetime import datetime, timezone


def timezone_aware_datetime(iso_str: str) -> datetime:
    """
    Convert ISO datetime string to timezone-aware datetime object.

    Args:
        iso_str: ISO datetime string in format '%Y-%m-%dT%H:%M:%SZ'

    Returns:
        Timezone-aware datetime object in UTC
    """
    return datetime.strptime(iso_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
