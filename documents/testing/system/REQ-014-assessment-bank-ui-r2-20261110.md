# REQ-014 Assessment Bank UI R2 — 2026-11-10

## Scope and environment

Local frontend/API at http://localhost:8088. Existing running API/database reused; no backend/schema/dependency/runtime configuration changed in R2. Existing Expert/L&D authorization and server-managed codes, nullable draft fields, review/publication/availability workflow retained. Staff-only UI did not gain Administrator access or a Delete action. Shared project typography/tokens retained rather than introducing a global font or color override.

## Results

| Acceptance | Actual result |
| --- | --- |
| Regression/component tests | Passed: 14 tests in 2 files; see [unit evidence](../unit/REQ-014-bank-ui-20261110.md). |
| Production build / scoped lint | Passed; existing Vite bundle-size warning only. |
| Real local draft save | Passed: unique UI-R2 prompt saved; correctAnswer and knowledgeLevel remained null; state DRAFT confirmed through real API. |
| Real Excel import / reload | Passed: one Questions-sheet XLSX row parsed, previewed and confirmed through real API; reload/search found both test drafts and API confirmed both remained DRAFT. |
| Desktop 1440×900 | Passed: table/no document overflow, draft live answer preview and keyboard focus containment, visible save footer, drag/drop JSON upload, source-row error detail, error/warning gates, confirm, empty search, manager authoring-action boundary. |
| Tablet 768×900 | Passed: same presentation acceptance. |
| Mobile 390×900 | Passed: same presentation acceptance; table becomes a labelled compact list and dialogs retain visible actions while scrolling. |

Final Playwright: **4 passed (2.2 minutes)**. Command (frontend cwd): `SYSTEM_TEST_BASE_URL=http://localhost:8088 PLAYWRIGHT_CHROME_PATH=<installed Chrome> npx playwright test --config=playwright.system.config.ts REQ-014-bank-ui-desktop.spec.ts --output=<dedicated output>`. [Run log](assets/assessment-bank-ui-r2-final-20261110/playwright-final.txt).

The real persistence test authenticates against the existing demo staff account. A session snapshot read from the real API is replayed only to avoid duplicate expensive catalog reads during StrictMode mounting. Draft/import writes and bank reads/reload assertions remain real. The three presentation cases authenticate real Expert/L&D identities but use explicit Question Bank route fixtures for repeatable layout/error/warning coverage; they are not additional persistence evidence. Runtime application source continues to use real APIs only.

The initial R2 combined run had 3 presentation passes and a real-save failure: the backend returned “MicroSkill catalog is unavailable” during save despite healthy containers. No success was claimed for it. After the build and other test processes stopped, the final real-API scenario passed without changing backend behavior/timeouts. [Initial run](assets/assessment-bank-ui-r2-final-20261110/playwright-initial.txt). This preserves evidence of intermittent catalog availability/performance; the successful local slice does not certify production resilience. Two uniquely named test drafts remain in the local bank; no cleanup/reset or publication was performed.

## Visual inspection and artifacts

Screenshots inspected in the final run and its immediately preceding R2 layout run: desktop/tablet/mobile directory, draft form, upload, validation and confirmation. Full-page shots include background page content below the viewport; modal backdrops cover the viewport as intended. [Final screenshots](assets/assessment-bank-ui-r2-final-20261110/) are separated by 1440/768/390 and real-api; earlier screenshots were preserved. Raw authentication-bearing traces remain outside tracked evidence in `/tmp/sep490-assessment-bank-ui/`.

## Data and validation limits

- Import totals use actual parsed source rows and server-accepted draft rows. Rejected count is source count minus accepted rows. Duplicate count uses distinct generated candidate codes with server duplicate warnings, so multiple warnings do not inflate it. “Accepted” means valid for draft import, not complete for publication.
- Source rows are tracked client-side only: actual Excel row numbers from the parser and JSON item numbers. The API remains unchanged. Server row references are mapped to those locations; unknown messages are preserved. No field-specific error is invented when the backend supplies only a general message.
- Configured byte/row limits come from session; 10 MiB/500 remain defaults. Format/schema/content validation remains in the existing parser/backend.
- Knowledge level remains optional for draft save; helper text explains that it is required before submission. All existing fields and API ownership remain unchanged.
- No new sorting, question deletion or Admin access was invented. Complete publication/retirement/email workflows and the rule assessment engine were not recertified by this UI slice.

## Manual checklist

1. As entitled Expert, open `/workspace/workspace-development/expert/assessment-bank`; search by code/content, set Skill/level/state/owner filters, remove an individual filter or clear all, and paginate.
2. Open Create question; confirm generated-code notice, required prompt/Skill, configured level choices and mandatory/Baseline explanation. Type options/answer and check the live preview. Save an incomplete draft, reload and inspect the saved draft.
3. Import questions: download XLSX/JSON templates, browse or drop one file, inspect name/size/configured limits; verify errors show source location when supplied and block progress. Warnings require acknowledgement. Go Back without committing, then confirm once; reload and inspect imported drafts.
4. As entitled L&D, open `/workspace/workspace-development/ld-manager/question-bank`; inspect existing details/assignment/review controls. Create/Import must be absent.
5. Repeat at 1440, 768, 390 widths; no document overflow, labels/actions readable, footer reachable, Tab remains inside modal and busy state prevents duplicate submissions.

## Uncached page / console / network check

A separate real staff sign-in and page navigation used no Question Bank route fixtures. The directory loaded; no JavaScript page errors, failed Question Bank requests or Question Bank HTTP error responses were observed. The browser emitted one unrelated shared-shell resource error: `http://localhost:8088/favicon.ico` returned 404. The raw smoke script exits 1 because it counts all console errors; this is not described as an entirely clean console. No unrelated favicon change was made. [Raw result](assets/assessment-bank-ui-r2-final-20261110/uncached-console-network.txt).

