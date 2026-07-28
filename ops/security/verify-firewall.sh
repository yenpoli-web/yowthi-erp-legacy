#!/usr/bin/env bash
set -Eeuo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
LC_ALL=C

if [[ "${EUID}" -ne 0 ]]; then
  echo "Firewall verification must run as root." >&2
  exit 1
fi

status="$(ufw status verbose)"
printf '%s\n' "${status}"

grep -q '^Status: active$' <<< "${status}"
grep -Eq '^22/tcp[[:space:]]+ALLOW IN[[:space:]]+Anywhere' <<< "${status}"
grep -Eq '^80/tcp[[:space:]]+ALLOW IN[[:space:]]+Anywhere' <<< "${status}"
grep -Eq '^443/tcp[[:space:]]+ALLOW IN[[:space:]]+Anywhere' <<< "${status}"
grep -Eq '^3000/tcp[[:space:]]+DENY IN[[:space:]]+Anywhere' <<< "${status}"
systemctl is-enabled --quiet ufw.service
systemctl is-active --quiet ufw.service

sshd -t
nginx -t
curl --silent --show-error --output /dev/null http://127.0.0.1:3000/
systemctl is-active --quiet nginx
systemctl is-active --quiet postgresql

printf 'FIREWALL_LOCAL_VERIFY=PASS\n'
