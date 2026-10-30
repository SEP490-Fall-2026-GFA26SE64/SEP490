# REQ-011 — Assigned Target Roles Test Plan and Evidence

## Current Scope Alignment
Follow [current test criteria](README.md#current-scope-alignment). Retained runs concern their recorded contract; revalidate L&D role assignment separately from discipline content authorization and publication. Original dates/counts are unchanged.

## Historical Test Plan and Evidence

**Status:** Unit, Controller/Security, Neo4j Testcontainers Integration, and System API tests passed; manual browser verification checklist verified.  
**Dedicated Level Evidence:** [Unit Test](unit/REQ-011-assigned-target-roles.md) | [Integration Test](integration/REQ-011-assigned-target-roles.md) | [System Test](system/REQ-011-assigned-target-roles.md)  
**Feature contracts:**
- [REQ-011-F01 View Assigned Target Roles](../features/Role%20catalog/README.md#req-011-f01)

Under [ARCHITECTURE.md](../ARCHITECTURE.md) and [neo4j_schema.md](../neo4j_schema.md), target roles and their expert assignments (`assignedExpertId`) are stored in **Neo4j 5.26 Community** via `Neo4jTargetRoleRepository`. Workspace access control strictly filters catalog queries by `assignedExpertId = X-User-Id` when the caller's role is `DOMAIN_EXPERT`.

---

## Test Cases

| Case | Acceptance rule | Level | Fixture and tenant scope | Trigger | Expected outcome | Executable location | Last result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-U01** | REQ-011-F01 AC01 | Unit/application | Roles across `org-alpha` assigned to `expert-1` and `expert-2` | Call `listTargetRoles` with `TargetRoleFilter(assignedExpertId="expert-1")` | Exclusively returns roles assigned to `expert-1`; completely filters out roles assigned to other experts | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleServiceTest.java` (`listsRolesFilteredByAssignedExpert`) | **PASS** 2026-10-01 |
| **F01-A01** | REQ-011-F01 AC01 | MVC/security | Mock service; headers `X-User-Role: DOMAIN_EXPERT`, `X-User-Id: expert-chen` | `GET /api/v1/organizations/{orgId}/target-roles` | Automatically injects `assignedExpertId = expert-chen` filter into application query; returns `200 OK` | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleControllerTest.java` | **PASS** 2026-10-01 |
| **F01-A02** | REQ-011-F01 AC02 | MVC/security | Role assigned to `expert-alpha`; caller headers `X-User-Role: DOMAIN_EXPERT`, `X-User-Id: expert-beta` | `GET /api/v1/organizations/{orgId}/target-roles/{roleId}` | Returns `403 Forbidden`; unauthorized expert cannot view unassigned role | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleControllerTest.java` (`getTargetRoleReturns403ForUnassignedExpert`) | **PASS** 2026-10-01 |
| **F01-A03** | REQ-011-F01 AC02 | MVC/security | Role assigned to `expert-alpha`; caller headers `X-User-Role: DOMAIN_EXPERT`, `X-User-Id: expert-beta` | `PUT /api/v1/organizations/{orgId}/target-roles/{roleId}` | Returns `403 Forbidden`; unauthorized expert cannot mutate unassigned role | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleControllerTest.java` (`updateTargetRoleReturns403ForUnassignedExpert`) | **PASS** 2026-10-01 |
| **F01-I01** | REQ-011-F01 AC01 | Neo4j integration | Disposable `neo4j:5.26-community` container with roles assigned to `expert-99` and other experts | Execute `findByOrganizationId` with `TargetRoleFilter(assignedExpertId="expert-99")` | Live Cypher query filters strictly on `assignedExpertId`; returns 1 matching role and 0 for non-existent expert | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java` | **PASS** 2026-09-30 |
| **F01-S01** | REQ-011-F01 Persona Isolation | System/UI | Compose development stack (`http://127.0.0.1:8088/expert/target-roles`) | Switch Domain Expert persona combobox between `expert-chen` and `expert-rivera` | Chen sees `ROLE-AI-ARCH` and `ROLE-DATA-ENG`; Rivera sees `ROLE-MLOPS-02`; queues are strictly isolated | [system/REQ-023-manual-browser-check.md](system/REQ-023-manual-browser-check.md) (Section 4) | **PASS** 2026-10-01 |

---

## Execution Evidence

- **Unit and Controller Suites**: 
  - `TargetRoleServiceTest.listsRolesFilteredByAssignedExpert` verified that query filtering enforces expert boundaries in memory.
  - `TargetRoleControllerTest.getTargetRoleReturns403ForUnassignedExpert` verified that cross-expert inspection returns HTTP 403 Forbidden.
- **Neo4j Testcontainers Integration**:
  - `TargetRoleAndMicroSkillNeo4jIntegrationTest` verified Neo4j Cypher `MATCH (r:TargetRole {organizationId: $organizationId}) WHERE r.assignedExpertId = $assignedExpertId` against live Neo4j engine.
- **Frontend / Manual System Verification**:
  - Domain Expert workspace (`/expert/target-roles`) features high-density queue sorting, Persona Switcher combobox, and read-only role metadata locking (role code, title, and domain cannot be modified by the expert).
