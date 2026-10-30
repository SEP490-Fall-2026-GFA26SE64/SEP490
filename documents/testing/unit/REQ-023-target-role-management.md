# REQ-023 — Target Role Management Unit Testing Plan & Evidence

## Current Scope Alignment
Follow [current unit criteria](README.md#current-scope-alignment). Revalidate L&D management, Expert configuration completion and separate publication/actor boundaries. Original dates/counts below describe the recorded contract only.

## Historical Test Plan and Evidence

**Feature Contracts:**
- [REQ-023-F01 Create Target Role](../../features/Role%20catalog/README.md#req-023-f01)
- [REQ-023-F02 View Organization Target Roles](../../features/Role%20catalog/README.md#req-023-f02)
- [REQ-023-F03 Update Target Role](../../features/Role%20catalog/README.md#req-023-f03)
- [REQ-023-F04 Delete Target Role](../../features/README.md#removed-scope)
- [REQ-023-F05 Expert Assigned Roles & Isolation](../../features/README.md#removed-scope)

**Level:** Unit (Domain Invariants, Application Services, Controller Contracts & Security RBAC)  
**Status:** PASSED (2026-10-01)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Scope / Fixture | Trigger / Method | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-U01** | REQ-023-F01 AC01, AC02 | TargetRole entity with track, domainCode, familyCode, version | Construct new TargetRole | Defaults to `DRAFT` status, normalizes code to uppercase, validates non-blank fields | [TargetRoleDomainTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/domain/TargetRoleDomainTest.java) | **PASS** |
| **F01-U02** | REQ-023-F01 AC03 | InMemory repository with existing code & version | Call `createTargetRole` with same code & version | Rejects with `DuplicateTargetRoleException` (409 Conflict) | [TargetRoleServiceTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/application/TargetRoleServiceTest.java) | **PASS** |
| **F01-U03** | REQ-023-F01 AC07 | TargetRole track-seniority matching & responsibilities list | Create TargetRole with Seniority and Responsibilities | Enforces P1–P5 for PROFESSIONAL and M3–M4 for MANAGEMENT; rejects invalid combinations | [TargetRoleDomainTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/domain/TargetRoleDomainTest.java) | **PASS** |
| **F01-A01** | REQ-023-F01 AC01, AC04 | Mock service; `LD_MANAGER` caller vs `LEARNER` caller | `POST /api/v1/organizations/{orgId}/target-roles` | `201 Created` with role payload for L&D Manager; `403 Forbidden` for non-manager | [TargetRoleControllerTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/api/TargetRoleControllerTest.java) | **PASS** |
| **F01-A02** | REQ-023-F01 AC08 | Mock service; track and seniority mismatch payload | `POST /api/v1/organizations/{orgId}/target-roles` with track=MANAGEMENT, seniority=P3 | Rejects with `400 Bad Request` and descriptive error message | [TargetRoleControllerTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/api/TargetRoleControllerTest.java) | **PASS** |
| **F02-U01** | REQ-023-F02 AC01, AC02 | Roles across `org-alpha` and `org-beta` with various tracks, statuses, and assigned experts | Call `listTargetRoles` with `TargetRoleFilter` | Multi-tenant isolation holds; search keywords, track, domain, and expert filters evaluate correctly | [TargetRoleServiceTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/application/TargetRoleServiceTest.java) | **PASS** |
| **F02-A01** | REQ-023-F02 AC01, AC03 | Mock service with role list | `GET /api/v1/organizations/{orgId}/target-roles` | `200 OK` with JSON array; single role lookup returns `200 OK` or `404 Not Found` | [TargetRoleControllerTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/api/TargetRoleControllerTest.java) | **PASS** |
| **F03-U01** | REQ-023-F03 AC01, AC02 | Existing target role in `DRAFT` status | Call `updateTargetRole` with new title, track, expert | Updates mutable fields while preserving immutable code and identity | [TargetRoleServiceTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/application/TargetRoleServiceTest.java) | **PASS** |
| **F03-U02** | REQ-023-F03 AC04 | Existing target role | Call `updateTargetRole` with updated seniority and responsibilities | Correctly persists new seniority and non-empty responsibilities array | [TargetRoleServiceTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/application/TargetRoleServiceTest.java) | **PASS** |
| **F03-A01** | REQ-023-F03 AC03 | Mock service; valid update payload | `PUT /api/v1/organizations/{orgId}/target-roles/{roleId}` | `200 OK` with updated TargetRoleDTO; `404 Not Found` if role does not exist | [TargetRoleControllerTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/api/TargetRoleControllerTest.java) | **PASS** |
| **F04-U01** | REQ-023-F04 AC01 | Existing target role (both `DRAFT` and `ACTIVE`) | Call `deleteTargetRole` | Successfully deletes role from repository; returns false when role not found | [TargetRoleServiceTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/application/TargetRoleServiceTest.java) | **PASS** |
| **F04-A01** | REQ-023-F04 AC02 | Mock service; `LD_MANAGER` caller | `DELETE /api/v1/organizations/{orgId}/target-roles/{roleId}` | `204 No Content` on successful deletion; `404 Not Found` when nonexistent | [TargetRoleControllerTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/api/TargetRoleControllerTest.java) | **PASS** |
| **F05-A01** | REQ-023-F05 AC01 | `X-User-Role: DOMAIN_EXPERT`, `X-User-Id: expert-chen` | `GET /api/v1/organizations/{orgId}/target-roles` | Automatically injects `assignedExpertId = expert-chen` filter; hides other experts' roles | [TargetRoleControllerTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/api/TargetRoleControllerTest.java) | **PASS** |
| **F05-A02** | REQ-023-F05 AC04 | `X-User-Role: DOMAIN_EXPERT`, `X-User-Id: expert-alpha`, payload with `status = REJECTED` on non-rejected role | `PUT /api/v1/organizations/{orgId}/target-roles/{roleId}` | Rejects expert assignment rejection with `400 Bad Request` ("Domain Experts can no longer reject target roles") | [TargetRoleControllerTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleControllerTest.java) | **PASS** |
| **F05-A03** | REQ-023-F05 AC05 | `X-User-Role: DOMAIN_EXPERT`, role already in `REJECTED` status | `PUT /api/v1/organizations/{orgId}/target-roles/{roleId}` with updated `skillTargets` and `status = REJECTED` | Successfully saves draft revisions and persists micro-skills without 400 Bad Request | [TargetRoleControllerTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleControllerTest.java) | **PASS** |
| **F05-U01** | REQ-023-F05 Rule | Competency detached from level in authoring modal | Call `handleRemoveCompetency(compId, level)` | Automatically removes all micro-skills belonging to detached competency from that level unless covered by remaining competency | [ExpertAssignedRolesPage.tsx](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/frontend/src/features/expert/target-roles/ExpertAssignedRolesPage.tsx) | **PASS** |
| **F05-U02** | REQ-023-F05 Rule | Published target role with customized levels, competencies, and micro-skills | Click `+ New Draft` (`handleDraftNewVersion`) | Clones predecessor's exact levels, level-competency mappings, and micro-skill targets into new draft (e.g. `v1.1 DRAFT`) | [ExpertAssignedRolesPage.tsx](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/frontend/src/features/expert/target-roles/ExpertAssignedRolesPage.tsx) | **PASS** |

---

## 2. Execution Evidence

```powershell
backend\mvnw.cmd "-Dtest=TargetRoleDomainTest,TargetRoleServiceTest,TargetRoleControllerTest" test
# Result: PASS — 30 tests, 0 failures, 0 errors, 0 skips
npm run build
# Result: PASS — tsc -b && vite build (0 errors)
```
