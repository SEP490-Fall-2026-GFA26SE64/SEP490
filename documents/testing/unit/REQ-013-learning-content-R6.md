# REQ-013 / FR-06.06, FR-06.09 — R6 original presentation, actual content

Date: 2026-10-29. Scope: restore the original Adaptive Pathway/Module Lesson presentation while retaining actual assigned content, persisted progress and authorization. Original source reference: `87d456e` (original reader/roadmap/timeline markup present in HEAD before the local content integration), plus the user's prior screenshots.

## Actual focused results

- **Passed:** `AdaptivePathwayPage.test.tsx` 9 checks: original roadmap module/skill details, real lesson count and reader link, original timeline, only actual pathways in selection, bounded reads of the selected pathway and fresh reads on selection changes; an unavailable unselected Module cannot block the visible pathway, completely blank no-assignment body, loading/error/retry, actual skill metadata with no fabricated mastery, Vietnamese labels.
- **Passed:** `LearningModuleReaderPage.test.tsx` 3 checks: original top bar/syllabus/content/footer, actual completion mutation and next lesson, unavailable exam action, server-selected lesson resume, authorized load error/retry with no sample fallback.
- **Passed:** `LessonVideoControls.test.tsx` 2 checks: real media metadata and time, real seek/mute/playback rate, actual play method and honest playback failure. The displayed controls do not advance a simulated position or fabricate watched coverage.
- **Passed:** existing backend regression `LearningContentServiceTest` 11 + `ModuleAuthoringServiceTest` 14 + `HexagonalArchitectureTest` 3 = 28, zero failures/errors/skips. R6 changes no backend policy or schema.
- **Passed:** TypeScript project check, production Vite build, scoped project Oxlint (zero warnings/errors after using explicit DOM-media mutation helpers). Vite retains its existing large-chunk advisory.

## Reproduction

```sh
node frontend/node_modules/vitest/vitest.mjs run --root frontend src/features/employee/pathway/AdaptivePathwayPage.test.tsx src/features/employee/modules/LearningModuleReaderPage.test.tsx src/shared/components/learning/LessonVideoControls.test.tsx --testTimeout=15000
MAVEN_OPTS='-XX:ActiveProcessorCount=2 -Xmx256m' sh backend/mvnw -f backend/pom.xml '-Dtest=LearningContentServiceTest,ModuleAuthoringServiceTest,HexagonalArchitectureTest' '-DargLine=-XX:ActiveProcessorCount=2 -Xmx384m' test -q
node frontend/node_modules/typescript/bin/tsc -b frontend/tsconfig.json
# From frontend:
node node_modules/vite/bin/vite.js build
node node_modules/oxlint/bin/oxlint src/features/employee/pathway/AdaptivePathwayPage.tsx src/features/employee/modules/AssignedLearningPathways.tsx src/features/employee/modules/useAssignedLearningPathways.ts src/features/employee/modules/LearningModuleReaderPage.tsx src/features/employee/modules/LearningModuleReaderPage.test.tsx src/features/employee/pathway/AdaptivePathwayPage.test.tsx src/shared/components/learning/LessonVideo.tsx src/shared/components/learning/LessonVideoControls.tsx src/shared/components/learning/LessonVideoControls.test.tsx
```

Local logs: `/tmp/sep490-learning-content-R6-backend.log`, `...-types.log`, `...-build.log`; backend XML remains in `backend/target/surefire-reports/`. Final focused frontend run: 14/14 passed.

Earlier attempts: one reader assertion ran before asynchronous sanitized body arrival (10 pass/1 fail), corrected to await the real body. A TypeScript run caught test-only unsupported constructor parameter-property syntax and Testing Library role options copied from Playwright; those were corrected and the project check rerun successfully. Initial player lint warned about imperative media-property writes through a passed ref; those operations now use explicit media helpers and the final scoped lint is clean. No assertion was removed to hide an application defect.
