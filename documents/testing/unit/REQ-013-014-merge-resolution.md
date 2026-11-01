# REQ-013 / REQ-014 / REQ-041 / REQ-042 — backend and UI merge verification

2026-11-01. This run validates the bounded conflict resolution, not every product requirement.

## Passed

- Backend compilation: all 479 source files compiled with JDK21.
- Focused backend package/test run: **76 passed**,0 failures/errors/skips across WorkspaceMergeAuthorizationTest, LegacyModuleWriteRetirementTest, ModuleSessionSecurityTest, QuestionBankServiceTest, Neo4jQuestionBankSkillReaderTest, ModuleAuthoringServiceTest, LearningContentServiceTest, LearningContentTest, ManualPathwayRetirementTest, InitialPathwayAccessTest and HexagonalArchitectureTest. The resulting product jar was packaged successfully.
- Frontend TypeScript build check passed after removing the obsolete unreferenced mock content store. Vite production build passed (existing large-chunk warning remains).
- Frontend: **25 unique component/unit cases passed** across workspaceFetch, QuestionBankWorkspace, ModuleManagementWorkspace, LearningModuleReaderPage, InitialEmployeePathway and WorkspaceBoundary. The first combined run had22 pass/3 timing failures; rerunning the two affected suites serially passed 13/13, with the other 12 already passed. No assertions were removed or test-source timeout changes made to achieve that rerun.
- Lint for changed TypeScript files exited0 with warnings, including existing effect/dependency advice; it is not warning-free.

New backend regression assertions cover trusted role/account headers, stable string Role IDs, rejecting a different assigned Expert, rejecting Employee staff access, workspace denial and retirement of legacy direct module writes. Existing service/security cases cover module ownership, exact revisions and Question Bank boundaries.

## Execution

From backend: `mvn -o -B -ntp -DargLine=-javaagent:$HOME/.m2/repository/org/mockito/mockito-core/5.17.0/mockito-core-5.17.0.jar -Dtest=WorkspaceMergeAuthorizationTest,LegacyModuleWriteRetirementTest,ModuleSessionSecurityTest,QuestionBankServiceTest,Neo4jQuestionBankSkillReaderTest,ModuleAuthoringServiceTest,LearningContentServiceTest,LearningContentTest,ManualPathwayRetirementTest,InitialPathwayAccessTest,HexagonalArchitectureTest package`, using JDK21 and `JAVA_TOOL_OPTIONS='-XX:ActiveProcessorCount=2 -Xmx768m'`.

The initial run could not initialize Mockito's self-attached mock maker in the sandbox. Reran with its explicit Java agent; all 76 passed. This is an environment correction, not a disabled test or substituted production implementation.

Frontend commands use the installed Node runtime: `tsc -b`, `vite build`, the six listed Vitest suites, and a serial rerun with `--maxWorkers=1 --testTimeout=20000` for module workspace/reader. Logs: `/tmp/sep490-backend-ui-merge/backend-unit-agent.log`, `frontend-typecheck.log`, `frontend-build.log`, `frontend-tests.log`, `frontend-tests-retry.log`, `frontend-lint.log`. Current Maven XML reports are in backend/target/surefire-reports.

[Real integration status](../integration/REQ-013-014-merge-resolution.md). [Browser/manual status](../system/REQ-013-014-merge-resolution.md).

## Existing-stack seed protection — 2026-11-01

`MigrationConfigurationTest` **3/3 Passed**,0 failures/errors/skips, after explicitly disabling `WORKSPACE_DEV_SEED_ENABLED` in accounts Compose. The new check parses Compose and asserts the preserved module migration location plus both catalog/workspace automatic seeds disabled. Existing continuity/profile checks remain. Maven offline/JDK21/Mockito Java agent; log `/tmp/sep490-backend-ui-merge/accounts-seed-config-test.log`. This configuration test prevents repeat startup seeding; it does not undo the first startup side effect. No product Java code changed in this follow-up.
