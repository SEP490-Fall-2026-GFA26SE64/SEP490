# REQ-002 / REQ-001 Workspace Baseline Integration - Unit and Build Evidence

Date: 2026-10-28. Scope: FR-04.05, FR-06.02, baseline portion of FR-07.05 and role-selection portion of FR-06.04, plus retained identity/subscription boundaries.

## Executed checks

| Check | Actual command | Result |
| --- | --- | --- |
| Backend compilation/package | `mvn -B -DskipTests package` from backend | Passed, exit 0. This command alone did not run tests. |
| Final backend unit/API/persistence/architecture selection | `mvn -B test -Dtest=WorkspaceBaselineResourcesIntegrationTest,HexagonalArchitectureTest,CurrentRoleFlowControllerTest,AdaptiveAttemptContractTest,TargetRoleSelectionServiceTest,WorkspaceAuthenticationServiceTest,SubscriptionAccessPolicyTest,RoleBaselinePostgresIntegrationTest` | Passed, exit 0: 78 tests, 0 failures/errors/skipped. Includes the real PostgreSQL tests described in the integration evidence. |
| Frontend affected suite, supported Node | `docker exec adapt-learn-graph-dev-web-1 npm test -- --maxWorkers=2 src/app/AppTargetRoleRoute.test.tsx src/features/auth/LoginPage.test.tsx src/features/guest/GuestRegisterPage.test.tsx src/features/subscription src/features/administration/user-management src/features/employee/baseline-assessment src/features/employee/target-roles/currentRoleFlowApi.test.ts src/features/manager/baseline-assessments` | Passed, exit 0: 71 tests in 18 files. Only discovered tests count; the selector does not imply a separate matching API test file. |
| Post-mobile-fix route/layout regression | `docker exec adapt-learn-graph-dev-web-1 npm test -- --maxWorkers=2 src/app/AppTargetRoleRoute.test.tsx src/features/administration/user-management/UserManagementPage.test.tsx` | Passed, exit 0: 10 tests. Overlaps the 71-test run; do not sum counts. |
| Final frontend build | `docker exec adapt-learn-graph-dev-web-1 npm run build` | Passed, exit 0. Bundle-size warning remains. |
| Frontend lint | `docker exec adapt-learn-graph-dev-web-1 npm run lint` | Passed, exit 0: 0 errors, 64 warnings. No unrelated warning cleanup. |

The container uses Node 22.23.3. Host Node 22.15.0 is below several existing dependency engine requirements; early host runs had timeout failures. These were not relabeled as passes. The supported-container run is the accepted frontend result.

## Corrections and retained failures

- Initial schema run: 55 tests, 1 failure and 1 error. It exposed an obsolete expected Flyway version and a fixture that inserted membership without its now-required single role. The corrected focused schema/ArchUnit run passed 7 tests.
- Initial API regression: 44 tests, 1 failure. The demo controller property gate was restored while separately enabling the workspace profile; the next API selection passed 45 tests, including the new workspace-gate case.
- Real-API browser execution exposed incompatible independent transaction managers and a result query using the demo `account_role` table. Workspace wiring now shares the application's transaction manager and result reads require real membership.
- Mobile screenshot inspection exposed missing CSS hooks when preserving the authenticated workspace layout during merge. The employee/header-search hooks were restored; browser verification measures header/tab non-overlap.

Raw execution logs are retained in the task's session evidence directory; current Maven XML reports are under `backend/target/surefire-reports`. Full repository suites and live provider certification were not claimed.

See [integration evidence](../integration/REQ-002-workspace-baseline.md) and [system/manual evidence](../system/REQ-002-workspace-baseline.md).
