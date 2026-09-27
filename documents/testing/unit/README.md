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

First implementation targets: `REQ-001` role availability and one active selection, `REQ-002` confirmed baseline allowance behavior, `REQ-015` required mastery in `[0,1]`, and `REQ-041` gap calculation. These are **planned cases**, not functionality claimed by this baseline. Add a frontend test runner only when the first real interactive feature is implemented.