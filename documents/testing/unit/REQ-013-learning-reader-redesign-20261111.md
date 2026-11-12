# REQ-013 learner reader redesign — component verification, 2026-11-11

Scope: revision 1 of the Employee learning-content redesign; FR-06.06 / FR-06.08 / FR-06.09. This records local checks, not production acceptance.

| Check | Command (repository root) | Actual result |
| --- | --- | --- |
| Reader / video controls | `npm --prefix frontend test -- --run src/features/employee/modules/LearningModuleReaderPage.test.tsx src/shared/components/learning/LessonVideoControls.test.tsx` | Passed: 2 files, 8 tests; final focused run 17:46 local time. |
| TypeScript / bundle | `npm --prefix frontend run build` | Passed on final source; existing bundle-size advisory remains. |
| Scoped lint | `cd frontend` then `./node_modules/.bin/oxlint src/features/employee/modules/LearningModuleReaderPage.tsx src/features/employee/modules/LearningReaderHeader.tsx src/features/employee/modules/LearningLessonSidebar.tsx src/features/employee/modules/LearningModuleReaderPage.test.tsx system-tests/REQ-013-learning-reader-redesign.spec.ts` | Passed, no diagnostics. |
| Whitespace | `git diff --check -- frontend/src/features/employee/modules frontend/system-tests/REQ-013-learning-reader-redesign.spec.ts` | Passed. |

Reader cases cover real title and lesson rendering through isolated component API doubles, completion writes, next/previous, sidebar collapse with retained selection, server-selected resume, empty content, load failure/retry, and a failed progress write preventing navigation followed by recovery. Video-control tests retain actual media-control event assertions. Doubles are test-only and do not prove database persistence, live media-provider connectivity or complete assessment behavior.

Initial checks found an obsolete next-button expectation and removed status shortcut; the shortcut was retained and tests updated to the approved Next lesson label. A first build caught an unused derived percentage after moving it to the header; removed. The final results above supersede those failed intermediate checks without claiming they passed initially.

Backend unit/security/ArchUnit/Testcontainers: Not Applicable to source changes (no backend/API/schema changes). Live authorization, persistence and assessment integration remain required system checks, reported separately in [system evidence](../system/REQ-013-learning-reader-redesign-20261111.md).
