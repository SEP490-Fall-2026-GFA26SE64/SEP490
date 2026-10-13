# REQ-011 — Assigned Target Roles Integration Testing Plan & Evidence

**Feature Contract:** [REQ-011-F01 View Assigned Target Roles](../../features/Assigned%20target%20roles/View%20Assigned%20Target%20Roles.md)  
**Level:** Integration (Neo4j Testcontainers Database Adapter & Cypher Queries)  
**Status:** PASSED (2026-09-30)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Container / Fixture | Trigger / Method | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-I01** | REQ-011-F01 AC01 | Disposable `neo4j:5.26-community` container with multiple TargetRole nodes assigned across `expert-99`, `expert-chen`, and other experts | Execute `findByOrganizationId` with `TargetRoleFilter(assignedExpertId="expert-99")` | Live Neo4j Cypher query filters strictly on `r.assignedExpertId = $assignedExpertId`; returns exactly matching role(s) for `expert-99` and 0 for unassigned or non-existent expert | [TargetRoleAndMicroSkillNeo4jIntegrationTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java) | **PASS** |
| **F01-I02** | REQ-011-F01 AC02 | Roles across `org-alpha` and `org-beta` with expert assignments | Query roles with active tenant and expert filter | Isolation across tenants holds in real graph: expert in Org A cannot query or retrieve roles from Org B | [TargetRoleAndMicroSkillNeo4jIntegrationTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java) | **PASS** |

---

## 2. Execution Evidence

```powershell
backend\mvnw.cmd "-Dtest=TargetRoleAndMicroSkillNeo4jIntegrationTest#assignedExpertFilteringWorks" test
# Result: PASS — Cypher MATCH (r:TargetRole {organizationId: $organizationId}) WHERE r.assignedExpertId = $assignedExpertId executed and passed
```
