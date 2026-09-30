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

---

## Sprint 1 Test Evidence Records

| Function ID | Policy & Scope | Boundaries Tested | Test File & Methods | Result |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-023-F01** ([Create Target Role](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/features/Target%20role%20management/Create%20Target%20Role.md)) | Actor: `LD_MANAGER`. Scoped to `organizationId`. Creates target role with initial `DRAFT` status and normalized code. | - Blank name/code rejection (`IllegalArgumentException`)<br>- Duplicate code within organization rejects with 409 Conflict (`DuplicateTargetRoleException`)<br>- Unauthorized actor (e.g. `LEARNER`) returns 403 Forbidden | `TargetRoleDomainTest`<br>`TargetRoleServiceTest`<br>`TargetRoleControllerTest` | **PASSED** (8 tests) |
| **REQ-023-F02** ([View Organization Target Roles](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/features/Target%20role%20management/View%20Organization%20Target%20Roles.md)) | Actor: `LD_MANAGER`. Scoped strictly to caller's `organizationId`. Lists all organization target roles including draft items. | - Tenant isolation: Organization A cannot see Organization B's roles<br>- Query filters (search keyword, track filter, status filter)<br>- Single role retrieval and missing role handling | `TargetRoleServiceTest`<br>`TargetRoleControllerTest` | **PASSED** (5 tests) |
| **REQ-023-F03** ([Update Target Role](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/features/Target%20role%20management/Update%20Target%20Role.md)) | Actor: `LD_MANAGER`. Updates mutable target role metadata (name, domainCode, familyCode, track, assignedExpertId, description). | - Immutable code preserved<br>- Status maintained (`DRAFT`, etc.)<br>- Unauthorized actor returns 403 Forbidden | `TargetRoleDomainTest`<br>`TargetRoleServiceTest`<br>`TargetRoleControllerTest` | **PASSED** (4 tests) |
| **REQ-023-F04** ([Delete Target Role](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/features/Target%20role%20management/Delete%20Target%20Role.md)) | Actor: `LD_MANAGER`. Permanently removes target role (`DRAFT` or `PUBLISHED`). | - Deletes both draft and published target roles<br>- Returns 204 No Content<br>- Unauthorized actor returns 403 Forbidden | `TargetRoleServiceTest`<br>`TargetRoleControllerTest` | **PASSED** (3 tests) |
| **REQ-011-F01 / REQ-023-F05** ([View Assigned Roles & Isolation](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/features/Assigned%20target%20roles/View%20Assigned%20Target%20Roles.md)) | Actor: `DOMAIN_EXPERT`. Strictly filters roles by `assignedExpertId = X-User-Id`. | - Experts cannot view roles assigned to other experts (403 Forbidden)<br>- Status lifecycle transitions: `markSent()`, `reject()`, `publish()` | `TargetRoleDomainTest`<br>`TargetRoleServiceTest`<br>`TargetRoleControllerTest` | **PASSED** (4 tests) |
| **REQ-012-F01** ([Create Micro-Skill](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/documents/features/Micro-skill%20management/Create%20Micro-Skill.md)) | Actor: `DOMAIN_EXPERT`. Scoped to `organizationId`. Creates atomic micro-skill linked to `MacroCompetency`. | - Blank code/name rejection<br>- Duplicate code within organization rejects with 409 Conflict (`DuplicateMicroSkillException`)<br>- Unauthorized non-expert actor returns 403 Forbidden | `MicroSkillDomainTest`<br>`MicroSkillServiceTest`<br>`MicroSkillControllerTest` | **PASSED** (8 tests) |
| **Architecture** | Hexagonal architecture boundaries across `catalog` and `competency`. | - Domain does not depend on adapters or Spring<br>- Application depends on ports, not adapters<br>- Controllers do not depend on infrastructure | `HexagonalArchitectureTest` | **PASSED** (3 tests) |