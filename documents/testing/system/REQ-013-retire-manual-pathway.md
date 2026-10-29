# REQ-013 — manual test assignment retirement (2026-10-30)

## Scope and environment

Preserved accounts-dev Compose stack, localhost:8088 frontend /28180 API, PostgreSQL V41, current learning-module-manage branch. No seed/import/reset or database migration in this change. User separately approved database/jar backup and API restart; backup is ignored/private under local/dev-accounts/merge-backup/remove-manual-20261030. Do not attach its contents.

Current browser verification: **Passed, 3/3 current cases**, real Chrome/Compose with no API fixtures. Expert UI/import retained, assignment panel absent, GET/POST410; Employee manual-only lesson403; guided empty pathway/role CTA, reload, desktop/mobile, no horizontal overflow or pageerror. Screenshots visually inspected below.

Run history: initial UI run interrupted by approved API restart; next combined-role run had2 timeouts at120s during cross-role logout/final read. Separate-session rerun:2 passed,1 failed because the5s empty-state assertion ran while the real pathway request was still loading. Final Employee-only rerun waits for an actual200 pathway response before asserting UI:1 passed (21.4s). Overall test deadline remains120s. All failures are retained in logs; no prior pass carries over for the corrected Employee case.

Command: SYSTEM_TEST_BASE_URL=http://localhost:8088 PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node frontend/node_modules/@playwright/test/cli.js test --config=frontend/playwright.system.config.ts REQ-013-learning-content.spec.ts --grep 'retired manual assignment'. Current3 cases are in frontend/system-tests/REQ-013-learning-content.spec.ts. Final receipts: /tmp/sep490-remove-manual-browser-rerun.log (Expert/API and admission passed) and /tmp/sep490-remove-manual-browser-employee.log (corrected Employee passed).

[Desktop](artifacts/REQ-013-retire-manual-pathway/desktop.png) · [Mobile](artifacts/REQ-013-retire-manual-pathway/mobile.png).

Post-restart read-only SQL confirms 10 historical assignments,14 lesson progress rows,V41, matching pre-change counts. Flyway validated41 migrations and applied none.

Historical R5–R7 and prior integration selector/assignment browser cases describe retired behavior and do not certify this change; they were not rerun as current acceptance. Actual generated approved learning end-to-end is outside this removal run: the preserved Employee has no current initial pathway and no approval/readiness evidence is fabricated.

## Conflict review

Duplicate squash merge of main 6889516 into already-integrated HEAD cedb66d caused 37 unmerged paths and two duplicate migration additions. Verified stage-2 entries matched HEAD, backed up the index/worktree, restored only verified merge paths and removed only obsolete merge-only files. Main integration remains in HEAD. Current unmerged paths: 0. Both canonical and workspace migration inventories contain 41 files, zero duplicate versions. No commit/push. The broad restore attempt was rejected by automatic review; the narrower verified recovery succeeded.

## Manual checklist

Prerequisites: accounts-dev services ready, existing Expert and Employee credentials from the private account sheet. Do not reset an account or progress.

1. Expert: open http://localhost:8088/expert/modules. Import Excel / ZIP and authoring remain available; no Assign a learning pathway panel.
2. Employee: open http://localhost:8088/employee/pathway. With no initial pathway, see empty-state guidance and Review Roles CTA, no sample R4 selector or Assigned modules link. With an actual initial pathway, retain its genuine generation/review display.
3. Open /employee/pathway?view=assigned and reload. It does not open the old manual selector. Check at desktop and 390px mobile widths.
4. Follow Review Roles; expect /employee/upskilling?tab=roles. Selecting role/level and real baseline/approval remains the owning pathway flow.
5. Authenticated GET/POST /api/v1/module-management/pathways returns 410. A legacy manual-only module URL returns 403; old assignment rows do not authorize private content.
6. Existing approved generated entries retain version and prerequisite checks; content completion remains separate from mastery. No data cleanup is performed.
