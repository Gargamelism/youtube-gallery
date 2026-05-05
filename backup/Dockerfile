FROM postgres:18-alpine
RUN apk add --no-cache rclone bash gzip
COPY run-backup.sh /usr/local/bin/run-backup.sh
COPY restore.sh    /usr/local/bin/restore.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY crontab       /etc/crontabs/root
RUN chmod +x /usr/local/bin/run-backup.sh /usr/local/bin/restore.sh /usr/local/bin/entrypoint.sh \
 && mkdir -p /backups /config/rclone
VOLUME ["/backups", "/config/rclone"]
ENV BACKUP_DIR=/backups \
    RCLONE_CONFIG=/config/rclone/rclone.conf \
    RCLONE_REMOTE=onedrive \
    RCLONE_DEST_PATH=youtube-gallery-backups \
    BACKUP_RETAIN_LOCAL=2 \
    BACKUP_RETAIN_REMOTE_DAYS=180
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["cron"]
