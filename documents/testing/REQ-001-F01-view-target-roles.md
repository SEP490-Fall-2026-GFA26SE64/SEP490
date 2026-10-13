# REQ-001-F01 — View Target Roles test plan and evidence

**Status:** Cluster 2 executable tests passed; full-stack catalog/detail browser flow passed through the shared REQ-001 Playwright suite; broader F01-only browser coverage remains partial  
**Dedicated Level Evidence:** [Unit Test](unit/REQ-001-F01-view-target-roles.md) | [Integration Test](integration/REQ-001-F01-view-target-roles.md) | [System Test](system/REQ-001-F01-view-target-roles.md)
**Feature contract:** [View Target Roles](../features/Target%20role%20selection/View%20Target%20Roles.md)

The development seed is not a production oracle. Tests must create deterministic organization-scoped fixtures and must not use real employee data or shared Compose volumes.

| Case | Acceptance rule | Level | Fixture and tenant scope | Trigger | Expected outcome | Executable location | Last result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F01-U01 | AC03/AC05 | Unit/domain | Valid professional and management role data | Construct summary/detail | Track-grade pairs and required fields accepted | `backend/src/test/java/com/adaptlearngraph/catalog/domain/TargetRoleDomainTest.java` | PASS 2026-09-30 |
| F01-U02 | AC03 | Unit/domain | Invalid track-grade, blank fields, invalid mastery | Construct domain output | Invalid catalog data rejected | Same as above | PASS 2026-09-30 |
| F01-U03 | AC01/AC04/AC07/AC08 | Unit/application | Fake actor/catalog ports for Org A/Org B | List/detail use case | Authorization, normalization, AND filters, stable sort and error mapping match contract | `backend/src/test/java/com/adaptlearngraph/catalog/application/TargetRoleQueryServiceTest.java` | PASS 2026-09-30 |
| F01-A01 | AC01/AC04/AC07/AC08 | MVC/security | Local actor enabled/disabled; valid and invalid input | Call list/detail HTTP APIs | `200/400/403/404/503` envelope and no client tenant field | `backend/src/test/java/com/adaptlearngraph/catalog/api/TargetRoleControllerTest.java`; `TargetRoleProductionBoundaryTest.java` | PASS 2026-09-30 |
| F01-I01 | AC02/AC03/AC05/AC07/AC09 | Neo4j integration | Disposable Neo4j; Org A and Org B roles including invalid/inactive graph data | Call real adapter | Tenant isolation, catalog validity, mapping and current-state reread hold | `backend/src/test/java/com/adaptlearngraph/catalog/infrastructure/Neo4jTargetRoleCatalogAdapterTest.java` | PASS 2026-09-30 |
| F01-I02 | AC08 | Neo4j integration | Disposable Neo4j stopped/unreachable | Call real adapter/API | Dependency failure becomes `CATALOG_UNAVAILABLE`, never empty/not-found | Same adapter test | PASS 2026-09-30 |
| F01-FE01 | AC04/AC06/AC07/AC08/AC10 | Frontend component | Mock HTTP responses, no selection callback | Search/filter/open detail/retry/back | Visible states match contract and browse never changes selection | `frontend/src/features/employee/target-roles/TargetRoleBrowsePanel.test.tsx`; `targetRoleApi.test.ts` | PASS 2026-09-30 |
| F01-S01 | AC01–AC10 | System | Full Compose, deterministic local actor and isolated fixture | Browse list/search/filter/detail and dependency recovery | End-to-end observable behavior matches feature without state mutation | Compose API smoke plus shared REQ-001 Playwright flow | PARTIAL: API paths PASS; browser catalog/detail PASS; search/filter/recovery not browser-automated |

Manual browser checklist: [system/REQ-001-F01-manual-browser-check.md](system/REQ-001-F01-manual-browser-check.md).

## Execution order

1. Domain/application unit tests.
2. MVC/security contract tests.
3. Neo4j Testcontainers integration tests.
4. Frontend component tests after selecting and installing the smallest compatible runner.
5. Full-stack system scenario and relevant regression.

Every execution update must record the exact command, date, result and any skipped case. Compile/build/manual smoke from cluster 1 must not be copied into this table as a passing executable test.

## Execution evidence — 2026-09-30

- `backend\mvnw.cmd "-Dtest=TargetRoleDomainTest,TargetRoleQueryServiceTest" test`: PASS — 17 tests, 0 failures/errors/skips.
- `backend\mvnw.cmd "-Dtest=TargetRoleControllerTest,TargetRoleProductionBoundaryTest" test`: PASS — 7 tests, 0 failures/errors/skips, including `401`/`403` actor error mapping.
- `backend\mvnw.cmd -Dtest=Neo4jTargetRoleCatalogAdapterTest test`: PASS — 3 tests, 0 failures/errors/skips against a disposable Neo4j container, including unreachable dependency behavior.
- `frontend\npm.cmd test`: PASS — 2 files, 6 tests.
- `frontend\npm.cmd run build`: PASS; the existing shared-bundle warning above 500 kB remains.
- `frontend\npm.cmd run lint`: PASS with 14 existing warnings outside this feature scope.
- `backend\mvnw.cmd test`: PASS — 37 tests, 0 failures/errors/skips, including catalog, schema, system-status, worker and architecture regression coverage.
- A later sandboxed rerun could not overwrite `backend/target/classes/application-local.yml` (`Access is denied`); the approved outside-sandbox rerun completed successfully. This was a build-output permission issue, not a test failure.
- The first full backend regression exposed unconditional catalog wiring in profiles without a Neo4j `Driver`. An initial `@ConditionalOnBean(Driver.class)` fix protected those profiles but was evaluated too early during the real Compose startup and removed the required port. The final wiring activates `CatalogConfiguration` only for the deployed `local`/`prod` profiles; the complete regression then passed.
- Compose verification after the final wiring fix: `migrate` exited `0`, `api` became healthy, the web proxy served on `127.0.0.1:8088`, system status returned `adapt-learn-graph`, and the target-role API returned the seeded Java P3 role with two requirements.
- Frontend tests exposed duplicate `Clear filters` actions in the no-match state. The toolbar action is now hidden in that state and the feature suite passes.
- On 2026-10-02, `npm.cmd run test:system:f02` reused the routed REQ-001 page and passed catalog list/detail rendering on both the working stack and an isolated fresh Compose stack. It does not add browser-level search/filter/dependency-recovery coverage, so F01-S01 remains partial rather than being overstated as a complete standalone F01 scenario.

## Remaining boundary

REQ-001-F01 local implementation/test review is complete. Production Identity/authorization and the catalog publication/index contract remain owner gates; F01-S01 retains a transparent partial status for search/filter/recovery at the browser level.
