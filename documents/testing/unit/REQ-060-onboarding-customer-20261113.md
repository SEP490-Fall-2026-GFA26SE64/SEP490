# REQ-060: Customer onboarding unit and component evidence

Date: 2026-11-13. Scope: FR-01.01/01.04, directly affected Guest subscription presentation, and shared combobox keyboard behavior. Local verification only.

## Results

| Check | Result | Exit | Scope |
| --- | --- | ---: | --- |
| Pre-change frontend baseline | 15 passed | 0 | Existing registration page/API tests |
| Backend `entities.domain.RegistrationFieldsTest` | 8 passed | 0 | Country allowlist, phone format/normalization, valid legacy nulls, existing password/name/email/slug rules |
| Backend `helper.RegistrationMappingsTest` | 4 passed | 0 | New public contact projection, null handling, secret redaction |
| Focused frontend registration/API/combobox/catalog run | 30 passed | 0 | Required fields/consent, placeholder links, country/industry, existing catalog selection |
| Expanded Guest/subscription/combobox suite | 71 passed, 12 files | 0 | Registration, landing, catalog, payment/receipt/plan and workspace controls |
| Final directly affected frontend rerun | 20 passed, 3 files | 0 | Registration/API/combobox after correcting stale inline errors and preserving focus on blur |
| Final TypeScript/Vite build | Passed | 0 | Existing large-bundle warning remains |
| Scoped oxlint | Passed | 0 | Changed frontend owners and new browser spec |

Counts overlap: do not add frontend reruns together. The final 20-test run supersedes those affected files in the earlier 71-test run. The [28 real HTTP/database tests](../integration/REQ-060-onboarding-customer-20261113.md) are separate from the 12 pure backend tests; the exact four-class backend run totals **40**, not repeated historical class files.

## Acceptance mapping

- AC-01: business name remains required; country/industry are optional searchable choices; no website headcount field.
- AC-02/04: required phone and consent; invalid input blocks submission; legal placeholder clicks preserve entered data and announce unavailable content.
- AC-03: client parser preserves null legacy contact fields, accepts normalized values and rejects invalid response shapes.
- AC-05: keyboard option selection/Escape return focus, fields retain errors until corrected, blur clears corrected errors without moving focus to the heading.
- AC-06: existing catalog selection submission and Guest/subscription component regressions remain covered.

## Commands

From `frontend`:

```powershell
npm.cmd test -- src\features\guest src\features\subscription src\shared\components\ui\Combobox.test.tsx --maxWorkers=1
npm.cmd test -- src\features\guest\GuestRegisterPage.test.tsx src\features\guest\registrationApi.test.ts src\shared\components\ui\Combobox.test.tsx --maxWorkers=1
npm.cmd run build
npm.cmd run lint -- src\features\guest\GuestLayout.tsx src\features\guest\GuestRegisterPage.tsx src\features\guest\registrationApi.ts src\shared\components\ui\Combobox.tsx src\features\subscription\GuestSubscriptionPage.tsx src\features\subscription\PlanCatalog.tsx src\features\subscription\PaymentStatusPanel.tsx system-tests\REQ-060-onboarding-customer.spec.ts
```

The initial expanded frontend run overlapped the Docker image build and failed four registration cases, including 5-second timeouts and subsequent interleaved typing. The identical production code passed all 71 cases with one worker after the image build. No timeout or global test configuration was weakened.

## Existing repository-wide backend failure

The canonical Maven `test` command was attempted before source edits and exited **1 before running tests**. Existing unrelated test sources use outdated module/prerequisite/question-bank contracts, including `ModuleAuthoringServiceTest`, `PrerequisiteServiceTest`, `QuestionBankPersistenceIntegrationTest` and `SkillLearningServiceTest`. These were not changed or declared green.

The established narrow alternative compiles selected tests and their support against Maven's test classpath, then runs the existing Surefire/JUnit runner. No dependencies, POM or unrelated tests were changed:

```powershell
.\backend\mvnw.cmd -q -f backend\pom.xml compile dependency:build-classpath '-Dmdep.includeScope=test' '-Dmdep.outputFile=target\onboarding-test-classpath.txt'
$cp = (Get-Content backend\target\onboarding-test-classpath.txt -Raw).Trim() + ';' + (Resolve-Path backend\target\classes).Path
$sources = @(
  'backend\src\test\java\com\adaptlearngraph\entities\domain\RegistrationFieldsTest.java',
  'backend\src\test\java\com\adaptlearngraph\helper\RegistrationMappingsTest.java',
  'backend\src\test\java\com\adaptlearngraph\apis\RegistrationApiIntegrationTest.java',
  'backend\src\test\java\com\adaptlearngraph\repository\RegistrationPostgresIntegrationTest.java'
)
javac -encoding UTF-8 -cp $cp -sourcepath backend\src\test\java -d backend\target\test-classes $sources
.\backend\mvnw.cmd -q -f backend\pom.xml surefire:test '-Dtest=com.adaptlearngraph.entities.domain.RegistrationFieldsTest,com.adaptlearngraph.helper.RegistrationMappingsTest,com.adaptlearngraph.apis.RegistrationApiIntegrationTest,com.adaptlearngraph.repository.RegistrationPostgresIntegrationTest'
```

Exact fully qualified selectors avoid counting stale test classes from an older package. Reports: `backend/target/surefire-reports/TEST-com.adaptlearngraph.*.xml`.
