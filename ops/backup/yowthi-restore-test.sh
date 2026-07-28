#!/usr/bin/env bash
set -Eeuo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
umask 077

readonly PRODUCTION_DATABASE=yowthi_erp
readonly SNAPSHOT_ARGUMENT="${1:-}"
readonly STAMP="$(date '+%Y%m%d%H%M%S')"
readonly VERIFY_DATABASE="yowthi_restore_verify_${STAMP}"

SNAPSHOT=
WORK_ROOT=
DATABASE_CREATED=false

cleanup() {
  local resolved_work_root

  set +e

  if [[ "${DATABASE_CREATED}" == true ]]; then
    if [[ "${VERIFY_DATABASE}" =~ ^yowthi_restore_verify_[0-9]{14}$ ]]; then
      runuser -u postgres -- dropdb --if-exists -- "${VERIFY_DATABASE}"
    else
      echo "Refusing to drop unexpected database: ${VERIFY_DATABASE}" >&2
    fi
  fi

  if [[ -z "${WORK_ROOT}" ]]; then
    return
  fi

  resolved_work_root="$(readlink -m -- "${WORK_ROOT}")"
  case "${resolved_work_root}" in
    /var/tmp/yowthi-restore-verify-[0-9]*.*)
      if [[ -d "${resolved_work_root}" ]]; then
        rm -rf --one-file-system -- "${resolved_work_root}"
      fi
      ;;
    *)
      echo "Refusing to remove unexpected work root: ${resolved_work_root}" >&2
      ;;
  esac
}

trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

if [[ "${EUID}" -ne 0 ]]; then
  echo "This restore test must run as root." >&2
  exit 1
fi

if [[ -z "${SNAPSHOT_ARGUMENT}" ]]; then
  echo "Usage: $0 SNAPSHOT_DIRECTORY" >&2
  exit 1
fi

SNAPSHOT="$(readlink -f -- "${SNAPSHOT_ARGUMENT}")"
case "${SNAPSHOT}" in
  /var/backups/yowthi-erp/snapshots/* | /var/tmp/yowthi-restore-source-*) ;;
  *)
    echo "Refusing snapshot outside approved roots: ${SNAPSHOT}" >&2
    exit 1
    ;;
esac

if [[ ! -d "${SNAPSHOT}" ]]; then
  echo "Snapshot does not exist: ${SNAPSHOT}" >&2
  exit 1
fi

for required_file in database.dump uploads.tar.gz metadata.txt SHA256SUMS; do
  if [[ ! -f "${SNAPSHOT}/${required_file}" ]]; then
    echo "Snapshot is missing ${required_file}" >&2
    exit 1
  fi
done

if [[ "${VERIFY_DATABASE}" == "${PRODUCTION_DATABASE}" ]] ||
   [[ ! "${VERIFY_DATABASE}" =~ ^yowthi_restore_verify_[0-9]{14}$ ]]; then
  echo "Unsafe verification database name: ${VERIFY_DATABASE}" >&2
  exit 1
fi

if runuser -u postgres -- psql -Atqc \
  "SELECT 1 FROM pg_database WHERE datname = '${VERIFY_DATABASE}'" | grep -qx 1; then
  echo "Verification database already exists: ${VERIFY_DATABASE}" >&2
  exit 1
fi

(
  cd "${SNAPSHOT}"
  sha256sum --check SHA256SUMS
)

pg_restore --list "${SNAPSHOT}/database.dump" > /dev/null

while IFS= read -r archive_entry; do
  if [[ "${archive_entry}" == /* ]] ||
     [[ "${archive_entry}" == ../* ]] ||
     [[ "${archive_entry}" == *"/../"* ]] ||
     [[ "${archive_entry}" == *"/.." ]]; then
    echo "Unsafe uploads archive entry: ${archive_entry}" >&2
    exit 1
  fi
done < <(tar --list --gzip --file "${SNAPSHOT}/uploads.tar.gz")

WORK_ROOT="$(mktemp -d "/var/tmp/yowthi-restore-verify-${STAMP}.XXXXXX")"
chmod 0700 "${WORK_ROOT}"

runuser -u postgres -- createdb \
  --template=template0 \
  --owner=postgres \
  "${VERIFY_DATABASE}"
DATABASE_CREATED=true

runuser -u postgres -- pg_restore \
  --exit-on-error \
  --no-owner \
  --no-acl \
  --dbname="${VERIFY_DATABASE}" < "${SNAPSHOT}/database.dump"

runuser -u postgres -- pg_dump \
  --schema-only \
  --no-owner \
  --no-acl \
  "${VERIFY_DATABASE}" > /dev/null

table_count="$(runuser -u postgres -- psql -X -qAt -d "${VERIFY_DATABASE}" -c \
  "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')")"
index_count="$(runuser -u postgres -- psql -X -qAt -d "${VERIFY_DATABASE}" -c \
  "SELECT count(*) FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog', 'information_schema')")"
constraint_count="$(runuser -u postgres -- psql -X -qAt -d "${VERIFY_DATABASE}" -c \
  "SELECT count(*) FROM pg_constraint WHERE connamespace NOT IN (SELECT oid FROM pg_namespace WHERE nspname IN ('pg_catalog', 'information_schema'))")"
invalid_index_count="$(runuser -u postgres -- psql -X -qAt -d "${VERIFY_DATABASE}" -c \
  "SELECT count(*) FROM pg_index WHERE NOT indisvalid")"
unvalidated_constraint_count="$(runuser -u postgres -- psql -X -qAt -d "${VERIFY_DATABASE}" -c \
  "SELECT count(*) FROM pg_constraint WHERE NOT convalidated")"

row_metrics="$(runuser -u postgres -- psql -X -qAt -d "${VERIFY_DATABASE}" <<'SQL'
CREATE TEMP TABLE restore_row_counts (table_name text NOT NULL, row_count bigint NOT NULL);
SELECT format(
  'INSERT INTO restore_row_counts SELECT %L, count(*) FROM %I.%I;',
  schemaname || '.' || tablename,
  schemaname,
  tablename
)
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND schemaname NOT LIKE 'pg_temp_%'
  AND schemaname NOT LIKE 'pg_toast_temp_%'
ORDER BY schemaname, tablename
\gexec
SELECT count(*) || '|' || coalesce(sum(row_count), 0) FROM restore_row_counts;
SQL
)"

if [[ "${table_count}" -le 0 ]] ||
   [[ "${invalid_index_count}" -ne 0 ]] ||
   [[ "${unvalidated_constraint_count}" -ne 0 ]]; then
  echo "Restored database integrity checks failed." >&2
  exit 1
fi

tar \
  --extract \
  --gzip \
  --file "${SNAPSHOT}/uploads.tar.gz" \
  --directory "${WORK_ROOT}"

if [[ ! -d "${WORK_ROOT}/uploads" ]]; then
  echo "Restored uploads directory is missing." >&2
  exit 1
fi

expected_upload_count="$(awk -F= '$1 == "uploads_file_count" { print $2 }' "${SNAPSHOT}/metadata.txt")"
restored_upload_count="$(find "${WORK_ROOT}/uploads" -maxdepth 1 -type f -printf '.' | wc -c)"
restored_upload_bytes="$(du -sb "${WORK_ROOT}/uploads" | awk '{ print $1 }')"

if [[ ! "${expected_upload_count}" =~ ^[0-9]+$ ]] ||
   [[ "${restored_upload_count}" -ne "${expected_upload_count}" ]]; then
  echo "Restored upload count does not match backup metadata." >&2
  exit 1
fi

printf 'RESTORE_VERIFY=PASS\n'
printf 'snapshot=%s\n' "${SNAPSHOT}"
printf 'temporary_database=%s\n' "${VERIFY_DATABASE}"
printf 'table_count=%s\n' "${table_count}"
printf 'index_count=%s\n' "${index_count}"
printf 'constraint_count=%s\n' "${constraint_count}"
printf 'invalid_index_count=%s\n' "${invalid_index_count}"
printf 'unvalidated_constraint_count=%s\n' "${unvalidated_constraint_count}"
printf 'row_metrics=%s\n' "${row_metrics}"
printf 'restored_upload_count=%s\n' "${restored_upload_count}"
printf 'restored_upload_bytes=%s\n' "${restored_upload_bytes}"
