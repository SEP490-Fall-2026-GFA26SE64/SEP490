# REQ-011 — Assigned Target Roles Unit Testing Plan & Evidence

## Current Scope Alignment
Follow [current unit criteria](README.md#current-scope-alignment). Revalidate assigned-role access separately from discipline authorization and publication. Original dates/counts below describe the recorded contract only.

## Historical Test Plan and Evidence

**Feature Contract:** [REQ-011-F01 View Assigned Target Roles](../../features/Role%20catalog/README.md#req-011-f01)<br>
**Level:** Unit (Domain Invariants, Application Services, Controller Contracts & Security RBAC)  
**Status:** PASSED (2026-10-01)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Scope / Fixture | Trigger / Method | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-U01** | REQ-011-F01 AC01 | Roles across `org-alpha` assigned to `expert-1` and `expert-2` | Call `TargetRoleService.listTargetRoles` with `TargetRoleFilter(assignedExpertId="expert-1")` | Exclusively returns roles assigned to `expert-1`; completely filters out roles assigned to other experts | [TargetRoleServiceTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleServiceTest.java) (`listsRolesFilteredByAssignedExpert`) | **PASS** |
| **F01-A01** | REQ-011-F01 AC01 | Mock service; headers `X-User-Role: DOMAIN_EXPERT`, `X-User-Id: expert-chen` | `GET /api/v1/organizations/{orgId}/target-roles` | Automatically injects `assignedExpertId = expert-chen` filter into application query; returns `200 OK` | [TargetRoleControllerTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleControllerTest.java) | **PASS** |
| **F01-A02** | REQ-011-F01 AC02 | Role assigned to `expert-alpha`; caller headers `X-User-Role: DOMAIN_EXPERT`, `X-User-Id: expert-beta` | `GET /api/v1/organizations/{orgId}/target-roles/{roleId}` | Returns `403 Forbidden`; unauthorized expert cannot view unassigned role | [TargetRoleControllerTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleControllerTest.java) (`getTargetRoleReturns403ForUnassignedExpert`) | **PASS** |
| **F01-A03** | REQ-011-F01 AC02 | Role assigned to `expert-alpha`; caller headers `X-User-Role: DOMAIN_EXPERT`, `X-User-Id: expert-beta` | `PUT /api/v1/organizations/{orgId}/target-roles/{roleId}` | Returns `403 Forbidden`; unauthorized expert cannot mutate unassigned role | [TargetRoleControllerTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleControllerTest.java) (`updateTargetRoleReturns403ForUnassignedExpert`) | **PASS** |

---

## 2. Execution Evidence

```powershell
backend\mvnw.cmd "-Dtest=TargetRoleServiceTest#listsRolesFilteredByAssignedExpert,TargetRoleControllerTest#getTargetRoleReturns403ForUnassignedExpert,TargetRoleControllerTest#updateTargetRoleReturns403ForUnassignedExpert" test
# Result: PASS — 3 tests, 0 failures, 0 errors, 0 skips
```
