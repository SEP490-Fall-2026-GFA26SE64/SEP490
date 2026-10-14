# REQ-018 — Target-Role Graph Editing Master Test Plan

## Current Scope Alignment
Follow [current test criteria](README.md#current-scope-alignment). Revalidate assigned-discipline/role graph access and separate Expert prerequisite authoring from L&D publication. Original dates/counts and legacy references remain historical, not revised acceptance.

## Historical Test Plan and Evidence

**Requirement:** [REQ-018 Target-Role Graph Editing](../../PRODUCT_OVERVIEW.md)  
**Feature Specifications:**
- [REQ-018-F01 View Target-Role Graph](../features/Target-role%20graph%20editing/View%20Target-Role%20Graph.md)
- [REQ-018-F02 Edit Prerequisite Relationships](../features/Target-role%20graph%20editing/Edit%20Prerequisite%20Relationships.md)

**Actors:** Domain Expert, L&D Manager  
**Primary Schema Sources:** [ARCHITECTURE.md](../ARCHITECTURE.md) & [neo4j_schema.md](../neo4j_schema.md)  
**Status:** PASSED (2026-10-01)

---

## 1. Requirement Summary & Rules

| Function ID | Function Name | Core Rules & Invariants | Architecture Schema Scope |
| :--- | :--- | :--- | :--- |
| **REQ-018-F01** | View Target-Role Graph | Displays authorized target role knowledge subgraph: role node, required micro-skills (`REQUIRES_SKILL`), target masteries, and pedagogical prerequisites (`PREREQUISITE_OF`). | Role node (`TargetRole`: `id`, `code`, `title`, `track`, `seniority`, `status`), skill nodes (`MicroSkill`: `id`, `code`, `name`, `macroCompetencyCode`), edges (`REQUIRES_SKILL`: `targetMastery`), edges (`PREREQUISITE_OF`: `minMastery`). |
| **REQ-018-F02** | Edit Prerequisite Relationships | Allows adding and deleting `PREREQUISITE_OF` relationships between micro-skills. Invariant: `sourceSkillId != targetSkillId` (no self-loops), `0.0 <= minMastery <= 1.0`. Graph DAG invariant: rejects any cycle creation (`[:PREREQUISITE_OF*1..25]`) with HTTP 400 Bad Request. | Edge label: `PREREQUISITE_OF`. Edge attributes: `minMastery` (Float, default 0.70), `status` (String, default "ACTIVE"). |

---

## 2. Test Execution Hierarchy

| Test Tier | Document Link | Scope & Verification | Executable Suite | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Unit Testing** | [unit/REQ-018-target-role-graph-editing.md](unit/REQ-018-target-role-graph-editing.md) | Domain models, anti-cycle DAG validation, minMastery bounds, Mockito service layer, HTTP MockMvc controller authorization. | `PrerequisiteDomainTest.java`, `PrerequisiteServiceTest.java`, `PrerequisiteControllerTest.java`, `TargetRoleGraphControllerTest.java` | **PASS (13/13 tests)** |
| **Integration Testing** | [integration/REQ-018-target-role-graph-editing.md](integration/REQ-018-target-role-graph-editing.md) | Neo4j Testcontainers graph persistence, Cypher cycle detection query `MATCH path = (target)-[:PREREQUISITE_OF*1..25]->(source)`, edge creation and deletion. | `TargetRoleAndMicroSkillNeo4jIntegrationTest.java` | **PASS** |
| **System Testing** | [system/REQ-018-target-role-graph-editing.md](system/REQ-018-target-role-graph-editing.md) | End-to-end Compose API and Vite UI integration, interactive graph visualization using vis-network, real-time prerequisite creation/deletion with cycle toast errors. | `compose.dev.yml` stack + manual browser verification | **PASS** |
| **Manual Browser Check** | [system/REQ-012-REQ-018-manual-browser-check.md](system/REQ-012-REQ-018-manual-browser-check.md) | Interactive step-by-step checklist for Domain Expert and L&D Manager personas verifying REQ-012 and REQ-018 flows. | Frontend UI at `/manager/target-roles`, `/manager/ontology`, `/expert/roles` | **READY** |

---

## 3. Coverage Matrix

| Requirement Case | Verified Condition | Level | Test Name | Status |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-018-F01-01** | Subgraph retrieval returns role, required skills, and prerequisites | Unit / HTTP | `TargetRoleGraphControllerTest.shouldReturnTargetRoleGraphWhenAuthorized` | **PASS** |
| **REQ-018-F01-02** | Subgraph endpoint enforces RBAC (`403 Forbidden` for Learner) | Unit / Security | `TargetRoleGraphControllerTest.shouldDenyLearnerAccessToTargetRoleGraph` | **PASS** |
| **REQ-018-F02-01** | Create prerequisite edge succeeds with valid minMastery (0.80) | Unit / Service | `PrerequisiteServiceTest.shouldCreatePrerequisiteWhenValid` | **PASS** |
| **REQ-018-F02-02** | Self-loop prerequisite rejected (`sourceSkillId == targetSkillId`) | Unit / Domain | `PrerequisiteServiceTest.shouldThrowWhenSelfLoop` | **PASS** |
| **REQ-018-F02-03** | Invalid minMastery (< 0 or > 1) rejected with validation error | Unit / HTTP | `PrerequisiteControllerTest.shouldRejectInvalidMinMastery` | **PASS** |
| **REQ-018-F02-04** | Cyclic prerequisite detected and rejected with `PrerequisiteCycleException` (400) | Unit / Service | `PrerequisiteServiceTest.shouldThrowWhenCycleDetected` | **PASS** |
| **REQ-018-F02-05** | Delete prerequisite edge succeeds | Unit / Service | `PrerequisiteServiceTest.shouldDeletePrerequisite` | **PASS** |
| **REQ-018-F02-06** | Neo4j Cypher cycle path detection in live Testcontainers | Integration | `TargetRoleAndMicroSkillNeo4jIntegrationTest` | **PASS** |
