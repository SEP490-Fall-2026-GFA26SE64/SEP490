# REQ-013 — one responsible Expert: unit evidence

Date: 2026-10-29. FR-05.05/FR-05.08/FR-04.06, bounded local Module ownership change.

## Passed

- ModuleAuthoringServiceTest:13 passed. Existing complete-field/version/release/pin/coverage assertions retained. Updated the superseded shared-edit policy: a peer Expert can read but receives403 for edit/delete/submit despite occupation access; owner edits preserve creator and prior payloads. Intake selects one active Expert and refuses another Expert's acceptance. Owner scope is independent of peer read visibility.
- HexagonalArchitectureTest:3 passed.
- ModuleManagementWorkspace.test.tsx:10 passed, including peer read-only controls, L&D routing/history, one-Expert intake selection and mutation errors/CSRF.
- TypeScript `tsc -b`: passed. Vite production build: passed, with existing large-bundle warning.

Backend command used a clean isolated snapshot and actual Maven test execution, not the old target directory (which retains legacy SQL resources). Initial restricted execution could not attach Mockito's JVM agent; the authorized rerun with JVM/Docker access passed. Frontend assertions were updated for the new Staff lookup and explicit intake Expert; one later concurrent run hit the existing five-second test limit, and a serial rerun passed. No timeout increase or omitted assertion was used.

[Integration evidence](../integration/REQ-013-single-expert.md), [system/manual evidence](../system/REQ-013-single-expert.md).
