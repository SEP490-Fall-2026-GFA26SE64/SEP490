# REQ-014 — Question Bank unit verification

Date: 2026-10-30. Scope: Question Bank authoring subset of FR-05.06; not module exam construction or calibration.

## Executed checks

- `QuestionBankServiceTest`: 16 passed in the consistent backend package run. Covers incomplete drafts/manual import, immutable normalized codes, owner/peer boundaries, exact reviewed-version publication, catalog snapshot changes, atomic bulk decisions, submitted transfer/withdrawal/return, immutable predecessors, whole-question retirement/reactivation, legacy missing explanation, import conflicts/confirmation/replay and changed content duplicates.
- `HexagonalArchitectureTest`: 3 passed in the same run.
- `Neo4jQuestionBankSkillReaderTest`: 3 passed in the latest backend run. A never-completing result and stalled session cleanup cannot hold the caller indefinitely; unavailable transport returns a safe503 and another read can recover; missing/ambiguous skills remain400 without invented content.
- Frontend Vitest: 10 passed across `QuestionBankWorkspace.test.tsx` (5), `questionBankApi.test.ts` (3), and `LegacyBaselineAssessmentRedirect.test.tsx` (2). Covers connected loading/empty/permission/error states, correct role routing, bounded stalled requests and safe response handling. Mocked unit responses are not real-stack evidence.

Latest backend command: `JAVA_HOME=<JDK21> bash backend/mvnw -f backend/pom.xml '-Dtest=QuestionBankServiceTest,Neo4jQuestionBankSkillReaderTest,QuestionBankPersistenceIntegrationTest,HexagonalArchitectureTest' package`. Latest result: **23/23 passed**,0 failures/errors/skips, `/tmp/sep490-question-bank-bounded-backend.log` (2026-10-30 09:47+07).

Frontend command, from `frontend`: `node node_modules/vitest/vitest.mjs run --maxWorkers=1 --no-file-parallelism src/shared/api/questionBankApi.test.ts src/shared/components/question-bank/__tests__/QuestionBankWorkspace.test.tsx src/features/manager/baseline-assessments/LegacyBaselineAssessmentRedirect.test.tsx`.

Earlier backend receipt: `/tmp/sep490-question-bank-consistent-backend.log` (20/20 before the bounded-reader regression was added). Earlier inconsistent source/class run failed and was corrected with a consistent rerun; it is not counted as passing. An earlier concurrent frontend run timed out; the final single-worker run passed without increasing its test threshold. Latest10/10 frontend receipt after final form/translation changes: `/tmp/sep490-question-bank-handoff-frontend.log`.

TypeScript/build/lint and real browser outcomes are recorded in the dedicated system evidence. These unit checks do not establish production readiness or real SMTP delivery.


### Bulk approval feedback follow-up — 2026-10-30

Focused component suite:8/8 passed (`/tmp/question-bank-feedback-unit.log`), including unreviewed-code popup/no approval request/direct detail, server conflict with public codes/selection retention, and eligible bulk submission. Initial run7/8 failed because the close-button test locator matched two controls; footer clarified to Back to list and final8/8 passed. TypeScript build passed (`/tmp/question-bank-feedback-types.log`); frontend bundle passed4.73s (`/tmp/question-bank-feedback-build.log`, existing chunk advisory). Scoped lint exit0; diff whitespace check passed. No backend/domain/schema changes; existing backend test results are historical, not rerun for this presentation-only change.
