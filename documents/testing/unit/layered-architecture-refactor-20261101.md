# Layered backend architecture refactor - 2026-11-01

## Scope

The Spring Boot backend was moved from per-feature hexagonal packages (`<feature>/api|application|domain|infrastructure`) to the layer packages below, all under `com.adaptlearngraph`. Class names, Spring bean names, HTTP routes, database migrations and runtime behavior are unchanged; only packages, visibility needed across packages, imports and documentation links changed.

| Layer | Packages |
| --- | --- |
| Controller | `apis`, `endpoints` (`ApiEndpoints` base routes), `advice`, `responseDto`, `model.dtos.file.response` |
| Business | `services` |
| Data | `dtos`, `entities`, `repository` |
| Infrastructure | `config`, `constants`, `exception`, `helper`, `jwt` (session authentication support; no JWT tokens are issued), `utility` |

Tests live in the same layer package as the class under test. [LayeredArchitectureTest](../../../backend/src/test/java/com/adaptlearngraph/architecture/LayeredArchitectureTest.java) replaces `HexagonalArchitectureTest`.

`SubscriptionExceptionHandler` previously used `basePackages = "com.adaptlearngraph.subscription.api"`; it now lists the same controllers explicitly (`SubscriptionLifecycleController`, `SubscriptionPlanController`, `MemberActivationController`) so its scope did not widen.

## Pre-existing failures repaired

The unmodified `main` (2856c98) backend suite had 618 tests with 21 failures and 32 errors. The refactor reproduced exactly that set before any repair. These were stale tests, not product defects:

| Test | Cause | Repair |
| --- | --- | --- |
| `SystemStatusTest`, `WorkerProfileTest` | Test-only `QuestionBankTestRuntime` nested `@Configuration` classes were component-scanned into full-context tests | Removed `@Configuration`; the isolated runtime registers them explicitly |
| Migration lineage/configuration, `BaselineAssessmentPostgresIntegrationTest`, `InitialPathwayAdapterIntegrationTest` R03, `QuestionBankPersistenceIntegrationTest` | Expected V43/43 migrations; all three histories are continuous V1-V46 | Expectations updated to V46 |
| `WorkspaceBaselineResourcesIntegrationTest` | Used the `db/migration` lineage, where `department_reference` does not exist at V12 | Uses `db/workspace-migration` (V9 creates it), 34 later migrations |
| `InitialReviewPersistenceIntegrationTest` (21 tests) | Built its retained fixture with current adapters on a V34 schema, but adapters now write V44 policy columns | Snapshot at V44, then migrate to latest; V34-to-latest retention stays covered by `InitialPathwayAdapterIntegrationTest` R03 |
| Baseline answer-review/management/blueprint controller tests | Controllers now also require `assessment.baseline.legacy-authoring.enabled=true` | Property added to the test slices |
| `RoleBaselinePostgresIntegrationTest` (24) | Baseline activation now requires an active organization Assessment Policy | Fixture supplies a satisfied activation-policy check |
| `CurrentRoleFlowControllerTest`, `AdaptiveAttemptContractTest` | Mocks used the pre-Level `choose` signature and the old policy `load` overload | Mocks match current signatures |
| `LocalDemoSessionTest` | Persona allowlist was narrowed to `ld`, `employee-a`, `admin` in #12 | Allowlist cases updated; `employee-b` is asserted as rejected |
| `ModuleAuthoringServiceTest` refresh case | The assignment token is `Instant.now().toString()`; two fast calls can return the same value on Windows | Test waits for the clock to advance. The coarse timestamp token is a known limitation |

## Executed verification

| Check | Result |
| --- | --- |
| Baseline `mvn -B clean verify` on unmodified main | 618 tests, 21 failures, 32 errors |
| Refactored `mvn -B clean verify`, final | 638 tests, 0 failures, 0 errors, 0 skipped; BUILD SUCCESS (includes Testcontainers PostgreSQL/Neo4j integration tests) |
| `LayeredArchitectureTest` | 4 rules passed |
| Isolated Docker Compose dev stack built from the refactored source (fresh volumes, separate project, ports and image tag) | migrate, seed, workspace-seed, se-seed and catalog-ready completed; API healthy; `ld`, `employee`, `expert` real password sign-in succeeded |
| GET route sweep: 52 parameter-free routes x 3 roles, refactored versus unmodified main stacks | 156 of 156 HTTP status codes identical; no 5xx |

These checks made no payments, sent no email and did not touch the existing development volumes.
