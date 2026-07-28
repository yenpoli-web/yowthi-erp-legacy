#!/usr/bin/env bash
set -Eeuo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
LC_ALL=C

if [[ "${EUID}" -ne 0 ]]; then
  echo "Firewall configuration must run as root." >&2
  exit 1
fi

if [[ -z "${SSH_CONNECTION:-}" ]]; then
  echo "Refusing to change the firewall outside an active SSH session." >&2
  exit 1
fi

for required_command in ufw sshd nginx curl; do
  if ! command -v "${required_command}" > /dev/null; then
    echo "Missing required command: ${required_command}" >&2
    exit 1
  fi
done

sshd -t
nginx -t

ssh_port="$(sshd -T | awk '$1 == "port" { print $2; exit }')"
if [[ "${ssh_port}" != 22 ]]; then
  echo "Refusing unexpected SSH port: ${ssh_port}" >&2
  exit 1
fi

curl --silent --show-error --output /dev/null http://127.0.0.1:3000/

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH administration'
ufw allow 80/tcp comment 'HTTP redirect and ACME'
ufw allow 443/tcp comment 'HTTPS application'
ufw deny 3000/tcp comment 'Block direct backend access'
ufw logging low
ufw --force enable

ufw status verbose
