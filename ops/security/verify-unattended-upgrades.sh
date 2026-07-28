#!/usr/bin/env bash
set -Eeuo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
LC_ALL=C

readonly CONFIG_SOURCE=/usr/local/share/yowthi-security/60-yowthi-unattended-upgrades
readonly CONFIG_TARGET=/etc/apt/apt.conf.d/60-yowthi-unattended-upgrades

if [[ "${EUID}" -ne 0 ]]; then
  echo "Automatic security update verification must run as root." >&2
  exit 1
fi

if [[ ! -f "${CONFIG_TARGET}" ]] ||
   [[ -L "${CONFIG_TARGET}" ]] ||
   ! cmp --silent "${CONFIG_SOURCE}" "${CONFIG_TARGET}"; then
  echo "Installed automatic update configuration does not match the reviewed source." >&2
  exit 1
fi

effective_config="$(apt-config dump)"
grep -qx 'APT::Periodic::Update-Package-Lists "1";' <<< "${effective_config}"
grep -qx 'APT::Periodic::Unattended-Upgrade "1";' <<< "${effective_config}"
grep -qx 'Unattended-Upgrade::Automatic-Reboot "false";' <<< "${effective_config}"
grep -qx 'Unattended-Upgrade::Remove-Unused-Kernel-Packages "false";' <<< "${effective_config}"
grep -qx 'Unattended-Upgrade::Remove-New-Unused-Dependencies "false";' <<< "${effective_config}"
grep -qx 'Unattended-Upgrade::Remove-Unused-Dependencies "false";' <<< "${effective_config}"

for unit in apt-daily.timer apt-daily-upgrade.timer unattended-upgrades.service; do
  systemctl is-enabled --quiet "${unit}"
  systemctl is-active --quiet "${unit}"
done

dry_run_output="$(unattended-upgrade --dry-run --debug 2>&1)"
allowed_origins="$(grep -m1 '^Allowed origins are:' <<< "${dry_run_output}")"

. /etc/os-release
grep -Fq "o=Ubuntu,a=${VERSION_CODENAME}-security" <<< "${allowed_origins}"
if grep -Eqi \
  "${VERSION_CODENAME}-updates|nodesource|deb\.nodesource\.com" \
  <<< "${allowed_origins}"; then
  echo "Non-security update origin is allowed unexpectedly." >&2
  exit 1
fi

printf '%s\n' "${allowed_origins}"
systemctl list-timers apt-daily.timer apt-daily-upgrade.timer --no-pager
printf 'AUTOMATIC_SECURITY_UPDATES_VERIFY=PASS\n'
