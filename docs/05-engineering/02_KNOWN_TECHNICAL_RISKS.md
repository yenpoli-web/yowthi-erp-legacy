# YOW THI 現行營運 ERP — Known Technical Risks

Status date: 2026-07-28. Findings are based on read-only Repository and VPS inspection.

## 1. Backup and Restore — Critical

- No automated PostgreSQL or runtime-upload backup job was found.
- The newest visible PostgreSQL dump was dated 2026-06-29.
- Runtime uploads contained 105 files (approximately 20 MB) and had no detected automated backup.
- No recurring restore verification was found.

Before risky Production changes, establish encrypted automated backups for both PostgreSQL and runtime uploads, off-VPS retention, and a tested restore procedure.

## 2. Network and SSH Exposure — High

- UFW was inactive.
- Backend port `3000` listened on all interfaces and was externally reachable, although Nginx already proxies to `127.0.0.1:3000`.
- SSH allowed direct root login and password authentication.
- PostgreSQL correctly listened only on `127.0.0.1:5432`.

Remediation must preserve a verified alternate administrative session to avoid lockout. Production firewall, SSH and service-binding changes require a separately approved execution and rollback sequence.

## 3. Split Source and Deployment Authority — High

- GitHub uses clean `main`; Production currently deploys from a separate VPS bare `master` history.
- The histories are unrelated even though inspected Source content can match.
- GitHub PR #1 contains the current Production fixes but was still Draft at inspection time.

This creates traceability and deployment-error risk. Do not merge histories or force-update either line. Normalize deployment only after reviewed Source, backup and rollback validation.

## 4. Dirty Production Worktree — High

- `backend/package-lock.json` and `frontend/package-lock.json` were modified by the deployed install process.
- Runtime uploads were untracked files inside the Production Git worktree.
- Historical archives and database dumps exist in the old line.

Deployment should use deterministic dependency installation, immutable release directories or an equivalent clean-build method, and external persistent storage for uploads.

## 5. Database Change History — High

- Historical schema changes include manual SQL and `prisma db push` operations.
- A complete, reproducible Production migration history is not yet established.

Future schema changes require an explicit migration, pre-migration backup, validation and rollback or forward-recovery plan. Existing Production data must not be rewritten merely to make history look clean.

## 6. Dependency and Runtime Baseline — Medium

Previous clean-build validation detected Backend and Frontend dependency vulnerabilities and deprecated transitive packages. Automatic `npm audit fix` or `--force` remains unsafe until dependency paths and breaking-change impact are reviewed.

The clean build was previously validated with Node.js 24.16.0 / npm 11.13.0, while Production ran Node.js 20.20.2 on 2026-07-28. Supported Node and npm versions should be pinned and reconciled before dependency upgrades.

## 7. Reliability Observability — Medium

- PM2 showed 40 accumulated restarts, but zero unstable restarts and approximately 10 hours of current uptime after the 2026-07-27 deployment.
- Current process metrics were healthy during inspection.
- Direct response times were fast during the sample, so reported intermittent delays were not reproduced.

Add uptime, restart-cause, latency and resource monitoring before attributing intermittent delays to application code or VPS capacity.

## 8. Repository Verification — Medium

- GitHub branches had no detected protection rules.
- Draft PR #1 had no automated status checks or review at inspection time.
- The historical local clone contains a malformed internal Codex checkpoint ref that interferes with normal fetch operations.

Repair the local metadata without deleting user work, establish clean-clone validation, and add lightweight required checks before treating GitHub `main` as the deployment source.
