# REQ-015 — Role Requirements Test Plan and Evidence

## Current Scope Alignment
Follow [current test criteria](README.md#current-scope-alignment). Revalidate assigned-Expert competency/skill proficiency/importance configuration, submission of completion and L&D publication without requirement editing. Original dates/counts are unchanged and do not certify revised scope.

## Historical Test Plan and Evidence

**Status:** Domain, Application, Neo4j Testcontainers Integration, and System API tests passed; interactive authoring modal verified.  
**Dedicated Level Evidence:** [Unit Test](unit/REQ-015-role-requirements.md) | [Integration Test](integration/REQ-015-role-requirements.md) | [System Test](system/REQ-015-role-requirements.md)  
**Feature contracts:**
- [REQ-015-F01 Link Micro-Skill to Target Role](../features/Role%20requirements/Link%20Micro-Skill%20to%20Target%20Role.md)
- [REQ-015-F02 Unlink Micro-Skill from Target Role](../features/Role%20requirements/Unlink%20Micro-Skill%20from%20Target%20Role.md)
- [REQ-015-F03 Set Required Proficiency](../features/Role%20requirements/Set%20Required%20Proficiency.md)

Under [ARCHITECTURE.md](../ARCHITECTURE.md) and [neo4j_schema.md](../neo4j_schema.md), role requirements are represented exclusively as directed graph edges `(:TargetRole)-[:REQUIRES_SKILL {targetMastery: Float}]->(:MicroSkill)`. Weight and mandatory flags have been removed per Neo4j Schema V5; every linked edge represents a benchmark threshold. Proficiency thresholds in the UI range from `1%` to `100%`, normalized and stored in Neo4j as `targetMastery: Float` in the range `[0.01, 1.0]`.

---

## Test Cases

| Case | Acceptance rule | Level | Fixture and tenant scope | Trigger | Expected outcome | Executable location | Last result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-I01** | REQ-015-F01 AC01 | Neo4j integration | Neo4j container with `MicroSkill` node `APACHE_SPARK` and TargetRole `ROLE_ML_ENG` | Save TargetRole with `skillTargets` JSON array | Creates `(:TargetRole)-[req:REQUIRES_SKILL]->(:MicroSkill)` graph edge in Neo4j | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java` | **PASS** 2026-09-30 |
| **F01-I02** | REQ-015-F01 AC02 | Neo4j integration | TargetRole with active `[:REQUIRES_SKILL]` relationships | Call `roleRepo.findById` | Reconstructs `skillTargets` JSON array directly from Neo4j graph relationships dynamically on read | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java` | **PASS** 2026-09-30 |
| **F02-I01** | REQ-015-F02 AC01 | Neo4j integration | TargetRole linked to `APACHE_SPARK`; target role deleted or skill unlinked | Execute unlinking / delete on target role | `[:REQUIRES_SKILL]` edge is removed; `(:MicroSkill {code: 'APACHE_SPARK'})` node in shared ontology remains completely intact | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java` | **PASS** 2026-09-30 |
| **F03-I01** | REQ-015-F03 AC01 | Neo4j integration | TargetRole saved with threshold `85%` | Read relationship property `req.targetMastery` | Persists as `0.85` Float in Neo4j; accurately round-trips back to `85%` threshold in API DTO | `backend/src/test/java/com/adaptlearngraph/catalog/TargetRoleAndMicroSkillNeo4jIntegrationTest.java` | **PASS** 2026-09-30 |
| **F03-U01** | REQ-015-F03 AC02 | Unit/frontend | Authoring modal in `TargetRolesPage.tsx` | Slide proficiency threshold slider or type numeric input | Enforces bounds between `1%` and `100%`; updates target mastery payload | `frontend/src/features/manager/target-roles/TargetRolesPage.tsx` | **PASS** 2026-10-01 |
| **F01-S01** | REQ-015 Publication Gate | System/UI | Compose development stack (`http://127.0.0.1:8088/expert/target-roles`) | Attempt to publish role with 0 linked micro-skills | Action is disabled or blocked with validation message: role requires at least 1 benchmark micro-skill | [system/REQ-023-manual-browser-check.md](system/REQ-023-manual-browser-check.md) (Section 4) | **PASS** 2026-10-01 |

---

## Execution Evidence

- **Neo4j Testcontainers Integration**:
  - `TargetRoleAndMicroSkillNeo4jIntegrationTest` executed against `neo4j:5.26-community`.
  - Asserted `count(req) = 1` for `MATCH (r:TargetRole)-[req:REQUIRES_SKILL]->(s:MicroSkill)`.
  - Asserted `req.targetMastery == 0.85` for threshold 85%.
  - Verified that unlinking or deleting the role executes `DETACH DELETE` on the role without deleting the `MicroSkill` node.
- **Frontend Authoring Modal**:
  - Expert authoring modal provides searchable dropdown across all catalog micro-skills.
  - Interactive slider controls required mastery from `1%` to `100%`.
  - Trash icon button (`Trash2`) allows unlinking micro-skills with instant state updates.
