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

The executable-test cluster for `REQ-001-F01` was approved and its domain/application, API/security and frontend component suites passed on 2026-09-30; cases and evidence are tracked in [../REQ-001-F01-view-target-roles.md](../REQ-001-F01-view-target-roles.md). `REQ-001-F02` Cluster 2 completed on 2026-10-02: T1 domain/command/hash passed 8 tests, T2 application policy/replay passed 15 tests, T3 HTTP/security passed 16 tests, and T5 frontend selection plus F01 regression passed 30 tests across eight files. Cases, deterministic fake boundaries, MVC/security slices, frontend fetch/hook fakes, and commands are tracked in [../REQ-001-F02-choose-target-role.md](../REQ-001-F02-choose-target-role.md). Vitest is scoped to `src/**/*.test.{ts,tsx}`; Playwright specs live under `system-tests/` and are system evidence, not unit evidence. Other targets such as REQ-002 baseline allowance, REQ-015 required mastery and REQ-041 gap calculation remain plans only until their own scope is approved.
