# REQ-013 / FR-05.05 — responsible Expert transfer, 2026-11-18

Local implementation evidence; no live data migration, deployment or browser run.

| Acceptance | Actual check | Result |
| --- | --- | --- |
| Manager-only transfer | Expert/Employee denied; same-organization module lookup and active Expert choice validation; missing/foreign/ineligible targets denied | Passed |
| Recorded creator is preserved | Repeated A → B → C transfers and seed → real Expert transfer retain createdBy/createdAt, content, revisions and review/release metadata | Passed |
| Complete transfer history | Previous/new owner IDs, actual Manager and server timestamp; previous history preserved | Passed |
| Ownership authorization | Former owner cannot edit; new owner edits/submits, ownership retained after revision changes | Passed |
| Stale/no-op requests | Stale lockVersion returns 409; same-owner does not save or fabricate history | Passed |
| State coverage | Draft, returned, submitted, publish-pending, released, archive-requested, archive-pending and archived states preserved | Passed |
| JSON/API contract | Legacy missing-owner fallback, nullable original creator/prior owner, JSON round trip, explicit DTO output and HTTP role denial | Passed |
| Forward migrations | V70 data mapping identical in canonical/workspace/module lineages | Passed |
| Existing intake retirement/import regression | 4 retirement checks and 7 Excel importer checks | Passed |
| Frontend component behavior | Current owner instead of creator, manager target selection/versioned request, empty eligible list, stale error and Expert edit/transfer controls; approval presentation regression | Passed, 10 tests |
| Production builds | Java 21 backend compile; TypeScript/Vite frontend build | Passed |
| Scoped lint / diff | Exit 0; two pre-existing state-in-effect warnings; frontend build retains large-bundle warning | Passed with warnings |

Final focused backend run: ModuleResponsibilityTransferTest 11 + ModuleIntakeRetirementTest 4 + SingleSkillImportTest 7 = 22 tests, zero failures/errors/skips. Initial focused run before migration-copy assertion: 21 tests passed. Real PostgreSQL concurrency/rollback evidence is [separate](../integration/REQ-013-responsibility-transfer-20261118.md).

## Commands and limits

- `JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home bash backend/mvnw -o -f backend/pom.xml -Dmaven.test.skip=true compile`
- Dependency classpath: `bash backend/mvnw -o -f backend/pom.xml dependency:build-classpath -Dmdep.outputFile=/tmp/sep490-label-brief/classpath.txt` (existing session artifact). Compile only the four named service test classes using Java 21 javac, classpath `backend/target/classes` plus dependencies, output `backend/target/test-classes`.
- `JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home bash backend/mvnw -o -f backend/pom.xml '-Dtest=ModuleResponsibilityTransferTest,ModuleIntakeRetirementTest,SingleSkillImportTest' '-DargLine=-javaagent:/Users/nguyenan/.m2/repository/org/mockito/mockito-core/5.17.0/mockito-core-5.17.0.jar' surefire:test`
- In frontend: `npm test -- src/features/expert/modules/ModuleResponsibilityTransfer.test.tsx src/features/expert/modules/ModuleApprovalReview.test.tsx`; `npm run build`; scoped `./node_modules/.bin/oxlint`; root `git diff --check`.

Normal whole-test compilation remains outside this pass: the preceding same-session attempt was blocked by stale unrelated test signatures ([prior evidence](REQ-013-intake-retirement-owner-20261118.md)). Isolated compilation does not establish a full-suite pass. MVC checks use the real service with mocked ports, not the live session/CSRF stack. No production certification is claimed.

Session logs: `/tmp/sep490-module-owner/unit-final.log`, `frontend-tests.log`, `compile-final.log`, `frontend-build-final.log`, `lint.log`. Browser checks are left to the user in the [manual checklist](../system/REQ-013-responsibility-transfer-20261118.md).
