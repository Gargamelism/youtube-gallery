#!/usr/bin/env bash
# Usage:
#   restore.sh /backups/youtube-gallery-20260501-020000.sql.gz   # local file
#   restore.sh onedrive:youtube-gallery-backups/<filename>        # specific remote file
#   restore.sh --latest-remote                                    # most recent remote file
#
# Restores a pg_dumpall dump back into the Postgres server defined by
# DB_HOST/DB_PORT/DB_USER/DB_PASSWORD. Refuses to run unless RESTORE_CONFIRM=YES
# is set, because pg_dumpall output begins with DROP ROLE / DROP DATABASE
# and will overwrite the live server.
set -euo pipefail

if [[ "${RESTORE_CONFIRM:-}" != "YES" ]]; then
  echo "ERROR: refusing to restore without RESTORE_CONFIRM=YES" >&2
  echo "This will OVERWRITE all databases and roles on ${DB_HOST}:${DB_PORT}." >&2
  exit 2
fi

source="${1:?usage: restore.sh <local-path|onedrive:path|--latest-remote>}"
# BusyBox mktemp -d requires an explicit template ending in 6 X's.
work_dir="$(mktemp -d /tmp/restore-XXXXXX)"
trap 'rm -rf "${work_dir}"' EXIT

case "${source}" in
  --latest-remote)
    latest="$(rclone lsf "${RCLONE_REMOTE}:${RCLONE_DEST_PATH}/" \
              --config "${RCLONE_CONFIG}" --files-only \
              --include 'youtube-gallery-*.sql.gz' | sort | tail -1)"
    [[ -n "${latest}" ]] || { echo "no remote backups found" >&2; exit 1; }
    rclone copy "${RCLONE_REMOTE}:${RCLONE_DEST_PATH}/${latest}" "${work_dir}/" \
      --config "${RCLONE_CONFIG}"
    dump="${work_dir}/${latest}"
    ;;
  "${RCLONE_REMOTE}:"*)
    rclone copy "${source}" "${work_dir}/" --config "${RCLONE_CONFIG}"
    dump="${work_dir}/$(basename "${source#${RCLONE_REMOTE}:}")"
    ;;
  *)
    dump="${source}"
    [[ -f "${dump}" ]] || { echo "file not found: ${dump}" >&2; exit 1; }
    ;;
esac

export PGPASSWORD="${DB_PASSWORD}"
gunzip -c "${dump}" \
  | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" \
         --set ON_ERROR_STOP=on -d postgres
echo "restore complete from: ${dump}"
