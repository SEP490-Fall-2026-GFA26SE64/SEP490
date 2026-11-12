# REQ-013 shared learner preview — unit evidence, 2026-11-12

Passed 33 tests across 5 files. Command: `npm --prefix frontend test -- src/shared/components/learning/LearningContentPreview.test.tsx src/features/expert/modules/ModuleManagementWorkspace.test.tsx src/shared/components/learning/LessonDocument.test.tsx src/features/employee/modules/LearningModuleReaderPage.test.tsx src/shared/components/learning/LessonVideoControls.test.tsx --testTimeout=15000`.

New preview checks verify actual sanitized body/code and private image URL, reading/video local navigation and first/last bounds, mobile/full-preview controls with selected lesson/width preserved, current unsaved authoring values retained on returning to edit, empty content, failed rendering/retry, and absence of learning/progress writes. Existing module/review, Employee, document and native video checks passed.

The final full `npm --prefix frontend run build` passed. Scoped oxlint passed without warnings/errors on affected components and new system test. `git diff --check` passed. Existing build large-chunk advisory remains. No new backend/API/schema/dependency changes in this task; no backend verification or deployment claimed.
