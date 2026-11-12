# REQ-014 linear stepper and question-form refinement — 2026-11-10

## Scope

Presentation refinement of the existing R2 slice: compact circular stepper; neutral, viewport-bounded draft dialog; shared FormField and native RadioGroup controls; 65/35 desktop editor/preview, collapsible small-screen preview; local field validation with existing draft/submission requirements. No backend, dependency, database, authorization, import format or question model change.

Component inspection found reusable Dialog/Body/Header/Footer, FormField, RadioGroup/Item, Input, Button and Accordion. Existing native select/checkbox controls remain because no shared Select/Checkbox abstraction existed. No suitable shared stepper was found, so LinearStepper was added under shared UI. The existing ContentPreview was extracted and reused by the form, question details and history.

## Recorded verification

- Passed: 17 component tests; [unit evidence](../unit/REQ-014-bank-ui-20261110.md).
- Passed: scoped Oxlint.
- First browser run: **4 passed (3.0 minutes)** on http://localhost:8088. One real API save/Excel import journey plus presentation journeys at 1440×900, 768×900 and 390×900. [Log](assets/assessment-bank-ui-refinement-20261110/first-run.txt).
- Real API: saved a unique incomplete draft with permitted null correctAnswer/knowledgeLevel, previewed and confirmed an XLSX row, reloaded and verified exactly two matching questions remained DRAFT. Replayed only the session snapshot from the real API to avoid duplicate catalog reads; writes and persisted-bank reads remain real. Two uniquely named test drafts remain in local data, unpublished.
- Presentation cases: explicit Question Bank fixtures after real Expert/L&D authentication. Covered whitespace-prompt validation/disabled save, live radio-answer preview, native ArrowDown/ArrowUp exclusive selection, collapsed small-screen preview expansion, keyboard focus containment, visible footer, last-field bounds above the footer, upload/error/warning/confirmation transitions, JSON source-row detail, empty search and manager action visibility. Fixtures are not additional persistence evidence; runtime application code still uses real APIs.

## Visual inspection and follow-up

Initial real/desktop/tablet/mobile screenshots were inspected. Two final presentation improvements were made after the first passing run: stepper moved outside the import body's scroller so current progress remains visible on mobile, and duplicate preview heading hidden on small screens. No API/state/persistence logic changed. Final responsive rerun and build results are appended below. Earlier screenshots/logs remain under [initial refinement assets](assets/assessment-bank-ui-refinement-20261110/); final captures use a separate directory. Modal screenshots in the final rerun are viewport captures; directory shots remain full-page.

## Manual checklist

- Expert: Import questions → Choose File, Review, Confirm. Verify three circles, connector lines, completed check icons, current orange indicator and neutral upcoming indicators; no large rectangular step containers. Progress stays visible while scrolling validation content.
- Download existing XLSX/JSON template, browse/drop file, inspect actual totals/errors/warnings. Errors block progress; warning acknowledgement enables confirmation. Import remains draft-only.
- Create question: generated-code notice is read-only; select Skill; Knowledge Level can remain unset for Draft but is required before submission. Mandatory flag still excludes Baseline.
- Blur an empty/whitespace prompt or empty Skill: field feedback appears and save remains disabled. Correct inputs; select/cycle radio answers by keyboard, clear selection to preserve null draft answer. On server failure, entered values remain.
- At desktop width, inspect 65/35 layout and sticky live preview while scrolling. At tablet/mobile, open/close preview. Empty content remains explicitly empty, with no invented question text.
- Scroll to Answer explanation: complete field stays above the visible Save/Cancel footer. Header/footer remain outside the content scroller; no document horizontal overflow.

## Limits

Configured validation/permissions remain server-owned. Unknown server errors remain a form error rather than a fabricated field attribution. Backend/review-publication/email/retirement workflows were not reimplemented or recertified. Existing Vite bundle-size warning and previously recorded shared favicon 404 are outside this refinement; no global shell or runtime changes were made.

## Final verification

- Passed: production frontend build after final source changes; Vite's existing large-bundle warning remains.
- Passed: 17 component tests, scoped Oxlint and `git diff --check`.
- Passed: responsive follow-up **3/3** at 1440×900, 768×900, 390×900 (**3.7 minutes**). Added a bounding-box assertion that import progress remains inside the viewport on the confirmation step. [Log](assets/assessment-bank-ui-refinement-final-20261110/responsive-final.txt).
- Real draft/save/import evidence remains the preceding **4/4** run; the final changes only move the stepper outside the body scroller and suppress a duplicate small-screen heading. The responsive follow-up executes the same import upload/review/confirmation controls with isolated fixtures; it does not claim additional database writes.
- Visually inspected final desktop/mobile form and confirmation captures. Neutral dialog border, radio rows, 65/35 desktop preview, one collapsible mobile preview heading and always-visible circular import progress are present. Footer/last-field bounds and no document overflow passed at each size. [Final screenshots](assets/assessment-bank-ui-refinement-final-20261110/); [real API screenshots](assets/assessment-bank-ui-refinement-20261110/real-api/).

Commands (frontend cwd): `npm run build`; `npm test -- src/shared/components/question-bank/__tests__ --maxWorkers=1`; scoped `oxlint`; `SYSTEM_TEST_BASE_URL=http://localhost:8088 PLAYWRIGHT_CHROME_PATH=<installed Chrome> npx playwright test --config=playwright.system.config.ts REQ-014-bank-ui-desktop.spec.ts`, followed by `--grep presentation` for the two final layout-only adjustments. All runs use distinct output folders and preserve prior evidence.
