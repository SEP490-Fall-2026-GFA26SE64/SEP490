# FR-04.07 Monitor employee development — unit/API/component evidence (2026-11-16)

**Scope:** L&D Manager read-only development report slice of [FR-04.07](../../features/Development%20reporting/README.md#fr-04-07): employee list, competency profile, skill gaps, assessment outcomes, learning progress and department summaries filtered by department/job position. Training ROI, costs/benefits and reporting period are **out of this slice**.

**Environment:** Windows 11, Java 21 (Maven offline classpath), Node 22.15, Vitest 5, local workspace `main` @ a484bf05 plus this change set.

## Backend

| ID | Acceptance | Test | Result |
| --- | --- | --- | --- |
| U-01 | Only same-organization members with the EMPLOYEE role are listed; aggregates map pathway, assessment and module data; no learner-state transaction is opened | `EmployeeDevelopmentReportServiceTest.listsOnlyEmployeesOfTheManagersOrganizationWithAggregatedProgress` | Passed |
| U-02 | Unknown or non-employee account → 404 `EMPLOYEE_NOT_FOUND` without reading pathway/competency owners | `unknownOrNonEmployeeAccountIsNotFoundWithoutReadingLearnerOwners` | Passed |
| U-03 | Unreadable sections return an explicit `unavailableCode`, never synthetic values | `unreadableSectionsAreReportedExplicitlyInsteadOfFabricated` | Passed |
| U-04 | 401/403 from an owner is propagated, not hidden as missing data | `authorizationFailureFromAnOwnerIsNotHiddenAsUnavailableData` | Passed |
| U-05 | Non-L&D actor is rejected before any organization read | `nonManagerIsRejectedBeforeAnyOrganizationRead` | Passed |
| A-01 | No new layered-architecture violation from the new controller/service/repository | `LayeredArchitectureTest` (12/14 rules pass; the 2 failing rules list only pre-existing `AssessmentPolicyController`, `CertificateController`, `RequirementPathwayController`, `RuleAssessmentController`, `WorkspaceAuthenticationController`) | Passed for this change; pre-existing failures unchanged |

**Command (procedure):** `mvnw -o compile`; standard `mvnw test` cannot compile the test tree because of unrelated pre-existing compile errors (`ModuleAuthoringControllerTest`, `PrerequisiteControllerTest`, `QuestionBankMappingsTest`, …). The two classes were therefore compiled with `javac` against `mvnw dependency:build-classpath -Dmdep.includeScope=test` + `target/classes` and executed with the JUnit Platform launcher 1.12.2: **14 run, 12 passed, 2 failed (pre-existing architecture rules only)**.

## Frontend

| ID | Acceptance | Test | Result |
| --- | --- | --- | --- |
| F-01 | Waived (bypassed) steps excluded from progress | `developmentMetrics.test.ts` | Passed |
| F-02 | Status classification: no target / pathway pending / on track / needs attention / completed | `developmentMetrics.test.ts` | Passed |
| F-03 | Department, job position (incl. unassigned bucket), status and search filters | `developmentMetrics.test.ts` | Passed |
| F-04 | Department summary aggregates (headcount, average progress, pass rate) | `developmentMetrics.test.ts` | Passed |
| F-05 | Parser accepts unavailable sections, rejects sections without data or reason | `developmentMetrics.test.ts` | Passed |
| F-06 | Detail composes competency, gaps, read-only pathway graph (no learn actions) and assessment outcomes with the same classification as the employee Overview | `EmployeeDevelopmentPage.test.tsx` | Passed |
| F-07 | Unavailable sections are explained instead of invented | `EmployeeDevelopmentPage.test.tsx` | Passed |

**Commands:** `npx tsc -b` (pass); `npm run lint` (exit 0, no findings in changed files); `npx vitest run src/features/manager/development` → **7/7 passed**.

**Regression comparison:** full `npx vitest run` on a clean HEAD worktree vs this change: HEAD 42 failed/381 passed (14 files); change 41 failed/387 passed (13 files). The failing file set is identical apart from timeout-flaky `GuestRegisterPage`; no new failure. The shared refactor (`composeRoleOverview`, `AttemptOutcomeLike`, `RequirementPathwayPresentation.assessmentStates`) keeps employee Overview/Pathway behavior.
