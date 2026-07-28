# YOW THI 現行營運 ERP — Project Identity

## 1. Identity

- Project Name: YOW THI 現行營運 ERP
- Project Type: Internal Operational ERP
- Company: YOW THI
- Lifecycle Class: Active Production
- Codebase Class: Maintained Legacy Codebase
- Commercial Product Platform: No
- Fixed Retirement Date: No

「Legacy」只描述既有技術與歷史來源，不代表本系統是臨時備份、已凍結產品或可降低維護標準的過渡系統。

## 2. Current Business Role

本系統目前直接支援公司正式營運。在 Project Owner 明確啟動、完成並驗收另一套替代系統前，本系統是目前唯一正式 ERP，必須持續維護其可用性、資料完整性、安全性與可恢復性。

目前工作可以包含：

1. 修正 Production Defect 與資料完整性問題。
2. 改善安全、穩定性、備份與復原能力。
3. 依實際業務需要進行範圍明確的功能與操作改善。
4. 維持報表、匯出、對帳與歷史資料可讀性。
5. 在 Owner 日後另行啟動替代計畫時，提供資料轉換與切換支援。

## 3. Development Boundary

本系統不採一般功能全面凍結。變更依實際營運價值與風險處理：

- 一般可逆 Bug Fix、UI、報表與低風險維護可直接執行並驗證。
- 影響 Business Meaning、成本、庫存、工資或跨模組資料完整性的修改，必須先確認規則與驗收案例。
- Production Deployment、Production Database Migration、Secrets、不可逆資料操作與刪除，必須取得該次具體授權。
- 不因未來可能替換而延後目前必要的安全、備份或資料完整性修正。

## 4. Repository Boundary

- Current Production Repository: `yenpoli-web/yowthi-erp-legacy`
- Current Production Runtime: Existing VPS
- Current Production Database: Existing PostgreSQL database
- Current Runtime Uploads: Existing VPS runtime storage

任何未來新 ERP 必須由 Owner 另行建立獨立產品身分與環境，不得直接共用本系統的 Git History、Database、Production Secrets、Runtime Storage 或 Deployment Credentials。

## 5. Code Reuse Policy

本系統可持續在原 Repository 內維護。若未來另建 ERP，本系統可以作為業務流程、資料欄位、遷移對照與營運經驗來源；任何程式碼重用仍須獨立審查，避免攜帶 Production-specific assumptions、Secrets、Runtime Data 或未確認的 Legacy coupling。
