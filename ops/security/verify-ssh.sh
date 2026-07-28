#!/usr/bin/env bash
set -Eeuo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
LC_ALL=C

readonly ADMIN_USER=yowthi-admin
readonly ADMIN_AUTHORIZED_KEYS=/home/yowthi-admin/.ssh/authorized_keys

if [[ "${EUID}" -ne 0 ]]; then
  echo "SSH verification must run as root." >&2
  exit 1
fi

sshd -t
effective_config="$(sshd -T)"

grep -qx 'pubkeyauthentication yes' <<< "${effective_config}"
grep -qx 'passwordauthentication no' <<< "${effective_config}"
grep -qx 'kbdinteractiveauthentication no' <<< "${effective_config}"
grep -Eq '^permitrootlogin (prohibit-password|without-password)$' <<< "${effective_config}"
grep -qx 'maxauthtries 3' <<< "${effective_config}"

id "${ADMIN_USER}" > /dev/null
test -s "${ADMIN_AUTHORIZED_KEYS}"
test "$(stat -c '%a' "/home/${ADMIN_USER}/.ssh")" = 700
test "$(stat -c '%a' "${ADMIN_AUTHORIZED_KEYS}")" = 600
test "$(stat -c '%U:%G' "${ADMIN_AUTHORIZED_KEYS}")" = "${ADMIN_USER}:${ADMIN_USER}"
runuser -u "${ADMIN_USER}" -- sudo --non-interactive /usr/bin/true
systemctl is-active --quiet ssh

printf 'SSH_LOCAL_VERIFY=PASS\n'
