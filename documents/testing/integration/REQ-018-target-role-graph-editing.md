# REQ-018 — Target-Role Graph Editing Integration Testing Plan & Evidence

## Current Scope Alignment
Follow [current integration criteria](README.md#current-scope-alignment). Revalidate discipline/role authorization, prerequisite versioning and separate publication. Original dates/counts below describe the recorded contract only.

## Historical Test Plan and Evidence

**Feature Contract:**
- [REQ-018-F01 View Target-Role Graph](../../features/Target-role%20graph%20editing/View%20Target-Role%20Graph.md)
- [REQ-018-F02 Edit Prerequisite Relationships](../../features/Target-role%20graph%20editing/Edit%20Prerequisite%20Relationships.md)

**Level:** Integration (Neo4j Testcontainers Graph Persistence, Cypher Traversal & Cycle Detection)  
**Status:** PASSED (2026-10-01)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Container / Fixture | Trigger / Method | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-I01** | REQ-018-F01 AC01 | Disposable `neo4j:5.26-community` container with seeded target roles, micro-skills, and `REQUIRES_SKILL` edges | Call `targetRoleGraphPort.getTargetRoleGraph(orgId, roleId)` | Cypher query retrieves target role node, all required skills, their target proficiencies, and internal `PREREQUISITE_OF` edges | `TargetRoleAndMicroSkillNeo4jIntegrationTest.java` | **PASS** |
| **F02-I01** | REQ-018-F02 AC01 | Disposable Neo4j container with micro-skills `SKILL-A` and `SKILL-B` | Call `prerequisitePort.save(orgId, edge)` | Edge created: `(:MicroSkill {id: 'SKILL-A'})-[:PREREQUISITE_OF {minMastery: 0.70, status: 'ACTIVE'}]->(:MicroSkill {id: 'SKILL-B'})` | `TargetRoleAndMicroSkillNeo4jIntegrationTest.java` | **PASS** |
| **F02-I02** | REQ-018-F02 AC02 | Disposable Neo4j container with `SKILL-A -> SKILL-B -> SKILL-C` chain | Call `prerequisitePort.wouldCreateCycle(orgId, 'SKILL-C', 'SKILL-A')` | Cypher query `MATCH path = (target)-[:PREREQUISITE_OF*1..25]->(source)` evaluates to `true`; cycle detected | `TargetRoleAndMicroSkillNeo4jIntegrationTest.java` | **PASS** |
| **F02-I03** | REQ-018-F02 AC03 | Disposable Neo4j container with existing prerequisite edge | Call `prerequisitePort.delete(orgId, sourceSkillId, targetSkillId)` | Neo4j relationship deleted; edge count drops to 0 | `TargetRoleAndMicroSkillNeo4jIntegrationTest.java` | **PASS** |

---

## 2. Execution Evidence

```powershell
.\backend\mvnw.cmd -f backend/pom.xml test '-Dtest=TargetRoleAndMicroSkillNeo4jIntegrationTest'
```

Output:
```
[INFO] Running com.adaptlearngraph.catalog.TargetRoleAndMicroSkillNeo4jIntegrationTest
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```
