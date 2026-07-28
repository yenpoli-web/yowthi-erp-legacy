# YOW THI 現行營運 ERP — Production Boundary and Future Replacement Policy

## 1. System Classification

本系統是公司目前正式營運 ERP。

- Production: Active
- Lifecycle: Active Production
- Codebase: Maintained Legacy Codebase
- Maintenance: Required
- Business-Critical Improvements: Allowed under controlled scope
- Replacement Project: Not active
- Decommission: Not scheduled

未來可能建立替代 ERP，不會降低目前系統的維護、安全、備份與資料完整性要求。

## 2. Current Production Boundary

Production 包含：

- Existing VPS
- Existing PostgreSQL database
- Existing PM2 and Nginx runtime
- Existing production secrets
- Existing runtime uploads

Source、Database、Secrets、Runtime Uploads 與 Deployment Credentials 是不同資產。Git Repository 只保存可維護 Source，不保存 Production Secrets 或營運資料。

## 3. Change Safety

1. Repository 修改應先在非 Production 環境驗證。
2. Production Deployment 必須對應可識別的 Git Commit。
3. Database Migration 必須在執行前備份、審查資料風險與準備復原方式。
4. 不可用 `db push` 取代需要稽核與重現能力的正式 Production Migration。
5. Runtime Uploads 與 PostgreSQL 必須具備自動備份及定期還原驗證。
6. 不得把 Production Worktree 當成 Runtime Data 的版本控制工具。

## 4. Future Replacement Boundary

只有 Project Owner 明確啟動替代專案後，才建立其 Repository 與交付規則。替代系統必須使用：

- Independent Repository and local working directory
- Independent database
- Independent secrets and credentials
- Independent runtime storage
- Independent backup policy
- Independently validated deployment environment

不得在未完成驗證前停止現行 ERP，也不得直接在現行 Production 環境原地覆蓋安裝未驗證的新系統。

## 5. Eventual Cutover and Archive Gates

若未來確定替換，本系統只有在以下事項完成後才可進入唯讀或退役：

1. Replacement production acceptance.
2. Final data migration and record-count reconciliation.
3. Financial, weight, quantity, status and attachment reconciliation.
4. Human-readable and structured data exports.
5. Final encrypted database and runtime-upload backup.
6. Successful restore verification.
7. Required observation period.
8. Explicit Project Owner decommission approval.

目前上述內容只是未來安全門檻，不是目前的開發 Objective 或退役時程。

## 6. Prohibited Actions

- Do not store database backups, runtime uploads or secrets in Git.
- Do not perform destructive Production cleanup without rollback and Owner approval.
- Do not delete the VPS or Production data because a future replacement is only being discussed.
- Do not import unconfirmed business rules from a future system into current Production.
