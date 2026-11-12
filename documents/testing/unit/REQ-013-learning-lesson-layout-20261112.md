# REQ-013 dedicated lesson layout — unit verification, 2026-11-12

Passed: 19 tests across WorkspaceLayout, LearningModuleReaderPage and LessonDocument.

Command: `npm --prefix frontend test -- src/shared/layouts/WorkspaceLayout.test.tsx src/features/employee/modules/LearningModuleReaderPage.test.tsx src/shared/components/learning/LessonDocument.test.tsx`.

New layout assertions cover structural absence of global sidebar/toggle in lesson mode, retention in default mode, shared navbar, full-width main modifier and preservation of the saved Employee sidebar preference. Existing reader/document checks cover the retained learning behavior.

Production build passed. Scoped oxlint completed without errors; three existing WorkspaceLayout warnings remain (state synchronization effect and duplicate comparisons). Build retains the existing large bundle advisory. `git diff --check` passed. No backend changes or backend checks are needed for this layout-only slice.
