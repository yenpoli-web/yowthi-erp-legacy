#!/usr/bin/env bash
set -Eeuo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

readonly BACKUP_ROOT=/var/backups/yowthi-erp
readonly SNAPSHOT_ROOT="${BACKUP_ROOT}/snapshots"
readonly REQUESTED_SNAPSHOT="${1:-${BACKUP_ROOT}/latest}"
readonly RESOLVED_SNAPSHOT="$(readlink -f -- "${REQUESTED_SNAPSHOT}")"

case "${RESOLVED_SNAPSHOT}" in
  "${SNAPSHOT_ROOT}"/*) ;;
  *)
    echo "Refusing snapshot outside ${SNAPSHOT_ROOT}: ${RESOLVED_SNAPSHOT}" >&2
    exit 1
    ;;
esac

if [[ ! -d "${RESOLVED_SNAPSHOT}" ]]; then
  echo "Snapshot does not exist: ${RESOLVED_SNAPSHOT}" >&2
  exit 1
fi

for required_file in database.dump uploads.tar.gz metadata.txt SHA256SUMS; do
  if [[ ! -f "${RESOLVED_SNAPSHOT}/${required_file}" ]]; then
    echo "Snapshot is missing ${required_file}" >&2
    exit 1
  fi
done

(
  cd "${RESOLVED_SNAPSHOT}"
  sha256sum --check SHA256SUMS
)

pg_restore --list "${RESOLVED_SNAPSHOT}/database.dump" > /dev/null
tar --list --gzip --file "${RESOLVED_SNAPSHOT}/uploads.tar.gz" > /dev/null

printf 'Verified snapshot: %s\n' "${RESOLVED_SNAPSHOT}"
