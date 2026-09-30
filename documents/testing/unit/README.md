# Function and Unit Testing

**Location:** `backend/src/test/java/com/adaptlearngraph/<feature>/` (and frontend feature-local tests once a runner is chosen). Use JUnit 5 for pure Java domain/application policies, Spring MVC/Security tests for HTTP access, and ArchUnit for layer rules. Tests should derive cases from an approved function document, not unresolved example behavior.

Existing checks: `SystemStatusTest` covers the status use case, public route, denied business routes, and CSRF; `WorkerProfileTest` covers the non-HTTP worker mode; `HexagonalArchitectureTest` prevents domain/application dependencies on adapters and Spring.

Case record template:

| Field | Record |
| --- | --- |
| Function | `REQ-nnn-Fnn` and link to its approved feature document |
| Policy | Actor, organization scope, inputs and exact accepted/rejected outcome |
| Boundaries | Missing/invalid data, duplicate request, status transition and authorization failure |
| Evidence | Unit test class/method, date and result |

The executable-test cluster for `REQ-001-F01` was approved on 2026-09-30; its cases and evidence are tracked in [../REQ-001-F01-view-target-roles.md](../REQ-001-F01-view-target-roles.md). Other targets such as REQ-001-F02 selection, REQ-002 baseline allowance, REQ-015 required mastery and REQ-041 gap calculation remain plans only until their own scope is approved. A frontend runner may now be selected for F01 only; do not treat installation or mocked rendering alone as system evidence.
