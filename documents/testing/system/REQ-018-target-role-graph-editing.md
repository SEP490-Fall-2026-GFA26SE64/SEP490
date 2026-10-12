# REQ-018 — Target-Role Graph Editing System Testing Plan & Evidence

**Feature Contract:**
- [REQ-018-F01 View Target-Role Graph](../../features/Target-role%20graph%20editing/View%20Target-Role%20Graph.md)
- [REQ-018-F02 Edit Prerequisite Relationships](../../features/Target-role%20graph%20editing/Edit%20Prerequisite%20Relationships.md)

**Level:** System (Docker Compose Stack, API Gateway & Graph Visualization Integration)  
**Status:** PASSED (2026-10-01)

---

## 1. Test Cases

| Case ID | Acceptance Rule | Environment Scope | Trigger / Scenario | Expected Outcome | Verification Method | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01-S01** | REQ-018-F01 End-to-End View | Complete Compose dev stack (`http://127.0.0.1:8088`) + Vite frontend (`http://127.0.0.1:5173`) | User clicks "Knowledge Graph" button on Target Role card/row | TargetRoleGraphModal opens, renders vis-network interactive graph with role node (orange) connected to required micro-skills (blue/green), displaying `targetMastery` and prerequisite arrows (`minMastery`) | Manual Browser & Network tab | **PASS** |
| **F01-S02** | REQ-018-F01 Element Inspector | TargetRoleGraphModal in frontend | User clicks any node or edge in the graph canvas | Element Inspector sidebar displays real-time architectural properties: track, seniority, status, target mastery, prerequisites breakdown | UI Component verification | **PASS** |
| **F02-S01** | REQ-018-F02 Prerequisite Authoring | Complete Compose stack + Competency Ontology page | User opens "Manage Prerequisites" modal, selects source and target skill with minMastery 80%, clicks "Establish Dependency" | Relationship created in Neo4j; table updates; canvas re-draws directed arrow with `minMastery: 80%` | Full-stack persistence check | **PASS** |
| **F02-S02** | REQ-018-F02 Cycle Prevention | Competency Ontology page | User attempts to add a prerequisite that completes a directed cycle (e.g., A -> B -> C -> A) | Backend returns `400 Bad Request` with `PrerequisiteCycleException`; UI displays error banner: "Cannot create prerequisite: adding this dependency would create a cycle in the skill graph." | End-to-end exception check | **PASS** |
| **F02-S03** | REQ-018-F02 Delete Prerequisite | Competency Ontology page | User clicks trash icon next to a prerequisite relationship | Relationship removed from Neo4j; graph visualizer dynamically removes directed edge | Live UI and database check | **PASS** |

---

## 2. Execution Evidence

- Docker Compose dev stack running (`api-gateway`, `backend`, `neo4j`, `postgres`).
- Neo4j query `MATCH (a:MicroSkill)-[r:PREREQUISITE_OF]->(b:MicroSkill) RETURN a.code, r.minMastery, b.code` verifies live graph dependencies.
- Frontend vis-network rendering verified with hierarchical layout mode and organic physics mode.
