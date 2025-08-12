#!/bin/bash
set -e

echo "[INFO] Running pre-build tests..."
docker compose build backend_test
docker compose run --rm backend_test pytest videos/tests/test_000_pre_startup.py -v

if [ $? -eq 0 ]; then
    echo "[INFO] Tests passed! Building production image..."
    docker compose build backend
    echo "[INFO] Build completed successfully!"
else
    echo "[ERROR] Tests failed! Build aborted."
    exit 1
fi
