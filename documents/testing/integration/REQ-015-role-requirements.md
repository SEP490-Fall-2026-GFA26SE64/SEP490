# REQ-015 — Role Requirements Integration Testing Plan & Evidence

**Feature Contracts:**
- [REQ-015-F01 Link Micro-Skill to Target Role](../../features/Role%20requirements/Link%20Micro-Skill%20to%20Target%20Role.md)
- [REQ-015-F02 Unlink Micro-Skill from Target Role](../../features/Role%20requirements/Unlink%20Micro-Skill%20from%20Target%20Role.md)
- [REQ-015-F03 Set Required Proficiency](../../features/Role%20requirements/Set%20Required%20Proficiency.md)

**Level:** Integration (Neo4j Testcontainers Graph Edges & Properties)  
**Status:** PASSED (2026-09-30)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Container / Fixture | Trigger / Method | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-I01** | REQ-015-F01 AC01 | Neo4j container with `MicroSkill` node `APACHE_SPARK` and TargetRole `ROLE_ML_ENG` | Save TargetRole with `skillTargets` JSON array | Creates `(:TargetRole)-[req:REQUIRES_SKILL]->(:MicroSkill)` graph edge in Neo4j without legacy weight or mandatory flags | [TargetRoleAndMicroSkillNeo4jIntegrationTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java) | **PASS** |
| **F01-I02** | REQ-015-F01 AC02 | TargetRole with active `[:REQUIRES_SKILL]` relationships | Call `roleRepo.findById` | Dynamically reconstructs `skillTargets` JSON array directly from Neo4j graph relationships on read | [TargetRoleAndMicroSkillNeo4jIntegrationTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java) | **PASS** |
| **F02-I01** | REQ-015-F02 AC01 | TargetRole linked to `APACHE_SPARK`; target role deleted or skill unlinked | Execute unlinking / delete on target role | `[:REQUIRES_SKILL]` edge is removed; `(:MicroSkill {code: 'APACHE_SPARK'})` node in shared ontology remains completely intact | [TargetRoleAndMicroSkillNeo4jIntegrationTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java) | **PASS** |
| **F03-I01** | REQ-015-F03 AC01 | TargetRole saved with threshold `85%` | Read relationship property `req.targetMastery` | Persists as `0.85` Float in Neo4j; accurately round-trips back to `85%` threshold in API DTO | [TargetRoleAndMicroSkillNeo4jIntegrationTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java) | **PASS** |

---

## 2. Execution Evidence

```powershell
backend\mvnw.cmd "-Dtest=TargetRoleAndMicroSkillNeo4jIntegrationTest#roleRequirementsGraphEdgesWork" test
# Result: PASS — Asserted count(req) = 1, req.targetMastery == 0.85, and unlinking integrity preserved
```
