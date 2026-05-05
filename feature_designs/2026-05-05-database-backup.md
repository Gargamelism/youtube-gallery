# Django 4.2 → 5.2 + Postgres 15 → 18 + Monthly Database Backup → OneDrive

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution Overview](#solution-overview)
- [Current System Analysis](#current-system-analysis)
- [Django 4.2 → 5.2 LTS Upgrade](#django-42--52-lts-upgrade)
- [Postgres 15 → 18 Upgrade](#postgres-15--18-upgrade)
- [Technical Design](#technical-design)
  - [Container image](#container-image)
  - [Backup script](#backup-script)
  - [Restore script](#restore-script)
  - [Compose integration](#compose-integration)
  - [Bootstrap (one-time, host-side)](#bootstrap-one-time-host-side)
- [Implementation Phases](#implementation-phases)
- [Performance Considerations](#performance-considerations)
- [Testing Strategy](#testing-strategy)
- [Risks and Mitigation](#risks-and-mitigation)
- [Conclusion](#conclusion)

## Overview

This change ships three coupled pieces of infrastructure, executed in this order to keep "one thing changes at a time":

1. **Django framework upgrade**: bump `Django==4.2.7` to the latest `5.2.x` LTS line. Django 5.2 LTS officially supports PG 13–18 (the matrix needed for the next step), runs on Python 3.10–3.13 (the project's `python:3.12-slim` is already inside this range), and has security support through April 2028. Performed while still on PG 15 so the only variable in flight is Django itself.
2. **Postgres major-version upgrade**: bump `db` from `postgres:15` to `postgres:18` (latest stable, October 2025). The upgrade is a destroy-volume / dump-restore cycle — done while the stack is offline — using a manually-prepared `pg_dumpall` from the running PG 15 server as the precondition. Django 5.2 is now the runtime, so PG 18 is in the officially-tested matrix.
3. **Monthly backup → OneDrive**: a self-contained Docker service `db-backup` that, once a month, dumps the entire Postgres server with `pg_dumpall`, gzips the dump, and uploads it to OneDrive via `rclone`. Old backups are pruned after 6 months. A companion `restore.sh` script lets an operator restore the most recent (or any specific) backup back into Postgres.

These are coupled because the backup container's Postgres client major version must match the server it dumps; pinning the new image to `postgres:18-alpine` is only correct after the server is upgraded. The Django upgrade comes first because it expands the supported PG matrix to include 18 (Django 4.2's matrix tops out at 16) — doing PG 18 without the Django bump would put us on an unofficial-support combination.

**Precondition (handled outside this plan)**: a complete `pg_dumpall | gzip` of the live PG 15 server has already been produced and stored at a known host path. This plan treats that file as an input.

**Host environment**: the prod host runs **Debian Linux** with **Docker Compose V2** (the `docker compose` plugin subcommand, not the legacy `docker-compose` Python binary). Every command in this plan uses `docker compose` (with a space). Debian-specific implications worth flagging up front:
- `host.docker.internal` does not resolve from inside containers by default (that hostname is a Docker Desktop convenience). Where this plan needs container-to-host connectivity (only the restore-test recipe in Testing Strategy), the command must include `--add-host=host.docker.internal:host-gateway`. Docker on Linux honors `host-gateway` since 20.10 (Debian's default Docker version).
- The `tianon/postgres-upgrade` and `pg_upgrade`-helper images would also work for the upgrade, but the dump-restore approach in Phase 0b is OS-agnostic and uses tools the operator already has on hand. No Debian-specific package installs are needed beyond a working `docker` + `docker compose`.
- `docker volume rm <project>_postgres_data` works identically on Debian; the `<project>` prefix is the directory name where compose was invoked (Compose V2 picks this up the same way V1 did).

## Problem Statement

The youtube-gallery stack runs PostgreSQL 15 in Docker against a named volume `postgres_data` and currently has **no backup infrastructure**. A single disk failure, accidental `docker volume rm`, corrupt migration, or hostile action would permanently lose:

- All registered user accounts and credentials
- Each user's YouTube channel subscriptions and channel settings
- Watch status, "not interested" flags, and per-user video metadata
- Tag definitions and tag-to-video associations

There is no off-host copy of any of this data. Recovery is impossible.

## Solution Overview

**Django path**: bump `Django==4.2.7` and the Django-coupled dependencies (DRF, cors-headers, filter, recaptcha, celery-beat) in [backend/requirements.txt](../backend/requirements.txt) to versions that support Django 5.2. Rebuild backend image. Run the existing test suite. Deploy. The codebase has been pre-checked for known 4.2 → 5.x removal hotspots and is clean (see [Django 4.2 → 5.2 LTS Upgrade](#django-42--52-lts-upgrade)).

**Postgres path**: stop the stack → drop the existing `postgres_data` named volume → bump `db` image to `postgres:18` → start the new server (which initializes a fresh empty volume) → restore the manual safety dump via `psql` → smoke-test → bring the rest of the stack back up. PG 15 → 18 is a major-version jump, so in-place data files cannot be reused; the dump-restore cycle is the canonical migration.

**Backup path**: a new dedicated container, built from a `postgres:18-alpine` base image, runs an internal cron daemon that fires a single backup script on the 1st of each month at 02:00. The script streams `pg_dumpall` through `gzip` to a timestamped file, uploads it to OneDrive with `rclone`, prunes anything older than 180 days on OneDrive, and keeps the last two dumps locally as a hot cache.

Key capabilities:

- **Framework upgrade**: Django 4.2 → 5.2 LTS, dependency bumps, no app-code rewrites expected (verified clean of common removal-list APIs)
- **DB upgrade**: one-shot, manual, replaces PG 15 with PG 18 (server data restored from the operator's pre-prepared dump)
- **Backup**: monthly, automatic, off-host (OneDrive)
- **Restore**: one-command via `restore.sh` (local file, specific OneDrive object, or `--latest-remote`)
- **Retention**: 6 months remote / 2 dumps local
- **Self-contained**: a single Compose service; no host cron, no app-layer coupling
- **Reproducible**: rclone OAuth token lives outside the image; image is rebuildable from source

## Current System Analysis

- **Database service** (current; pre-upgrade): service name `db`, image `postgres:15`, backed by named volume `postgres_data`, exposing port `5432:5432`, on network `youtube_gallery_network` (driver `bridge`). **This feature replaces the image with `postgres:18` in both compose files** — see the [Postgres 15 → 18 Upgrade](#postgres-15--18-upgrade) section.
- **Dev compose** ([docker-compose.yml](../docker-compose.yml)) — db service uses `environment:` block with `${DB_USER}`/`${DB_PASSWORD}`/`${DB_NAME}` substituted from a host `.env`, **and** publishes a healthcheck:
  ```yaml
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
    interval: 5s
    timeout: 5s
    retries: 5
  ```
- **Prod compose** ([docker-compose.prod.yml](../docker-compose.prod.yml)) — db service **hardcodes** `POSTGRES_DB: youtube_gallery`, `POSTGRES_USER: postgres`, `POSTGRES_PASSWORD: postgres` and uses **no env_file**. **No healthcheck is currently defined** on prod `db`. This is a planning constraint, not a bug to fix in this feature: the backup service must work without depending on a prod-side healthcheck (or this feature must add one).
- **DB env-var contract** (from [backend/youtube_gallery/settings.py](../backend/youtube_gallery/settings.py) DATABASES block, all `config()`-resolved with defaults):
  - `DB_HOST` (default `db`), `DB_PORT` (default `5432`), `DB_NAME` (default `youtube_gallery`), `DB_USER` (default `postgres`), `DB_PASSWORD` (default `postgres`).
  - The backup container reuses the same names so any source of truth (env or hardcoded) feeds both.
- **Network**: `youtube_gallery_network` (bridge) — both compose files declare it; the backup service joins it to resolve `db` by hostname.
- **Existing scheduling**: Celery Beat handles application-level periodic tasks ([backend/videos/management/commands/setup_periodic_tasks.py](../backend/videos/management/commands/setup_periodic_tasks.py)). It is **not** a fit for backups: backups must survive bad backend deploys and run in an isolated container with the right Postgres client version.
- **Existing backup tooling**: none. `grep -r -l -E "(pg_dump|rclone|backup)" --include="*.yml" --include="*.sh" --include="Dockerfile*"` returns nothing. No `backup/` directory exists at the repo root.
- **Existing Postgres client**: the backend Dockerfile (Debian `python:3.12-slim`) installs `postgresql-client` via apt for ad-hoc use, but is unsuitable as a backup base — it has no rclone, no cron, and pulls in the entire Django stack on every backup attempt.
- **Tables to verify after restore** (verified `db_table` Meta in [backend/users/models.py](../backend/users/models.py) and [backend/videos/models.py](../backend/videos/models.py); these projects override Django's default `app_modelname` naming):
  - `users` (User), `user_channels` (UserChannel), `user_watch_preferences`, `user_videos` (UserVideo), `channel_tags` (ChannelTag), `user_channel_tags`, `user_daily_quotas`, `user_youtube_credentials`, `update_frequencies`, `channels` (Channel), `videos` (Video).
- **`.gitignore`** ([.gitignore](../.gitignore)) — already ignores `.env*`, `client_secret*`, and `/backend/config/credentials/*`. No `backup/` exclusions exist; we add one in this feature.

## Django 4.2 → 5.2 LTS Upgrade

### Why Django 5.2 specifically

- **Officially supports PG 18** (the next phase), unlike Django 4.2 whose tested matrix tops out at PG 16. This removes the "unofficial combination" risk that an earlier draft of this plan accepted.
- **LTS line**: 5.2 was released April 2025 and receives security fixes through April 2028. 4.2's mainstream support ended April 2024 and extended security ended April 2026 — i.e. is at end-of-life as of the date of this plan.
- **Python compatibility**: Django 5.2 supports Python 3.10–3.13. The project runs on `python:3.12-slim` ([backend/Dockerfile](../backend/Dockerfile), [backend/Dockerfile.prod](../backend/Dockerfile.prod)), already in range — no Python upgrade needed.

### Codebase pre-check (verified)

The common Django 4.2 → 5.x breakage hotspots are absent in this codebase. Verified by grep:

- **No `django.utils.timezone.utc`** (removed in Django 5.0). The three `timezone.utc` usages — [backend/videos/services/quota_tracker.py:82](../backend/videos/services/quota_tracker.py#L82), [backend/videos/utils/dateutils.py:14](../backend/videos/utils/dateutils.py#L14), [backend/users/models.py:310](../backend/users/models.py#L310) — all import from `datetime` (Python stdlib), not from Django.
- **No `pytz`** anywhere; project uses stdlib `zoneinfo`-style imports.
- **No `default_app_config`** (removed in Django 5.0).
- **No `USE_L10N`** setting (deprecated in 4.0, removed in 5.0).
- **No `smart_text` / `ugettext` / `force_text` / `ifequal` / `ifnotequal` / `NullBooleanField`** (long-deprecated APIs removed across 4.0–5.0).

Conclusion: **no application code changes are anticipated**. Test suite must still run to catch surprises (e.g. third-party-package interactions, signal-handler shape changes).

### Dependency bumps required

The Django-coupled libraries in [backend/requirements.txt](../backend/requirements.txt) need version bumps (current → minimum-supporting-Django-5.2). Exact target version is the latest stable in each line at implementation time; the table below is the minimum bar:

| Package | Current | Minimum for Django 5.2 | Notes |
|---------|---------|------------------------|-------|
| `Django` | 4.2.7 | latest 5.2.x | Pin to a 5.2.x line, not 5.x, to avoid silent 5.3+ upgrades. |
| `djangorestframework` | 3.14.0 | 3.15.2+ | DRF 3.15 added Django 5.0/5.1 support; 3.15.2 added 5.2. |
| `django-cors-headers` | 4.3.1 | 4.5.0+ | 4.5+ tested with Django 5.1+. |
| `django-filter` | 23.3 | 24.3+ | 24.x is the Django 5.x-compatible line. |
| `django-recaptcha` | 3.0.0 | 4.0.0+ | 4.x line supports modern Django. Verify the captcha views still work — recaptcha v3 score check is project-critical (see [CLAUDE.md](../CLAUDE.md) auth section). |
| `django-celery-beat` | 2.6.0 | 2.7.0+ | 2.7 added Django 5.1+ support. |
| `django-dirtyfields` | 1.9.2 | latest | Generally Django-version-agnostic; bump to latest as a hygiene step. |

Packages **not** affected (independent of Django version, no bump required for this upgrade): `psycopg2-binary`, `python-decouple`, `Pillow`, `requests`, `google-auth*`, `python-dateutil`, `pydantic`, `celery`, `redis`, `flower`, `redis-om`, `gunicorn`, `cryptography`. Their bumps are out of scope here (would warrant a separate dependency-hygiene pass).

### Upgrade procedure (Phase 0a; sequential)

1. **Branch off `master`**: `git checkout -b django-5.2-upgrade`.
2. **Edit [backend/requirements.txt](../backend/requirements.txt)** with the version bumps above.
3. **Rebuild backend image locally**: `docker compose build backend`.
4. **Run the existing test suite against PG 15 (still the running server)**:
   ```
   docker compose run --rm backend python manage.py test
   ```
   Test suites of note: [backend/users/test_tag_functionality.py](../backend/users/test_tag_functionality.py) (653+ lines), [backend/videos/tests/test_serializer_optimization.py](../backend/videos/tests/test_serializer_optimization.py). All must pass.
5. **Run with `-Wd` (Python deprecation warnings on)** to surface anything the test suite would otherwise tolerate:
   ```
   docker compose run --rm backend python -Wd manage.py test
   ```
   Address any `RemovedInDjango51Warning` / `RemovedInDjango60Warning` that appear.
6. **Static check**: `docker compose run --rm backend python manage.py check --deploy` should produce no new warnings vs. the 4.2 baseline.
7. **Smoke-test in dev compose** against PG 15: log in, list channels, toggle watch status, run reCAPTCHA-protected flows (register / login).
8. **Deploy to prod** (still on PG 15). Watch `docker compose logs backend` for several hours / a day. Only after Django-on-PG-15 is stable does Phase 0b (PG upgrade) begin.

### Rollback

The Django upgrade is purely application-layer (no DB schema changes — Django 5.2's built-in migrations against an existing 4.2 database are limited to internal contrib apps, all backward-compatible). Rollback = revert the requirements.txt commit + `docker compose build backend` + `docker compose up -d backend`. The DB stays untouched.

## Postgres 15 → 18 Upgrade

### Why dump-restore (not in-place)

Postgres data files are tied to the server's major version. PG 18 will not start against a PG 15 data directory; it requires either `pg_upgrade` (which needs both old and new binaries co-resident) or a logical dump-restore. Since the operator already produces a `pg_dumpall` for the safety backup, dump-restore reuses that artifact and avoids juggling two postgres versions in one container.

### Precondition (out of scope, performed by operator outside this plan)

- A complete `pg_dumpall` of the running PG 15 server, gzipped, exists at a known host path (e.g. `~/yt-gallery-pg15-pre-upgrade.sql.gz`).
- The dump must include all roles and all databases (i.e. produced with `pg_dumpall`, not per-DB `pg_dump`).
- The operator has verified the dump is non-empty and non-truncated (e.g. `gunzip -c ... | wc -l` shows tens of thousands of lines).

### Upgrade procedure (Phase 0b; sequential, all on the prod host)

1. **Capture row counts before** for post-upgrade comparison:
   ```
   docker compose -f docker-compose.prod.yml exec db \
     psql -U postgres -d youtube_gallery -c \
     "SELECT 'users' AS t, count(*) FROM users
      UNION ALL SELECT 'videos', count(*) FROM videos
      UNION ALL SELECT 'user_videos', count(*) FROM user_videos
      UNION ALL SELECT 'user_channels', count(*) FROM user_channels
      UNION ALL SELECT 'channels', count(*) FROM channels
      UNION ALL SELECT 'channel_tags', count(*) FROM channel_tags;"
   ```
   Save the output. This is the rollback / success oracle.

2. **Stop the stack**:
   ```
   docker compose -f docker-compose.prod.yml down
   ```

3. **Bump the `db` image tag** in **both** compose files (`postgres:15` → `postgres:18`):
   - [docker-compose.yml](../docker-compose.yml) — `db` service `image:` line
   - [docker-compose.prod.yml](../docker-compose.prod.yml) — `db` service `image:` line

4. **Destroy the PG 15 data volume** (irreversible — this is why the safety dump exists):
   ```
   docker volume ls | grep postgres_data       # confirm exact name; usually <project>_postgres_data
   docker volume rm <project>_postgres_data
   ```
   The exact volume name depends on the Compose project name (typically the repo directory name, e.g. `youtube-gallery_postgres_data`).

5. **Start only the db service** so PG 18 initializes a fresh empty volume without bringing the application up against an empty database:
   ```
   docker compose -f docker-compose.prod.yml up -d db
   ```

6. **Wait for `pg_isready`** (PG 18 takes ~5–15s to initdb on first start):
   ```
   until docker compose -f docker-compose.prod.yml exec db pg_isready -U postgres; do sleep 2; done
   ```

7. **Restore the safety dump**:
   ```
   gunzip -c ~/yt-gallery-pg15-pre-upgrade.sql.gz \
     | docker compose -f docker-compose.prod.yml exec -T db \
         psql -U postgres -v ON_ERROR_STOP=1 -d postgres
   ```
   `-T` disables TTY allocation so the pipe works. `ON_ERROR_STOP=1` aborts on the first SQL error rather than silently producing a half-restored DB. `-d postgres` connects to the system DB so the dump's own `CREATE DATABASE youtube_gallery` succeeds.

8. **Compare row counts** to step 1 — they must match exactly. If they do not, **do not proceed**; rollback (see below).

9. **Bring up the rest of the stack**:
   ```
   docker compose -f docker-compose.prod.yml up -d
   ```

10. **Application smoke-test**: log in to the web app with a known user, view the channel list, toggle a video's watch status. Confirm no 500s in `docker compose logs backend`.

### Rollback (if step 7 or 8 fails)

The PG 15 source database has not been touched (we destroyed only the Docker volume, not the original server). To revert:

1. Revert the image tag in both compose files: `postgres:18` → `postgres:15`.
2. `docker volume rm <project>_postgres_data` (drops the failed PG 18 volume).
3. `docker compose up -d db`, wait for `pg_isready`.
4. Re-run the restore (step 7) — PG 15 → PG 15 is trivially compatible.
5. `docker compose up -d`.

### Notes on PG 15 → 18 compatibility for this stack

- **Django version** (post-Phase-0a): Django 5.2 LTS, which **officially supports PG 13–18**. This puts us on a vendor-blessed combination. The Django upgrade in Phase 0a is the prerequisite that makes this true.
- **Rejected alternatives** (kept here as a record of the decision):
  - *Stay on Django 4.2 + use PG 18*: an "unofficial but works in practice" position. Rejected because Django 4.2 is at end-of-life (security support ended April 2026) and we'd be deferring a needed framework upgrade only to do it under more pressure later.
  - *Stay on Django 4.2 + downgrade target to PG 17*: would still be on EOL Django; doesn't address the underlying staleness.
- **Extensions**: this codebase enables `pg_trgm` (verified in [backend/users/migrations/0006_enable_pg_trgm_extension.py](../backend/users/migrations/0006_enable_pg_trgm_extension.py)). `pg_trgm` ships with PG 18's contrib package; the `pg_dumpall` text dump preserves the `CREATE EXTENSION pg_trgm` calls and the restore re-enables it automatically. No manual action needed.
- **Raw SQL surfaces** (verified):
  - [backend/users/migrations/0003_add_performance_indexes.py](../backend/users/migrations/0003_add_performance_indexes.py) — `RunSQL` for index creation; standard syntax, version-agnostic.
  - [backend/users/migrations/0006_enable_pg_trgm_extension.py](../backend/users/migrations/0006_enable_pg_trgm_extension.py) — extension enable; works on PG 12+.
  - [backend/videos/management/commands/migrate_sqlite_data.py](../backend/videos/management/commands/migrate_sqlite_data.py) — one-time SQLite → Postgres migration; not run at runtime.
  - No raw SQL in views, services, or serializers.
- **`pg_dumpall` format**: text format (default) is forward-compatible — a PG 15 dump restores cleanly into PG 18.
- **psycopg2 / psycopg3**: this project uses `psycopg2-binary` (in requirements.txt). Both psycopg2 ≥ 2.9 and psycopg3 are wire-compatible with PG 18 — no driver bump required.

## Technical Design

### Container image

**Base image decision**: use **`postgres:18-alpine`** as the base (matching the post-upgrade `db` major version), not generic `alpine:3.20`. Reason: alpine 3.20's apk repos do not ship `postgresql18-client`; pulling the official `postgres:18-alpine` image guarantees `pg_dumpall` exactly matches the server major version with zero apk-version-pinning effort. It is built on Alpine, so `apk add` still works for the additional tools. **This image must only be built after the [Postgres 15 → 18 Upgrade](#postgres-15--18-upgrade) phase has completed** — otherwise it will produce a v18 client trying to dump a v15 server and `pg_dumpall` will refuse with a version-mismatch error.

`backup/Dockerfile` — small, single-stage:

```dockerfile
FROM postgres:18-alpine
RUN apk add --no-cache rclone tzdata bash gzip
COPY run-backup.sh /usr/local/bin/run-backup.sh
COPY restore.sh    /usr/local/bin/restore.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY crontab       /etc/crontabs/root
RUN chmod +x /usr/local/bin/run-backup.sh /usr/local/bin/restore.sh /usr/local/bin/entrypoint.sh \
 && mkdir -p /backups /config/rclone
VOLUME ["/backups", "/config/rclone"]
ENV TZ=Europe/Bratislava \
    BACKUP_DIR=/backups \
    RCLONE_CONFIG=/config/rclone/rclone.conf \
    RCLONE_REMOTE=onedrive \
    RCLONE_DEST_PATH=youtube-gallery-backups \
    BACKUP_RETAIN_LOCAL=2 \
    BACKUP_RETAIN_REMOTE_DAYS=180
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["cron"]
```

Notes on package choices:
- **No `dcron`**: BusyBox already ships `crond` in Alpine. Adding `dcron` (Dillon's cron, an alternative daemon) would replace it for no benefit on a service that runs continuously and never sleeps. BusyBox `crond -f -l 8 -c /etc/crontabs` runs in foreground at log level 8 and reads crontabs from `/etc/crontabs/` (the Alpine convention) rather than the BusyBox default `/var/spool/cron/crontabs/`.
- **No `coreutils`**: BusyBox `ls -1t`, `xargs -r`, `mktemp -d`, `gunzip`, `gzip` all work for our needs. Adding `coreutils` would shadow BusyBox in PATH and create unpredictable behavior.
- **`bash`** is required because both scripts use `[[ ... ]]` and `set -o pipefail` reliably; Alpine's default `ash` would not be safe.
- **`tzdata`** is required so `TZ=Europe/Bratislava` actually resolves (otherwise cron runs in UTC).
- **No explicit user**: the base `postgres:18-alpine` image creates a `postgres` user but does not switch to it; this image runs as root, which is acceptable for an isolated backup container that holds no secrets in its image and only has read-only access to a config volume.

`backup/crontab` (single line; trailing newline required by BusyBox crond):

```cron
0 2 1 * * /usr/local/bin/run-backup.sh >> /proc/1/fd/1 2>&1
```

`backup/entrypoint.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f "${RCLONE_CONFIG}" ]]; then
  echo "ERROR: rclone config not found at ${RCLONE_CONFIG}" >&2
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
```

### Backup script

`backup/run-backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
timestamp="$(date +%Y%m%d-%H%M%S)"
dump_file="${BACKUP_DIR}/youtube-gallery-${timestamp}.sql.gz"

export PGPASSWORD="${DB_PASSWORD}"
pg_dumpall \
  -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" \
  | gzip -9 > "${dump_file}"

rclone copy "${dump_file}" "${RCLONE_REMOTE}:${RCLONE_DEST_PATH}/" \
  --config "${RCLONE_CONFIG}"

rclone delete "${RCLONE_REMOTE}:${RCLONE_DEST_PATH}/" \
  --min-age "${BACKUP_RETAIN_REMOTE_DAYS}d" --config "${RCLONE_CONFIG}"

# Local retention: keep newest BACKUP_RETAIN_LOCAL files; delete the rest.
# `ls -1t` works on BusyBox; `xargs -r` does not run rm on empty input.
ls -1t "${BACKUP_DIR}"/youtube-gallery-*.sql.gz \
  | tail -n +"$((BACKUP_RETAIN_LOCAL + 1))" | xargs -r rm --

echo "backup complete: ${dump_file}"
```

Notes:
- `set -euo pipefail` plus `pipefail` means a `pg_dumpall` failure propagates even though it pipes into `gzip`.
- The pipe `pg_dumpall | gzip` keeps memory bounded — never materializes the full dump in memory.
- Local retention runs **after** the upload succeeded, so a network blip cannot leave us with neither local nor remote copies of the latest dump.

### Restore script

`backup/restore.sh`:

```bash
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
  onedrive:*)
    rclone copy "${source}" "${work_dir}/" --config "${RCLONE_CONFIG}"
    dump="${work_dir}/$(basename "${source#onedrive:}")"
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
```

Design points:
- **Safety gate**: `RESTORE_CONFIRM=YES` is mandatory. `pg_dumpall` output starts with `DROP ROLE` / `DROP DATABASE` and will wipe the target server.
- **Three input modes**: explicit local path, explicit `onedrive:` path, or `--latest-remote` for the common "give me the newest backup" case.
- **`--set ON_ERROR_STOP=on`**: stops on the first SQL error rather than producing a half-restored database.
- **Connects to the `postgres` system DB**: `pg_dumpall` recreates databases, so connecting to the app DB would fail when the script tries to drop it.
- Reuses the same env vars as the backup container, so it runs as `docker compose run --rm db-backup /usr/local/bin/restore.sh ...`.

### Compose integration

Both compose files get the same service, with two important differences from a naïve approach:

1. **Prod `db` has no healthcheck** today. We have two choices: (a) add a healthcheck to prod `db` so backup can wait on `service_healthy`, or (b) use `condition: service_started` and rely on `pg_isready` polling inside the backup container before the first cron fires. **Decision: pick (a)** — adding the same healthcheck block to prod `db` is a one-line change with zero behavioral risk and matches dev. It is included as a sub-step of Phase 2.
2. **Prod compose hardcodes DB credentials** in the `db` service block (and uses no `env_file`). The backup service must read those same credentials. **Decision**: in prod, hardcode `DB_*` env vars in the backup service's `environment:` block, mirroring the prod `db` values. In dev, use `env_file: .env`. This keeps the existing prod model (no `.env` on prod) intact.

`docker-compose.prod.yml` — additions:

```yaml
# 1. Add to existing db service:
db:
  # ...existing fields preserved...
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 5s
    timeout: 5s
    retries: 5

# 2. New service:
db-backup:
  build: ./backup
  depends_on:
    db:
      condition: service_healthy
  environment:
    DB_HOST: db
    DB_PORT: '5432'
    DB_USER: postgres
    DB_PASSWORD: postgres
    DB_NAME: youtube_gallery
    TZ: Europe/Bratislava
  volumes:
    - backup_data:/backups
    - ./backup/rclone:/config/rclone:ro
  networks:
    - youtube_gallery_network
  restart: unless-stopped
```

Top-level `volumes:` block addition (prod):

```yaml
volumes:
  postgres_data:
    driver: local
  media_files:
    driver: local
  backup_data:        # <-- new
    driver: local
```

`docker-compose.yml` (dev) — additions:

```yaml
db-backup:
  build: ./backup
  profiles: [backup]   # opt-in only: docker compose --profile backup up db-backup
  depends_on:
    db:
      condition: service_healthy
  env_file: .env       # dev uses the same .env that the db/backend services consume
  environment:
    TZ: Europe/Bratislava
  volumes:
    - backup_data:/backups
    - ./backup/rclone:/config/rclone:ro
  networks:
    - youtube_gallery_network
```

Top-level `volumes:` block addition (dev):

```yaml
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  backup_data:        # <-- new
    driver: local
```

**`docker compose run` semantics** (verified): when a service has an `ENTRYPOINT`, `docker compose run --rm db-backup /usr/local/bin/restore.sh --latest-remote` passes `restore.sh --latest-remote` as **args to the entrypoint**, not as a CMD override. Our `entrypoint.sh` handles this by checking `$# -gt 0 && "$1" != "cron"` and `exec`ing the args directly. This makes ad-hoc invocation work without `--entrypoint` overrides.

**.gitignore** — append a new section so the OAuth refresh token in `rclone.conf` cannot be committed. Insert after the existing `# credentials` section in [.gitignore](../.gitignore):

```
# backup
backup/rclone/rclone.conf
```

Note: the existing `.env*` rule already covers any `.env` files inside `backup/`; `client_secret*` is unrelated. The keep-file `backup/rclone/.gitkeep` (created in Phase 1) is not matched by the new rule and will commit normally.

### Bootstrap (one-time, host-side)

Documented in `backup/README.md`. Steps are sequential — each depends on the previous.

1. **Build the image**:
   ```
   docker compose -f docker-compose.prod.yml build db-backup
   ```
2. **Create the host config directory** (the user does this manually per the project's "no Bash file ops" rule; the README instructs them):
   ```
   mkdir -p backup/rclone
   ```
3. **Run interactive `rclone config`** inside the container, with the host directory mounted so the resulting token persists across runs. The entrypoint's `exec "$@"` branch makes the override safe; we additionally pass `--entrypoint` to skip its env-validation since `rclone.conf` does not yet exist:
   ```
   docker compose -f docker-compose.prod.yml run --rm \
     --entrypoint rclone \
     -v "$PWD/backup/rclone:/config/rclone" \
     db-backup --config /config/rclone/rclone.conf config
   ```
   In the prompts:
   - `n` — new remote
   - name: `onedrive`
   - storage: `onedrive`
   - leave `client_id` / `client_secret` blank (use rclone's defaults)
   - account type: `onedrive` (Personal) or `business` depending on the user's account; **the README must call this out** because rclone's flow asks for it explicitly.
   - complete the OAuth web flow (rclone opens a localhost URL or prints one for headless mode — `n` to "Use auto config?" if running on a remote host).
4. **Verify** the remote was registered:
   ```
   docker compose -f docker-compose.prod.yml run --rm \
     --entrypoint rclone \
     db-backup --config /config/rclone/rclone.conf listremotes
   ```
   Output must include `onedrive:`.
5. **Verify the destination path is writable**:
   ```
   docker compose -f docker-compose.prod.yml run --rm \
     --entrypoint rclone \
     db-backup --config /config/rclone/rclone.conf mkdir onedrive:youtube-gallery-backups
   ```
6. **Confirm `rclone.conf` is git-ignored**:
   ```
   git check-ignore backup/rclone/rclone.conf
   ```
   Should print the path (= ignored). `git status` should not list it.

### `backup/README.md` content outline

The README is the operator's runbook. Required sections:

1. **Purpose** — one paragraph: monthly Postgres dump → OneDrive, 6-month remote retention, restore script.
2. **Bootstrap** — the six numbered steps above.
3. **Operations**:
   - **Force a backup now**: `docker compose -f docker-compose.prod.yml run --rm db-backup /usr/local/bin/run-backup.sh`
   - **List remote backups**: `docker compose -f docker-compose.prod.yml run --rm --entrypoint rclone db-backup --config /config/rclone/rclone.conf lsf onedrive:youtube-gallery-backups/`
   - **Inspect cron**: `docker compose -f docker-compose.prod.yml exec db-backup crontab -l` and `docker compose -f docker-compose.prod.yml logs db-backup`
4. **Restore** — three explicit recipes for the three input modes (local path, `onedrive:` path, `--latest-remote`) with `RESTORE_CONFIRM=YES`. **Bold warning** that this overwrites all roles and databases.
5. **Security note** — `pg_dumpall` includes hashed role passwords. The OneDrive destination must be a private account, not shared. Recommend `rclone crypt` if the account is ever shared.
6. **Troubleshooting**:
   - "rclone config not found" → mount `backup/rclone/rclone.conf` and re-run bootstrap.
   - OAuth token expired → re-run `rclone config reconnect onedrive:` against the same volume.
   - `pg_isready` failure inside the container → check that `db` is on `youtube_gallery_network` and reachable.

## Implementation Phases

Phases are organized so independent file edits in Phases 1–2 can run in parallel; Phases 0a → 0b → 3 → 4 → 5 are inherently sequential. **Phase 0b must complete before Phase 4** (the backup image's `pg_dumpall` is v18 and cannot dump a v15 server). Phases 1–2 (file authoring + compose edits) may run in parallel with the planning of Phases 0a/0b.

### Phase 0a — Django 4.2 → 5.2 LTS upgrade (still on PG 15; **strictly sequential, deploy-and-soak before 0b**)

Full procedure documented above in [Django 4.2 → 5.2 LTS Upgrade](#django-42--52-lts-upgrade). Summary: branch → bump dependency versions in [backend/requirements.txt](../backend/requirements.txt) → rebuild backend image → run test suite → run with deprecation warnings on → `manage.py check --deploy` → dev smoke-test → deploy to prod against PG 15 → soak. Phase 0b only begins after this phase has been stable in prod for at least one full day to surface any latent runtime issues that the test suite missed.

Rollback: revert requirements.txt, rebuild, redeploy. DB untouched.

### Phase 0b — Postgres 15 → 18 upgrade (precondition: Phase 0a deployed + manual safety dump exists; **strictly sequential**)

Full procedure documented above in [Postgres 15 → 18 Upgrade](#postgres-15--18-upgrade). Summary: snapshot row counts → stop stack → bump `db` image tag in both compose files → drop `postgres_data` volume → start fresh PG 18 → restore safety dump via `psql` → compare row counts → bring rest of stack up → smoke-test. Rollback path is documented and verified before declaring this phase complete.

This phase produces the precondition the backup feature needs: a running `postgres:18` `db` service with all production data intact, hosted by Django 5.2.

### Phase 1 — Author the `backup/` source tree (**all sub-tasks parallelizable; can run alongside Phases 0a/0b planning**)

The user creates the `backup/` directory and the `backup/rclone/` subdirectory (per the project's no-Bash-file-ops rule). All seven files below can then be authored independently — no file imports another at edit time:

- `backup/Dockerfile` — exact contents in the Container image section.
- `backup/entrypoint.sh` — exact contents in the Container image section.
- `backup/run-backup.sh` — exact contents in the Backup script section.
- `backup/restore.sh` — exact contents in the Restore script section.
- `backup/crontab` — single line, trailing newline.
- `backup/README.md` — six-section structure in the Bootstrap section.
- `backup/rclone/.gitkeep` — empty file so the empty directory survives in git.

### Phase 2 — Wire into Compose and ignore secrets (**parallelizable with Phase 1; the `db` image-tag bump in this phase is required by Phase 0b and must be in place before Phase 0b runs**)

Three edits, no inter-dependencies between files:

- [.gitignore](../.gitignore) — append the `# backup` block.
- [docker-compose.yml](../docker-compose.yml) — three changes:
  1. bump `db.image` from `postgres:15` to `postgres:18` (Phase 0b dependency),
  2. add `db-backup` service (with `profiles: [backup]`),
  3. add `backup_data` to top-level `volumes`.
- [docker-compose.prod.yml](../docker-compose.prod.yml) — four changes:
  1. bump `db.image` from `postgres:15` to `postgres:18` (Phase 0b dependency),
  2. add a `healthcheck` block to the existing `db` service,
  3. add the `db-backup` service,
  4. add `backup_data` to top-level `volumes`.

### Phase 3 — Bootstrap rclone on the prod host (Pending; **sequential after Phases 0a + 0b + 1 + 2**)

Operator follows the six-step bootstrap above. Output: a working `backup/rclone/rclone.conf` on the host, never committed.

### Phase 4 — Manual verification (Pending; **sequential after 3**)

Two checks, in order:
1. Force a one-shot backup and confirm both the local file in `backup_data` and the OneDrive object exist.
2. Restore-test against a throwaway Postgres (full procedure in Testing Strategy). **This is the gate that turns "files in OneDrive" into "verified backups."**

### Phase 5 — Schedule check (Pending; **sequential after 4**)

Confirm container is running with `restart: unless-stopped`, `crontab -l` shows the entry, `docker logs db-backup` shows `crond` is active, and the next-month-1st 02:00 fire is on the calendar.

### Phase 6 — Out of scope for v1

- Failure alerting (email / Slack / heartbeat-style dead-man monitoring)
- At-rest dump encryption (rclone `crypt` backend)
- Secondary off-OneDrive copy (e.g., S3 mirror)
- Wider dependency-hygiene pass (bumping `Pillow`, `requests`, `celery`, `gunicorn`, etc.) — Phase 0a only bumps the Django-coupled libraries; everything else stays put.
- `psycopg2-binary` → `psycopg[binary]` (psycopg3) migration — Django 5.0+ supports both; this plan stays on psycopg2 to minimize variables.
- Future Postgres major upgrades (e.g. 18 → 19 when 19 lands) — when that happens, the backup image's `FROM postgres:18-alpine` tag must be bumped in lockstep with the `db` service tag.

## Performance Considerations

- **Memory**: streamed pipe `pg_dumpall | gzip` keeps memory bounded; no buffering of the full dump.
- **Disk**: `BACKUP_RETAIN_LOCAL=2` caps local consumption at ~2× compressed dump size.
- **Network**: monthly upload — cost negligible on any modern connection.
- **DB load**: `pg_dumpall` takes per-database transactional snapshots. At 02:00 on the 1st, application traffic is minimal and the snapshot has no observable impact.
- **Rclone delete cost**: a single OneDrive listing + delete per month — well within OneDrive API limits.

## Testing Strategy

### Backend / DB layer

These tests are independent and can be executed in any order, but the restore test depends on the manual-run test producing a remote object. Within each test, commands are sequential.

- **Manual run** (parallelizable): `docker compose -f docker-compose.prod.yml run --rm db-backup /usr/local/bin/run-backup.sh` — exits 0; gzipped dump appears under the `backup_data` volume and on OneDrive under `youtube-gallery-backups/`. Verify with:
  ```
  docker compose -f docker-compose.prod.yml run --rm --entrypoint rclone db-backup \
    --config /config/rclone/rclone.conf lsf onedrive:youtube-gallery-backups/
  ```
- **Restore test (the real gate)** — depends on a remote object existing:
  1. Stand up an isolated Postgres on the host (matching the upgraded major version): `docker run --rm -d --name pg-test -e POSTGRES_PASSWORD=test -p 55432:5432 postgres:18`.
  2. Run restore against it from the backup container. On Debian, `host.docker.internal` is not resolvable by default — `--add-host=host.docker.internal:host-gateway` is **required** (Docker on Linux honors the `host-gateway` magic value since 20.10):
     ```
     docker compose -f docker-compose.prod.yml run --rm \
       --add-host=host.docker.internal:host-gateway \
       -e DB_HOST=host.docker.internal -e DB_PORT=55432 \
       -e DB_USER=postgres -e DB_PASSWORD=test \
       -e RESTORE_CONFIRM=YES \
       db-backup /usr/local/bin/restore.sh --latest-remote
     ```
  3. Confirm row counts match production for the **actual** table names (these are custom `db_table` Meta values, not Django defaults):
     - `users` (User model — table renamed from default `users_user`)
     - `videos` (Video model — table renamed from default `videos_video`)
     - `user_videos` (UserVideo)
     - `user_channels` (UserChannel)
     - `channels` (Channel)
     - `channel_tags` (ChannelTag — table renamed from default `videos_tag`)
     - `user_channel_tags`, `user_watch_preferences`, `user_daily_quotas`, `user_youtube_credentials`, `update_frequencies`
     Verification query (run via `psql` against the restored DB):
     ```sql
     SELECT 'users' AS t, count(*) FROM users
     UNION ALL SELECT 'videos', count(*) FROM videos
     UNION ALL SELECT 'user_videos', count(*) FROM user_videos
     UNION ALL SELECT 'user_channels', count(*) FROM user_channels
     UNION ALL SELECT 'channels', count(*) FROM channels
     UNION ALL SELECT 'channel_tags', count(*) FROM channel_tags;
     ```
  4. Confirm a known user can authenticate (token-based login via `POST /api/auth/login`) against the restored DB. This is the "data is actually intact" check.
  5. Tear down: `docker rm -f pg-test`.
- **Safety gate** (parallelizable): `docker compose run --rm db-backup /usr/local/bin/restore.sh /backups/anything.sql.gz` (no `RESTORE_CONFIRM`) exits 2 with the error message and does not connect to Postgres.
- **Failure path** (parallelizable): stop `db` (`docker compose stop db`), run `run-backup.sh`; confirm non-zero exit, the partial gzipped file is not uploaded (rclone is never invoked because `set -e` aborts the pipeline). Verify nothing new appeared on OneDrive.
- **Retention** (two independent sub-tests):
  - **Remote**: place a synthetic `youtube-gallery-20251101-020000.sql.gz` (older than 180d at test time) on OneDrive via `rclone copy`, run `run-backup.sh`, confirm `rclone lsf onedrive:youtube-gallery-backups/` no longer lists it.
  - **Local**: place ≥ 3 synthetic `youtube-gallery-*.sql.gz` files in the `backup_data` volume, run `run-backup.sh`, confirm only the newest 2 (by mtime) plus the newly created dump remain — i.e., the script keeps the configured `BACKUP_RETAIN_LOCAL=2` newest files at the moment of pruning.
- **Schedule check** (parallelizable): `docker compose -f docker-compose.prod.yml exec db-backup crontab -l` shows the single line from `backup/crontab`; `docker compose -f docker-compose.prod.yml logs db-backup` shows the entrypoint's `starting BusyBox crond in foreground` line and no errors.

### Frontend / Integration

- No frontend changes — UI is unaffected.
- No new backend code paths — Postgres credentials and network are reused.

## Risks and Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| OneDrive OAuth token revoked or expired beyond refresh | High — silent failure | v1: include manual `rclone listremotes` check in monthly ops. v2 (out of scope): alert on non-zero script exit. |
| `pg_dumpall` includes (hashed) role passwords — sensitive file leaves the server | Medium | Document in `backup/README.md`; OneDrive destination is private. Consider rclone `crypt` backend if account is ever shared. |
| Backup runs while a long migration is in flight | Low | `pg_dumpall` uses transactional snapshots per DB; safe but may extend lock contention briefly. 02:00 monthly minimises overlap. |
| `rclone.conf` committed by accident | High | `.gitignore` entry added; bootstrap step explicitly checks `git status`. |
| Restore wipes the wrong server | High | `RESTORE_CONFIRM=YES` env var gate; restore intentionally cannot be a one-line accident. |
| Image drifts (future Postgres major upgrade) | Medium | The backup image's `FROM postgres:18-alpine` tag pins the client major version to the server's. Future `db` service major-version bumps must update this tag in lockstep — otherwise `pg_dumpall` will refuse to dump a newer server. |
| PG 15 → 18 upgrade restore fails (truncated dump, SQL error, network blip) | High | Pre-upgrade row-count snapshot is the success oracle (Phase 0b step 1 vs step 8). On mismatch or `psql` non-zero exit, follow the [Rollback](#rollback-if-step-7-or-8-fails) procedure: revert image tag to `postgres:15`, drop volume, re-restore. The PG 15 source DB is not touched during the upgrade. |
| Django 4.2 → 5.2 dependency conflict (DRF / cors-headers / filter / recaptcha / celery-beat version skew) | Medium | Phase 0a runs the existing test suite against the new dependency set before deploy. If any package's 5.2-compatible release introduces a behavior change, the test suite is the first signal. Pip's resolver will surface incompatibilities at install time. |
| Latent deprecation in app code that test suite tolerates | Medium | Phase 0a step 5 runs tests with `python -Wd` (deprecation warnings on). Codebase grep already cleared the highest-risk APIs (`pytz`, `django.utils.timezone.utc`, `default_app_config`, etc.); residual risk is in third-party-library shims. |
| `django-recaptcha` 3.x → 4.x behavior change (auth flow is project-critical) | Medium | recaptcha v3 score-check is called out in [CLAUDE.md](../CLAUDE.md). Smoke-test register + login flows specifically (Phase 0a step 7) — these are the only two views that exercise the captcha. |
| `pg_dumpall` produces version-coupled SQL | Low | The dump can be restored on any same-major-version server (and is forward-compatible PG 15 → 18 in text format, which is what we use). Cross-major *backward* restore (e.g. PG 18 → PG 15) is **not supported**. |
| `host.docker.internal` not resolvable on Debian during restore-test | Low | Restore-test recipe always includes `--add-host=host.docker.internal:host-gateway` (mandatory on Linux/Debian; harmless on Docker Desktop). |
| BusyBox `crond` swallows job stderr unless logged | Low | Crontab line redirects stdout+stderr to `/proc/1/fd/1` so `docker logs db-backup` shows everything. |

## Conclusion

This change does three things in a deliberate order: bumps Django from 4.2 (end-of-life as of April 2026) to 5.2 LTS (security-supported through April 2028), then upgrades Postgres from 15 to 18, then ships the project's first backup infrastructure. The Django upgrade comes first because Django 5.2 is what makes PG 18 a vendor-supported combination — sequencing avoids stacking two unverified variables in one maintenance window. A codebase pre-check confirmed the Django-side changes are confined to dependency-version bumps; no application code rewrites are anticipated, but the existing test suite and a deprecation-warning-on test run gate the deploy. The PG upgrade is a destroy-volume / dump-restore cycle gated by a manually-prepared safety dump (precondition handled outside this plan), with an explicit row-count oracle and a documented rollback path. The backup feature is roughly 200 lines across a Dockerfile, two shell scripts, a crontab entry, and Compose additions. After Phases 0a (Django) → 0b (PG upgrade) → bootstrap (rclone OAuth) → first verified restore-test, the stack will be on current major versions of both framework and database, with its first off-host disaster-recovery copy of user data.
