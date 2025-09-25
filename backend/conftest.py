import os
import sys
from pathlib import Path

import pytest

# Get the absolute path to the project root
PROJECT_ROOT = Path(__file__).resolve().parent

# Add the project root directory to Python path
sys.path.insert(0, str(PROJECT_ROOT))


def pytest_configure():
    """Configure Django settings before tests run"""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "youtube_gallery.settings")
    os.environ["TESTING"] = "TRUE"

    # Ensure we're in the correct directory
    os.chdir(PROJECT_ROOT)


@pytest.fixture
def mock_youtube_credentials(monkeypatch):
    """
    Provide pytest monkeypatch updates that set environment variables for YouTube API credentials during tests.
    
    Sets `YOUTUBE_CREDENTIALS_DIR` to "/tmp/test_credentials" and `YOUTUBE_CLIENT_SECRET_FILE` to "test_client_secret.json".
    
    Parameters:
        monkeypatch: pytest `MonkeyPatch` fixture used to set environment variables for the test process.
    """
    monkeypatch.setenv("YOUTUBE_CREDENTIALS_DIR", "/tmp/test_credentials")
    monkeypatch.setenv("YOUTUBE_CLIENT_SECRET_FILE", "test_client_secret.json")
