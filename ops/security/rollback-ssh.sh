#!/usr/bin/env bash
set -Eeuo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

readonly CONFIG_TARGET=/etc/ssh/sshd_config.d/99-yowthi-hardening.conf

if [[ "${EUID}" -ne 0 ]]; then
  echo "SSH rollback must run as root." >&2
  exit 1
fi

rm -f -- "${CONFIG_TARGET}"
sshd -t
systemctl reload ssh
printf 'SSH_HARDENING_ROLLBACK=COMPLETE\n'
