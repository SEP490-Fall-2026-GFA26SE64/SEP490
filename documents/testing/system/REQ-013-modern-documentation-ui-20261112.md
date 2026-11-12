# REQ-013 modern documentation UI — 2026-11-12

## Delivered visual slice

Employee module lessons use a compact shared-navbar/module-header composition, a lighter syllabus with orange active state and green completed indicators, and an open white document surface. The module title is displayed once visually. Breadcrumb and the extra skill-status toolbar are removed; the actual skill eligibility panel and assessment actions remain at the end of the lesson.

On wide screens, On this page navigation is generated from actual nonempty H1/H2/H3 content headings. Links scroll and transfer keyboard focus to unique section targets; no headings or sample content are invented. Smaller screens retain a single document column and toggleable syllabus. Collapsing the syllabus supplies the existing focused reading view. No new dependencies, API, persistence schema or completion policy changes. Completion and Next remain separate existing actions; combined/automatic completion was not silently introduced from concept artwork.

## Checks

- 20 focused tests passed: WorkspaceLayout, LearningModuleReaderPage, LessonDocument. Includes actual heading-derived contents link/focus and the retained save/navigation/error/resume behavior. Command: `npm --prefix frontend test -- src/shared/layouts/WorkspaceLayout.test.tsx src/features/employee/modules/LearningModuleReaderPage.test.tsx src/shared/components/learning/LessonDocument.test.tsx --testTimeout=15000`.
- 2 LessonVideoControls tests passed separately.
- Full production build passed; subsequent CSS-only header refinement rebuilt with Vite successfully. Existing large-bundle advisory remains.
- Scoped oxlint and git diff whitespace checks passed.
- Final Playwright suite passed 6/6 in 21.6 seconds against the built SPA on local port 5100. Reading content at 1440/820/390 px, syllabus toggle, no horizontal overflow, code/copy, contents keyboard focus, completion, next/previous, reload-resume, back navigation, and short/long/plain content all checked with isolated authenticated API fixtures. No page errors. No live learner writes.

Earlier tests first exposed obsolete assertions for removed breadcrumb/repeated title/toolbar; those assertions were updated to the approved UI. One default 5-second component test timed out on the slow machine; the full focused suite passed with a 15-second ceiling. The first browser run on port 8088 was interrupted because the web service did not respond (curl also timed out); it is not a passing runtime check. The standalone build run uses fixture APIs and does not establish actual backend persistence, cross-learner authorization or mastery acceptance. Those remain the separate functional-upgrade task.

## Files and artifacts

Changed LearningReaderHeader.tsx, LearningLessonSidebar.tsx, LearningModuleReaderPage.tsx, learningReader.css, shared LessonDocument.tsx, their focused tests and REQ-013-learning-document-reader.spec.ts. Images and browser outputs are in /tmp/learning-modern-* rather than tracked project assets. No new untracked images in the repository. Desktop/mobile layouts visually inspected. The usual web on port 8088 needs separate recovery/verification; no deployment or service restart was performed in this visual slice.
