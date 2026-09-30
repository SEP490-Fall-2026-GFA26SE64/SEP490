# REQ-001-F01 — View Target Roles test plan and evidence

**Status:** Cluster 2 approved on 2026-09-30; executable tests not yet recorded
**Feature contract:** [View Target Roles](../features/Target%20role%20selection/View%20Target%20Roles.md)

The development seed is not a production oracle. Tests must create deterministic organization-scoped fixtures and must not use real employee data or shared Compose volumes.

| Case | Acceptance rule | Level | Fixture and tenant scope | Trigger | Expected outcome | Executable location | Last result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F01-U01 | AC03/AC05 | Unit/domain | Valid professional and management role data | Construct summary/detail | Track-grade pairs and required fields accepted | `backend/src/test/java/com/adaptlearngraph/catalog/domain/TargetRoleDomainTest.java` | Not run |
| F01-U02 | AC03 | Unit/domain | Invalid track-grade, blank fields, invalid mastery | Construct domain output | Invalid catalog data rejected | Same as above | Not run |
| F01-U03 | AC01/AC04/AC07/AC08 | Unit/application | Fake actor/catalog ports for Org A/Org B | List/detail use case | Authorization, normalization, AND filters, stable sort and error mapping match contract | `backend/src/test/java/com/adaptlearngraph/catalog/application/TargetRoleQueryServiceTest.java` | Not run |
| F01-A01 | AC01/AC04/AC07/AC08 | MVC/security | Local actor enabled/disabled; valid and invalid input | Call list/detail HTTP APIs | `200/400/403/404/503` envelope and no client tenant field | `backend/src/test/java/com/adaptlearngraph/catalog/api/TargetRoleControllerTest.java` | Not run |
| F01-I01 | AC02/AC03/AC05/AC07/AC09 | Neo4j integration | Disposable Neo4j; Org A and Org B roles including invalid/inactive graph data | Call real adapter | Tenant isolation, catalog validity, mapping and current-state reread hold | `backend/src/test/java/com/adaptlearngraph/catalog/infrastructure/Neo4jTargetRoleCatalogAdapterTest.java` | Not run |
| F01-I02 | AC08 | Neo4j integration | Disposable Neo4j stopped/unreachable | Call real adapter/API | Dependency failure becomes `CATALOG_UNAVAILABLE`, never empty/not-found | Same adapter test or API integration test | Not run |
| F01-FE01 | AC04/AC06/AC07/AC08/AC10 | Frontend component | Mock HTTP responses, no selection callback | Search/filter/open detail/retry/back | Visible states match contract and browse never changes selection | Feature-local test after runner setup | Not run |
| F01-S01 | AC01–AC10 | System | Full Compose, deterministic local actor and isolated fixture | Browse list/search/filter/detail and dependency recovery | End-to-end observable behavior matches feature without state mutation | Documented system script/scenario | Not run |

## Execution order

1. Domain/application unit tests.
2. MVC/security contract tests.
3. Neo4j Testcontainers integration tests.
4. Frontend component tests after selecting and installing the smallest compatible runner.
5. Full-stack system scenario and relevant regression.

Every execution update must record the exact command, date, result and any skipped case. Compile/build/manual smoke from cluster 1 must not be copied into this table as a passing executable test.
