#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${RCLONE_CONFIG:-}" || ! -f "${RCLONE_CONFIG:-}" ]]; then
  echo "ERROR: rclone config not found at ${RCLONE_CONFIG:-<unset>}" >&2
  echo "Mount your prepared rclone.conf into /config/rclone/rclone.conf." >&2
  echo "See backup/README.md for the bootstrap procedure." >&2
  exit 1
fi

for var in DB_HOST DB_PORT DB_USER DB_PASSWORD; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: required env var ${var} is empty" >&2
    exit 1
  fi
done

# Ad-hoc invocation: `docker compose run --rm db-backup /usr/local/bin/restore.sh ...`
# passes args to ENTRYPOINT, so when args other than the default CMD are present,
# exec them directly instead of starting cron.
if [[ $# -gt 0 && "$1" != "cron" ]]; then
  exec "$@"
fi

echo "starting BusyBox crond in foreground (TZ=${TZ})"
# BusyBox crond's default crontab directory is /var/spool/cron/crontabs/.
# We installed our crontab to /etc/crontabs/root (Alpine convention),
# so -c /etc/crontabs is required for crond to find it.
exec crond -f -l 8 -c /etc/crontabs
