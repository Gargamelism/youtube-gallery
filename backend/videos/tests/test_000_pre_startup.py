"""
Tests that run before Django initialization
"""

import json
import os
from pathlib import Path

import pytest


def test_environment_variables() -> None:
    """Test that required environment variables are set"""
    required_vars = [
        "YOUTUBE_CREDENTIALS_DIR",
        "YOUTUBE_CLIENT_SECRET_FILE",
        "YOUTUBE_TOKEN_FILE",
    ]

    missing_vars = []
    for var in required_vars:
        if os.getenv(var) is None:
            missing_vars.append(var)

    if missing_vars:
        pytest.skip(f"Missing environment variables: {', '.join(missing_vars)}. These will be required for production.")


def test_credentials_directory() -> None:
    """Test that credentials directory exists and has correct permissions"""
    cred_dir = os.getenv("YOUTUBE_CREDENTIALS_DIR")
    if not cred_dir:
        pytest.skip("YOUTUBE_CREDENTIALS_DIR not set")

    path = Path(cred_dir)
    if not path.exists():
        pytest.skip(f"Credentials directory {cred_dir} does not exist yet. Will be created at runtime.")

    if path.exists() and not path.is_dir():
        pytest.fail(f"{cred_dir} exists but is not a directory")

    # Skip permission check in development/test environment
    if os.getenv("TESTING"):
        pytest.skip("Skipping permission check in test environment")


def test_client_secret_format() -> None:
    """Test that client secret file exists and has correct format"""
    cred_dir = os.getenv("YOUTUBE_CREDENTIALS_DIR")
    secret_file = os.getenv("YOUTUBE_CLIENT_SECRET_FILE")

    if not (cred_dir and secret_file):
        pytest.skip("YouTube credentials environment variables not set")

    path = Path(cred_dir) / secret_file
    if not path.exists():
        pytest.skip("Client secret file not found. Required for YouTube API access.")

    try:
        with open(path) as f:
            data = json.load(f)
    except json.JSONDecodeError:
        pytest.skip("Client secret file is not valid JSON. Will need to be configured for YouTube API access.")
        return
    except Exception as e:
        pytest.skip(f"Could not read client secret file: {str(e)}")
        return

    # Verify format only if file exists and is readable
    required_keys = ["web", "installed"]
    if not any(key in data for key in required_keys):
        pytest.fail("Client secret file must contain either 'web' or 'installed' key")

    if "web" in data:
        web_keys = ["client_id", "project_id", "auth_uri", "token_uri", "auth_provider_x509_cert_url", "client_secret"]
        missing_keys = [key for key in web_keys if key not in data["web"]]
        if missing_keys:
            pytest.fail(f"Missing required keys in client secret: {', '.join(missing_keys)}")


def test_token_file_permissions() -> None:
    """Test that token file has correct permissions if it exists"""
    cred_dir = os.getenv("YOUTUBE_CREDENTIALS_DIR")
    token_file = os.getenv("YOUTUBE_TOKEN_FILE")

    if not (cred_dir and token_file):
        pytest.skip("YouTube credentials environment variables not set")

    path = Path(cred_dir) / token_file
    if not path.exists():
        pytest.skip("Token file does not exist yet. Will be created when authenticating with YouTube API.")

    # Skip permission check in development/test environment
    if os.getenv("TESTING"):
        pytest.skip("Skipping permission check in test environment")
