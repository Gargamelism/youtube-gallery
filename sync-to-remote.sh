#!/bin/bash

# YouTube Gallery - Remote Sync Script
# Syncs local changes to remote server via rsync

# Configuration
REMOTE_USER="gargamel"
REMOTE_HOST="10.0.0.11"
REMOTE_PATH="/mnt/dev/React/youtube-gallery"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  -h, --help       Show this help message"
  echo "  -n, --dry-run    Show what would be synced without actually syncing"
  echo "  -d, --delete     Delete remote files that don't exist locally (use with caution)"
  echo "  -w, --watch      Watch for changes and auto-sync"
  echo ""
  echo "Configuration:"
  echo "  Edit the REMOTE_USER, REMOTE_HOST, and REMOTE_PATH variables at the top of this script"
  echo "  Current remote: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}"
  exit 0
}

# Parse command line arguments
DRY_RUN=""
DELETE=""
WATCH=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      usage
      ;;
    -n|--dry-run)
      DRY_RUN="-n"
      shift
      ;;
    -d|--delete)
      DELETE="--delete"
      shift
      ;;
    -w|--watch)
      WATCH=true
      shift
      ;;
    *)
      echo -e "${RED}Error: Unknown option $1${NC}"
      usage
      ;;
  esac
done

# Rsync command with exclusions
sync_files() {
  local dry_run_flag=$1
  local delete_flag=$2

  if [[ -n "$dry_run_flag" ]]; then
    echo -e "${YELLOW}DRY RUN - No files will be modified${NC}"
  fi

  if [[ -n "$delete_flag" ]]; then
    echo -e "${YELLOW}WARNING: Will delete remote files not present locally${NC}"
  fi

  echo -e "${GREEN}Syncing to ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}${NC}"

  rsync -avz $dry_run_flag $delete_flag \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude '.git' \
    --exclude 'backend/staticfiles' \
    --exclude 'backend/media' \
    --exclude '.env' \
    --exclude 'backend/.claude/client_secret.json' \
    --exclude '.DS_Store' \
    --exclude '*.swp' \
    --exclude '*.swo' \
    --exclude 'sync-to-remote.sh' \
    ./ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/

  if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✓ Sync completed successfully${NC}"
  else
    echo -e "${RED}✗ Sync failed${NC}"
    exit 1
  fi
}

# Watch mode
if [[ "$WATCH" == true ]]; then
  echo -e "${GREEN}Watch mode enabled - monitoring for changes...${NC}"
  echo -e "${YELLOW}Press Ctrl+C to stop${NC}"

  # Check if fswatch is available (macOS)
  if command -v fswatch &> /dev/null; then
    fswatch -o . | while read; do
      echo -e "\n${YELLOW}Change detected, syncing...${NC}"
      sync_files "$DRY_RUN" "$DELETE"
    done
  # Check if inotifywait is available (Linux)
  elif command -v inotifywait &> /dev/null; then
    while inotifywait -r -e modify,create,delete,move .; do
      echo -e "\n${YELLOW}Change detected, syncing...${NC}"
      sync_files "$DRY_RUN" "$DELETE"
    done
  else
    echo -e "${RED}Error: Neither fswatch (macOS) nor inotifywait (Linux) is installed${NC}"
    echo "Install with:"
    echo "  macOS: brew install fswatch"
    echo "  Linux: sudo apt-get install inotify-tools"
    exit 1
  fi
else
  # Single sync
  sync_files "$DRY_RUN" "$DELETE"
fi
