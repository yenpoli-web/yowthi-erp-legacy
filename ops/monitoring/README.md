# Production availability and latency monitoring

The health check records three independent paths every minute:

- Backend directly on `127.0.0.1:3000` (expected unauthenticated response: `401`)
- Nginx over local HTTPS with the Production hostname (expected response: `200`)
- Public HTTPS through DNS and the VPS network path (expected response: `200`)

Each path has a 2-second failure threshold. A failed probe makes the systemd service fail and writes a warning to the journal. The check never restarts services or modifies ERP data.

## Install

```bash
sudo install -o root -g root -m 0755 \
  ops/monitoring/yowthi-health-check.sh \
  /usr/local/sbin/yowthi-health-check
sudo install -o root -g root -m 0644 \
  ops/monitoring/yowthi-health-check.service \
  /etc/systemd/system/yowthi-health-check.service
sudo install -o root -g root -m 0644 \
  ops/monitoring/yowthi-health-check.timer \
  /etc/systemd/system/yowthi-health-check.timer
sudo systemctl daemon-reload
sudo systemctl enable --now yowthi-health-check.timer
```

## Verify and inspect

```bash
sudo systemctl start yowthi-health-check.service
sudo systemctl status yowthi-health-check.service
sudo systemctl list-timers yowthi-health-check.timer
sudo journalctl -u yowthi-health-check.service --since today
```

The journal line includes HTTP status and total seconds for each path, one-minute load, available memory, root filesystem usage and a failure count. Comparing the three timings separates application delay from local reverse-proxy delay and upstream network delay.
