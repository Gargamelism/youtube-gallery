#!/usr/bin/env bash
set -euo pipefail
timestamp="$(date +%Y%m%d-%H%M%S)"
dump_file="${BACKUP_DIR}/youtube-gallery-${timestamp}.sql.gz"
dump_file_tmp="${dump_file}.tmp"

trap 'rm -f "${dump_file_tmp}"' EXIT

export PGPASSWORD="${DB_PASSWORD}"
pg_dumpall \
  -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" \
  | gzip -9 > "${dump_file_tmp}"
mv "${dump_file_tmp}" "${dump_file}"

rclone copy "${dump_file}" "${RCLONE_REMOTE}:${RCLONE_DEST_PATH}/" \
  --config "${RCLONE_CONFIG}"

rclone delete "${RCLONE_REMOTE}:${RCLONE_DEST_PATH}/" \
  --min-age "${BACKUP_RETAIN_REMOTE_DAYS}d" --config "${RCLONE_CONFIG}"

# Local retention: keep newest BACKUP_RETAIN_LOCAL files; delete the rest.
# `ls -1t` works on BusyBox; `xargs -r` does not run rm on empty input.
ls -1t "${BACKUP_DIR}"/youtube-gallery-*.sql.gz \
  | tail -n +"$((BACKUP_RETAIN_LOCAL + 1))" | xargs -r rm --

echo "backup complete: ${dump_file}"
