# FR-03.01 — Bulk user import template restyle (2026-11-19)

Scope: the System Administrator's **Import Excel** template now follows the organization-structure template design. The English guide tab is renamed **Instructions** (Vietnamese stays **Hướng dẫn**); on the Users tab the header moves to row 1 (data from row 2) with orange required / light-orange optional headers, frozen header, autofilter and the existing drop-downs; the Lists tab uses orange table headers. The error report keeps the red **Import error** column. The parser still scans the first 10 rows for the header, so files based on the previous template remain accepted. Previous evidence: [FR-03-01-bulk-user-import-20261117.md](./FR-03-01-bulk-user-import-20261117.md).

Environment: local Docker stack `adapt-learn-graph-kgtest`, `http://127.0.0.1:8088`, Chrome via `playwright.system.config.ts`. Actor: System Administrator `admin@technova.com`.

| ID | Check | Command / procedure | Expected | Result |
| --- | --- | --- | --- | --- |
| T1 | Template and parser (unit) | `npx vitest run src/features/administration/user-management/import` | Tabs Hướng dẫn / Người dùng / Danh mục (EN first tab = Instructions); header in row 1 with fills `EA580C` / `FFF5EB`; frozen `ySplit: 1`; drop-downs from row 2; error report round-trips with data from row 2 | Passed |
| T2 | Typecheck | `npx tsc -p tsconfig.app.json --noEmit` | No errors | Passed |
| S1 | Template layout in browser | `npx playwright test -c playwright.system.config.ts system-tests/FR-03-01-bulk-user-import.spec.ts --workers=1` → "template: Instructions-first layout…" | Instructions/Users/Lists, tab colours, row-1 headers and fills, autofilter, drop-down; blank template re-upload reports no rows | Passed |
| S2 | End-to-end import (desktop) | same spec → "desktop: template, validation preview…" (updated for row-1 header) | Preview 5 rows / 2 valid / 3 errors, error report rows from row 2, 2 invitations sent, users visible after reload | Functional steps Passed; the final "no HTTP ≥ 400" assertion Failed on `404 GET /api/v1/organizations/{id}/roles` and `403 GET /api/v1/employee/target-roles` issued by the user directory page — outside this template change, reported separately |
| S3 | Mobile 390×844 | same spec → "mobile…" | Upload + preview usable, no horizontal overflow | Passed (on rerun; first serial run timed out on the sign-in page load) |

Artifacts: `frontend/test-results/FR-03-01-import/` (not committed).

## Manual checklist

1. Sign in as a System Administrator at `http://127.0.0.1:8088`, open **User Accounts** → **Import Excel** → **Download template (.xlsx)**.
2. The first tab is **Instructions** (VI: **Hướng dẫn**) with the sheet table, column rules and legend; then **Users** and **Lists**.
3. On **Users**, row 1 is the header: required columns (`*`) orange with white text, optional columns light orange; row 1 is frozen and filterable; Role/Department/Job position/Target role/Level offer drop-downs.
4. Fill two rows, upload → the preview validates them; download the error report → the red **Import error** column explains each failed row.
