# Production Network Firewall

The Production VPS exposes only:

- `22/tcp` for SSH administration;
- `80/tcp` for HTTP redirect and ACME;
- `443/tcp` for the HTTPS application.

Direct external access to Backend port `3000/tcp` is explicitly denied. PostgreSQL remains bound to loopback and is not exposed by UFW.

## Safe application procedure

Run from a confirmed public-key SSH session. Before changing UFW, create a configuration backup and arm a two-minute automatic rollback:

```bash
tar --create --gzip --file /root/ufw-config-before-YYYYMMDDTHHMMSS.tar.gz /etc/ufw
systemd-run \
  --unit=yowthi-firewall-rollback \
  --on-active=2m \
  /usr/sbin/ufw disable
```

Install and execute the reviewed scripts:

```bash
install -m 0750 -o root -g root ops/security/configure-firewall.sh /usr/local/sbin/yowthi-configure-firewall
install -m 0750 -o root -g root ops/security/verify-firewall.sh /usr/local/sbin/yowthi-verify-firewall
/usr/local/sbin/yowthi-configure-firewall
/usr/local/sbin/yowthi-verify-firewall
```

From a separate client connection, verify:

1. public-key SSH on port 22 succeeds;
2. HTTPS returns the application;
3. direct port 3000 is unreachable.

Only after all checks pass, cancel the rollback timer:

```bash
systemctl stop yowthi-firewall-rollback.timer
systemctl reset-failed yowthi-firewall-rollback.service 2>/dev/null || true
```

## Emergency rollback

If external verification fails, keep the original SSH session open and run:

```bash
ufw disable
```

If the session is lost, the armed transient timer disables UFW automatically after two minutes.

This procedure does not change SSH authentication policy. Disabling root password authentication is a separate hardening task that requires a verified alternate administrative account and key.
