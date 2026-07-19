# YOW THI Legacy Transitional ERP — System Boundary and Decommission Policy

## 1. System Classification

本系統是公司現行過渡 ERP，不是未來目標系統。

- Production: Active
- Lifecycle: Legacy / Transitional
- General New Feature Development: Frozen
- Maintenance: Allowed under controlled scope
- Replacement: Planned
- Decommission: Required after successful replacement

## 2. Environment Boundary

### Legacy Production

- Existing VPS
- Existing PostgreSQL database
- Existing PM2 and Nginx runtime
- Existing production secrets
- Existing runtime uploads

### New ERP

全新 ERP 必須使用：

- Independent GitHub Repository
- Independent local working directory
- New VPS
- New database
- New secrets
- New deployment user and credentials
- Independent runtime storage
- Independent backup policy

## 3. Cutover Principle

採用新舊 VPS 並行策略：

1. 舊 VPS 繼續提供過渡 ERP。
2. 新 VPS 建立全新 ERP 環境。
3. 完成測試、資料轉換、驗收與切換演練。
4. 執行最終資料同步與 Cutover。
5. 舊 ERP 進入唯讀觀察期。
6. 完成封存與完整性驗證。
7. 停止並取消舊 VPS。

不得先刪除舊系統，再於同一環境原地安裝未驗證的新 ERP。

## 4. Required Archive

PDF 不得作為唯一封存形式。

退役前至少必須建立：

- PDF/A human-readable records
- Structured CSV / JSON or equivalent exports
- Original attachments and images
- Final encrypted PostgreSQL backup
- Schema and migration history
- Data dictionary
- Source baseline reference
- SHA-256 manifest
- Record-count reconciliation
- Restore verification record

## 5. Decommission Gates

必須全部通過：

1. New ERP production acceptance.
2. Final Legacy data freeze.
3. Final data migration.
4. Record-count reconciliation.
5. Financial, weight, quantity and status reconciliation.
6. Attachment reconciliation.
7. PDF/A archive generation.
8. Structured data export.
9. Final encrypted database backup.
10. Successful restore test.
11. New ERP observation period.
12. Business owner decommission approval.

## 6. Source Authority

本 Legacy Repository 的用途：

- Clean source escrow
- Controlled maintenance baseline
- Decommission support
- Historical implementation reference

它不具有全新 ERP 的架構或產品權威。

## 7. Prohibited Actions

- Do not delete the old VPS before archive and restore verification.
- Do not rely on PDF as the only archive.
- Do not store database backups in Git.
- Do not reuse Legacy secrets in the New ERP.
- Do not evolve the Legacy codebase into the New ERP.
- Do not perform destructive cleanup without rollback and owner approval.
