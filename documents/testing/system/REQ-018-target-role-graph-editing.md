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



| **F01-S11** | REQ-018-F01 Target Role Version Changes (Diff) View | Manager & Expert Target Roles Details modal | User clicks "View Details" on target role and switches segmented toggle from "Architecture Specifications" to "Version Changes (Diff)" | Compares current revision against immediate predecessor in lineage; presents summary badges (Added/Removed/Adjusted skills and competencies) and side-by-side diff table highlighting changes in emerald, amber, and rose | Playwright spec `REQ-018-target-role-authoring-and-graph.spec.ts` | **PASS** |



| **F01-S12** | REQ-018-F01 Clean Graph Nodes, Widened Dialog & Target Mastery Semantics | TargetRoleGraphModal & ExpertAssignedRolesPage | User views target role graph and configures skills in Domain Expert portal | Target role root node displays clean role code (omits org and version); level nodes display clean level title (omits `Rank idx`); Configure Skills dialog expands to `max-w-5xl`; "Active Editing: All Levels" text removed; all labels and table headers adopt human-centric "Target Mastery" replacing developer jargon "Threshold" | Playwright spec `REQ-018-target-role-authoring-and-graph.spec.ts` & Manual Check | **PASS** |



| **F01-S13** | REQ-018-F01 Level Filter Tabs & Clickable Change Badges in Version Diff | TargetRoleVersionDiff (Manager & Expert) | User selects a level tab (e.g. `Intern`, `Fresher`) or clicks any summary metric badge (`+X Skills Added`, `-X Skills Removed`, `X Target Mastery Adjusted`, `+X / -Y Competencies`, `X Unchanged`) | View updates to show only changes for that level or change category; clicking Unchanged displays the unchanged skills table; non-conflicting role version resolution prevents cross-version competency overwrites (`+0 / -0` bug eliminated) | Playwright spec `REQ-018-target-role-authoring-and-graph.spec.ts` | **PASS** |



| **F01-S14** | REQ-018-F01 Inline Target Mastery Editing in Expert Skills Configuration | ExpertAssignedRolesPage | Expert clicks Edit button on a configured micro-skill | Target mastery column turns into an auto-focused numeric input (`min 1, max 100`) with Save and Cancel buttons; saving updates mastery in place without having to delete and re-add the micro-skill | Playwright spec `REQ-018-target-role-authoring-and-graph.spec.ts` | **PASS** |



| **F01-S15** | REQ-018-F01 Competency UUID Auto-Generation & Semantic Code Reseed | Complete Compose stack (Neo4j, Spring Boot, React) | System re-seeds Neo4j with automated UUIDs and semantic level-scoped competency codes (`COMP-DEV-J01`, `COMP-QA-M01`, `COMP-SEC-S01`); backend validates uniqueness constraint `ontology_v011_competency_code` | Graph and table views display clean semantic competency codes; UUIDs used as canonical primary keys; all 472 competencies and 2,363 relationships intact | Cypher uniqueness query & Playwright E2E spec | **PASS** |

| **F01-S16** | REQ-018-F01 Unified Version Diff Buttons, Modal Scroll & Description Clamp Fix | Expert and Manager Target Roles Views | User opens View Details modal, scrolls down, and switches to Version Diff | Modal body scrolls smoothly via `flex-1 overflow-y-auto min-h-0`; competency description clamps cleanly to 1 line without text bleeding; version diff buttons have solid background fills and black text, combining both skills and competencies under Added and Removed; calm neutral table styling | Automated Playwright Spec & Visual Check | **PASS** |



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



- Automated Playwright spec `frontend/system-tests/REQ-018-target-role-authoring-and-graph.spec.ts` passed 3/3 tests (17.7s).



- Automated Playwright spec `frontend/system-tests/REQ-017-F02-ontology-explore-graph.spec.ts` passed 1/1 tests (7.9s).











