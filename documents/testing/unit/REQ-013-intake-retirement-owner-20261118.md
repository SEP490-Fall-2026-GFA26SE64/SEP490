# REQ-013 / FR-05.05 — intake retirement and responsible person

Date: 2026-11-18, local checkout. No deployment or live database modification.

## Acceptance and results

| ID | Check | Actual result |
| --- | --- | --- |
| A1 | Removed assignment/acceptance HTTP routes have no handler | Passed, standalone MVC returns 404 for both POST routes |
| A2 | Retired Java compatibility calls cannot create assignments/content/documents or publish | Passed, 410 across Expert/L&D/Employee calls, zero mutation calls |
| A3 | Catalog listing does not read pending assignments or fabricate owners | Passed |
| A4 | Create/import records trusted creator as owner and DRAFT, with permitted null review/release/intake values | Passed |
| A5 | Existing Excel importer scenarios | Passed, SingleSkillImportTest: 7 tests |
| A6 | Frontend production build, scoped lint and whitespace checks | Passed; lint reports two existing set-state-in-effect warnings in unchanged effects |
| A7 | Full normal backend test compilation | Blocked by existing stale test signatures across QuestionBank, ModuleAuthoring and SkillLearning tests; tests did not execute through this entry point |

Focused run: ModuleIntakeRetirementTest 4 + SingleSkillImportTest 7, 11 total, zero failures/errors/skips. These use isolated mocks; they do not prove live persistence or browser behavior.

## Reproduction

Frontend: `cd frontend && npm run build`; `git diff --check`.

Normal backend attempt: `bash backend/mvnw -f backend/pom.xml '-Dtest=ModuleAuthoringServiceTest#retiredIntakeCannotAssignOrReceiveForAnyActor+catalogNoLongerLoadsPendingIntakeAssignments,ModuleAuthoringControllerTest#retiredIntakeRoutesAreNotExposed' test`. This initial command was blocked at test compilation; the new checks were subsequently moved to a standalone class to avoid unrelated stale fixtures.

Focused fallback: generate dependency classpath with `bash backend/mvnw -o -f backend/pom.xml dependency:build-classpath -Dmdep.outputFile=/tmp/sep490-label-brief/classpath.txt`; compile ModuleIntakeRetirementTest.java and SingleSkillImportTest.java with Java 21 javac, classpath backend/target/classes plus generated dependencies, output backend/target/test-classes. Run `JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home bash backend/mvnw -o -f backend/pom.xml '-Dtest=ModuleIntakeRetirementTest,SingleSkillImportTest' '-DargLine=-javaagent:/Users/nguyenan/.m2/repository/org/mockito/mockito-core/5.17.0/mockito-core-5.17.0.jar' surefire:test`.

Production backend sources compiled successfully during the normal attempt. Initial focused execution without explicit Mockito agent failed to attach; rerun with the agent passed.

Raw local logs: `/tmp/sep490-label-brief/backend-check.log`, `/tmp/sep490-label-brief/focused-agent-tests.log`. Reports: `backend/target/surefire-reports/TEST-com.adaptlearngraph.services.ModuleIntakeRetirementTest.xml` and `TEST-com.adaptlearngraph.services.SingleSkillImportTest.xml`.

UI inspection: [manual checklist](../system/REQ-013-intake-retirement-owner-20261118.md). Real persistence: [limits](../integration/REQ-013-intake-retirement-owner-20261118.md).
