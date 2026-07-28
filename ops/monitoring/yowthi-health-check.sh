#!/usr/bin/env bash

set -eu

failures=0

probe() {
  local label="$1"
  local expected_code="$2"
  local maximum_seconds="$3"
  local result
  local curl_status
  local http_code
  local total_seconds

  shift 3

  set +e
  result=$(curl --silent --show-error --output /dev/null \
    --connect-timeout 5 --max-time 10 \
    --write-out '%{http_code} %{time_total}' "$@" 2>/dev/null)
  curl_status=$?
  set -e

  read -r http_code total_seconds <<<"${result:-000 10.000000}"
  http_code=${http_code:-000}
  total_seconds=${total_seconds:-10.000000}

  printf '%s_code=%s %s_seconds=%s ' \
    "$label" "$http_code" "$label" "$total_seconds"

  if [ "$curl_status" -ne 0 ] || [ "$http_code" != "$expected_code" ] || \
    ! awk -v actual="$total_seconds" -v maximum="$maximum_seconds" \
      'BEGIN { exit !(actual <= maximum) }'; then
    failures=$((failures + 1))
  fi
}

printf 'timestamp=%s ' "$(date --iso-8601=seconds)"
probe backend 401 2 http://127.0.0.1:3000/auth/me
probe nginx 200 2 --resolve yowthi.co.th:443:127.0.0.1 https://yowthi.co.th/
probe public 200 2 https://yowthi.co.th/
printf 'load_1m=%s memory_available_kb=%s disk_used_percent=%s failures=%s\n' \
  "$(cut -d' ' -f1 /proc/loadavg)" \
  "$(awk '/^MemAvailable:/ { print $2 }' /proc/meminfo)" \
  "$(df -P / | awk 'NR == 2 { gsub("%", "", $5); print $5 }')" \
  "$failures"

if [ "$failures" -ne 0 ]; then
  logger --priority daemon.warning --tag yowthi-health-check \
    "health check failed: failures=$failures"
  exit 1
fi
