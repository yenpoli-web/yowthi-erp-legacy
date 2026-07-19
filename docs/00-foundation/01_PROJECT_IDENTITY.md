# YOW THI Legacy Transitional ERP — Project Identity

## 1. Identity

- Project Name: YOW THI Legacy Transitional ERP
- Project Type: Internal Operational Legacy ERP
- Company: YOW THI
- Lifecycle Class: Transitional Production System
- Long-term Product: No
- Commercial Product Platform: No
- New YOW THI ERP: No

## 2. Current Business Role

本系統目前仍支援公司正式營運，因此在全新 ERP 完成並切換前，不得任意停止、刪除或破壞。

本系統剩餘生命週期目的只有：

1. 維持必要營運穩定性。
2. 支援歷史資料對帳與轉換。
3. 支援全新 ERP 切換。
4. 完成歷史封存與退役。

## 3. Development Boundary

一般新功能開發凍結。

只允許：

- Critical Bug Fix
- Security Fix
- Production Stability Fix
- Backup / Restore
- Archive / Export
- Migration / Cutover Support
- Decommission Preparation

任何非必要功能擴充都應在全新 YOW THI ERP 中重新分析及實作。

## 4. Repository Boundary

- Legacy Repository: `yenpoli-web/yowthi-erp-legacy`
- Future New ERP Repository: `yenpoli-web/yowthi-erp`
- Commercial ERP Repository: `yenpoli-web/erp-commercial-platform`

三者不得共用 Git History、Database、Production Secrets、Runtime Storage、Deployment Credentials、Task Authority 或 Architecture Identity。

## 5. Code Reuse Policy

舊系統可作為業務流程、資料欄位、遷移對照及營運經驗來源，但不得直接作為全新 ERP 的程式基線。

任何程式碼重用都必須經過獨立審查，確認不攜帶 Legacy coupling、Production-specific assumptions、Secrets 或實際營運資料，且符合全新架構與測試要求。
