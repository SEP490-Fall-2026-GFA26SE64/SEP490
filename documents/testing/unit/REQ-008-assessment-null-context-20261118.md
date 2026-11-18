# REQ-008 assessment history nullable context — 2026-11-18

Scope: frontend build compatibility for independent module assessments. `AssessmentTarget.selectionId` legitimately permits null; the shared outcome classifier now accepts that same nullability. Its exact selection/revision/step comparisons are unchanged. No backend, API, schema or visual changes.

| Check | Result |
| --- | --- |
| `cd frontend && npm test -- src/features/employee/baseline-assessment/usePathwayAssessmentStates.test.ts` | Passed, 3 tests: independent history ignored; matching pathway history classified; foreign selection/revision/step ignored. |
| `cd frontend && npm run build` | Passed, TypeScript and Vite production build. Existing large-chunk warning remains. |
| `git diff --check` | Passed. |
| Browser / Playwright | Not applicable: type declaration only, no rendered UI or runtime logic changes. |
| Docker image / GitHub Actions / deployment | Not run; local build does not certify remote deployment. |

The initial local build lacked the already-declared ExcelJS dependency and failed in user-import files. Dependencies were installed with `npm install --ignore-scripts --no-audit --no-fund --package-lock=false`; the subsequent build passed. No manifest or lockfile changes. This local dependency installation was not a clean lockfile reproduction of CI.

Optional manual check after deployment: as an Employee with independent and pathway assessment history, open the current Pathway and Overview; independent history must not replace an exact pathway outcome. Not run in this slice.
