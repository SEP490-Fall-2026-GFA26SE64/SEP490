# REQ-024 — Expert Assignment Test Plan and Evidence

## Current Scope Alignment
Follow [current test criteria](README.md#current-scope-alignment). Revalidate L&D target-role assignment/removal separately from discipline Expert assignments (REQ-051). Dates/counts below remain evidence of the original contract.

## Historical Test Plan and Evidence

**Status:** Domain, Application, Controller/Security, Neo4j Testcontainers Integration, and UI modal tests passed; manual browser verification checklist verified.  
**Dedicated Level Evidence:** [Unit Test](unit/REQ-024-expert-assignment.md) | [Integration Test](integration/REQ-024-expert-assignment.md) | [System Test](system/REQ-024-expert-assignment.md)  
**Feature contracts:**
- [REQ-024-F01 Assign Target Role to Expert](../features/Expert%20assignment/Assign%20Target%20Role%20to%20Expert.md)
- [REQ-024-F02 Reassign Target Role Expert](../features/Expert%20assignment/Reassign%20Target%20Role%20Expert.md)

Under [ARCHITECTURE.md](../ARCHITECTURE.md) and [neo4j_schema.md](../neo4j_schema.md), the `assignedExpertId` field is a core architectural attribute stored directly on each `(:TargetRole)` node in **Neo4j 5.26 Community**. Each role is assigned to exactly one primary Domain Expert responsible for micro-skill threshold authoring and graph publication.

---

## Test Cases

| Case | Acceptance rule | Level | Fixture and tenant scope | Trigger | Expected outcome | Executable location | Last result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-U01** | REQ-024-F01 AC01 | Unit/application | `CreateTargetRoleCommand` with `assignedExpertId = "expert-chen"` | Call `service.createTargetRole` | Successfully stores role with `assignedExpertId = "expert-chen"`; verifies non-empty field | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleServiceTest.java` | **PASS** 2026-10-01 |
| **F01-A01** | REQ-024-F01 AC02 | MVC/security | `POST /api/v1/organizations/{orgId}/target-roles` payload containing `assignedExpertId` | Invoke POST with `X-User-Role: LD_MANAGER` | Returns `201 Created` with JSON payload containing non-null `assignedExpertId` | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleControllerTest.java` | **PASS** 2026-10-01 |
| **F02-U01** | REQ-024-F02 AC01 | Unit/domain | Existing TargetRole assigned to `expert-chen` | Call `role.updateDetails` with `newAssignedExpertId = "expert-rivera"` | Returns updated TargetRole entity with `assignedExpertId = "expert-rivera"` | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleDomainTest.java` (`updateDetailsModifiesMetadata`) | **PASS** 2026-10-01 |
| **F02-U02** | REQ-024-F02 AC02 | Unit/application | Existing TargetRole in repository | Call `service.updateTargetRole` with reassigned expert | Updates repository record; immediate access transfer reflected on next read | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleServiceTest.java` (`updatesTargetRoleSuccessfully`) | **PASS** 2026-10-01 |
| **F02-I01** | REQ-024-F02 AC01 | Neo4j integration | Real Neo4j container with `roleAlpha` initially unassigned | Update role with `assignedExpertId = "expert-99"` and call `roleRepo.save` | Cypher MERGE updates `r.assignedExpertId = 'expert-99'`; `findById` verifies persistence | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java` | **PASS** 2026-09-30 |
| **F02-A01** | REQ-024-F02 Access Shift | MVC/security | Role reassigned from `expert-alpha` to `expert-beta` | `expert-alpha` invokes `PUT /api/v1/organizations/{orgId}/target-roles/{roleId}` | Returns `403 Forbidden` for `expert-alpha`; access immediately revoked upon reassignment | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleControllerTest.java` (`updateTargetRoleReturns403ForUnassignedExpert`) | **PASS** 2026-10-01 |
| **F01-S01** | REQ-024-F01 Combobox Selection | System/UI | Compose development stack (`http://127.0.0.1:8088/ld-manager/target-roles`) | Open Create or Edit Target Role modal dialog | Searchable Combobox lists all `ELIGIBLE_EXPERTS` with name and title; selection saves and renders assigned expert badge in table | [system/REQ-023-manual-browser-check.md](system/REQ-023-manual-browser-check.md) (Section 2) | **PASS** 2026-10-01 |

---

## Execution Evidence

- **Hexagonal Domain & Service Suites**:
  - `TargetRoleDomainTest` and `TargetRoleServiceTest` confirmed that `assignedExpertId` is fully supported across creation and update workflows.
- **Controller Access Shift Checks**:
  - `TargetRoleControllerTest` confirmed that any reassignment immediately revokes authoring authority for the previous expert (403 Forbidden) and grants it to the new expert.
- **Neo4j Testcontainers Integration**:
  - `TargetRoleAndMicroSkillNeo4jIntegrationTest` asserted that `assignedExpertId` persists directly on Neo4j nodes and correctly filters Cypher catalog queries.
