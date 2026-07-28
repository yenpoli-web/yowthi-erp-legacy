#!/usr/bin/env bash
set -Eeuo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
LC_ALL=C

readonly ADMIN_USER=yowthi-admin
readonly CONFIG_SOURCE=/usr/local/share/yowthi-security/99-yowthi-hardening.conf
readonly CONFIG_TARGET=/etc/ssh/sshd_config.d/99-yowthi-hardening.conf

if [[ "${EUID}" -ne 0 ]]; then
  echo "SSH hardening must run as root." >&2
  exit 1
fi

if [[ -z "${SSH_CONNECTION:-}" ]]; then
  echo "Refusing SSH hardening outside an active SSH session." >&2
  exit 1
fi

if [[ ! -f "${CONFIG_SOURCE}" ]] || [[ -L "${CONFIG_SOURCE}" ]]; then
  echo "Reviewed SSH configuration source is missing or unsafe." >&2
  exit 1
fi

if ! id "${ADMIN_USER}" > /dev/null 2>&1; then
  echo "Verified administrator account is missing." >&2
  exit 1
fi

if [[ ! -s "/home/${ADMIN_USER}/.ssh/authorized_keys" ]]; then
  echo "Administrator authorized_keys is missing or empty." >&2
  exit 1
fi

runuser -u "${ADMIN_USER}" -- sudo --non-interactive /usr/bin/true

previous_config=
if [[ -e "${CONFIG_TARGET}" ]]; then
  previous_config="$(mktemp /etc/ssh/sshd_config.d/.99-yowthi-hardening.previous.XXXXXX)"
  cp --preserve=mode,ownership,timestamps -- "${CONFIG_TARGET}" "${previous_config}"
fi

restore_previous_config() {
  set +e
  if [[ -n "${previous_config}" && -f "${previous_config}" ]]; then
    mv -- "${previous_config}" "${CONFIG_TARGET}"
  else
    rm -f -- "${CONFIG_TARGET}"
  fi
  sshd -t
  systemctl reload ssh
}

trap restore_previous_config ERR
install -m 0600 -o root -g root "${CONFIG_SOURCE}" "${CONFIG_TARGET}"
sshd -t
systemctl reload ssh
trap - ERR

if [[ -n "${previous_config}" ]]; then
  rm -f -- "${previous_config}"
fi

sshd -T | grep -E \
  '^(pubkeyauthentication|passwordauthentication|kbdinteractiveauthentication|permitrootlogin|maxauthtries) '
