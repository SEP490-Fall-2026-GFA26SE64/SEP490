# REQ-023 — Target Role Management Integration Testing Plan & Evidence

## Current Scope Alignment
Follow [current integration criteria](README.md#current-scope-alignment). Revalidate L&D management, Expert configuration completion and L&D publication persistence/access. Original dates/counts below describe the recorded contract only.

## Historical Test Plan and Evidence

**Feature Contracts:**
- [REQ-023-F01 Create Target Role](../../features/Role%20catalog/README.md#req-023-f01)
- [REQ-023-F02 View Organization Target Roles](../../features/Role%20catalog/README.md#req-023-f02)
- [REQ-023-F03 Update Target Role](../../features/Role%20catalog/README.md#req-023-f03)
- [REQ-023-F04 Delete Target Role](../../features/README.md#removed-scope)
- [REQ-023-F05 Expert Assigned Roles & Isolation](../../features/README.md#removed-scope)

**Level:** Integration (Neo4j Testcontainers Database Repository & Graph Lifecycle)  
**Status:** PASSED (2026-09-30)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Container / Fixture | Trigger / Method | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-I01** | REQ-023-F01 AC01, AC02 | Disposable `neo4j:5.26-community` container with schema constraints migrated | `save` TargetRole in `org-alpha` and `org-beta` via `Neo4jTargetRoleRepository` | Persists node with `id, organizationId, code, domainCode, familyCode, track, seniority, responsibilities, version, status`; verifies strict multi-tenant isolation | [TargetRoleAndMicroSkillNeo4jIntegrationTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java) | **PASS** |
| **F01-I02** | REQ-023-F01 AC05 | Disposable Neo4j container with `MicroSkill` node | `save` TargetRole with `skillTargets` JSON array | Creates `(:TargetRole)-[req:REQUIRES_SKILL]->(:MicroSkill)` with `targetMastery = threshold / 100.0`; reading back dynamically reconstructs `skillTargets` from graph edges | [TargetRoleAndMicroSkillNeo4jIntegrationTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java) | **PASS** |
| **F01-I03** | REQ-023-F01 AC06 | Disposable Neo4j container with existing active v1.0 TargetRole | `save` successor draft with same code and `version = '1.1'` | Persists v1.1 alongside v1.0 without violating `target_role_code` uniqueness; verifies both versions queryable | [TargetRoleAndMicroSkillNeo4jIntegrationTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java) | **PASS** |
| **F01-I04** | REQ-023-F04 AC01 | TargetRole with active `[:REQUIRES_SKILL]` and `[:HAS_ROLE]` graph edges | `deleteById` on `Neo4jTargetRoleRepository` | Executes `DETACH DELETE r`; removes role and all its edges while preserving connected `MicroSkill` nodes | [TargetRoleAndMicroSkillNeo4jIntegrationTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java) | **PASS** |

---

## 2. Execution Evidence

```powershell
backend\mvnw.cmd "-Dtest=TargetRoleAndMicroSkillNeo4jIntegrationTest" test
# Result: PASS — 6 tests, 0 failures, 0 errors, 0 skips
```
