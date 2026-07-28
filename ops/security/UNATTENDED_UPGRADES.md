# Production Automatic Security Updates

The Production VPS refreshes Ubuntu package metadata and installs security updates daily through `unattended-upgrades`.

The managed configuration:

- retains the Ubuntu release, Ubuntu security and Ubuntu ESM security origins already defined by Ubuntu;
- does not allow the Ubuntu updates pocket or the NodeSource repository for unattended installation;
- never reboots the VPS automatically;
- never removes old kernels or unused dependencies automatically.

Application deployments, Node.js packages and general Ubuntu updates remain manual maintenance operations.

## Safe application procedure

Run from a confirmed public-key SSH session after a successful manual security update and reboot:

```bash
install -d -m 0755 -o root -g root /usr/local/share/yowthi-security
install -m 0644 -o root -g root \
  ops/security/60-yowthi-unattended-upgrades \
  /usr/local/share/yowthi-security/60-yowthi-unattended-upgrades
install -m 0750 -o root -g root \
  ops/security/configure-unattended-upgrades.sh \
  /usr/local/sbin/yowthi-configure-unattended-upgrades
install -m 0750 -o root -g root \
  ops/security/verify-unattended-upgrades.sh \
  /usr/local/sbin/yowthi-verify-unattended-upgrades
install -m 0750 -o root -g root \
  ops/security/rollback-unattended-upgrades.sh \
  /usr/local/sbin/yowthi-rollback-unattended-upgrades

/usr/local/sbin/yowthi-configure-unattended-upgrades
```

The verification performs an unattended-upgrade dry run and refuses an allowed-origin set that contains `jammy-updates` or NodeSource.

## Verification

```bash
/usr/local/sbin/yowthi-verify-unattended-upgrades
journalctl -u apt-daily-upgrade.service --no-pager
```

The update timers use systemd's normal randomized schedule. A kernel update can create `/var/run/reboot-required`, but the VPS must be rebooted manually during a controlled maintenance window.

## Rollback

Remove only the YOW THI managed drop-in and return to the underlying Ubuntu configuration:

```bash
/usr/local/sbin/yowthi-rollback-unattended-upgrades
```

Rollback does not remove installed packages or change Ubuntu's original configuration files.
