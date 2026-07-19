# YOW THI ERP ??Known Technical Risks

## Dependency Findings

Build validation detected:

- Backend: 4 vulnerabilities ??1 moderate and 3 high.
- Frontend: 2 high vulnerabilities.
- Deprecated transitive dependencies including `inflight`, old `glob` versions and a beta `source-map` package.

Automatic `npm audit fix` and `npm audit fix --force` are prohibited until dependency paths and breaking-change impact are reviewed.

## Frontend Bundle

The production build reported at least one JavaScript chunk over 500 KB after minification.

This is a performance and maintainability item. It does not invalidate the current build baseline.

## Runtime Version

The clean build passed on:

- Node.js: 24.16.0
- npm: 11.13.0

The supported project runtime version has not yet been formally pinned or reconciled with Production.
