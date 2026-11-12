# REQ-014 — Question Details R4 component verification

Run started 2026-11-10 and completed 2026-11-11. Frontend-only refinement; no backend/schema/API/dependency changes.

Passed: 34 tests across 5 files using `npm test -- src/shared/components/question-bank/__tests__ --maxWorkers=1 --testTimeout=15000`. Initial 28-case regression, 32-case extension and 34-case null-state extension passed before the final 34-case run.

New checks cover four distinct detail sections; mandatory/Baseline wording without falsely excluding questions; actual correct-answer key and missing explanation; chronological activity and actual historical snapshots; version selection retained across tabs; no new version implied by assignment; nullable creator/editor/submitter/reviewer identities and times; empty prompt/answers/null correct key; unassigned ownership versus known person with unavailable current role. Submission/approval confirmation checks assert cancellation sends no command, no new required reason, expected revision and original null non-assignment owner payload, error retention, and the existing exact-version acknowledgement guard. Clipboard failure still exposes the complete compact ID for manual selection. Existing form/import/ownership/tab regressions remain active.

Final production build, scoped Oxlint and diff check passed. The existing large-bundle warning remains. No backend, database integration or security certification is claimed for this UI-only slice.

[Unit log](../system/assets/assessment-bank-details-r4-verified-20261111/unit.log), [build](../system/assets/assessment-bank-details-r4-verified-20261111/build.log), [lint](../system/assets/assessment-bank-details-r4-verified-20261111/lint.log), [browser evidence and runtime recovery](../system/REQ-014-question-details-r4-20261111.md).
