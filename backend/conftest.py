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
def mock_youtube_credentials(monkeypatch: pytest.MonkeyPatch, tmp_path: pytest.TempPathFactory) -> None:
    """Mock YouTube API credentials using a secure temporary directory"""
    # Create a secure temporary directory for credentials using tmp_path fixture
    credentials_dir = tmp_path / "test_credentials"
    credentials_dir.mkdir(exist_ok=True)

    monkeypatch.setenv("YOUTUBE_CREDENTIALS_DIR", str(credentials_dir))
    monkeypatch.setenv("YOUTUBE_CLIENT_SECRET_FILE", "test_client_secret.json")
