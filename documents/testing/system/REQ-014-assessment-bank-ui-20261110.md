# REQ-014 Assessment Bank desktop UI — 2026-11-10

## Scope and environment

Shared Expert / L&D Question Bank directory, draft editor and import dialogs. Local frontend at http://localhost:8088; existing API/database runtime retained. Desktop acceptance only (1440×1000 and 1280×900); mobile acceptance was excluded. No backend, migration, dependency or runtime changes.

## Recorded checks

| Check | Actual result |
| --- | --- |
| Component regression and new live-preview/filter/import-gate cases | Passed: 11 tests (`npm test -- src/shared/components/question-bank/__tests__/QuestionBankWorkspace.test.tsx --maxWorkers=1`). |
| Initial frontend production build | Passed; existing bundle-size warning. |
| Initial scoped Oxlint | Passed. |
| First desktop browser run | Failed: initial session load reached the application's existing 30-second timeout; preview assertion used the default 5-second expectation. No draft/import completed in that run. |
| Authenticated diagnostic GETs | Session, bank, notifications all returned 200; observed approximately 13.9 seconds, 1.0 second and 0.7 second respectively. |
| Second browser run | Interrupted while waiting for the slow local catalog; no success claimed. |

Browser regression: `frontend/system-tests/REQ-014-bank-ui-desktop.spec.ts`. The final harness replays a session snapshot read from the real authenticated API to avoid duplicate expensive catalog reads during React StrictMode mounting. Real draft/import writes and real bank reads/reload assertions remain enabled. Error/warning previews are explicitly isolated route fixtures, not persistence evidence. L&D identity is authenticated separately. This does not certify initial uncached session-load performance or production operation.

## Manual checklist

Prerequisites: running local stack and entitled demo Expert/L&D accounts; at least one available Skill.

- Expert: open Assessment Bank, search/filter/paginate, clear filters, inspect status/Skill/owner and open details.
- Open Create: type prompt/options, choose correct answer, check live preview; choose a Skill and save an incomplete draft. Reload and confirm it remains a draft.
- Import: download XLSX/JSON template, upload a uniquely named test question, inspect validation/preview; errors block progress and warnings require acknowledgement. Continue to confirmation, go Back without committing, then confirm once. Reload and verify a draft was created.
- L&D: inspect the directory and review/assignment controls; Create and Import must be absent.
- Keyboard: Tab remains inside an open dialog; header/footer remain accessible while the body scrolls.

## Final desktop presentation checks

- Passed: production frontend build after final UI changes; existing Vite bundle-size warning only. A test-only Testing Library type error (`exact` option) was corrected before this successful build.
- Passed: scoped Oxlint for the workspace, component tests and desktop Playwright spec.
- Passed: desktop Playwright presentation scenario (1 test, 37.9 seconds) at 1280×900. Real staff sign-in; Question Bank session/list/preview/write responses use explicit UI fixtures in this scenario. Covered table layout/no document overflow, live prompt/answer preview, keyboard focus remaining in the dialog, draft save dialog closure, invalid import gate, warning acknowledgement, confirmation step, empty search and separately authenticated manager with no authoring buttons. This is not proof of database persistence.
- Visually inspected: directory, draft editor, upload, warning review, confirmation and manager directory screenshots under [assets](assets/assessment-bank-ui-20261110/). Dialog header/footer remain visible, form body scrolls, tables use project surfaces/tokens.
- Real API attempt: session returned HTTP 503. The original TypeError caused by assuming a successful response was corrected in the harness to assert HTTP 200 explicitly before reading fields. The failed response is a runtime blocker, not a passing persistence check.

Browser command: `SYSTEM_TEST_BASE_URL=http://localhost:8088 PLAYWRIGHT_CHROME_PATH=<installed Chrome> npx playwright test --config=playwright.system.config.ts REQ-014-bank-ui-desktop.spec.ts --grep presentation`. A separate `--grep "real draft"` run checks actual draft/import persistence. Desktop mobile-independent styling is retained; mobile acceptance was not run.

## Final real-API recheck

Blocked: real persistence scenario stopped after 12.6 seconds at `GET /api/v1/question-bank/session`: expected 200, received 503. The same runtime failure recurred after other test/build processes had stopped. No successful draft/import persistence is claimed and this run stopped before any write. The presentation scenario remains Passed, separately.

Next verification: restore the existing local Question Bank session endpoint to HTTP 200, then rerun `--grep "real draft"` and verify the two uniquely named drafts survive reload. No runtime/backend repair or migration was performed in this UI slice. The full desktop DoD remains partially blocked, so existing feature completion documentation was not updated.

Retained run logs: [presentation](assets/assessment-bank-ui-20261110/presentation-run.txt), [real API recheck](assets/assessment-bank-ui-20261110/real-api-recheck.txt). Raw traces remain in `/tmp/sep490-assessment-bank-ui/` and are not committed because they may contain authentication state.


