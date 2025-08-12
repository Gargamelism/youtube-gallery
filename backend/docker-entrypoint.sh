#!/bin/bash
set -e

# Run pre-startup tests first
echo "Running pre-startup tests..."
pytest videos/tests/test_000_pre_startup.py -v

# If tests pass, continue with normal startup
echo "Pre-startup tests passed, starting Django..."
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
