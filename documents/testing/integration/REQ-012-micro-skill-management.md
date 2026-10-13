# REQ-012 — Micro-Skill Management Integration Testing Plan & Evidence

**Feature Contract:** [REQ-012-F01 Create Micro-Skill](../../features/Micro-skill%20management/Create%20Micro-Skill.md)  
**Level:** Integration (Neo4j Testcontainers Graph Persistence & Ontological Edges)  
**Status:** PASSED (2026-09-30)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Container / Fixture | Trigger / Method | Expected Outcome | Executable Test Location | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-I01** | REQ-012-F01 AC01, AC02 | Disposable `neo4j:5.26-community` container with existing `MacroCompetency` node | Call `microSkillRepo.save` with valid MicroSkill domain entity | Node created with label `(:MicroSkill {id, organizationId, code, name, description})` and linked via `(:MacroCompetency)-[:HAS_SKILL]->(:MicroSkill)` graph edge | [TargetRoleAndMicroSkillNeo4jIntegrationTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java) | **PASS** |
| **F01-I02** | REQ-012-F01 AC03 | Disposable Neo4j container with `MicroSkill` saved in `org-alpha` | Query micro-skills scoped to `org-beta` | Returns 0 records; strict multi-tenant isolation enforced in Neo4j Cypher queries | [TargetRoleAndMicroSkillNeo4jIntegrationTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java) | **PASS** |
| **F01-I03** | Neo4j Schema V5 (MicroSkill & MacroCompetency) | Disposable Neo4j container seeded with `DevelopmentCatalogSeeder` | Call `microSkillRepo.findAll(orgId)` | Retrieves all catalog skills with 100% schema fidelity (`id`, `code`, `name`, `description`, `macroCompetencyCode`, `status`, `createdAt`, `updatedAt`); zero extraneous mock attributes | [TargetRoleAndMicroSkillNeo4jIntegrationTest.java](file:///d:/Semesters/Fall2026/SEP490/Project/SEP490/backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java) | **PASS** |

---

## 2. Execution Evidence

```powershell
backend\mvnw.cmd "-Dtest=TargetRoleAndMicroSkillNeo4jIntegrationTest" test
# Result: PASS — MicroSkill node creation and ontological relationships verified in Testcontainers
```
