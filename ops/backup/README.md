# Production Backup Operations

This backup job creates a timestamped snapshot containing:

- PostgreSQL custom-format dump of `yowthi_erp`;
- compressed archive of `backend/public/uploads`;
- non-secret metadata including the deployed Git commit;
- SHA-256 checksums.

The job verifies checksums, the PostgreSQL archive catalogue and the uploads archive before publishing a snapshot under `/var/backups/yowthi-erp/snapshots`.

## Production installation

Install the reviewed scripts and units with root ownership:

```bash
install -m 0750 -o root -g root ops/backup/yowthi-backup.sh /usr/local/sbin/yowthi-backup
install -m 0750 -o root -g root ops/backup/yowthi-backup-verify.sh /usr/local/sbin/yowthi-backup-verify
install -m 0644 -o root -g root ops/systemd/yowthi-backup.service /etc/systemd/system/yowthi-backup.service
install -m 0644 -o root -g root ops/systemd/yowthi-backup.timer /etc/systemd/system/yowthi-backup.timer
systemctl daemon-reload
systemctl enable --now yowthi-backup.timer
```

Run and inspect the first snapshot:

```bash
systemctl start yowthi-backup.service
systemctl status yowthi-backup.service --no-pager
/usr/local/sbin/yowthi-backup-verify /var/backups/yowthi-erp/latest
```

## Safety and retention

- Backup files are root-only and are not stored in Git.
- The job never modifies the application database or runtime uploads.
- Failed runs remain unpublished and their incomplete working directory is removed.
- Automatic deletion is intentionally not enabled until off-VPS retention and restore testing are established.
- `pg_restore --list` validates archive readability but is not a full database restore test.
- At least one verified snapshot must be copied off the VPS after every material Production change.
