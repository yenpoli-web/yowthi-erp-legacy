# Production SSH Hardening

The Production VPS uses two key-based administrative paths:

- `yowthi-admin` with a locked password and explicitly validated passwordless sudo;
- root with public-key authentication retained only as a recovery path.

Password and keyboard-interactive SSH authentication are disabled. Root password login is prohibited while root public-key login remains available during this maintenance phase.

## Safe application procedure

1. Back up `/etc/ssh`.
2. Provision `yowthi-admin` from the already verified root `authorized_keys`.
3. Open a separate key-based SSH session as `yowthi-admin` and verify `sudo -n`.
4. Arm the two-minute automatic rollback.
5. Install, validate and reload the hardening configuration.
6. Open new key-based sessions as both `yowthi-admin` and root.
7. Confirm the effective server settings and application health.
8. Cancel the rollback timer only after every check passes.

Example rollback guard:

```bash
systemd-run \
  --unit=yowthi-ssh-rollback \
  --on-active=2m \
  /usr/local/sbin/yowthi-rollback-ssh
```

Install the reviewed files:

```bash
install -d -m 0755 -o root -g root /usr/local/share/yowthi-security
install -m 0600 -o root -g root ops/security/99-yowthi-hardening.conf \
  /usr/local/share/yowthi-security/99-yowthi-hardening.conf
install -m 0750 -o root -g root ops/security/create-admin-user.sh \
  /usr/local/sbin/yowthi-create-admin-user
install -m 0750 -o root -g root ops/security/configure-ssh.sh \
  /usr/local/sbin/yowthi-configure-ssh
install -m 0750 -o root -g root ops/security/verify-ssh.sh \
  /usr/local/sbin/yowthi-verify-ssh
install -m 0750 -o root -g root ops/security/rollback-ssh.sh \
  /usr/local/sbin/yowthi-rollback-ssh
```

Provision and test the alternate administrator before hardening SSH:

```bash
/usr/local/sbin/yowthi-create-admin-user
ssh yowthi-admin@VPS
sudo -n true
```

After the alternate session succeeds, apply and verify:

```bash
/usr/local/sbin/yowthi-configure-ssh
/usr/local/sbin/yowthi-verify-ssh
```

## Emergency rollback

From an existing root session:

```bash
/usr/local/sbin/yowthi-rollback-ssh
```

If every session is lost, the armed transient timer removes only `99-yowthi-hardening.conf` and reloads the previously valid SSH configuration after two minutes. The `yowthi-admin` account is retained and can be reviewed separately.
