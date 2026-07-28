# YOW THI 現行營運 ERP — Repository and Deployment Baseline

## 1. Repository Baselines

### Historical Production Line

- Local working directory: `C:\yowthi-erp`
- Branch: `master`
- VPS bare remote: `/root/yowthi-erp.git`
- VPS deployed commit on 2026-07-28: `141729f48345f5fe6eba18a81ee33ab4be8e8c17`
- History condition: contains archives, database backup and runtime artifacts that must not be copied into the clean GitHub history

### Clean GitHub Line

- Repository: `yenpoli-web/yowthi-erp-legacy`
- Default branch: `main`
- Clean baseline on 2026-07-28: `2cea07b2a529e799dcadfe339d8c412fb007bcbf`
- Production-fix Draft PR: `#1`
- PR head on 2026-07-28: `2ee38a77f41d2d4744b1a970ffba28c7f1fc723d`

The historical `master` and clean GitHub `main` have unrelated Git histories. They must not be merged or force-combined merely to make commit graphs appear continuous.

## 2. Verified Source Equivalence

Read-only verification on 2026-07-28 confirmed:

- VPS deployed `backend/src` matches Draft PR #1 head.
- VPS deployed `backend/prisma` matches Draft PR #1 head.
- VPS deployed Frontend Source matches Draft PR #1 head; the historical line additionally contains `frontend/src/views/GuidedView.vue.bak`, which is not Product Source.
- Runtime uploads, database dumps, archives and generated files are intentionally excluded from the clean GitHub line.

This evidence verifies content equivalence for the inspected Source paths. It does not itself merge PR #1 or change Production deployment authority.

## 3. Current Authority

- GitHub `main` is the clean Repository authority for content merged into it.
- The VPS currently deploys from its separate bare `master` line.
- Until the deployment path is deliberately migrated, a Production release must record both the reviewed GitHub commit and the exact deployed VPS commit or content mapping.
- Draft PRs and unmerged branches are not Production authority.

## 4. Required Deployment Normalization

The deployment path should be migrated in a separately authorized task:

1. Merge only reviewed Source into clean GitHub `main`.
2. Validate clean-clone Backend tests/build and Frontend build.
3. Create and verify current PostgreSQL and runtime-upload backups.
4. Establish a rollback-capable deployment procedure using reviewed GitHub commits.
5. Stop allowing `npm install` or runtime uploads to dirty the deployed Source worktree.
6. Record the deployed commit and build time for every Production release.

No history rewrite, force push, Production deployment or data migration is authorized by this document.
