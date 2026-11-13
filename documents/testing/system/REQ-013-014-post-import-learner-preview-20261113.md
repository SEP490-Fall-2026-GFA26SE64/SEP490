# REQ-013 / REQ-014 post-import learner previews — 2026-11-13

Approved scope: after successful import confirmation, inspect the newly persisted Module/Question drafts as a learner. Existing import validation, owner/organization boundaries, review/publication and learner scoring/progress APIs remain unchanged. This is not a new approval workflow or automatic submission feature.

## Implementation

- LearningImportPanel retains the actual ModuleDocument[] commit response and opens ImportedModulesPreview. Its directory contains only that response's modules; each selected revision uses the existing LearningContentPreview/LearningPreviewReader, LessonBody and LessonVideo. Reading, private images, uploaded video, module/lesson selection, desktop/mobile sizing, full preview and return to directory are available. Module import uses a wide bounded dialog.
- QuestionBankWorkspace matches the immutable generated preview codes against the returned BankView and retains only those saved questions. ImportedQuestionsPreview presents the persisted current version, question navigation, local trial choices, desktop/mobile sizing and full preview. The staff answer key/explanation is a separate collapsed accordion, never highlighted in the neutral choices.
- AssessmentQuestionContent was extracted from the active Employee BaselineAttemptPanel so Employee and staff simulation use the same question/option markup. Existing Employee command callbacks, disabled/review behavior and baseline input identifiers are preserved. The shared component accepts no correct-answer or scoring data.
- Failed confirmations stay in import with the existing server error. No result viewer opens for an unsuccessful import. Result state remains scoped by the existing account/organization/role-keyed workspace wrappers and is cleared when closing/unmounting. No schema, backend, API, dependency, authorization or publication change was needed for this slice.

## Executed verification

| Check | Result |
| --- | --- |
| Frontend production build | Passed, TypeScript/Vite. Existing bundle-size advisory only. `/tmp/sep490-post-import-build.log`. |
| Component regression | 100/100 Passed,18 files,53.85s. Includes Module workspace/import, shared lesson/media renderers, Question Bank and Employee BaselinePresentation. `/tmp/sep490-post-import-components.log`. |
| Focused final component check | 6/6 Passed,2 files,3.05s. ImportedModulesPreview and LearningImportPanel rerun after visual spacing/title refinement; matching log `/tmp/sep490-post-import-final-focused.log`. |
| Fixture-backed Chrome | 16/16 Passed,39.8s, including new saved-import Module and Question cases plus existing authoring/exact revision previews. Final visual refinement subset5/5 Passed,about1.2min. Results are overlapping runs, not21 distinct tests. |
| Lint / whitespace | Scoped oxlint Passed with no warnings; modified frontend source/spec whitespace check Passed. |
| Actual local Module import | Passed on the real app/API/PostgreSQL/MinIO in the separate baseline-lab-20261111 test organization. Imported TEXT + H.264 video, opened returned saved reading, loaded and played the private video, read the new Module back from the API as DRAFT, and returned to the directory. |
| Actual local Question import | Passed in the same test organization. Confirmed a unique question, automatically opened exactly one persisted draft, selected a trial answer without exposing the key, deliberately expanded the staff explanation, and reloaded the stored Question as DRAFT. |

Component command: `npm --prefix frontend test -- src/features/expert/modules src/shared/components/learning src/shared/components/question-bank src/features/employee/baseline-assessment/BaselinePresentation.test.tsx --testTimeout=15000`.

Browser command from frontend: `SYSTEM_TEST_BASE_URL=http://127.0.0.1:5100 PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ./node_modules/.bin/playwright test --config=playwright.system.config.ts --output=/tmp/sep490-post-import-browser-final REQ-013-shared-learner-preview.spec.ts REQ-014-post-import-preview.spec.ts --max-failures=1`. Visual refinement rerun used `/tmp/sep490-post-import-browser-polish` and grep `Import preview shows|Question import opens|failed question`.

Browser acceptance at1440/390px: server-saved content rather than file-preview text; only imported items, excluding a pre-existing Question; module/lesson switching; real H.264 fixture metadata/playback; private image/video URLs; current video retained in full preview; mobile bounds and no horizontal overflow; question choices neutral before/after selection; staff key collapsed per question; question navigation/full preview/back; no learner/progress/score writes and no page errors; failed409 confirmation retains import. Existing authoring regressions also cover1280px. The tiny one-second H.264 fixture is899 bytes encoded in a source helper, not a generated screenshot/video directory.

Initial new component test used the wrong upload label/file API fixture and was corrected to the real Select file control and flat import fields. Initial Chrome run passed15/16 and failed only because the negative-case assertion matched both the global and inline error; it was scoped to the import dialog and the full16 passed. These earlier attempts remain outside Git under `/tmp/sep490-post-import-browser` and are not represented as final passes.

## Real runtime details and limits

Actual URL: `http://localhost:8088/workspace/baseline-lab-20261111/expert/modules` and `/expert/assessment-bank` under the same workspace prefix. Existing test identity was used; credentials/session data were never added to the repository. Runtime result `/tmp/sep490-post-import-preview/real-result.json`; committed module response `/tmp/sep490-post-import-preview/real-module-committed.json`.

Two QA module drafts and one QA question draft remain in this dedicated test organization, all prefixed `[QA POST IMPORT ...]`; neither was submitted, published or assigned to a learner. One earlier local Module attempt completed but its following Question Bank initial load timed out, so the Module check was repeated and a second QA draft was created. Subsequent direct reads responded in505ms for bank session and573ms for the9-question bank; a separate Question-only real-browser rerun then passed. No timeout thresholds, retry policy or backend code was changed to conceal this transient failure. Local Question source/preconditions were kept separate from the fixture-backed pass. No production performance guarantee is claimed.

The actual Question confirmation persisted ID `c680c8e2-91b0-4371-a4ea-d7e19705361d`, code `Q-7A83934C-3B49-4D97-9C50-F57C5B5DC29F`. The final actual Module check used `cc82ef7e-56be-433b-9631-f63f0499f349`. Browser request monitoring recorded no learner-state writes and no page errors in the final successful Question run; Module playback uses the existing preview-only media component without a progress callback. No grading/mastery API was called. Mobile behavior was verified with isolated browser fixtures, not a second real-database import.

Screenshots visually inspected: `/tmp/sep490-post-import-modules.png` and `/tmp/sep490-post-import-questions.png`; no generated screenshots/traces were added to Git. The separate existing conflict in `documents/testing/system/REQ-013-module-authoring-wide-20261113.md` was preserved. No commit, push, deployment, database reset or unrelated conflict resolution was performed.

## Manual checks

1. Sign in as an authorized Expert; import the Module ZIP through the normal validation/confirmation steps. Only after confirmation succeeds should the imported-module directory and learner reader open.
2. Select another module and lesson. Read TEXT, inspect an authorized image, play VIDEO, switch desktop/mobile and open/close full preview. Return to directory; the drafts remain available through normal module details/history.
3. Import Question Excel/JSON and confirm it. Only questions from that confirmed batch should appear in the result viewer. The complete prompt/options must match saved versions, with no correct-answer highlight.
4. Select a trial answer; expand the separate staff key; change questions and verify the key starts collapsed. Open/close full preview and return to the bank. No attempt, grade, mastery or publication should be created.
5. For an invalid upload or failed/stale confirmation, retain the existing import error/confirmation controls and show no successful result viewer. Reopening a new import must not show the previous batch's result.
