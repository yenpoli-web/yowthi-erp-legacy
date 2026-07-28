#!/usr/bin/env bash

set -eu

local_root=/var/backups/yowthi-erp/snapshots
remote_root=pcloud:YOWTHI-ERP-Backups/yowthi-erp-legacy/snapshots
config_file=/root/.config/rclone/rclone.conf
verified_snapshots=0

test -d "$local_root"
test -r "$config_file"

while IFS= read -r -d '' snapshot; do
  test -f "$snapshot/SHA256SUMS"
  (
    cd "$snapshot"
    sha256sum -c SHA256SUMS
  )
  verified_snapshots=$((verified_snapshots + 1))
done < <(find "$local_root" -mindepth 1 -maxdepth 1 -type d -print0)

if [ "$verified_snapshots" -eq 0 ]; then
  echo 'No local backup snapshots found.' >&2
  exit 1
fi

echo "Uploading $verified_snapshots verified snapshots to pCloud."

rclone copy "$local_root" "$remote_root" \
  --config "$config_file" \
  --immutable \
  --checksum \
  --transfers 2 \
  --checkers 4 \
  --contimeout 10s \
  --timeout 5m \
  --retries 3 \
  --low-level-retries 10 \
  --stats-one-line \
  --log-level INFO

rclone check "$local_root" "$remote_root" \
  --config "$config_file" \
  --one-way \
  --checkers 4 \
  --log-level INFO

echo "Offsite backup verified: snapshots=$verified_snapshots"
