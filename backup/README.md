# Database Backup

Monthly Postgres dump to OneDrive. Runs on the 1st of each month at 02:00, uploads a gzipped `pg_dumpall` to OneDrive, keeps 6 months remotely, and keeps the last 2 dumps locally as a hot cache. A companion `restore.sh` handles recovery.

## Bootstrap

Run once on the production host after completing the Postgres 15 → 18 upgrade.

**1. Build the image:**
```bash
docker compose -f docker-compose.prod.yml build db-backup
```

**2. Create the rclone config directory** (if not already present):
```bash
mkdir -p backup/rclone
```

**3. Run interactive rclone config** (skips entrypoint validation since rclone.conf does not yet exist):
```bash
docker compose -f docker-compose.prod.yml run --rm \
  --entrypoint rclone \
  -v "$PWD/backup/rclone:/config/rclone" \
  db-backup --config /config/rclone/rclone.conf config
```
In the prompts:
- `n` — new remote
- name: `onedrive`
- storage: `onedrive`
- Leave `client_id` / `client_secret` blank (use rclone's built-in defaults)
- Account type: `onedrive` (Personal) or `business` — **choose the correct type for your account**
- OAuth: if on a remote/headless host, answer `n` to "Use auto config?" and follow the printed URL on a local browser

**4. Verify the remote was registered:**
```bash
docker compose -f docker-compose.prod.yml run --rm \
  --entrypoint rclone \
  db-backup --config /config/rclone/rclone.conf listremotes
```
Output must include `onedrive:`.

**5. Verify the destination path is writable:**
```bash
docker compose -f docker-compose.prod.yml run --rm \
  --entrypoint rclone \
  db-backup --config /config/rclone/rclone.conf mkdir onedrive:youtube-gallery-backups
```

**6. Confirm rclone.conf is git-ignored:**
```bash
git check-ignore backup/rclone/rclone.conf
```
Should print the path. `git status` must not list it.

## Operations

**Force a backup now:**
```bash
docker compose -f docker-compose.prod.yml run --rm db-backup /usr/local/bin/run-backup.sh
```

**List remote backups:**
```bash
docker compose -f docker-compose.prod.yml run --rm \
  --entrypoint rclone \
  db-backup --config /config/rclone/rclone.conf lsf onedrive:youtube-gallery-backups/
```

**Inspect cron schedule:**
```bash
docker compose -f docker-compose.prod.yml exec db-backup crontab -l
docker compose -f docker-compose.prod.yml logs db-backup
```

## Restore

> **WARNING: Restoring overwrites all databases and roles on the target server. This is irreversible.**
> Set `RESTORE_CONFIRM=YES` to proceed.

**From the most recent remote backup:**
```bash
docker compose -f docker-compose.prod.yml run --rm \
  -e RESTORE_CONFIRM=YES \
  db-backup /usr/local/bin/restore.sh --latest-remote
```

**From a specific remote file:**
```bash
docker compose -f docker-compose.prod.yml run --rm \
  -e RESTORE_CONFIRM=YES \
  db-backup /usr/local/bin/restore.sh onedrive:youtube-gallery-backups/youtube-gallery-20260501-020000.sql.gz
```

**From a local file in the backup volume:**
```bash
docker compose -f docker-compose.prod.yml run --rm \
  -e RESTORE_CONFIRM=YES \
  db-backup /usr/local/bin/restore.sh /backups/youtube-gallery-20260501-020000.sql.gz
```

## Security

`pg_dumpall` output includes hashed role passwords. The OneDrive destination must remain a private account (not shared). If the account is ever shared, switch to an `rclone crypt` remote as the destination.

## Troubleshooting

**"rclone config not found"** — mount `backup/rclone/rclone.conf` and re-run the bootstrap procedure above.

**OAuth token expired** — re-run `rclone config reconnect` against the same volume:
```bash
docker compose -f docker-compose.prod.yml run --rm \
  --entrypoint rclone \
  db-backup --config /config/rclone/rclone.conf reconnect onedrive:
```

**pg_isready failure inside the container** — confirm `db` is on `youtube_gallery_network` and healthy:
```bash
docker compose -f docker-compose.prod.yml ps db
```
