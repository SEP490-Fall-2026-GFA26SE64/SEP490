# REQ-018 — Target-Role Graph Editing System Testing Plan & Evidence

## Current Scope Alignment
Follow [current system criteria](README.md#current-scope-alignment). Revalidate assigned-discipline/role graph access and separate L&D publication. Dates/counts below certify only their recorded contract.

## Historical Test Plan and Evidence

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
| **F01-S03** | REQ-018-F01 Competency Graph Visualization | Complete Compose stack | User views Target Role Knowledge Graph with macro competencies assigned | Graph displays Competency nodes (purple) linked via `(:Level)-[:REQUIRES_COMPETENCY]->(:Competency)` and `(:Competency)-[:CONTAINS_SKILL]->(:MicroSkill)`; legend includes Competency; Inspector displays competency cluster metadata | Playwright spec `REQ-018-target-role-authoring-and-graph.spec.ts` | **PASS** |
| **F01-S04** | REQ-018-F01 Modification Sorting & Successor Draft Flow | Expert & Manager Target Roles views | Domain Expert clicks "New Draft", creates successor draft, configures competencies table, submits to L&D Manager | Successor draft placed directly below predecessor without auto-opening modal; latest modified role ranks at table top on both portals; status becomes `SUBMITTED`; draft persists to Neo4j | Automated Playwright Spec | **PASS** |
| **F01-S05** | REQ-018-F01 Level Competencies & Cascading Micro-skills | Expert Assigned Roles view | Expert configures skills per level: competencies are isolated per level (`levelCompetencies[lvl]`); selecting micro-skills cascades strictly from configured competencies; "Save Draft" persists changes and "Close" discards uncommitted changes | Playwright spec `REQ-018-target-role-authoring-and-graph.spec.ts` | **PASS** |
| **F01-S06** | REQ-018-F01 L&D Manager Details & Review Consolidation | Manager Target Roles view | Manager opens "View Details" to inspect full specifications, interactive level tabs (`All Levels Overview`, `Junior`, `Middle`, `Senior`) with isolated competencies and micro-skills, and performs direct review actions; obsolete "Review Submitted" button removed | Playwright spec `REQ-018-target-role-authoring-and-graph.spec.ts` | **PASS** |
| **F01-S07** | REQ-018-F01 Neo4j Ontology Edge Alignment | TargetRoleGraphModal | Interactive graph visualizer aligns to `neo4j.svg` ontology: `(:TargetRole)-[:HAS_LEVEL]->(:Level)-[:HAS_COMPETENCY]->(:Competency)-[:HAS_SKILL]->(:MicroSkill)` and `(:Level)-[:REQUIRES_SKILL]->(:MicroSkill)` | Automated & Visual Verification | **PASS** |
| **F01-S08** | REQ-018-F01 Multi-level Selection & Dynamic Level Details | Expert Assigned Roles view | Multi-level edit toggle and `All Levels` option allow viewing and editing common competencies & micro-skills at once; redundant inner level tabs removed; `Proficiency Benchmark Levels` removed from Configure Skills; button text styled with `whitespace-nowrap px-3 text-xs`; Details modal dynamically renders role-specific levels with isolated competencies and micro-skills | Automated Playwright Spec & Manual Check | **PASS** |
| **F01-S09** | REQ-018-F01 Full-Bleed Canvas & Interactive Collapsible Inspector | TargetRoleGraphModal | Modal expands to full viewport width/height (`max-w-[96vw] h-[90vh]`) with slate-gray dot-grid canvas; header, controls, and legend float inside the canvas; Element Inspector opens as a floating drawer on node click and closes cleanly via [X] or canvas click; configured micro-skills connect to their parent competency via `HAS_SKILL` | Browser Subagent & Live Verification | **PASS** |
| **F01-S10** | REQ-018-F01 Zero-Overlap Layout, Left-Side Inspector & Level Filtering | TargetRoleGraphModal | Node width constraints (`widthConstraint: maximum 200–220px`) and generous tree spacing (`nodeSpacing: 300px`, `levelSeparation: 160px`) ensure 0% node overlap; Element Inspector placed on left side (`top-16 left-4 bottom-4`) with smooth slide-in; search input highlights matching nodes and auto-focuses; Level dropdown filters the subgraph to specific proficiency ranks (Fresher, Intern) | Browser Subagent & Live Verification | **PASS** |
| **F02-S01** | REQ-018-F02 Prerequisite Authoring | Complete Compose stack + Competency Ontology page | User opens "Manage Prerequisites" modal, selects source and target skill with minMastery 80%, clicks "Establish Dependency" | Relationship created in Neo4j; table updates; canvas re-draws directed arrow with `minMastery: 80%` | Full-stack persistence check | **PASS** |
| **F02-S02** | REQ-018-F02 Cycle Prevention | Competency Ontology page | User attempts to add a prerequisite that completes a directed cycle (e.g., A -> B -> C -> A) | Backend returns `400 Bad Request` with `PrerequisiteCycleException`; UI displays error banner: "Cannot create prerequisite: adding this dependency would create a cycle in the skill graph." | End-to-end exception check | **PASS** |
| **F02-S03** | REQ-018-F02 Delete Prerequisite | Competency Ontology page | User clicks trash icon next to a prerequisite relationship | Relationship removed from Neo4j; graph visualizer dynamically removes directed edge | Live UI and database check | **PASS** |

---

## 2. Execution Evidence

- Docker Compose dev stack running (`api-gateway`, `backend`, `neo4j`, `postgres`, `web`).
- Neo4j graph ontology verified:
  - `(:TargetRole)-[:HAS_LEVEL]->(:Level)`
  - `(:Level)-[:HAS_COMPETENCY]->(:Competency)`
  - `(:Competency)-[:HAS_SKILL]->(:MicroSkill)`
  - `(:Level)-[:REQUIRES_SKILL]->(:MicroSkill)`
  - `(:MicroSkill)-[:HAS_SKILL_PREREQUISITE]->(:MicroSkill)`
- Frontend vis-network rendering verified with hierarchical layout mode and organic physics mode.
- TypeScript compiler verification `tsc -b` passed with 0 errors.
- Automated Playwright spec `frontend/system-tests/REQ-018-target-role-authoring-and-graph.spec.ts` passed 2/2 tests (12.1s).


