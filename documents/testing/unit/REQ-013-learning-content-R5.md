# REQ-013 / FR-06.06, FR-06.09 — R5 pathway presentation

Date: 2026-10-29. Scope: restore existing Employee roadmap/timeline presentation with real manually confirmed assignments. Generated/adaptive pathway logic is excluded.

## Actual results

- **Passed:** `LearningContentServiceTest` 11, `ModuleAuthoringServiceTest` 14, `HexagonalArchitectureTest` 3; 28 checks, zero failures/errors/skips in the final focused backend run.
- New policy checks: assigned released preview before start does not pin or write progress; progress still requires explicit start; unassigned/other-organization/non-Employee access rejected; unstarted archived package unavailable; existing pinned revision remains readable after a later release/archive.
- **Passed:** `AdaptivePathwayPage.test.tsx` 7 component checks. Actual snapshot lesson IDs determine completion; unrelated historical progress and watched position alone do not complete content. Both views use the same real module link, shared modules load once, empty/error/retry and Vietnamese/loading states work; overview performs GET requests only.
- **Passed:** TypeScript project check; Vite production build (existing large chunk advisory); scoped project Oxlint after splitting data hook from UI, no warnings/errors.

## Commands and evidence

```sh
MAVEN_OPTS='-XX:ActiveProcessorCount=2 -Xmx256m' sh backend/mvnw -f backend/pom.xml '-Dtest=LearningContentServiceTest,ModuleAuthoringServiceTest,HexagonalArchitectureTest,LearningContentIntegrationTest' '-DargLine=-XX:ActiveProcessorCount=2 -Xmx384m' test -q
node frontend/node_modules/vitest/vitest.mjs run --root frontend src/features/employee/pathway/AdaptivePathwayPage.test.tsx --testTimeout=15000
node frontend/node_modules/typescript/bin/tsc -b frontend/tsconfig.json
# From frontend:
node node_modules/vite/bin/vite.js build
node node_modules/oxlint/bin/oxlint src/features/employee/pathway/AdaptivePathwayPage.tsx src/features/employee/modules/AssignedLearningPathways.tsx src/features/employee/modules/useAssignedLearningPathways.ts src/features/employee/pathway/AdaptivePathwayPage.test.tsx
```

Backend XML: `backend/target/surefire-reports/TEST-*.xml`; final combined run log: `/tmp/sep490-learning-content-R5-backend.log`. The combined command also contains the separately recorded PostgreSQL integration test.

Earlier attempts retained: sandbox JVM attachment unavailable (25 mock initialization errors, 3 architecture passes); subsequent unrestricted run found two outdated version-switch test stubs still targeting the old internal read method, corrected to cover the new preview read before rerun. Initial frontend run hit its 5-second timeout (6 pass/1 timeout); final focused reruns with 15-second timeout passed all 7, including after the responsive tab correction. The obsolete ESLint executable was not installed; actual project lint is Oxlint, which was run successfully. A later Oxlint invocation used the repository root instead of frontend and could not locate the executable; the corrected frontend-directory invocation completed with zero warnings/errors. These failed attempts are not counted as passes.
