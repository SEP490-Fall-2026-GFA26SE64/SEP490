# REQ-012 — Micro-Skill Management System Testing Plan & Evidence

## Current Scope Alignment
Follow [current system criteria](README.md#current-scope-alignment). Revalidate assigned-discipline skills, descriptions/proficiency and deactivation/history. Dates/counts below certify only their recorded contract.

## Historical Test Plan and Evidence

**Feature Contract:**
- [REQ-012-F01 Create Micro-Skill](../../features/Learning%20catalog/README.md#req-012-f01)
- [REQ-012-F02 View Micro-Skills](../../features/Learning%20catalog/README.md#req-012-f02)
- [REQ-012-F03 Update Micro-Skill](../../features/Learning%20catalog/README.md#req-012-f03)
- [REQ-012-F04 Delete Micro-Skill](../../features/README.md#removed-scope)

**Level:** System (Docker Compose Stack, API Gateway & Graph Catalog Integration)  
**Status:** PASSED (2026-10-01)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Environment Scope | Trigger / Scenario | Expected Outcome | Verification Method | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-S01** | REQ-012-F01 End-to-End | Complete Compose dev stack (`http://127.0.0.1:8088`) | Domain Expert creates atomic micro-skill through REST endpoint | Returns `201 Created`; micro-skill node is immediately queryable in live Neo4j database | Compose API & Neo4j Browser Smoke | **PASS** |
| **F01-S02** | REQ-012-F01 Ontology Linking | Complete Compose dev stack | Link newly created micro-skill to existing target role | Graph edge `(:MacroCompetency)-[:HAS_SKILL]->(:MicroSkill)` created cleanly; skill selectable in role requirement dropdown | Full-stack authoring check | **PASS** |
| **F02-S01** | REQ-012-F02 View Micro-Skills | Compose stack + Competency Ontology UI | Domain Expert browses ontology page | Table loads micro-skills from Neo4j; architectural fields populated (`code`, `name`, `macroCompetencyCode`, `status`, `updatedAt`) | Live UI & Network inspection | **PASS** |
| **F03-S01** | REQ-012-F03 Update Micro-Skill | Compose stack + Competency Ontology UI | Domain Expert edits skill title/description via edit modal | Backend returns `200 OK`; updated values reflected in Neo4j and UI table | Live UI and database update | **PASS** |
| **F04-S01** | REQ-012-F04 Delete Unused Skill | Compose stack + Competency Ontology UI | Domain Expert deletes skill without dependencies | Backend returns `204 No Content`; node removed from Neo4j | Live UI and database check | **PASS** |
| **F04-S02** | REQ-012-F04 Delete In-Use Skill | Compose stack + Competency Ontology UI | Domain Expert attempts to delete skill required by target role | Backend returns `409 Conflict`; UI displays warning toast; skill remains intact | Live UI error handling | **PASS** |

---

## 2. Execution Evidence

- Docker Compose dev stack healthy.
- Seeded catalog contains atomic micro-skills (`JAVA-CORE`, `SPRING-BOOT`, `DOCKER`, `KAFKA`, `SQL-OPTIMIZE`, `SYSTEM-DESIGN`).
- Live Neo4j browser query `MATCH (s:MicroSkill) RETURN s` confirms all architectural properties populated (`id`, `code`, `name`, `description`, `organizationId`).
- Deletion safety guard tested against active nodes.
