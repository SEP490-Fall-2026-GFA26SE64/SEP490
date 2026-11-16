# REQ-060/061: Starter catalog unit, API and component evidence

Date: 2026-11-12. Scope: FR-01.01 / FR-07.03 starter selection; local development only.

## Executed results

| Check | Passed | Failed / skipped | Exit |
| --- | ---: | --- | ---: |
| `PlatformCatalogServiceTest` | 10 | 0 / 0 | 0 |
| `PlatformCatalogControllerTest` | 4 | 0 / 0 | 0 |
| `StarterCatalogArchitectureTest` | 1 | 0 / 0 | 0 |
| Three frontend test files | 24 | 0 / 0 | 0 |
| TypeScript/Vite production build | Passed | Existing bundle-size warning | 0 |
| Scoped oxlint | Passed | Three graph ref/error-state warnings; no errors | 0 |
| Whitespace check | Passed | No whitespace errors | 0 |

The [30 real-persistence tests](../integration/REQ-060-061-starter-catalog-20261112.md) are included in the final **45 backend tests**, not added to them again. Browser verification is [separate](../system/REQ-060-061-starter-catalog-20261112.md).

## Acceptance mapping

| ID | Verified behavior | Executable evidence |
| --- | --- | --- |
| AC-01 | JobPosition, TargetRole, Level, Competency and MicroSkill are exposed; excluded/unknown selection ids are rejected | Service/controller tests; frontend parser tests |
| AC-02 | Explicit selection adds only required ancestry/prerequisites, never teaching modules; removing descendants does not re-expand a retained parent | `explicitSelectionPreservesPruningAndNeverImportsModules`, `selectingAParentDoesNotSilentlyRestorePrunedDescendants`, component pruning test |
| AC-03 | Shared prerequisites remain until their last dependent is removed; independent skills do not import unrelated parents | `sharedPrerequisitesRemainUntilTheirLastDependentIsRemoved`, skill closure test; locked prerequisite component assertion |
| AC-04 | Dialog draft is separate from applied selection; Apply commits, Cancel discards; preview errors block Apply and Retry recovers | `GuestCatalogPicker.test.tsx` |
| AC-05 | Guided exploration and filters update graph/list without changing selection; result 65 is reachable; oversized branches are rejected atomically | Guided filter, load-more and 300-item component cases |
| AC-06 | Registration submits the applied explicit selection, preserving the existing account/verification flow | `GuestRegisterPage.test.tsx`, `registrationApi.test.ts` |
| AC-07 | Changed owners preserve existing controller/service/data boundaries | `StarterCatalogArchitectureTest` reuses five existing layer/HTTP rules |

## Commands and build limitation

Working directory: repository root unless stated otherwise.

```powershell
.\backend\mvnw.cmd -q -f backend\pom.xml compile dependency:build-classpath '-Dmdep.includeScope=test' '-Dmdep.outputFile=target\catalog-test-classpath.txt'
$cp = (Get-Content backend\target\catalog-test-classpath.txt -Raw).Trim() + ';' + (Resolve-Path backend\target\classes).Path
$sources = @(
  'backend\src\test\java\com\adaptlearngraph\services\PlatformCatalogServiceTest.java',
  'backend\src\test\java\com\adaptlearngraph\apis\PlatformCatalogControllerTest.java',
  'backend\src\test\java\com\adaptlearngraph\repository\WorkspaceCatalogImportNeo4jIntegrationTest.java',
  'backend\src\test\java\com\adaptlearngraph\repository\RegistrationPostgresIntegrationTest.java',
  'backend\src\test\java\com\adaptlearngraph\repository\WorkspaceCatalogImportLeaseIntegrationTest.java',
  'backend\src\test\java\com\adaptlearngraph\architecture\StarterCatalogArchitectureTest.java'
)
javac -encoding UTF-8 -cp $cp -sourcepath backend\src\test\java -d backend\target\test-classes $sources
.\backend\mvnw.cmd -q -f backend\pom.xml surefire:test '-Dtest=PlatformCatalogServiceTest,PlatformCatalogControllerTest,WorkspaceCatalogImportNeo4jIntegrationTest,RegistrationPostgresIntegrationTest,WorkspaceCatalogImportLeaseIntegrationTest,StarterCatalogArchitectureTest'
```

Final execution after main compilation: **45 tests, 0 failures/errors/skips, exit 0**. The targeted `javac` step compiles existing test sources and their support classes against Maven's test classpath. No dependency, Maven configuration, test framework or unrelated test source was changed.

From `frontend`:

```powershell
npm.cmd test -- src\features\guest\GuestCatalogPicker.test.tsx src\features\guest\GuestRegisterPage.test.tsx src\features\guest\registrationApi.test.ts
npm.cmd run build
npm.cmd run lint -- src\features\guest\GuestCatalogPicker.tsx src\features\guest\StarterCatalogGraph.tsx src\features\guest\catalogSelection.ts src\features\guest\platformCatalogApi.ts src\shared\components\ui\ontologyGraphStyle.ts system-tests\REQ-060-starter-catalog.spec.ts system-tests\REQ-060-061-multi-org-workspace.spec.ts
```

## Explicit repository-wide failures

The standard Maven `test` lifecycle was attempted first and **failed before executing tests**: pre-existing unrelated test sources use obsolete constructors/DTOs, including `AssessmentPolicyControllerTest`, `ModuleAuthoringControllerTest`, `PrerequisiteControllerTest` and mapping/authoring tests. This is not a passing full Maven suite.

The full `LayeredArchitectureTest` was also executed: **7 passed, 2 failed, exit 1**. Failing rules:

- `webDoesNotDependOnEntitiesOrRepositories`
- `webSignaturesUseNoEntities`

Their findings reference `AssessmentPolicyController`, `CertificateController`, `RequirementPathwayController`, `RuleAssessmentController` and `WorkspaceAuthenticationController`. `git diff --quiet` verified those source owners are unchanged from HEAD. The changed-owner test reports its own scope; it does not waive or fix these failures.

An initial version of that focused test failed because its imported class set lacked the required Infrastructure layer. Adding the actual `PlatformCatalogConfiguration` to the test's imported owners corrected the fixture; no architecture rule was weakened.

Reports: `backend/target/surefire-reports/TEST-com.adaptlearngraph.*.xml`. Local feature checks passed; repository-wide validation remains **not green**.
