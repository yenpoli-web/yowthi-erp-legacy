#!/usr/bin/env bash
set -Eeuo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
LC_ALL=C

readonly CONFIG_TARGET=/etc/apt/apt.conf.d/60-yowthi-unattended-upgrades

if [[ "${EUID}" -ne 0 ]]; then
  echo "Automatic security update rollback must run as root." >&2
  exit 1
fi

rm -f -- "${CONFIG_TARGET}"

apt-config dump |
  grep -E '^APT::Periodic::(Update-Package-Lists|Unattended-Upgrade) '
printf 'AUTOMATIC_SECURITY_UPDATES_ROLLBACK=COMPLETE\n'
