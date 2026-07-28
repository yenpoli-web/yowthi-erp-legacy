#!/usr/bin/env bash
set -Eeuo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
LC_ALL=C

readonly ADMIN_USER=yowthi-admin
readonly ADMIN_HOME=/home/yowthi-admin
readonly ROOT_AUTHORIZED_KEYS=/root/.ssh/authorized_keys
readonly ADMIN_AUTHORIZED_KEYS="${ADMIN_HOME}/.ssh/authorized_keys"
readonly SUDOERS_FILE=/etc/sudoers.d/yowthi-admin

if [[ "${EUID}" -ne 0 ]]; then
  echo "Administrator provisioning must run as root." >&2
  exit 1
fi

if [[ -z "${SSH_CONNECTION:-}" ]]; then
  echo "Refusing administrator provisioning outside an active SSH session." >&2
  exit 1
fi

if [[ ! -s "${ROOT_AUTHORIZED_KEYS}" ]]; then
  echo "Root authorized_keys is missing or empty." >&2
  exit 1
fi

if ! id "${ADMIN_USER}" > /dev/null 2>&1; then
  useradd \
    --create-home \
    --home-dir "${ADMIN_HOME}" \
    --shell /bin/bash \
    --user-group \
    "${ADMIN_USER}"
fi

admin_home_from_passwd="$(getent passwd "${ADMIN_USER}" | cut -d: -f6)"
admin_shell_from_passwd="$(getent passwd "${ADMIN_USER}" | cut -d: -f7)"
if [[ "${admin_home_from_passwd}" != "${ADMIN_HOME}" ]] ||
   [[ "${admin_shell_from_passwd}" != /bin/bash ]]; then
  echo "Existing administrator account has unexpected attributes." >&2
  exit 1
fi

passwd --lock "${ADMIN_USER}" > /dev/null
usermod --append --groups sudo "${ADMIN_USER}"

install -d -m 0700 -o "${ADMIN_USER}" -g "${ADMIN_USER}" "${ADMIN_HOME}/.ssh"
install -m 0600 -o "${ADMIN_USER}" -g "${ADMIN_USER}" \
  "${ROOT_AUTHORIZED_KEYS}" "${ADMIN_AUTHORIZED_KEYS}"

sudoers_temp="$(mktemp /etc/sudoers.d/.yowthi-admin.XXXXXX)"
trap 'rm -f -- "${sudoers_temp}"' EXIT
printf '%s\n' 'yowthi-admin ALL=(ALL:ALL) NOPASSWD: ALL' > "${sudoers_temp}"
chmod 0440 "${sudoers_temp}"
visudo --check --file "${sudoers_temp}"
mv -- "${sudoers_temp}" "${SUDOERS_FILE}"
trap - EXIT

visudo --check --file /etc/sudoers
runuser -u "${ADMIN_USER}" -- sudo --non-interactive /usr/bin/true

password_status="$(passwd --status "${ADMIN_USER}" | awk '{ print $2 }')"
if [[ "${password_status}" != L ]]; then
  echo "Administrator password is not locked." >&2
  exit 1
fi

printf 'ADMIN_USER_PROVISIONED=%s\n' "${ADMIN_USER}"
ssh-keygen -lf "${ADMIN_AUTHORIZED_KEYS}"
