#!/usr/bin/env bash
set -Eeuo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
LC_ALL=C

readonly CONFIG_SOURCE=/usr/local/share/yowthi-security/60-yowthi-unattended-upgrades
readonly CONFIG_TARGET=/etc/apt/apt.conf.d/60-yowthi-unattended-upgrades
readonly VERIFY_COMMAND=/usr/local/sbin/yowthi-verify-unattended-upgrades

if [[ "${EUID}" -ne 0 ]]; then
  echo "Automatic security update configuration must run as root." >&2
  exit 1
fi

if [[ -z "${SSH_CONNECTION:-}" ]]; then
  echo "Refusing automatic security update configuration outside an active SSH session." >&2
  exit 1
fi

if [[ ! -f "${CONFIG_SOURCE}" ]] || [[ -L "${CONFIG_SOURCE}" ]]; then
  echo "Reviewed automatic update configuration source is missing or unsafe." >&2
  exit 1
fi

if [[ ! -x "${VERIFY_COMMAND}" ]]; then
  echo "Automatic update verification command is missing." >&2
  exit 1
fi

if fuser \
  /var/lib/dpkg/lock-frontend \
  /var/lib/dpkg/lock \
  /var/lib/apt/lists/lock \
  /var/cache/apt/archives/lock > /dev/null 2>&1; then
  echo "Refusing configuration while an APT or dpkg lock is active." >&2
  exit 1
fi

target_existed=false
if [[ -e "${CONFIG_TARGET}" ]]; then
  target_existed=true
  if [[ -L "${CONFIG_TARGET}" ]] || ! cmp --silent "${CONFIG_SOURCE}" "${CONFIG_TARGET}"; then
    echo "Refusing to overwrite an unexpected existing automatic update configuration." >&2
    exit 1
  fi
fi

restore_previous_state() {
  set +e
  if [[ "${target_existed}" == false ]]; then
    rm -f -- "${CONFIG_TARGET}"
  fi
}

trap restore_previous_state ERR
install -m 0644 -o root -g root "${CONFIG_SOURCE}" "${CONFIG_TARGET}"
systemctl enable --now apt-daily.timer apt-daily-upgrade.timer unattended-upgrades.service
"${VERIFY_COMMAND}"
trap - ERR

printf 'AUTOMATIC_SECURITY_UPDATES_CONFIGURED=PASS\n'
