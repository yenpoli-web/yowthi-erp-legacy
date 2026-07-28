# YOW THI 現行營運 ERP

本系統是 YOW THI 目前在正式環境持續使用的內部 ERP，也是公司現階段唯一的正式 ERP。

Repository 保存可維護、可建置且排除 Production Secrets、資料庫備份、Runtime Uploads 與產出檔案的 Source Baseline。系統雖沿用既有 Legacy Codebase，但不再以「臨時備份、功能凍結或等待退役」作為目前產品定位。

## Current Role

- Lifecycle: Active Production
- Product Scope: YOW THI Internal ERP
- Development Mode: Controlled Maintenance and Business-Critical Improvement
- Production Runtime: Existing VPS
- Replacement Project: Not active; any future replacement requires a separate Owner decision
- Decommission: Not scheduled

## Allowed Work

- Production defect correction
- Security and stability remediation
- Backup and restore improvement
- Data integrity correction
- Business-required maintenance and bounded improvements
- Reporting, export and operational usability improvement
- Future migration or cutover preparation after explicit Owner approval

所有變更均應保護現有營運資料，執行與風險相稱的驗證。Production Deployment、Production Database Migration、不可逆資料操作及正式退役仍需要個別明確授權。

## Repository Boundary

- Current Production Repository: `yenpoli-web/yowthi-erp-legacy`
- Production database, secrets and runtime uploads remain outside Git
- Any future replacement ERP must use an independently approved Repository, database, secrets, runtime storage and deployment environment

本 Repository 可持續維護目前 ERP，但不得把未確認的新系統商業規則直接套入現行 Production。

## Repository Hygiene

- Do not commit `.env`, credentials or private keys.
- Do not commit database backups or runtime uploads.
- Do not commit generated build output or local AI/IDE state.
- Keep source changes, operational data and deployment credentials separated.
