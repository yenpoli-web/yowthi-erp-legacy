# pCloud offsite backup

This copies verified Production snapshots to the YOW THI pCloud account in the Europe data region.

## Current policy

- Source: `/var/backups/yowthi-erp/snapshots`
- Destination: `pcloud:YOWTHI-ERP-Backups/yowthi-erp-legacy/snapshots`
- Schedule: daily at 04:30 Asia/Bangkok, with up to 15 minutes randomized delay
- Transfer mode: direct upload over pCloud OAuth; no additional client-side encryption
- Retention: remote snapshots are retained; this process never deletes pCloud files
- Integrity: every local `SHA256SUMS` is verified before upload, then rclone checks every local file against pCloud
- Immutability: an existing remote file with different content causes failure instead of overwrite

The direct-upload policy applies only to the current Legacy ERP. A future replacement ERP will use a separately designed encrypted offsite backup.

## Credentials

The OAuth configuration is stored outside Git:

```text
/root/.config/rclone/rclone.conf
```

It must remain owned by `root:root` with mode `0600`. Never commit or print the access token.

## Install

```bash
sudo install -o root -g root -m 0755 \
  ops/offsite-backup/yowthi-offsite-backup.sh \
  /usr/local/sbin/yowthi-offsite-backup
sudo install -o root -g root -m 0644 \
  ops/offsite-backup/yowthi-offsite-backup.service \
  /etc/systemd/system/yowthi-offsite-backup.service
sudo install -o root -g root -m 0644 \
  ops/offsite-backup/yowthi-offsite-backup.timer \
  /etc/systemd/system/yowthi-offsite-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now yowthi-offsite-backup.timer
```

## Verify and inspect

```bash
sudo systemctl start yowthi-offsite-backup.service
sudo systemctl status yowthi-offsite-backup.service
sudo systemctl list-timers yowthi-offsite-backup.timer
sudo journalctl -u yowthi-offsite-backup.service --since today
sudo rclone lsd pcloud:YOWTHI-ERP-Backups/yowthi-erp-legacy/snapshots
```

## Restore one snapshot

```bash
snapshot=YYYYMMDDTHHMMSS+0700
restore=/path/to/empty/restore-directory
sudo rclone copy \
  "pcloud:YOWTHI-ERP-Backups/yowthi-erp-legacy/snapshots/$snapshot" \
  "$restore"
sudo sh -c "cd '$restore' && sha256sum -c SHA256SUMS"
```
