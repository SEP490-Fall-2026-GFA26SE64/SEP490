# REQ-024 — Expert Assignment Integration Testing Plan & Evidence

## Current Scope Alignment
Follow [current integration criteria](README.md#current-scope-alignment). Revalidate role assignment/removal/history separately from discipline assignments. Original dates/counts below describe the recorded contract only.

## Historical Test Plan and Evidence

**Feature Contracts:**
- [REQ-024-F01 Assign Target Role to Expert](../../features/Role%20catalog/README.md#req-024-f01)
- [REQ-024-F02 Reassign Target Role Expert](../../features/Role%20catalog/README.md#req-024-f02)

**Level:** Integration (Neo4j Testcontainers Property Mutation & Persistence)  
**Status:** PASSED (2026-09-30)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Container / Fixture | Trigger / Method | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F02-I01** | REQ-024-F02 AC01 | Real disposable Neo4j container with `roleAlpha` initially unassigned | Update role with `assignedExpertId = "expert-99"` and call `roleRepo.save` | Cypher MERGE updates `r.assignedExpertId = 'expert-99'`; subsequent `findById` confirms field persisted cleanly in Neo4j node | [TargetRoleAndMicroSkillNeo4jIntegrationTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java) | **PASS** |
| **F02-I02** | REQ-024-F02 AC02 | Neo4j container with role assigned to `expert-alpha` | Call `roleRepo.save` with `assignedExpertId = "expert-beta"` | Overwrites `assignedExpertId` property in Neo4j; subsequent Cypher query for `expert-alpha` returns 0 results | [TargetRoleAndMicroSkillNeo4jIntegrationTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java) | **PASS** |

---

## 2. Execution Evidence

```powershell
backend\mvnw.cmd "-Dtest=TargetRoleAndMicroSkillNeo4jIntegrationTest#assignedExpertFilteringWorks" test
# Result: PASS — Verified assignedExpertId mutation, Cypher persistence, and query filtering
```
