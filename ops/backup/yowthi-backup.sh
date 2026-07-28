#!/usr/bin/env bash
set -Eeuo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
umask 077

readonly BACKUP_ROOT=/var/backups/yowthi-erp
readonly SNAPSHOT_ROOT="${BACKUP_ROOT}/snapshots"
readonly DATABASE_NAME=yowthi_erp
readonly APPLICATION_ROOT=/var/www/yowthi-erp
readonly UPLOADS_DIR="${APPLICATION_ROOT}/backend/public/uploads"
readonly STAMP="$(date '+%Y%m%dT%H%M%S%z')"
readonly FINAL_DIR="${SNAPSHOT_ROOT}/${STAMP}"

WORK_DIR=

cleanup() {
  if [[ -n "${WORK_DIR}" && -d "${WORK_DIR}" ]]; then
    rm -rf --one-file-system -- "${WORK_DIR}"
  fi
}

trap cleanup EXIT

if [[ "${BACKUP_ROOT}" != /var/backups/yowthi-erp ]]; then
  echo "Refusing unexpected backup root: ${BACKUP_ROOT}" >&2
  exit 1
fi

if [[ ! -d "${UPLOADS_DIR}" ]]; then
  echo "Uploads directory does not exist: ${UPLOADS_DIR}" >&2
  exit 1
fi

install -d -m 0700 -o root -g root "${BACKUP_ROOT}" "${SNAPSHOT_ROOT}"
WORK_DIR="$(mktemp -d "${BACKUP_ROOT}/.incomplete-${STAMP}.XXXXXX")"

if [[ -e "${FINAL_DIR}" ]]; then
  echo "Backup snapshot already exists: ${FINAL_DIR}" >&2
  exit 1
fi

runuser -u postgres -- pg_dump \
  --format=custom \
  --compress=6 \
  --no-owner \
  --no-acl \
  "${DATABASE_NAME}" > "${WORK_DIR}/database.dump"

tar \
  --create \
  --gzip \
  --file "${WORK_DIR}/uploads.tar.gz" \
  --directory "$(dirname "${UPLOADS_DIR}")" \
  "$(basename "${UPLOADS_DIR}")"

deployed_commit="$(git -C "${APPLICATION_ROOT}" rev-parse HEAD 2>/dev/null || printf 'unknown')"
database_size="$(stat -c '%s' "${WORK_DIR}/database.dump")"
uploads_size="$(stat -c '%s' "${WORK_DIR}/uploads.tar.gz")"
uploads_count="$(find "${UPLOADS_DIR}" -maxdepth 1 -type f -printf '.' | wc -c)"

cat > "${WORK_DIR}/metadata.txt" <<EOF
format_version=1
created_at=$(date --iso-8601=seconds)
hostname=$(hostname)
database_name=${DATABASE_NAME}
deployed_commit=${deployed_commit}
database_bytes=${database_size}
uploads_archive_bytes=${uploads_size}
uploads_file_count=${uploads_count}
EOF

(
  cd "${WORK_DIR}"
  sha256sum database.dump uploads.tar.gz metadata.txt > SHA256SUMS
  sha256sum --check SHA256SUMS
)

pg_restore --list "${WORK_DIR}/database.dump" > /dev/null
tar --list --gzip --file "${WORK_DIR}/uploads.tar.gz" > /dev/null

chmod 0600 "${WORK_DIR}"/*
mv -- "${WORK_DIR}" "${FINAL_DIR}"
WORK_DIR=
ln -sfn "snapshots/${STAMP}" "${BACKUP_ROOT}/latest"

logger -t yowthi-backup "Created verified snapshot ${FINAL_DIR}"
printf '%s\n' "${FINAL_DIR}"
