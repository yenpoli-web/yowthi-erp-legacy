# YOW THI Legacy Transitional ERP

YOW THI 公司目前仍在正式環境運作的過渡 ERP。

本 Repository 保存經清理、可建置且不含舊污染 Git History 的 Legacy Source Baseline。它不是未來全新 YOW THI ERP 的程式基礎。

## Current Role

- Lifecycle: Operational / Legacy / Transitional
- Development Mode: Maintenance Only
- General New Features: Frozen
- Production Runtime: Existing legacy VPS
- Replacement Target: New YOW THI ERP
- Final Disposition: Decommission after replacement, archive verification and observation period

## Allowed Work

- Critical production defect correction
- Security remediation
- Production stability correction
- Backup and restore validation
- Historical data export
- Migration, cutover and decommission support

## Repository Boundaries

- Legacy Repository: `yenpoli-web/yowthi-erp-legacy`
- Future New ERP Repository: `yenpoli-web/yowthi-erp`
- Commercial ERP Repository: `yenpoli-web/erp-commercial-platform`

The three systems have separate product identities, Git histories, databases, deployment environments and lifecycle governance.

## Prohibited Direction

- Do not evolve this codebase into the new ERP.
- Do not use this Repository as the architecture baseline of the new ERP.
- Do not add general business expansion features.
- Do not mix this Repository with the commercial ERP.
- Do not commit `.env`, credentials, database backups, runtime uploads or generated build output.
