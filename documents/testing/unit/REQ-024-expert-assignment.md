# REQ-024 — Expert Assignment Unit Testing Plan & Evidence

**Feature Contracts:**
- [REQ-024-F01 Assign Target Role to Expert](../../features/Expert%20assignment/Assign%20Target%20Role%20to%20Expert.md)
- [REQ-024-F02 Reassign Target Role Expert](../../features/Expert%20assignment/Reassign%20Target%20Role%20Expert.md)

**Level:** Unit (Domain Invariants, Application Services & Controller RBAC Contracts)  
**Status:** PASSED (2026-10-01)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Scope / Fixture | Trigger / Method | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-U01** | REQ-024-F01 AC01 | `CreateTargetRoleCommand` with `assignedExpertId = "expert-chen"` | Call `service.createTargetRole` | Successfully stores role with `assignedExpertId = "expert-chen"`; verifies non-empty field | [TargetRoleServiceTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleServiceTest.java) | **PASS** |
| **F01-A01** | REQ-024-F01 AC02 | `POST /api/v1/organizations/{orgId}/target-roles` payload containing `assignedExpertId` | Invoke POST with `X-User-Role: LD_MANAGER` | Returns `201 Created` with JSON payload containing non-null `assignedExpertId` | [TargetRoleControllerTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleControllerTest.java) | **PASS** |
| **F02-U01** | REQ-024-F02 AC01 | Existing TargetRole assigned to `expert-chen` | Call `role.updateDetails` with `newAssignedExpertId = "expert-rivera"` | Returns updated TargetRole entity with `assignedExpertId = "expert-rivera"` | [TargetRoleDomainTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleDomainTest.java) (`updateDetailsModifiesMetadata`) | **PASS** |
| **F02-U02** | REQ-024-F02 AC02 | Existing TargetRole in repository | Call `service.updateTargetRole` with reassigned expert | Updates repository record; immediate access transfer reflected on next read | [TargetRoleServiceTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleServiceTest.java) (`updatesTargetRoleSuccessfully`) | **PASS** |
| **F02-A01** | REQ-024-F02 Access Shift | Role reassigned from `expert-alpha` to `expert-beta` | `expert-alpha` invokes `PUT /api/v1/organizations/{orgId}/target-roles/{roleId}` | Returns `403 Forbidden` for `expert-alpha`; access immediately revoked upon reassignment | [TargetRoleControllerTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleControllerTest.java) (`updateTargetRoleReturns403ForUnassignedExpert`) | **PASS** |

---

## 2. Execution Evidence

```powershell
backend\mvnw.cmd "-Dtest=TargetRoleDomainTest#updateDetailsModifiesMetadata,TargetRoleServiceTest#updatesTargetRoleSuccessfully,TargetRoleControllerTest#updateTargetRoleReturns403ForUnassignedExpert" test
# Result: PASS — 3 tests, 0 failures, 0 errors, 0 skips
```
